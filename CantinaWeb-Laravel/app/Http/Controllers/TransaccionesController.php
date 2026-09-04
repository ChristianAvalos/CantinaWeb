<?php

namespace App\Http\Controllers;

use DateTime;
use Illuminate\Http\Request;
use App\Models\Transacciones;
use App\Models\TransaccionesDetalle;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Concerns\AplicaFiltrosDinamicos;
use App\Http\Requests\CreateTransaccionRequest;
use App\Http\Requests\UpdateTransaccionRequest;
use App\Helpers\StockHelper;
use App\Models\Producto;
use App\Models\TipoPago;
use App\Models\TipoEstado;
use App\Models\Comprobante;
use App\Models\Cuota;

class TransaccionesController extends Controller
{
    use AplicaFiltrosDinamicos;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $isAdmin = isset($user->rol_id) ? ($user->rol_id === 1) : false;

        $filtros = $this->normalizarFiltros($request->input('filtros', []));

        $search = $filtros['search'] ?? $request->input('search');
        $mes = $filtros['mes'] ?? $request->input('mes');
        $fechaDesde = $filtros['fecha_desde'] ?? $request->input('fecha_desde');
        $fechaHasta = $filtros['fecha_hasta'] ?? $request->input('fecha_hasta');
        $tipo = $filtros['tipo'] ?? $request->input('tipo');

        // Si el search es una fecha en formato dd/mm/yyyy, la convertimos a yyyy-mm-dd
        if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $search)) {
            $fecha = DateTime::createFromFormat('d/m/Y', $search);
            if ($fecha) {
                $searchFecha = $fecha->format('Y-m-d');
            } else {
                $searchFecha = null;
            }
        } else {
            $searchFecha = null;
        }

        $transacciones = Transacciones::with([
            'tipoMovimiento',
            'persona',
            'tipoEstado',
            'tipoPago',
            'tipoComprobante',
            'tipoMoneda',
            'banco',
            'formaPago',
            'organizacion',
            'comprobante:id,id_transaccion',
            'caja'
        ]);
        // Si NO es admin, limitar por la organización del usuario
        if (! $isAdmin) {
            $transacciones->where('id_organizacion', $user->id_organizacion);
        }

        $transacciones = $transacciones->when($search, function ($q, $search) use ($searchFecha) {
                $q->where(function ($s) use ($search, $searchFecha) {
                    $s->where('nombre', 'ilike', '%' . $search . '%')
                        ->orWhere('descripcion', 'ilike', '%' . $search . '%')
                        ->orWhere('monto', 'ilike', '%' . $search . '%')
                        ->orWhereHas('persona', function ($q2) use ($search) {
                            $q2->where('nombre', 'ilike', '%' . $search . '%');
                        })
                        ->orWhereHas('tipoMovimiento', function ($q3) use ($search) {
                            $q3->where('nombre', 'ilike', '%' . $search . '%');
                        });

                    // Si el search es una fecha válida, buscar por fecha exacta
                    if ($searchFecha) {
                        $s->orWhereDate('fecha', $searchFecha);
                    }
                });
            })
            ->when($tipo, function ($q, $tipo) {
                $q->where('id_TipoMovimiento', $tipo);
            })
            ->when($fechaDesde || $fechaHasta, function ($q) use ($fechaDesde, $fechaHasta) {
                if ($fechaDesde) {
                    $q->whereDate('fecha', '>=', $fechaDesde);
                }

                if ($fechaHasta) {
                    $q->whereDate('fecha', '<=', $fechaHasta);
                }
            })
            // Filtro por mes si viene el parámetro
            ->when($mes, function ($q, $mes) {
                [$anio, $mesNum] = explode('-', $mes); // $mes debe venir como 'YYYY-MM'
                $q->whereYear('fecha', $anio)
                    ->whereMonth('fecha', $mesNum);
            })
            ->when(!empty($filtros), function ($q) use ($filtros) {
                return $this->aplicarFiltrosDinamicos($q, $filtros, ['search', 'mes', 'fecha_desde', 'fecha_hasta', 'tipo', 'ejercicio']);
            })
            ->orderBy('id', 'desc')
            ->paginate(10);

        // sumo los montos de la página devuelta
        $subtotal = $transacciones->getCollection()->sum('monto');



        return response()->json([
            'transacciones' => $transacciones,
            'subtotal' => $subtotal
        ]);
    }



    /**
     * Show the form for creating a new resource.
     */
    public function createTransaccion(CreateTransaccionRequest $request)
    {
        $data = $request->validated();

        $transaccion = Transacciones::create([
            'nombre' => $data['nombre'],
            'descripcion' => $data['descripcion'] ?? null,
            'fecha' => $data['fecha'],
            'lote' => $data['lote'] ?? null,
            'id_organizacion' => $data['id_organizacion'] ?? Auth::user()->id_organizacion,
            'id_persona' => $data['id_persona'] ?? null,
            'id_TipoEstado' => $data['id_TipoEstado'],
            'id_TipoComprobante' => $data['id_TipoComprobante'] ?? null,
            'nro_comprobante' => $data['nro_comprobante'] ?? null,
            'id_TipoPago' => $data['id_TipoPago'],
            'id_FormaPago' => $data['id_FormaPago'],
            'id_TipoMoneda' => $data['id_TipoMoneda'] ?? null,
            'id_TipoMovimiento' => $data['id_TipoMovimiento'],
            'monto' => $data['monto'] ?? 0,
            'monto_recibido' => $data['monto_recibido'] ?? null,
            'vuelto' => $data['vuelto'] ?? null,
            'iva' => $data['iva'] ?? null,
            'id_usuario' => Auth::user()->id,
            'id_Caja' => $data['id_Caja'] ?? null,
            'id_Banco' => $data['id_Banco'] ?? null,
            'UrevUsuario' => Auth::user()->name,
            'UrevFechaHora' => now()

        ]);

        return response()->json($transaccion, 201);
    }

    /**
     * Crea una venta POS de forma ATÓMICA: cabecera + detalles en una sola
     * transacción de BD, validando el stock de cada producto antes de descontar.
     * Si falla cualquier detalle, se revierte todo (no quedan ventas a medias).
     */
    public function crearVentaPos(Request $request)
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:255',
            'descripcion' => 'nullable|string|max:1000',
            'fecha' => 'required|date',
            'id_organizacion' => 'required|exists:organizacion,id',
            'id_persona' => 'nullable|exists:personas,id',
            'id_TipoPago' => 'required|exists:tipo_pagos,id',
            'id_FormaPago' => 'required|exists:forma_pagos,id',
            'monto_recibido' => 'nullable|numeric',
            'vuelto' => 'nullable|numeric',
            'iva' => 'nullable|numeric',
            'detalles' => 'required|array|min:1',
            'detalles.*.codigo_barras' => 'required|string',
            'detalles.*.cantidad' => 'required|numeric|min:0.0001',
            'detalles.*.precio_unitario' => 'required|numeric|min:0',
        ]);

        try {
            $venta = DB::transaction(function () use ($data) {
                // 1) Cabecera (Venta = movimiento 2, Finalizado = estado 3)
                $cabecera = Transacciones::create([
                    'nombre' => $data['nombre'],
                    'descripcion' => $data['descripcion'] ?? null,
                    'fecha' => $data['fecha'],
                    'id_organizacion' => $data['id_organizacion'],
                    'id_persona' => $data['id_persona'] ?? null,
                    'id_TipoEstado' => 3,            // Finalizado
                    'id_TipoMovimiento' => 2,        // Venta
                    'id_TipoPago' => $data['id_TipoPago'],
                    'id_FormaPago' => $data['id_FormaPago'],
                    'monto' => 0,
                    'monto_recibido' => $data['monto_recibido'] ?? null,
                    'vuelto' => $data['vuelto'] ?? null,
                    'iva' => $data['iva'] ?? null,
                    'id_usuario' => Auth::user()->id,
                    'UrevUsuario' => Auth::user()->name,
                    'UrevFechaHora' => now(),
                ]);

                // 2) Detalles: validar stock y descontar
                $montoTotal = 0;
                foreach ($data['detalles'] as $detalle) {
                    $producto = Producto::where('codigo_barras', $detalle['codigo_barras'])->first();
                    if (!$producto) {
                        throw new \Exception("Producto no encontrado (código: {$detalle['codigo_barras']})");
                    }

                    $cantidad = (float) $detalle['cantidad'];
                    $precioUnitario = (float) $detalle['precio_unitario'];
                    $subtotal = $cantidad * $precioUnitario;
                    $stockActual = (float) ($producto->stock_actual ?? 0);

                    // Validar stock (venta = salida)
                    if ($stockActual < $cantidad) {
                        throw new \Exception(
                            "Stock insuficiente para {$producto->nombre} (disponible: {$stockActual}, requerido: {$cantidad})"
                        );
                    }

                    TransaccionesDetalle::create([
                        'id_transaccion' => $cabecera->id,
                        'id_producto' => $producto->id,
                        'cantidad' => $cantidad,
                        'precio_unitario' => $precioUnitario,
                        'subtotal' => $subtotal,
                        'UrevUsuario' => Auth::user()->name,
                        'UrevFechaHora' => now(),
                    ]);

                    StockHelper::calcular($producto->id, $cantidad, 'salida', Auth::user()->name);
                    $montoTotal += $subtotal;
                }

                // 3) Recalcular monto de la cabecera
                $cabecera->update([
                    'monto' => $montoTotal,
                    'UrevUsuario' => Auth::user()->name,
                    'UrevFechaHora' => now(),
                ]);

                // 4) Guardar el snapshot del comprobante impreso. Se guarda una copia
                //    fiel de lo que se va a imprimir, para que al reimprimir desde la
                //    tabla Ventas se muestre SIEMPRE lo mismo (aunque los productos,
                //    clientes u organización cambien después).
                Comprobante::create([
                    'id_transaccion' => $cabecera->id,
                    'id_organizacion' => $cabecera->id_organizacion,
                    'datos' => $this->generarSnapshotComprobante($cabecera),
                    'id_usuario' => Auth::id(),
                    'UrevUsuario' => Auth::user()->name,
                    'UrevFechaHora' => now(),
                ]);

                return $cabecera->load([
                    'persona',
                    'tipoPago',
                    'formaPago',
                    'tipoEstado',
                    'organizacion',
                    'transacionDetalles.producto',
                    'comprobante',
                ]);
            });

            return response()->json([
                'message' => 'Venta realizada correctamente.',
                'venta' => $venta,
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Construye el snapshot estructurado del comprobante de una transacción.
     * Centraliza los datos tal cual se imprimen (empresa, cliente, ítems, montos).
     */
    private function generarSnapshotComprobante(Transacciones $transaccion): array
    {
        $organizacion = $transaccion->organizacion;
        $detalles = $transaccion->transacionDetalles()->with('producto')->get();

        $items = $detalles->map(function ($d) {
            return [
                'codigo' => $d->producto->codigo_barras ?? '',
                'producto' => $d->producto->nombre ?? ('Producto #' . $d->id_producto),
                'cantidad' => (float) $d->cantidad,
                'precio_unitario' => (float) $d->precio_unitario,
                'subtotal' => (float) $d->subtotal,
            ];
        })->values()->toArray();

        $total = (float) $transaccion->monto;
        $iva = (float) ($transaccion->iva ?? 0);

        return [
            'titulo' => 'COMPROBANTE DE VENTA',
            'numero' => (string) $transaccion->id,
            // La columna fecha es solo date (sin hora); se usa created_at para mostrar
            // la hora real de la venta en el comprobante.
            'fecha' => \Carbon\Carbon::parse($transaccion->created_at ?? now())->format('d/m/Y H:i'),
            'empresa' => [
                'RazonSocial' => $organizacion->RazonSocial ?? '',
                'RUC' => $organizacion->RUC ?? '',
                'Direccion' => $organizacion->Direccion ?? '',
                'Telefono' => $organizacion->Telefono ?? '',
                'Email' => $organizacion->Email ?? '',
                'Sigla' => $organizacion->Sigla ?? '',
            ],
            'cliente' => $transaccion->persona
                ? [
                    'nombre' => $transaccion->persona->nombre ?? '',
                    'documento' => $transaccion->persona->documento ?? '',
                ]
                : null,
            'forma_pago' => $transaccion->formaPago->nombre ?? '',
            'tipo_pago' => $transaccion->tipoPago->nombre ?? '',
            'cajero' => $transaccion->UrevUsuario ?? '',
            'items' => $items,
            'subtotal' => round(max(0, $total - $iva), 2),
            'iva' => round($iva, 2),
            'total' => round($total, 2),
            'monto_recibido' => round((float) ($transaccion->monto_recibido ?? 0), 2),
            'vuelto' => round((float) ($transaccion->vuelto ?? 0), 2),
        ];
    }

    /**
     * Devuelve el comprobante (snapshot) guardado de una venta para reimprimir.
     */
    public function obtenerComprobante($id)
    {
        $transaccion = Transacciones::with('comprobante')->find($id);

        if (! $transaccion || ! $transaccion->comprobante) {
            return response()->json([
                'message' => 'La venta no posee un comprobante guardado.',
            ], 404);
        }

        return response()->json([
            'comprobante' => $transaccion->comprobante,
        ], 200);
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
    public function show(Transacciones $transacciones)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Transacciones $transacciones)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function updateTransaccion(UpdateTransaccionRequest $request, $id)
    {
        $data = $request->validated();
        $transaccion = Transacciones::findOrFail($id);

        // No permitir editar una transacción ya finalizada o anulada.
        // Las correcciones de cabecera se hacen con /corregir y las reversiones con /anular.
        $estadoActual = (int) $transaccion->id_TipoEstado;
        if ($estadoActual === 3 || $estadoActual === 7) {
            return response()->json([
                'message' => $estadoActual === 7
                    ? 'No se puede editar una transacción anulada.'
                    : 'No se puede editar una transacción finalizada. Usá "Corregir datos" para la cabecera o "Anular" para revertirla.'
            ], 422);
        }

        $detalleQuery = TransaccionesDetalle::where('id_transaccion', $transaccion->id);
        $tieneDetalles = $detalleQuery->exists();
        $montoDetalles = (float) $detalleQuery->sum('subtotal');
        $montoNormalizado = $tieneDetalles ? $montoDetalles : (float) ($data['monto'] ?? 0);

        // Al cerrar (submit final) una compra/venta manual, se fuerza el estado Finalizado (3).
        $idTipoMovimiento = (int) ($data['id_TipoMovimiento'] ?? $transaccion->id_TipoMovimiento);
        $finalizar = (bool) $request->input('finalizar', false);
        $idTipoEstado = ($finalizar && in_array($idTipoMovimiento, [1, 2], true))
            ? 3
            : $data['id_TipoEstado'];

        try {
            DB::transaction(function () use ($transaccion, $data, $montoNormalizado, $idTipoEstado, $request) {
                $transaccion->update([
                    'nombre' => $data['nombre'],
                    'descripcion' => $data['descripcion'] ?? null,
                    'fecha' => $data['fecha'],
                    'lote' => $data['lote'] ?? null,
                    'id_persona' => $data['id_persona'],
                    'id_TipoEstado' => $idTipoEstado,
                    'id_TipoComprobante' => $data['id_TipoComprobante'] ?? null,
                    'nro_comprobante' => $data['nro_comprobante'] ?? null,
                    'id_TipoPago' => $data['id_TipoPago'],
                    'id_FormaPago' => $data['id_FormaPago'],
                    'id_TipoMoneda' => $data['id_TipoMoneda'] ?? null,
                    'id_Caja' => $data['id_Caja'] ?? null,
                    'id_Banco' => $data['id_Banco'] ?? null,
                    'id_organizacion' => $data['id_organizacion'] ?? Auth::user()->id_organizacion,
                    'id_usuario' => Auth::user()->id,
                    'id_TipoMovimiento' => $data['id_TipoMovimiento'],
                    'monto' => $montoNormalizado,
                    'monto_recibido' => $data['monto_recibido'] ?? null,
                    'vuelto' => $data['vuelto'] ?? null,
                    'iva' => $data['iva'] ?? null,
                    'UrevUsuario' => Auth::user()->name,
                    'UrevFechaHora' => now(),
                ]);

                // Sincronizar cuotas si la transacción se paga a crédito/cuotas
                $this->sincronizarCuotas($transaccion, $request);
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($transaccion->load('tipoPago'), 200);
    }

    public function Grafico(Request $request)
    {
        $userId = Auth::user()->id;
        $idTipoIngreso = 1;
        $idTipoEgreso = [2, 3];
        $mes = $request->input('mes');
        // Sumar todos los ingresos del usuario en el mes
        $presupuestoQuery = Transacciones::where('id_usuario', $userId)
            ->where('id_TipoMovimiento', $idTipoIngreso);



        // Sumar todos los egresos del usuario en el mes
        $egresoQuery = Transacciones::where('id_usuario', $userId)
            ->whereIn('id_TipoMovimiento', $idTipoEgreso)
            ->sum('monto');

        $acumulado = $presupuestoQuery->sum('monto') - $egresoQuery;

        // Filtro por mes
        if ($mes) {
            [$anio, $mesNum] = explode('-', $mes);
            $presupuestoQuery->whereYear('UrevFechaHora', $anio)
                ->whereMonth('UrevFechaHora', $mesNum);
        }
        $presupuesto = $presupuestoQuery->sum('monto');

        $ingresoMes = $presupuesto;

        // Agrupa los egresos por categoría y suma los montos en el mes
        $gastosQuery = Transacciones::select('id_Categoria', DB::raw('SUM(monto) as monto'))
            ->where('id_usuario', $userId)
            ->whereIn('id_TipoMovimiento', $idTipoEgreso)
            ->groupBy('id_Categoria')
            ->with('categoria');

        if ($mes) {
            [$anio, $mesNum] = explode('-', $mes);
            $gastosQuery->whereYear('UrevFechaHora', $anio)
                ->whereMonth('UrevFechaHora', $mesNum);
        }
        $gastos = $gastosQuery->get();

        $egresoMesQuery = Transacciones::where('id_usuario', $userId)
            ->whereIn('id_TipoMovimiento', $idTipoEgreso);

        if ($mes) {
            [$anio, $mesNum] = explode('-', $mes);
            $egresoMesQuery->whereYear('UrevFechaHora', $anio)
                ->whereMonth('UrevFechaHora', $mesNum);
        }
        $egresoMes = $egresoMesQuery->sum('monto');

        $colores = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
        $gastosFormateados = [];
        foreach ($gastos as $idx => $gasto) {
            $gastosFormateados[] = [
                'categoria' => $gasto->categoria ? $gasto->categoria->nombre : 'Sin categoría',
                'monto' => (float) $gasto->monto,
                'color' => $colores[$idx % count($colores)]
            ];
        }

        $totalGastado = array_sum(array_column($gastosFormateados, 'monto'));
        $restante = $presupuesto - $totalGastado;

        return response()->json([
            'gastos' => $gastosFormateados,
            'restante' => $restante,
            'acumulado' => $acumulado,
            'ingresoMes' => $ingresoMes,
            'egresoMes' => $egresoMes,
        ]);
    }


    /**
     * Anula una transacción (estilo SAP):
     * revierte el stock de sus detalles y la marca con el estado 'Anulada'.
     * No se borra físicamente el registro para conservar la trazabilidad.
     */
    public function AnularTransaccion($id)
    {
        $transaccion = Transacciones::findOrFail($id);

        // Evitar anular dos veces la misma transacción
        if ((int) $transaccion->id_TipoEstado === 7) {
            return response()->json(['message' => 'La transacción ya está anulada.'], 422);
        }

        // 1) Validar stock disponible antes de revertir
        $detalles = TransaccionesDetalle::with('producto')->where('id_transaccion', $transaccion->id)->get();
        $operacionInversa = $this->direccionInversa($transaccion);

        // Si la reversión va a QUITAR stock (compra o ajuste positivo),
        // verificar que el stock actual alcance (que no se haya vendido/consumido ya).
        if ($operacionInversa === 'salida') {
            $sinStock = [];
            foreach ($detalles as $detalle) {
                $stockActual = (float) ($detalle->producto->stock_actual ?? 0);
                $cantidad = (float) $detalle->cantidad;
                if ($stockActual < $cantidad) {
                    $sinStock[] = sprintf(
                        '%s (stock: %s, requerido: %s)',
                        $detalle->producto->nombre ?? 'Producto #' . $detalle->id_producto,
                        $stockActual,
                        $cantidad
                    );
                }
            }

            if (count($sinStock) > 0) {
                return response()->json([
                    'message' => 'No se puede anular: parte de esta transacción ya fue vendida o consumida (stock insuficiente). Anulá primero las ventas asociadas. Detalle: ' . implode('; ', $sinStock) . '.',
                    'errors' => ['stock' => $sinStock],
                ], 422);
            }
        }

        // 2) Revertir el stock de cada detalle (operación inversa a la original)
        foreach ($detalles as $detalle) {
            StockHelper::calcular(
                $detalle->id_producto,
                (float) $detalle->cantidad,
                $operacionInversa,
                Auth::user()->name
            );
        }

        // 3) Marcar como Anulada
        $transaccion->update([
            'id_TipoEstado' => 7,
            'UrevUsuario' => Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Transacción anulada correctamente. Stock revertido.',
            'transaccion' => $transaccion->load('tipoEstado'),
        ], 200);
    }

    /**
     * Corrige solo los datos de cabecera NO contables de una transacción
     * (nombre, descripción, fecha, nro_comprobante, tipo de comprobante y persona).
     * No modifica estado, movimiento, montos ni stock: permite arreglar un
     * error de tipeo (ej. número de factura) sin anular la operación.
     */
    public function corregirTransaccion(Request $request, $id)
    {
        $transaccion = Transacciones::findOrFail($id);

        // No corregir transacciones ya anuladas
        if ((int) $transaccion->id_TipoEstado === 7) {
            return response()->json(['message' => 'No se puede corregir una transacción anulada.'], 422);
        }

        $data = $request->validate([
            'nombre' => ['required', 'string', 'max:255'],
            'descripcion' => ['nullable', 'string'],
            'fecha' => ['required', 'date'],
            'nro_comprobante' => ['nullable', 'string', 'max:50'],
            'id_TipoComprobante' => ['nullable', 'integer'],
            'id_persona' => ['nullable', 'integer'],
        ]);

        $transaccion->update([
            'nombre' => $data['nombre'],
            'descripcion' => $data['descripcion'] ?? null,
            'fecha' => $data['fecha'],
            'nro_comprobante' => $data['nro_comprobante'] ?? null,
            'id_TipoComprobante' => $data['id_TipoComprobante'] ?? null,
            'id_persona' => $data['id_persona'] ?? null,
            'UrevUsuario' => Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Transacción corregida correctamente.',
            'transaccion' => $transaccion->load(['tipoComprobante', 'persona']),
        ], 200);
    }

    /**
     * Devuelve la dirección de movimiento de una transacción:
     * - Compra  (1): entrada
     * - Venta   (2): salida
     * - Ajuste  (3): según estado (5=Positivo→entrada, 6=Negativo→salida)
     */
    private function direccionMovimiento(Transacciones $transaccion): string
    {
        $tipoMovimiento = (int) $transaccion->id_TipoMovimiento;

        if ($tipoMovimiento === 2) {
            return 'salida';   // Venta
        }

        if ($tipoMovimiento === 3) {
            return (int) $transaccion->id_TipoEstado === 6 ? 'salida' : 'entrada'; // Ajuste
        }

        return 'entrada';      // Compra (y fallback)
    }

    /**
     * Operación inversa: si la original fue entrada → salida, y viceversa.
     */
    private function direccionInversa(Transacciones $transaccion): string
    {
        return $this->direccionMovimiento($transaccion) === 'entrada' ? 'salida' : 'entrada';
    }

    /**
     * Indica si la transacción (compra o venta) se paga a crédito o en cuotas.
     */
    private function esCreditoCuotas(Transacciones $transaccion): bool
    {
        if (! in_array((int) $transaccion->id_TipoMovimiento, [1, 2], true)) {
            return false;
        }

        $tipoPago = TipoPago::find($transaccion->id_TipoPago);
        if (! $tipoPago) {
            return false;
        }

        $nombre = mb_strtolower(trim($tipoPago->nombre ?? ''));

        return in_array($nombre, ['crédito', 'credito', 'cuotas'], true);
    }

    /**
     * Extrae el array de cuotas desde el request (puede venir como array o JSON string).
     * Devuelve null cuando no se enviaron cuotas.
     */
    private function extraerCuotas(Request $request): ?array
    {
        $raw = $request->input('cuotas');

        if ($raw === null || $raw === '') {
            return null;
        }

        if (is_array($raw)) {
            return $raw;
        }

        $decoded = json_decode((string) $raw, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Reemplaza las cuotas de una transacción por las recibidas en el request.
     * Solo actúa cuando la transacción es una venta a crédito/cuotas.
     */
    private function sincronizarCuotas(Transacciones $transaccion, Request $request): void
    {
        if (! $this->esCreditoCuotas($transaccion)) {
            return;
        }

        $cuotas = $this->extraerCuotas($request);
        if ($cuotas === null) {
            return;
        }

        $montoTotal = (float) $transaccion->monto;

        $normalizadas = [];
        $suma = 0.0;
        foreach ($cuotas as $index => $cuota) {
            $numero = (int) ($cuota['numero'] ?? ($index + 1));
            $monto = (float) ($cuota['monto'] ?? 0);
            $fecha = $cuota['fecha_vencimiento'] ?? null;

            if ($monto <= 0 || ! $fecha) {
                throw new \InvalidArgumentException("La cuota #{$numero} debe tener un monto mayor a 0 y una fecha de vencimiento.");
            }

            $suma += $monto;
            $normalizadas[] = compact('numero', 'monto', 'fecha');
        }

        if (count($normalizadas) === 0) {
            return;
        }

        // Tolerancia de redondeo (centavos)
        if (abs($suma - $montoTotal) > 0.5) {
            throw new \InvalidArgumentException('La suma de las cuotas no coincide con el monto total de la transacción.');
        }

        $idPendiente = (int) (TipoEstado::where('descripcion', 'Pendiente')->value('id') ?? 4);

        Cuota::where('id_transaccion', $transaccion->id)->delete();

        foreach ($normalizadas as $cuota) {
            Cuota::create([
                'id_transaccion' => $transaccion->id,
                'numero' => $cuota['numero'],
                'monto' => $cuota['monto'],
                'fecha_vencimiento' => $cuota['fecha'],
                'id_TipoEstado' => $idPendiente,
                'UrevUsuario' => Auth::user()->name,
                'UrevFechaHora' => now(),
            ]);
        }
    }
}
