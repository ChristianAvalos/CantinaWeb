<?php

namespace App\Http\Controllers;

use DateTime;
use Illuminate\Http\Request;
use App\Enums\EstadoTransaccion;
use App\Models\Transacciones;
use App\Models\TransaccionesDetalle;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;
use App\Http\Controllers\Concerns\AplicaFiltrosDinamicos;
use App\Http\Requests\CreateTransaccionRequest;
use App\Http\Requests\UpdateTransaccionRequest;
use App\Services\InventarioService;
use App\Services\Comprobante\DocumentoFiscalService;
use App\Services\NumeracionComprobanteService;
use App\Models\DatosFacturacion;
use App\Models\Producto;
use App\Models\Sucursal;
use App\Models\TipoMovimientos;
use App\Models\TipoPago;
use App\Models\TipoComprobante;
use App\Models\TipoEstado;
use App\Models\Comprobante;
use App\Models\Cuota;
use Illuminate\Validation\Rule;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

class TransaccionesController extends Controller
{
    use PerteneceAOrganizacion;
    use AplicaFiltrosDinamicos;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
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
            'motivoAjuste',
            'tipoPago',
            'tipoComprobante',
            'tipoMoneda',
            'banco',
            'formaPago',
            'organizacion',
            'sucursal',
            'comprobante:id,id_transaccion',
            'cuotas',
            'caja'
        ]);
        // Aislamiento por organización; el Administrador de Sistema ve todos.
        $transacciones->when(! $this->esAdminSistema(), function ($q) {
            $q->where('id_organizacion', $this->organizacionDelUsuario());

            if ($sucursal = $this->sucursalDelUsuario()) {
                $q->where('id_sucursal', $sucursal);
            }
        });

        $transacciones = $transacciones->when($search, function ($q, $search) use ($searchFecha) {
                $q->where(function ($s) use ($search, $searchFecha) {
                    $s->where('descripcion', 'ilike', '%' . $search . '%')
                        ->orWhere('monto', 'ilike', '%' . $search . '%')
                        ->orWhereHas('persona', function ($q2) use ($search) {
                            $q2->where('nombre', 'ilike', '%' . $search . '%');
                        })
                        ->orWhereHas('tipoMovimiento', function ($q3) use ($search) {
                            $q3->where('nombre', 'ilike', '%' . $search . '%');
                        })
                        ->orWhereHas('motivoAjuste', function ($q4) use ($search) {
                            $q4->where('nombre', 'ilike', '%' . $search . '%');
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

        // El Administrador de Sistema puede elegir la organización destino; el
        // resto siempre crea en la suya.
        $idOrganizacion = $this->esAdminSistema()
            ? ($data['id_organizacion'] ?? $this->organizacionDelUsuario())
            : $this->organizacionDelUsuario();
        // Sucursal: la elegida (validada contra la organización destino) o, para
        // un usuario acotado, la suya; si no, la principal de esa organización.
        $idSucursal = $data['id_sucursal']
            ?? (! $this->esAdminSistema() ? $this->sucursalDelUsuario() : null)
            ?? Sucursal::where('id_organizacion', $idOrganizacion)->orderByDesc('es_principal')->value('id')
            ?? Sucursal::principalDeOCrear((int) $idOrganizacion)->id;

        $transaccion = Transacciones::create([
            'descripcion' => $data['descripcion'] ?? null,
            'fecha' => $data['fecha'],
            'lote' => $data['lote'] ?? null,
            'id_organizacion' => $idOrganizacion,
            'id_sucursal' => $idSucursal,
            'id_persona' => $data['id_persona'] ?? null,
            'id_TipoEstado' => EstadoTransaccion::ACTIVO, // nace "parqueada": sin efecto en stock
            'id_MotivoAjuste' => $data['id_MotivoAjuste'] ?? null,
            'direccion' => ((int) $data['id_TipoMovimiento'] === 3) ? ($data['direccion'] ?? null) : null,
            'id_TipoComprobante' => $data['id_TipoComprobante'] ?? null,
            'nro_comprobante' => $data['nro_comprobante'] ?? null,
            'id_TipoPago' => $data['id_TipoPago'] ?? null,
            'id_FormaPago' => $data['id_FormaPago'] ?? null,
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
        $esAdmin = $this->esAdminSistema();
        // Un vendedor no elige sucursal: se fuerza la suya (o la principal).
        $puedeElegirSucursal = $this->puedeElegirSucursal();
        $idSucursalUsuario = $this->sucursalDelUsuario();
        // El Administrador de Sistema elige la organización destino; el resto
        // vende siempre dentro de la suya.
        $idOrganizacionDestino = $esAdmin
            ? ($request->input('id_organizacion') ?? $this->organizacionDelUsuario())
            : $this->organizacionDelUsuario();

        // Comprobante del POS: Ticket (por defecto) o Factura. Boleta y notas no
        // se emiten desde acá.
        $tipoComprobante = $request->input('id_TipoComprobante')
            ? TipoComprobante::find($request->input('id_TipoComprobante'))
            : TipoComprobante::whereRaw('LOWER(nombre) = ?', ['ticket'])->first();

        if (! $tipoComprobante || ! in_array(mb_strtolower(trim($tipoComprobante->nombre)), ['ticket', 'factura'], true)) {
            return response()->json([
                'errors' => ['id_TipoComprobante' => ['El comprobante del POS debe ser Ticket o Factura.']],
            ], 422);
        }

        $esFactura = mb_strtolower(trim($tipoComprobante->nombre)) === 'factura';

        // Una Factura sin timbrado vigente no es un documento válido.
        if ($esFactura) {
            $datosFiscales = DatosFacturacion::activoDe((int) $idOrganizacionDestino);

            if (! $datosFiscales || ! $datosFiscales->timbradoVigente()) {
                return response()->json([
                    'errors' => ['id_TipoComprobante' => ['La organización no tiene un timbrado vigente: no se puede emitir Factura.']],
                ], 422);
            }
        }

        $data = $request->validate([
            'descripcion' => 'nullable|string|max:1000',
            'fecha' => 'required|date',
            'id_organizacion' => [
                'required',
                'exists:organizacion,id',
                function ($attribute, $value, $fail) use ($esAdmin) {
                    if (! $esAdmin && (int) $value !== (int) $this->organizacionDelUsuario()) {
                        $fail('Solo podés vender dentro de tu propia organización.');
                    }
                },
            ],
            // Con más de una sucursal en la organización destino, elegir una es
            // obligatorio; y debe pertenecer a esa organización y, si el usuario
            // tiene una asignada, ser la suya.
            'id_sucursal' => [
                Rule::requiredIf(fn () => ! $idSucursalUsuario
                    && Sucursal::where('id_organizacion', $idOrganizacionDestino)->count() > 1),
                'nullable',
                'exists:sucursales,id',
                function ($attribute, $value, $fail) use ($puedeElegirSucursal, $idOrganizacionDestino, $idSucursalUsuario) {
                    if ($value === null) {
                        return;
                    }
                    if (! $puedeElegirSucursal && $idSucursalUsuario && (int) $value !== (int) $idSucursalUsuario) {
                        $fail('La sucursal seleccionada no es la tuya.');
                        return;
                    }
                    if (! Sucursal::where('id', $value)->where('id_organizacion', $idOrganizacionDestino)->exists()) {
                        $fail('La sucursal seleccionada no pertenece a la organización.');
                    }
                },
            ],
            // En Factura el cliente es obligatorio (documento fiscal). En Ticket
            // puede ser Consumidor Final.
            'id_persona' => [
                $esFactura ? 'required' : 'nullable',
                'exists:personas,id',
                function ($attribute, $value, $fail) use ($idOrganizacionDestino) {
                    if ($value === null) {
                        return;
                    }
                    if (! \App\Models\Persona::where('id', $value)
                        ->where('id_organizacion', $idOrganizacionDestino)->exists()) {
                        $fail('El cliente seleccionado no pertenece a la organización.');
                    }
                },
            ],
            'id_TipoComprobante' => 'nullable|exists:tipo_comprobantes,id',
            'id_TipoPago' => 'required|exists:tipo_pagos,id',
            'id_FormaPago' => 'required|exists:forma_pagos,id',
            'monto_recibido' => 'nullable|numeric',
            'vuelto' => 'nullable|numeric',
            'iva' => 'nullable|numeric',
            'detalles' => 'required|array|min:1',
            'detalles.*.codigo_barras' => 'required|string',
            'detalles.*.cantidad' => 'required|numeric|min:0.0001',
            'detalles.*.precio_unitario' => 'required|numeric|min:0',
        ], [
            'id_persona.required' => 'Para emitir Factura debe seleccionar el cliente.',
            'id_persona.exists' => 'El cliente seleccionado no existe.',
        ]);

        try {
            // La organización la elige el Administrador de Sistema; el resto usa
            // la suya, con su sucursal (o la principal de la organización).
            $idOrganizacion = $idOrganizacionDestino;
            $idSucursal = $data['id_sucursal']
                ?? ((! $puedeElegirSucursal && $idSucursalUsuario) ? (int) $idSucursalUsuario : null)
                ?? Sucursal::principalDeOCrear((int) $idOrganizacion)->id;

            $venta = DB::transaction(function () use ($data, $tipoComprobante, $esFactura, $idOrganizacion, $idSucursal) {
                // La Factura toma su número del secuencial autorizado (EEE-PPP-NNNNNNN)
                // DENTRO de la transacción: si la venta falla, el número se revierte.
                $nroComprobante = $esFactura
                    ? NumeracionComprobanteService::siguiente((int) $idOrganizacion, (int) $idSucursal, (int) $tipoComprobante->id)
                    : null;

                // 1) Cabecera (Venta = movimiento 2, Finalizado = estado 3)
                $cabecera = Transacciones::create([
                    'descripcion' => $data['descripcion'] ?? null,
                    'fecha' => $data['fecha'],
                    'id_organizacion' => $idOrganizacion,
                    'id_sucursal' => $idSucursal,
                    'id_persona' => $data['id_persona'] ?? null,
                    'id_TipoEstado' => EstadoTransaccion::FINALIZADO,
                    'id_TipoMovimiento' => 2,        // Venta
                    'id_TipoPago' => $data['id_TipoPago'],
                    'id_FormaPago' => $data['id_FormaPago'],
                    'id_TipoComprobante' => $tipoComprobante->id,
                    'nro_comprobante' => $nroComprobante,
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
                    $producto = Producto::where('codigo_barras', $detalle['codigo_barras'])
                        ->where('id_organizacion', $idOrganizacion)
                        ->first();
                    if (!$producto) {
                        throw new \Exception("Producto no encontrado (código: {$detalle['codigo_barras']})");
                    }

                    $cantidad = (float) $detalle['cantidad'];
                    $precioUnitario = (float) $detalle['precio_unitario'];
                    $subtotal = $cantidad * $precioUnitario;
                    $stockActual = InventarioService::stockEnSucursal($producto->id, $idSucursal);

                    // Validar stock (venta = salida)
                    if ($stockActual < $cantidad) {
                        throw new \Exception(
                            "Stock insuficiente para {$producto->nombre} (disponible: {$stockActual}, requerido: {$cantidad})"
                        );
                    }

                    // IVA de la línea: el POS cobra con IVA incluido y usa 10% por
                    // defecto. Queda grabado para que la factura sea reproducible.
                    $ivaLinea = \App\Services\IvaService::desglosar($subtotal, \App\Services\IvaService::TIPO_10);

                    $detalleCreado = TransaccionesDetalle::create([
                        'id_transaccion' => $cabecera->id,
                        'id_producto' => $producto->id,
                        'cantidad' => $cantidad,
                        'precio_unitario' => $precioUnitario,
                        'subtotal' => $subtotal,
                        'tipo_iva' => $ivaLinea['tipo_iva'],
                        'monto_iva' => $ivaLinea['monto_iva'],
                        'UrevUsuario' => Auth::user()->name,
                        'UrevFechaHora' => now(),
                    ]);

                    // Toda salida de stock pasa por el kardex.
                    InventarioService::registrarDocumento(
                        $cabecera,
                        $producto->id,
                        $cantidad,
                        TipoMovimientos::DIRECCION_SALIDA,
                        [
                            'id_transaccion_detalle' => $detalleCreado->id,
                            'costo_unitario' => $precioUnitario,
                        ]
                    );

                    $montoTotal += $subtotal;
                }

                // 3) Recalcular el monto de la cabecera. El Ticket se identifica
                //    con el número de transacción; la Factura ya trae su secuencial.
                $cabecera->update([
                    'monto' => $montoTotal,
                    'nro_comprobante' => $esFactura ? $nroComprobante : (string) $cabecera->id,
                    'UrevUsuario' => Auth::user()->name,
                    'UrevFechaHora' => now(),
                ]);

                // 4) Guardar el snapshot del comprobante impreso. Se guarda una copia
                //    fiel de lo que se va a imprimir, para que al reimprimir desde la
                //    tabla Ventas se muestre SIEMPRE lo mismo (aunque los productos,
                //    clientes u organización cambien después).
                $this->registrarComprobante($cabecera);

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
     * "Posteo" del documento: aplica al kardex todos los detalles de una
     * transacción parqueada. Es el único punto (junto a la venta POS) que mueve
     * stock por un documento.
     *
     * Idempotente: si el documento ya está posteado no hace nada, y bloquea la
     * cabecera para que dos finalizaciones simultáneas no muevan stock dos veces.
     *
     * @throws \InvalidArgumentException|\RuntimeException
     */
    private function aplicarKardex(Transacciones $transaccion): void
    {
        // Bloqueo de la cabecera: serializa posteos concurrentes del mismo documento.
        $transaccion = Transacciones::whereKey($transaccion->id)->lockForUpdate()->first();

        if (! $transaccion) {
            return;
        }

        // Idempotencia: si el documento YA tiene movimientos en el kardex, no se
        // vuelve a aplicar (cubre finalizados previos y datos heredados del modelo
        // anterior, que movían stock al cargar el detalle).
        // OJO: acá NO se puede usar estaPosteada(): este método se invoca DESPUÉS de
        // persistir el estado final, por lo que el estado ya es "posteado". El guard
        // de "no editar posteadas" vive en el caller.
        if ($transaccion->movimientosHistorial()->exists()) {
            return;
        }

        $direccion = $transaccion->direccionStock();
        // Motivo (solo ajustes): explica el movimiento en el kardex. En compras/ventas es null.
        $motivo = $transaccion->motivoAjuste?->nombre;
        $detalles = TransaccionesDetalle::where('id_transaccion', $transaccion->id)->get();

        foreach ($detalles as $detalle) {
            InventarioService::registrarDocumento(
                $transaccion,
                $detalle->id_producto,
                (float) $detalle->cantidad,
                $direccion,
                [
                    'id_transaccion_detalle' => $detalle->id,
                    'costo_unitario' => $detalle->precio_unitario,
                    'fecha' => $transaccion->fecha,
                    'motivo' => $motivo,
                ]
            );
        }
    }

    /**
     * Construye el snapshot estructurado del comprobante de una transacción.
     * Centraliza los datos tal cual se imprimen (empresa, cliente, ítems, montos).
     */
    /**
     * Guarda el comprobante de un documento usando el documento fiscal canónico
     * y el emisor configurado. Es idempotente: si ya existe, no lo duplica.
     */
    private function registrarComprobante(Transacciones $transaccion): void
    {
        if ($transaccion->comprobante()->exists()) {
            return;
        }

        $documento = DocumentoFiscalService::construir($transaccion);

        // El emisor se elige POR ORGANIZACIÓN (SaaS). Si está deshabilitado no se
        // emite, pero el documento igual queda guardado como snapshot.
        $datosFiscales = DatosFacturacion::activoDe((int) $transaccion->id_organizacion);
        $emisor = \App\Services\Comprobante\EmisorComprobanteService::resolver($datosFiscales);
        $resultado = $emisor->habilitado()
            ? $emisor->emitir($documento, $transaccion)
            : ['estado' => 'pendiente', 'referencia' => null];

        $documento['emision'] = [
            'emisor' => $emisor->nombre(),
            'estado' => $resultado['estado'] ?? 'impreso',
            'referencia' => $resultado['referencia'] ?? null,
        ];

        Comprobante::create([
            'id_transaccion' => $transaccion->id,
            'id_organizacion' => $transaccion->id_organizacion,
            'datos' => $documento,
            'id_usuario' => Auth::id(),
            'UrevUsuario' => Auth::user()?->name,
            'UrevFechaHora' => now(),
        ]);
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

        if (! $this->enAlcance($transaccion, true)) {
            return response()->json(['message' => 'La venta no pertenece a tu organización o sucursal.'], 403);
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

        if (! $this->enAlcance($transaccion, true)) {
            return response()->json(['message' => 'La transacción no pertenece a tu organización o sucursal.'], 403);
        }

        // No permitir editar una transacción ya posteada ni anulada.
        // Las correcciones de cabecera se hacen con /corregir y las reversiones con /anular.
        if ($transaccion->esAnulada()) {
            return response()->json(['message' => 'No se puede editar una transacción anulada.'], 422);
        }
        if ($transaccion->estaPosteada()) {
            return response()->json([
                'message' => 'No se puede editar una transacción finalizada. Usá "Corregir datos" para la cabecera o "Anular" para revertirla.'
            ], 422);
        }

        $detalleQuery = TransaccionesDetalle::where('id_transaccion', $transaccion->id);
        $tieneDetalles = $detalleQuery->exists();
        $montoDetalles = (float) $detalleQuery->sum('subtotal');
        $montoNormalizado = $tieneDetalles ? $montoDetalles : (float) ($data['monto'] ?? 0);

        $idTipoMovimiento = (int) ($data['id_TipoMovimiento'] ?? $transaccion->id_TipoMovimiento);
        $finalizar = (bool) $request->input('finalizar', false);

        // Comprobante elegido para una VENTA. En ventas el número es SIEMPRE
        // automático: no se acepta uno cargado a mano. La Factura exige timbrado
        // vigente y cliente; el Ticket no necesita timbrado.
        $esVenta = $idTipoMovimiento === 2;
        $tipoComprobanteVenta = null;
        $esFacturaVenta = false;
        $nombreComprobanteVenta = '';
        if ($esVenta && ! empty($data['id_TipoComprobante'])) {
            $tipoComprobanteVenta = TipoComprobante::find($data['id_TipoComprobante']);
            $nombreComprobanteVenta = mb_strtolower(trim((string) ($tipoComprobanteVenta->nombre ?? '')));
            $esFacturaVenta = $nombreComprobanteVenta === 'factura';

            if (! in_array($nombreComprobanteVenta, ['factura', 'ticket'], true)) {
                return response()->json([
                    'errors' => ['id_TipoComprobante' => ['En ventas solo se emite Factura o Ticket.']],
                ], 422);
            }

            if ($esFacturaVenta) {
                $datosFiscales = DatosFacturacion::activoDe((int) $transaccion->id_organizacion);
                if (! $datosFiscales || ! $datosFiscales->timbradoVigente()) {
                    return response()->json([
                        'errors' => ['id_TipoComprobante' => ['La organización no tiene un timbrado vigente: no se puede emitir Factura.']],
                    ], 422);
                }

                // La factura es un documento fiscal: lleva el cliente.
                if (empty($data['id_persona'])) {
                    return response()->json([
                        'errors' => ['id_persona' => ['Para emitir Factura debe seleccionar el cliente.']],
                    ], 422);
                }
            }
        }

        // Finalizar = "postear": el documento deja de ser borrador y recién ahí se
        // aplica el kardex. El estado final depende del tipo de documento:
        //   - Compra/Venta → Finalizado (3)
        //   - Ajuste       → Positivo (5, entrada) o Negativo (6, salida)
        if ($finalizar) {
            if ($idTipoMovimiento === 3) {
                $idTipoEstado = ($data['direccion'] ?? null) === TipoMovimientos::DIRECCION_SALIDA
                    ? EstadoTransaccion::NEGATIVO
                    : EstadoTransaccion::POSITIVO;
            } else {
                $idTipoEstado = EstadoTransaccion::FINALIZADO;
            }

            // No se puede postear un documento sin ítems.
            if (! $tieneDetalles) {
                return response()->json(['message' => 'No se puede finalizar una transacción sin detalles.'], 422);
            }
        } else {
            // Sin finalizar NO se cambia el estado: un borrador sigue siendo borrador.
            // OJO con ajustes: el "Tipo de ajuste" (Positivo=5 / Negativo=6) solo define
            // la DIRECCIÓN y se aplica recién al finalizar. Si se persistiera ahora, el
            // documento quedaría marcado como posteado (5/6) y bloquearía el detalle.
            $idTipoEstado = $transaccion->id_TipoEstado?->value ?? $transaccion->id_TipoEstado;
        }

        try {
            DB::transaction(function () use ($transaccion, $data, $montoNormalizado, $idTipoEstado, $idTipoMovimiento, $request, $finalizar, $esVenta, $esFacturaVenta, $tipoComprobanteVenta) {
                // En VENTAS el número se asigna automáticamente una sola vez
                // (no se toma el que venga del formulario). Compras y ajustes
                // conservan el número que se carga a mano.
                $nroComprobante = $esVenta
                    ? $transaccion->nro_comprobante
                    : ($data['nro_comprobante'] ?? null);

                if ($esVenta && $finalizar && $tipoComprobanteVenta && ! $nroComprobante) {
                    $datosFiscalesVenta = DatosFacturacion::activoDe((int) $transaccion->id_organizacion);

                    if ($datosFiscalesVenta) {
                        // Secuencial autorizado (EEE-PPP-NNNNNNN) por tipo.
                        $nroComprobante = NumeracionComprobanteService::siguiente(
                            (int) $transaccion->id_organizacion,
                            (int) ($data['id_sucursal'] ?? $transaccion->id_sucursal),
                            (int) $tipoComprobanteVenta->id
                        );
                    } elseif (! $esFacturaVenta) {
                        // Ticket sin datos fiscales: se identifica con la transacción,
                        // igual que el POS.
                        $nroComprobante = (string) $transaccion->id;
                    }
                }

                $transaccion->update([
                    'descripcion' => $data['descripcion'] ?? null,
                    'fecha' => $data['fecha'],
                    'lote' => $data['lote'] ?? null,
                    'id_persona' => $data['id_persona'] ?? null,
                    'id_TipoEstado' => $idTipoEstado,
                    'id_sucursal' => (! $this->puedeElegirSucursal() && $this->sucursalDelUsuario())
                        ? $this->sucursalDelUsuario()
                        : ($data['id_sucursal'] ?? $transaccion->id_sucursal),
                    'id_MotivoAjuste' => $data['id_MotivoAjuste'] ?? null,
                    'direccion' => ($idTipoMovimiento === 3) ? ($data['direccion'] ?? null) : null,
                    'id_TipoComprobante' => $data['id_TipoComprobante'] ?? null,
                    'nro_comprobante' => $nroComprobante,
                    'id_TipoPago' => $data['id_TipoPago'] ?? null,
                    'id_FormaPago' => $data['id_FormaPago'] ?? null,
                    'id_TipoMoneda' => $data['id_TipoMoneda'] ?? null,
                    'id_Caja' => $data['id_Caja'] ?? null,
                    'id_Banco' => $data['id_Banco'] ?? null,
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

                // Posteo: recién acá se mueve stock. Se refresca la cabecera para que
                // direccionStock() lea la dirección ya persistida (ajustes: columna
                // `direccion`; compras/ventas: tipo de movimiento).
                if ($finalizar) {
                    $transaccion->refresh();
                    $this->aplicarKardex($transaccion);

                    // La Factura se emite al finalizar (queda imprimible/reimprimible).
                    // El Ticket sigue saliendo solo por el POS.
                    if ($esFacturaVenta) {
                        $this->registrarComprobante($transaccion);
                    }
                }
            });
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($transaccion->load('tipoPago'), 200);
    }

    /**
     * Resumen del panel: totales del mes consultado y serie de los últimos 6
     * meses comparando ventas contra compras.
     *
     * Compra = salida de dinero (egreso) y Venta = entrada (ingreso), por lo
     * que el saldo del mes es `ventas - compras`.
     *
     * Solo se consideran documentos POSTEADOS: los borradores (Activo) y las
     * anuladas todavía no impactaron la caja ni el inventario.
     */
    public function Grafico(Request $request)
    {
        $esAdminSistema = $this->esAdminSistema();
        $idOrganizacion = $this->organizacionDelUsuario();
        $idSucursal = $this->sucursalDelUsuario();

        $estadosPosteados = [
            EstadoTransaccion::FINALIZADO->value,
            EstadoTransaccion::POSITIVO->value,
            EstadoTransaccion::NEGATIVO->value,
        ];

        // Query base ya acotada a la organización (y sucursal) del usuario.
        $base = function () use ($esAdminSistema, $idOrganizacion, $idSucursal) {
            $query = Transacciones::query();

            if ($esAdminSistema) {
                return $query;
            }

            $query->where('transacciones.id_organizacion', $idOrganizacion);

            if (! empty($idSucursal)) {
                $query->where('transacciones.id_sucursal', $idSucursal);
            }

            return $query;
        };

        $mes = $request->input('mes');
        $mes = preg_match('/^\d{4}-\d{2}$/', (string) $mes) ? $mes : now()->format('Y-m');
        [$anio, $mesNumero] = array_map('intval', explode('-', $mes));

        $totalDelMes = function ($idTipoMovimiento) use ($base, $anio, $mesNumero, $estadosPosteados) {
            return (float) $base()
                ->whereIn('transacciones.id_TipoEstado', $estadosPosteados)
                ->where('transacciones.id_TipoMovimiento', $idTipoMovimiento)
                ->whereYear('transacciones.fecha', $anio)
                ->whereMonth('transacciones.fecha', $mesNumero)
                ->sum('transacciones.monto');
        };

        $ventasMes = $totalDelMes(TipoMovimientos::DOCUMENTO_VENTA);
        $comprasMes = $totalDelMes(TipoMovimientos::DOCUMENTO_COMPRA);
        $ajustesMes = $totalDelMes(TipoMovimientos::DOCUMENTO_AJUSTE);

        // Serie de los últimos 6 meses (incluido el consultado) en una consulta.
        $inicioSerie = Carbon::createFromDate($anio, $mesNumero, 1)->subMonths(5)->startOfMonth();
        $finSerie = Carbon::createFromDate($anio, $mesNumero, 1)->endOfMonth();

        $acumulados = $base()
            ->select(
                DB::raw("to_char(transacciones.fecha, 'YYYY-MM') as periodo"),
                'transacciones.id_TipoMovimiento as id_tipo_movimiento',
                DB::raw('SUM(transacciones.monto) as monto')
            )
            ->whereIn('transacciones.id_TipoEstado', $estadosPosteados)
            ->whereIn('transacciones.id_TipoMovimiento', [
                TipoMovimientos::DOCUMENTO_COMPRA,
                TipoMovimientos::DOCUMENTO_VENTA,
            ])
            ->whereBetween('transacciones.fecha', [$inicioSerie->toDateString(), $finSerie->toDateString()])
            ->groupBy('periodo', 'transacciones.id_TipoMovimiento')
            ->get()
            ->keyBy(fn ($fila) => $fila->periodo.'-'.(int) $fila->id_tipo_movimiento);

        $serie = [];
        foreach (range(0, 5) as $indice) {
            $fechaMes = $inicioSerie->copy()->addMonths($indice);
            $periodo = $fechaMes->format('Y-m');

            $serie[] = [
                'mes'     => $periodo,
                'label'   => $fechaMes->translatedFormat('M Y'),
                'ventas'  => (float) ($acumulados->get($periodo.'-'.TipoMovimientos::DOCUMENTO_VENTA)->monto ?? 0),
                'compras' => (float) ($acumulados->get($periodo.'-'.TipoMovimientos::DOCUMENTO_COMPRA)->monto ?? 0),
            ];
        }

        // Cuotas pendientes: por cobrar (ventas a crédito) y por pagar (compras
        // a crédito). Se separan por tipo de documento de la transacción.
        $idEstadoPendiente = TipoEstado::where('descripcion', 'Pendiente')->value('id');

        $cuotasPendientes = function ($idTipoMovimiento) use ($base, $idEstadoPendiente) {
            if (! $idEstadoPendiente) {
                return ['cantidad' => 0, 'monto' => 0.0];
            }

            $query = $base()
                ->join('cuotas', 'cuotas.id_transaccion', '=', 'transacciones.id')
                ->where('cuotas.id_TipoEstado', $idEstadoPendiente)
                ->where('transacciones.id_TipoMovimiento', $idTipoMovimiento);

            return [
                'cantidad' => (clone $query)->count(),
                'monto'    => (float) (clone $query)->sum('cuotas.monto'),
            ];
        };

        $cobranzas = $cuotasPendientes(TipoMovimientos::DOCUMENTO_VENTA);
        $pagos = $cuotasPendientes(TipoMovimientos::DOCUMENTO_COMPRA);

        return response()->json([
            'mes'                      => $mes,
            'ventasMes'                => $ventasMes,
            'comprasMes'               => $comprasMes,
            'ajustesMes'               => $ajustesMes,
            'saldoMes'                 => $ventasMes - $comprasMes,
            'cobranzasPendientes'      => $cobranzas['cantidad'],
            'cobranzasPendientesMonto' => $cobranzas['monto'],
            'pagosPendientes'          => $pagos['cantidad'],
            'pagosPendientesMonto'     => $pagos['monto'],
            'serie'                    => $serie,
        ]);
    }


    /**
     * Anula una transacción (estilo SAP):
     * si el documento ya fue posteado (Finalizado/Positivo/Negativo) revierte el
     * stock de sus detalles; si todavía era un borrador (Activo) solo lo marca
     * como Anulada, ya que nunca movió inventario.
     * No se borra físicamente el registro para conservar la trazabilidad.
     */
    /**
     * Emite una Nota de Crédito cuando la venta anulada tiene una Factura emitida.
     *
     * La factura NO se borra ni se modifica: la NC la referencia y revierte sus
     * montos. Si la venta no fue facturada (ticket), no se emite nada y la
     * anulación sigue funcionando como siempre.
     */
    private function emitirNotaCreditoSiCorresponde(Transacciones $transaccion, $detalles): ?Transacciones
    {
        // Solo ventas con Factura ya emitida (número asignado).
        if ((int) $transaccion->id_TipoMovimiento !== 2 || ! $transaccion->nro_comprobante) {
            return null;
        }

        $tipoOrigen = $transaccion->tipoComprobante;
        if (! $tipoOrigen || mb_strtolower(trim($tipoOrigen->nombre)) !== 'factura') {
            return null;
        }

        $tipoNotaCredito = TipoComprobante::whereRaw('LOWER(nombre) = ?', ['nota de crédito'])->first();
        if (! $tipoNotaCredito) {
            return null;
        }

        $numero = NumeracionComprobanteService::siguiente(
            (int) $transaccion->id_organizacion,
            (int) $transaccion->id_sucursal,
            (int) $tipoNotaCredito->id
        );

        $nota = Transacciones::create([
            'descripcion' => 'Nota de Crédito de la Factura Nº ' . $transaccion->nro_comprobante,
            'fecha' => now()->toDateString(),
            'id_organizacion' => $transaccion->id_organizacion,
            'id_sucursal' => $transaccion->id_sucursal,
            'id_persona' => $transaccion->id_persona,
            'id_TipoEstado' => EstadoTransaccion::FINALIZADO,
            'id_TipoMovimiento' => 2,                 // se mantiene dentro de ventas
            'id_TipoComprobante' => $tipoNotaCredito->id,
            'id_transaccion_origen' => $transaccion->id,
            'id_TipoPago' => $transaccion->id_TipoPago,
            'id_FormaPago' => $transaccion->id_FormaPago,
            'nro_comprobante' => $numero,
            'monto' => -1 * (float) $transaccion->monto,
            'iva' => -1 * (float) ($transaccion->iva ?? 0),
            'id_usuario' => Auth::id(),
            'UrevUsuario' => Auth::user()?->name,
            'UrevFechaHora' => now(),
        ]);

        // Detalles en negativo para que las cantidades y el IVA también reviertan.
        // NO se registra kardex: el stock ya lo revirtió la anulación.
        foreach ($detalles as $detalle) {
            TransaccionesDetalle::create([
                'id_transaccion' => $nota->id,
                'id_producto' => $detalle->id_producto,
                'cantidad' => -1 * (float) $detalle->cantidad,
                'precio_unitario' => $detalle->precio_unitario,
                'subtotal' => -1 * (float) $detalle->subtotal,
                'tipo_iva' => $detalle->tipo_iva,
                'monto_iva' => -1 * (float) $detalle->monto_iva,
                'lote' => $detalle->lote,
                'fecha_vencimiento' => $detalle->fecha_vencimiento,
                'UrevUsuario' => Auth::user()?->name,
                'UrevFechaHora' => now(),
            ]);
        }

        $this->registrarComprobante($nota);

        return $nota;
    }

    public function AnularTransaccion($id)
    {
        $transaccion = Transacciones::findOrFail($id);

        if (! $this->enAlcance($transaccion, true)) {
            return response()->json(['message' => 'La transacción no pertenece a tu organización o sucursal.'], 403);
        }

        // Evitar anular dos veces la misma transacción
        if ($transaccion->esAnulada()) {
            return response()->json(['message' => 'La transacción ya está anulada.'], 422);
        }

        // Si nunca se posteó (sigue siendo borrador), no movió stock: no hay nada
        // que revertir, solo se marca como Anulada.
        $fuePosteada = $transaccion->estaPosteada();

        // 1) Validar stock disponible antes de revertir
        $detalles = TransaccionesDetalle::with('producto')->where('id_transaccion', $transaccion->id)->get();
        $operacionInversa = $transaccion->direccionStockInversa();

        // Si la reversión va a QUITAR stock (compra o ajuste positivo),
        // verificar que el stock actual alcance (que no se haya vendido/consumido ya).
        if ($fuePosteada && $operacionInversa === TipoMovimientos::DIRECCION_SALIDA) {
            $sinStock = [];
            foreach ($detalles as $detalle) {
                $stockActual = InventarioService::stockEnSucursal($detalle->id_producto, $transaccion->id_sucursal);
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

        // 2) Revertir el stock de cada detalle, solo si el documento fue posteado
        //    (un borrador nunca movió stock). Cada reversa queda enlazada en el
        //    kardex con el movimiento que revierte.
        $notaCredito = null;

        try {
            DB::transaction(function () use ($transaccion, $detalles, $operacionInversa, $fuePosteada, &$notaCredito) {
                if ($fuePosteada) {
                    foreach ($detalles as $detalle) {
                        InventarioService::registrarDocumento(
                            $transaccion,
                            $detalle->id_producto,
                            (float) $detalle->cantidad,
                            $operacionInversa,
                            [
                                'id_transaccion_detalle' => $detalle->id,
                                'costo_unitario' => $detalle->precio_unitario,
                                'motivo' => 'Anulación de la transacción #' . $transaccion->id,
                                'id_movimiento_origen' => InventarioService::buscarMovimientoOrigen($detalle->id, $detalle->id_producto),
                            ]
                        );
                    }
                }

                // 3) Si la venta tiene Factura emitida, se revierte con una Nota
                //    de Crédito (la factura no se borra: queda el historial fiscal).
                $notaCredito = $this->emitirNotaCreditoSiCorresponde($transaccion, $detalles);

                // 4) Marcar como Anulada
                $transaccion->update([
                    'id_TipoEstado' => EstadoTransaccion::ANULADA,
                    'UrevUsuario' => Auth::user()->name,
                    'UrevFechaHora' => now(),
                ]);
            });
        } catch (\InvalidArgumentException | \RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $mensaje = $fuePosteada
            ? 'Transacción anulada correctamente. Stock revertido.'
            : 'Transacción anulada correctamente.';

        if ($notaCredito ?? null) {
            $mensaje .= ' Se emitió la Nota de Crédito Nº ' . $notaCredito->nro_comprobante . '.';
        }

        return response()->json([
            'message' => $mensaje,
            'transaccion' => $transaccion->load('tipoEstado'),
            'nota_credito' => $notaCredito ?? null,
        ], 200);
    }

    /**
     * Corrige solo los datos de cabecera NO contables de una transacción
     * (descripción, fecha, nro_comprobante, tipo de comprobante y persona).
     * No modifica estado, movimiento, montos ni stock: permite arreglar un
     * error de tipeo (ej. número de factura) sin anular la operación.
     */
    public function corregirTransaccion(Request $request, $id)
    {
        $transaccion = Transacciones::findOrFail($id);

        if (! $this->enAlcance($transaccion, true)) {
            return response()->json(['message' => 'La transacción no pertenece a tu organización o sucursal.'], 403);
        }

        // No corregir transacciones ya anuladas
        if ($transaccion->esAnulada()) {
            return response()->json(['message' => 'No se puede corregir una transacción anulada.'], 422);
        }

        $data = $request->validate([
            'descripcion' => ['nullable', 'string'],
            'fecha' => ['required', 'date'],
            'nro_comprobante' => ['nullable', 'string', 'max:50'],
            'id_TipoComprobante' => ['nullable', 'integer'],
            'id_persona' => ['nullable', 'integer'],
        ]);

        $transaccion->update([
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
     * Elimina FÍSICAMENTE una transacción. Solo un administrador (rol 1) puede
     * hacerlo y únicamente si el registro NO está enlazado a nada que ya haya
     * tenido efecto: sin kardex, sin cuotas y sin comprobante emitido.
     *
     * Es la excepción controlada a la regla SAP de "no borrar, anular": sirve
     * para limpiar borradores cargados por error.
     */
    public function destroyTransaccion($id)
    {
        $user = Auth::user();

        if (! $user || (int) $user->rol_id !== 1) {
            return response()->json(['message' => 'Solo un administrador puede eliminar transacciones.'], 403);
        }

        $transaccion = Transacciones::findOrFail($id);

        if (! $this->enAlcance($transaccion, true)) {
            return response()->json(['message' => 'La transacción no pertenece a tu organización o sucursal.'], 403);
        }

        // Candados: no se borra nada que ya haya impactado o esté enlazado.
        if ($transaccion->estaPosteada()) {
            return response()->json(['message' => 'La transacción está finalizada: anulala en vez de eliminarla.'], 422);
        }
        if ($transaccion->esAnulada()) {
            return response()->json(['message' => 'La transacción ya está anulada.'], 422);
        }
        if ($transaccion->movimientosHistorial()->exists()) {
            return response()->json(['message' => 'La transacción tiene movimientos de stock (kardex): no se puede eliminar.'], 422);
        }
        if ($transaccion->cuotas()->exists()) {
            return response()->json(['message' => 'La transacción tiene cuotas asociadas: no se puede eliminar.'], 422);
        }
        if ($transaccion->comprobante()->exists()) {
            return response()->json(['message' => 'La transacción tiene un comprobante emitido: no se puede eliminar.'], 422);
        }

        DB::transaction(function () use ($transaccion) {
            // La FK de transacciones_detalles es ON DELETE CASCADE, pero se borra
            // explícito para no depender de la config del motor.
            $transaccion->transacionDetalles()->delete();
            $transaccion->delete();
        });

        return response()->json(['message' => 'Transacción eliminada definitivamente.']);
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
