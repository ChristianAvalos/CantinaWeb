<?php

namespace App\Http\Controllers;

use App\Models\CuentaMovimiento;
use App\Models\Transacciones;
use App\Services\CuentaAlumnoService;
use Illuminate\Http\Request;

/**
 * Portal de solo consulta para alumnos y tutores.
 *
 * Toda la autorización se resuelve en el servidor con `persona_vinculos`:
 * el id del alumno que llega desde el navegador NUNCA se usa sin comprobar que
 * el usuario autenticado esté vinculado a él dentro de su organización.
 */
class PortalFamiliaController extends Controller
{
    public function resumen(Request $request)
    {
        $user = $request->user()->loadMissing('role', 'persona');
        $accesos = CuentaAlumnoService::alumnosAccesibles($user);

        $alumnos = array_map(function (array $acceso) {
            /** @var \App\Models\Persona $persona */
            $persona = $acceso['persona'];
            $resumen = $acceso['permisos']['puede_ver_saldo']
                ? CuentaAlumnoService::resumen($persona)
                : null;

            return [
                'id' => $persona->id,
                'nombre' => $persona->nombre,
                'documento' => $persona->documento,
                'parentesco' => $acceso['parentesco'],
                'permisos' => $acceso['permisos'],
                'saldo' => $resumen['saldo'] ?? null,
                'deuda' => $resumen['deuda'] ?? null,
                'saldo_favor' => $resumen['saldo_favor'] ?? null,
                'ultima_compra' => Transacciones::where('id_persona', $persona->id)
                    ->where('id_TipoMovimiento', 2)
                    ->orderByDesc('id')
                    ->value('created_at'),
            ];
        }, $accesos);

        return response()->json([
            'usuario' => [
                'id' => $user->id,
                'nombre' => $user->name,
                'persona' => $user->persona?->nombre,
            ],
            'alumnos' => $alumnos,
        ]);
    }

    public function alumno(Request $request, $id)
    {
        $acceso = CuentaAlumnoService::accesoA($request->user(), (int) $id);

        if (! $acceso) {
            return response()->json(['message' => 'No tenés acceso a la cuenta de ese alumno.'], 403);
        }

        $persona = $acceso['persona'];
        $permisos = $acceso['permisos'];
        $resumen = $permisos['puede_ver_saldo'] ? CuentaAlumnoService::resumen($persona) : null;

        $compras = [];
        if ($permisos['puede_ver_compras']) {
            $compras = Transacciones::with([
                'transacionDetalles.producto',
                'sucursal',
                'tipoEstado',
                'formaPago',
            ])
                ->where('id_persona', $persona->id)
                ->where('id_organizacion', $persona->id_organizacion)
                ->where('id_TipoMovimiento', 2)
                ->where('id_TipoEstado', '!=', 7) // anuladas fuera del historial visible
                ->orderByDesc('fecha')
                ->orderByDesc('id')
                ->limit(100)
                ->get()
                ->map(fn (Transacciones $compra) => [
                    'id' => $compra->id,
                    'nro_comprobante' => $compra->nro_comprobante,
                    'descripcion' => $compra->descripcion,
                    'fecha' => $compra->fecha,
                    // La hora real de la operación: `fecha` es solo date.
                    'fecha_hora' => optional($compra->created_at)->format('Y-m-d H:i'),
                    'monto' => (float) $compra->monto,
                    'sucursal' => $compra->sucursal?->nombre,
                    'estado' => $compra->tipoEstado?->nombre,
                    'forma_pago' => $compra->formaPago?->nombre,
                    'detalles' => $compra->transacionDetalles->map(fn ($d) => [
                        'producto' => $d->producto?->nombre,
                        'cantidad' => (float) $d->cantidad,
                        'precio_unitario' => (float) $d->precio_unitario,
                        'subtotal' => (float) $d->subtotal,
                    ]),
                ]);
        }

        $movimientos = [];
        if ($permisos['puede_ver_saldo']) {
            $movimientos = CuentaMovimiento::with(['formaPago', 'pagador', 'sucursal'])
                ->where('id_persona', $persona->id)
                ->whereIn('estado', [
                    CuentaMovimiento::ESTADO_CONFIRMADO,
                    CuentaMovimiento::ESTADO_PENDIENTE,
                ])
                ->orderByDesc('fecha_hora')
                ->orderByDesc('id')
                ->limit(100)
                ->get()
                ->map(fn (CuentaMovimiento $m) => [
                    'id' => $m->id,
                    'tipo' => $m->tipo,
                    'direccion' => $m->direccion,
                    'monto' => (float) $m->monto,
                    'estado' => $m->estado,
                    'fecha_hora' => optional($m->fecha_hora)->format('Y-m-d H:i'),
                    'descripcion' => $m->descripcion,
                    'forma_pago' => $m->formaPago?->nombre,
                    'pagador' => $m->pagador?->nombre,
                    'sucursal' => $m->sucursal?->nombre,
                ]);
        }

        return response()->json([
            'alumno' => [
                'id' => $persona->id,
                'nombre' => $persona->nombre,
                'documento' => $persona->documento,
                'parentesco' => $acceso['parentesco'],
                'permisos' => $permisos,
            ],
            'resumen' => $resumen,
            'compras' => $compras,
            'movimientos' => $movimientos,
            'formas_pago' => $permisos['puede_pagar']
                ? \App\Models\FormaPago::orderBy('nombre')->get(['id', 'nombre'])
                : [],
        ]);
    }

    /**
     * El tutor informa un pago (efectivo/transferencia hecha fuera del sistema).
     * Nace PENDIENTE: recién impacta el saldo cuando el personal lo confirma.
     * Cuando se integre una pasarela, ese flujo solo tendrá que confirmar el
     * mismo movimiento con `referencia_externa`.
     */
    public function registrarPago(Request $request, $id)
    {
        $acceso = CuentaAlumnoService::accesoA($request->user(), (int) $id);

        if (! $acceso) {
            return response()->json(['message' => 'No tenés acceso a la cuenta de ese alumno.'], 403);
        }

        if (! $acceso['permisos']['puede_pagar']) {
            return response()->json(['message' => 'No tenés permiso para informar pagos de ese alumno.'], 403);
        }

        $data = $request->validate([
            'monto' => ['required', 'numeric', 'min:1'],
            'id_forma_pago' => ['required', 'exists:forma_pagos,id'],
            'referencia' => ['nullable', 'string', 'max:100'],
            'descripcion' => ['nullable', 'string', 'max:255'],
        ], [
            'monto.required' => 'Ingresá el monto.',
            'monto.numeric' => 'El monto debe ser un número.',
            'monto.min' => 'El monto debe ser mayor a cero.',
            'id_forma_pago.required' => 'Seleccioná la forma de pago.',
            'id_forma_pago.exists' => 'La forma de pago seleccionada no es válida.',
        ]);

        $persona = $acceso['persona'];

        $movimiento = CuentaMovimiento::create([
            'id_organizacion' => $persona->id_organizacion,
            'id_sucursal' => null,
            'id_persona' => $persona->id,
            'tipo' => CuentaMovimiento::TIPO_PAGO,
            'direccion' => CuentaMovimiento::DIRECCION_ABONO,
            'monto' => $data['monto'],
            'id_persona_pagador' => $request->user()->id_persona,
            'id_forma_pago' => $data['id_forma_pago'],
            'estado' => CuentaMovimiento::ESTADO_PENDIENTE,
            'referencia_externa' => $data['referencia'] ?? null,
            'descripcion' => $data['descripcion'] ?? 'Pago informado desde el portal',
            'fecha_hora' => now(),
            'UrevUsuario' => $request->user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Pago informado. Queda pendiente de confirmación por la cantina.',
            'data' => $movimiento,
        ], 201);
    }

    public function cancelarPago(Request $request, $id)
    {
        $movimiento = CuentaMovimiento::findOrFail($id);
        $acceso = CuentaAlumnoService::accesoA($request->user(), (int) $movimiento->id_persona);

        if (! $acceso) {
            return response()->json(['message' => 'No tenés acceso a ese movimiento.'], 403);
        }

        if ($movimiento->estado !== CuentaMovimiento::ESTADO_PENDIENTE
            || (int) $movimiento->id_persona_pagador !== (int) $request->user()->id_persona) {
            return response()->json(['message' => 'Solo podés cancelar tus pagos pendientes.'], 422);
        }

        $movimiento->update([
            'estado' => CuentaMovimiento::ESTADO_ANULADO,
            'UrevUsuario' => 'Anulado - ' . $request->user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json(['message' => 'Pago pendiente cancelado.']);
    }
}
