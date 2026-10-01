<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\TransaccionesDetalle;
use App\Models\Transacciones;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\UpdateTransaccionDetalleRequest; 
use App\Http\Requests\CreateTransaccionDetalleRequest; 
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

        // Un documento ya posteado (Finalizado / Positivo / Negativo) es inmutable:
        // su stock ya fue aplicado al kardex y no se pueden tocar sus detalles.
        if ($transaccion->estaPosteada()) {
            return response()->json(['message' => 'No se pueden modificar los detalles de una transacción finalizada.'], 422);
        }

        $producto = $this->buscarProductoPorCodigo($request->codigo_barras, $transaccion->id_organizacion);

        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        $cantidad = (float) $request->cantidad;
        $precioUnitario = (float) $request->precio_unitario;
        $subtotal = $cantidad * $precioUnitario;

        // El detalle se guarda SIN mover stock: el kardex se registra recién al
        // finalizar (postear) la transacción. Igual validamos temprano para avisar
        // si no alcanza el stock (validación "suave", sin bloquear el borrador).
        if ($transaccion->direccionStock() === TipoMovimientos::DIRECCION_SALIDA) {
            $stockActual = (float) ($producto->stock_actual ?? 0);
            if ($stockActual < $cantidad) {
                return response()->json([
                    'message' => "Stock insuficiente para {$producto->nombre} (disponible: {$stockActual}, requerido: {$cantidad}).",
                ], 422);
            }
        }

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

        $montoCabecera = $this->recalcularMontoCabecera($transaccion->id);

        return response()->json([
            'message' => 'Detalle creado exitosamente.',
            'detalle' => $detalle,
            'monto_cabecera' => $montoCabecera,
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

        $transaccion = Transacciones::findOrFail($detalle->id_transaccion);

        // Un documento ya posteado es inmutable: su stock ya fue aplicado.
        if ($transaccion->estaPosteada()) {
            return response()->json(['message' => 'No se pueden modificar los detalles de una transacción finalizada.'], 422);
        }

        $producto = $this->buscarProductoPorCodigo($data['codigo_barras'], $transaccion->id_organizacion);

        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        $cantidadNueva = (float) $data['cantidad'];
        $precioUnitario = (float) $data['precio_unitario'];
        $subtotal = $cantidadNueva * $precioUnitario;

        // El stock NO se mueve acá (se aplica al finalizar). Validación "suave"
        // para avisar temprano si una salida no tiene stock suficiente.
        if ($transaccion->direccionStock() === TipoMovimientos::DIRECCION_SALIDA) {
            $stockActual = (float) ($producto->stock_actual ?? 0);
            if ($stockActual < $cantidadNueva) {
                return response()->json([
                    'message' => "Stock insuficiente para {$producto->nombre} (disponible: {$stockActual}, requerido: {$cantidadNueva})."
                ], 422);
            }
        }

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

        $transaccion = Transacciones::findOrFail($idTransaccion);

        // Un documento ya posteado es inmutable: su stock ya fue aplicado.
        if ($transaccion->estaPosteada()) {
            return response()->json(['message' => 'No se pueden modificar los detalles de una transacción finalizada.'], 422);
        }

        // Borrador: el detalle nunca movió stock, así que se borra sin tocar el kardex.
        $detalle->delete();

        $montoCabecera = $this->recalcularMontoCabecera($idTransaccion);

        return response()->json([
            'message' => 'Detalle eliminado correctamente.',
            'monto_cabecera' => $montoCabecera,
        ], 200);
    }
}
