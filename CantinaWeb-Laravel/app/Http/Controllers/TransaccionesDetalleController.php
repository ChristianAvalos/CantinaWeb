<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\TransaccionesDetalle;
use App\Models\Transacciones;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Http\Requests\UpdateTransaccionDetalleRequest; 
use App\Http\Requests\CreateTransaccionDetalleRequest; 
use App\Services\InventarioService;
use App\Http\Controllers\Concerns\AplicaFiltrosDinamicos;
use App\Models\Producto;
use App\Models\TipoMovimientos;

class TransaccionesDetalleController extends Controller
{
    use AplicaFiltrosDinamicos;

    private function recalcularMontoCabecera($idTransaccion): float
    {
        $subtotal = TransaccionesDetalle::where('id_transaccion', $idTransaccion)->sum('subtotal');
        $subtotal = (float) $subtotal;

        Transacciones::where('id', $idTransaccion)->update([
            'monto' => $subtotal,
            'UrevUsuario' => Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return $subtotal;
    }

    /**
     * Busca un producto por código de barras dentro del alcance de la transacción.
     *
     * Los productos se crean con `id_organizacion = NULL` (ver ProductoController),
     * así que se aceptan tanto los de la organización de la transacción como los
     * que no tienen organización asignada. Es el mismo criterio que usa
     * ProductoController@index.
     */
    private function buscarProductoPorCodigo(?string $codigoBarras, $idOrganizacion): ?Producto
    {
        return Producto::where('codigo_barras', $codigoBarras)
            ->when($idOrganizacion, function ($q) use ($idOrganizacion) {
                $q->where(function ($q2) use ($idOrganizacion) {
                    $q2->whereNull('id_organizacion')
                        ->orWhere('id_organizacion', $idOrganizacion);
                });
            })
            ->first();
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $id_transaccion = $request->input('id_transaccion');
        $filtros = $this->normalizarFiltros($request->input('filtros', []));

        // Si no hay id_transaccion, retornar vacío
        if (!$id_transaccion) {
            return response()->json([
                'transaccionesDetalle' => [
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'total' => 0,
                ]
            ]);
        }

        $transaccionesDetalle = TransaccionesDetalle::with(['producto'])
            ->whereHas('transaccion', function ($query) use ( $id_transaccion) {
                if ($id_transaccion) {
                    $query->where('id', $id_transaccion);
                }
            })
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('cantidad', 'like', '%' . $search . '%')
                        ->orWhere('precio_unitario', 'like', '%' . $search . '%')
                        ->orWhereHas('producto', function ($q2) use ($search) {
                            $q2->where('nombre', 'like', '%' . $search . '%');
                        });
                });
            })
            ->when(!empty($filtros), function ($query) use ($filtros) {
                return $this->aplicarFiltrosDinamicos($query, $filtros, ['search', 'id_transaccion']);
            })
            ->orderBy('id', 'desc')
            ->paginate(5);

        $subtotal = TransaccionesDetalle::where('id_transaccion', $id_transaccion)
            ->whereHas('transaccion', function ($query) {
            })
            ->sum('subtotal');

        return response()->json([
            'transaccionesDetalle' => $transaccionesDetalle,
            'subtotal' => $subtotal
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function createTransaccionDetalle(CreateTransaccionDetalleRequest $request)
    {
        $data = $request->validated();

        $usuario = Auth::user()->name;

        // Aquí deberías recibir el id_transaccion desde el frontend, si no, ajusta según tu lógica
        $id_transaccion = $request->input('id_transaccion');
        if (!$id_transaccion) {
            return response()->json(['message' => 'ID de transacción requerido'], 422);
        }

        $transaccion = Transacciones::find($id_transaccion);
        if (!$transaccion) {
            return response()->json(['message' => 'Transacción no encontrada'], 404);
        }

        $producto = $this->buscarProductoPorCodigo($request->codigo_barras, $transaccion->id_organizacion);

        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        $cantidad = (float) $request->cantidad;
        $precioUnitario = (float) $request->precio_unitario;
        $subtotal = $cantidad * $precioUnitario;

        // Dirección del stock: la resuelve la propia transacción (sin consultar de nuevo).
        $tipoOperacion = $transaccion->direccionStock();

        // Detalle + movimiento de stock en una sola transacción de BD: si el kardex
        // rechaza el movimiento (stock insuficiente), el detalle no queda creado.
        try {
            $resultado = DB::transaction(function () use (
                $transaccion,
                $producto,
                $cantidad,
                $precioUnitario,
                $subtotal,
                $tipoOperacion,
                $data,
                $usuario,
                $request
            ) {
                $detalle = TransaccionesDetalle::create([
                    'id_transaccion' => $transaccion->id,
                    'id_producto' => $producto->id,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                    'subtotal' => $subtotal,
                    'lote' => isset($data['lote']) ? $data['lote'] : null,
                    'fecha_vencimiento' => isset($data['fecha_vencimiento']) ? $data['fecha_vencimiento'] : null,
                    'UrevUsuario' => $usuario,
                    'UrevFechaHora' => $request->Fecha ?? now(),
                ]);

                // Único camino para mover stock: escribe el kardex y actualiza el producto.
                $movimiento = InventarioService::registrarDocumento(
                    $transaccion,
                    $producto->id,
                    $cantidad,
                    $tipoOperacion,
                    [
                        'id_transaccion_detalle' => $detalle->id,
                        'costo_unitario' => $precioUnitario,
                        'fecha' => $request->Fecha ?? now(),
                    ]
                );

                $montoCabecera = $this->recalcularMontoCabecera($transaccion->id);

                return [$detalle, $movimiento, $montoCabecera];
            });
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        [$detalle, $movimiento, $montoCabecera] = $resultado;

        return response()->json([
            'message' => 'Detalle creado exitosamente.',
            'detalle' => $detalle,
            'monto_cabecera' => $montoCabecera,
            'stock_actual' => (float) $movimiento->stock_nuevo,
        ], 201);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(TransaccionesDetalle $transaccionesDetalle)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(TransaccionesDetalle $transaccionesDetalle)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function updateTransaccionDetalle(UpdateTransaccionDetalleRequest $request, $id)
    {
        $data = $request->validated();
        $detalle = TransaccionesDetalle::findOrFail($id);

        $usuario = Auth::user()->name;

        // Guardar valores anteriores para el cálculo de stock
        $idProductoAnterior = $detalle->id_producto;
        $cantidadAnterior = (float) $detalle->cantidad;

        $transaccion = Transacciones::findOrFail($detalle->id_transaccion);

        $producto = $this->buscarProductoPorCodigo($data['codigo_barras'], $transaccion->id_organizacion);

        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        $cantidadNueva = (float) $data['cantidad'];
        $precioUnitario = (float) $data['precio_unitario'];
        $subtotal = $cantidadNueva * $precioUnitario;

        // Validación para compras: la nueva cantidad no puede ser menor a lo ya vendido
        $tipoMovimiento = (int) ($transaccion->id_TipoMovimiento ?? 0);
        if ($tipoMovimiento === 1) {
            $cantidadMinima = $detalle->cantidad_minima;
            if ($cantidadNueva < $cantidadMinima) {
                return response()->json([
                    'message' => 'La cantidad no puede ser menor al mínimo permitido.',
                    'errors' => [
                        'cantidad' => ["No se puede reducir la cantidad por debajo de {$cantidadMinima} unidades (mínimo por ventas ya realizadas)."]
                    ]
                ], 422);
            }
        }

        // Validación para ventas: si la cantidad aumenta, el incremento no puede superar el stock disponible
        $tipoOperacion = $transaccion->direccionStock();
        if ($tipoOperacion === TipoMovimientos::DIRECCION_SALIDA && $cantidadNueva > $cantidadAnterior) {
            $stockActual = (float) ($producto->stock_actual ?? 0);
            $incremento = $cantidadNueva - $cantidadAnterior;
            if ($stockActual < $incremento) {
                return response()->json([
                    'message' => "Stock insuficiente para {$producto->nombre} (disponible: {$stockActual}, requerido: {$incremento})."
                ], 422);
            }
        }

        // El cambio del detalle y el movimiento de stock son atómicos: si el kardex
        // rechaza el movimiento, el detalle NO queda modificado.
        try {
            DB::transaction(function () use (
                $detalle,
                $producto,
                $cantidadNueva,
                $cantidadAnterior,
                $precioUnitario,
                $subtotal,
                $data,
                $usuario,
                $idProductoAnterior,
                $transaccion
            ) {
                $detalle->update([
                    'id_producto' => $producto->id,
                    'cantidad' => $cantidadNueva,
                    'lote' => isset($data['lote']) ? $data['lote'] : null,
                    'fecha_vencimiento' => isset($data['fecha_vencimiento']) ? $data['fecha_vencimiento'] : null,
                    'precio_unitario' => $precioUnitario,
                    'subtotal' => $subtotal,
                    'UrevUsuario' => $usuario,
                    'UrevFechaHora' => now(),
                ]);

                $direccionOriginal = $transaccion->direccionStock();
                $direccionInversa = $transaccion->direccionStockInversa();

                if ($idProductoAnterior === $producto->id) {
                    // Mismo producto: solo se registra la diferencia como movimiento.
                    $diferencia = $cantidadNueva - $cantidadAnterior;

                    if (abs($diferencia) > 0.0001) {
                        InventarioService::registrarDocumento(
                            $transaccion,
                            $producto->id,
                            abs($diferencia),
                            $diferencia > 0 ? $direccionOriginal : $direccionInversa,
                            [
                                'id_transaccion_detalle' => $detalle->id,
                                'costo_unitario' => $precioUnitario,
                                'motivo' => 'Ajuste por edición del detalle #' . $detalle->id,
                            ]
                        );
                    }
                } else {
                    // Cambió el producto: se revierte el anterior y se aplica el nuevo.
                    InventarioService::registrarDocumento($transaccion, $idProductoAnterior, $cantidadAnterior, $direccionInversa, [
                        'id_transaccion_detalle' => $detalle->id,
                        'motivo' => 'Reversión por cambio de producto en el detalle #' . $detalle->id,
                        'id_movimiento_origen' => InventarioService::buscarMovimientoOrigen($detalle->id, $idProductoAnterior),
                    ]);

                    InventarioService::registrarDocumento($transaccion, $producto->id, $cantidadNueva, $direccionOriginal, [
                        'id_transaccion_detalle' => $detalle->id,
                        'costo_unitario' => $precioUnitario,
                        'motivo' => 'Alta por cambio de producto en el detalle #' . $detalle->id,
                    ]);
                }
            });
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $montoCabecera = $this->recalcularMontoCabecera($detalle->id_transaccion);

        return response()->json([
            'message' => 'Detalle actualizado exitosamente.',
            'detalle' => $detalle->load('producto'),
            'monto_cabecera' => $montoCabecera,
        ], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function deleteTransaccionDetalle($id)
    {
        $detalle = TransaccionesDetalle::findOrFail($id);
        $idTransaccion = $detalle->id_transaccion;
        $idProducto = $detalle->id_producto;
        $cantidad = (float) $detalle->cantidad;

        $transaccion = Transacciones::findOrFail($idTransaccion);

        // Al eliminar, revertir el stock: si era venta → devolver (entrada), si era compra → quitar (salida)
        $direccionInversa = $transaccion->direccionStockInversa();

        // El movimiento original que se está revirtiendo (para dejar el enlace en el kardex).
        $origenId = InventarioService::buscarMovimientoOrigen($detalle->id, $idProducto);

        try {
            $resultado = DB::transaction(function () use (
                $detalle,
                $transaccion,
                $idTransaccion,
                $idProducto,
                $cantidad,
                $direccionInversa,
                $origenId
            ) {
                // Se revierte el stock ANTES de borrar: si el kardex rechaza el
                // movimiento (stock insuficiente), el detalle no se elimina.
                $movimiento = InventarioService::registrarDocumento($transaccion, $idProducto, $cantidad, $direccionInversa, [
                    'id_transaccion_detalle' => $detalle->id,
                    'motivo' => 'Eliminación del detalle #' . $detalle->id,
                    'id_movimiento_origen' => $origenId,
                ]);

                $detalle->delete();

                $montoCabecera = $this->recalcularMontoCabecera($idTransaccion);

                return [$movimiento, $montoCabecera];
            });
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        [$movimiento, $montoCabecera] = $resultado;

        return response()->json([
            'message' => 'Transacción eliminada correctamente.',
            'monto_cabecera' => $montoCabecera,
            'stock_actual' => (float) $movimiento->stock_nuevo,
        ], 200);
    }
}
