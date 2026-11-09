<?php

namespace App\Http\Controllers;

use App\Models\CuentaMovimiento;
use App\Models\Persona;
use App\Services\CuentaAlumnoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

/**
 * Cuenta corriente de los alumnos, vista por el personal de la cantina.
 *
 * Permite ver deudores, el historial y registrar/confirmar pagos o recargas
 * hechos en el mostrador (el portal solo informa pagos pendientes).
 */
class CuentaAlumnoController extends Controller
{
    use PerteneceAOrganizacion;

    public function index(Request $request)
    {
        $idOrganizacion = $this->esAdminSistema()
            ? $request->input('id_organizacion')
            : $this->organizacionDelUsuario();

        if (! $this->esAdminSistema() && ! $idOrganizacion) {
            return response()->json(['message' => 'Tu usuario no tiene una organización asignada.'], 403);
        }

        $search = trim((string) $request->input('search'));
        $searchLower = mb_strtolower($search);

        $query = Persona::query()
            ->with(['tipoPersona', 'organizacion'])
            ->select('personas.*')
            ->addSelect([
                'cargos_confirmados' => CuentaMovimiento::selectRaw('COALESCE(SUM(monto), 0)')
                    ->whereColumn('cuenta_movimientos.id_persona', 'personas.id')
                    ->where('estado', CuentaMovimiento::ESTADO_CONFIRMADO)
                    ->where('direccion', CuentaMovimiento::DIRECCION_CARGO),
                'abonos_confirmados' => CuentaMovimiento::selectRaw('COALESCE(SUM(monto), 0)')
                    ->whereColumn('cuenta_movimientos.id_persona', 'personas.id')
                    ->where('estado', CuentaMovimiento::ESTADO_CONFIRMADO)
                    ->where('direccion', CuentaMovimiento::DIRECCION_ABONO),
                'pagos_pendientes' => CuentaMovimiento::selectRaw('COALESCE(SUM(monto), 0)')
                    ->whereColumn('cuenta_movimientos.id_persona', 'personas.id')
                    ->where('estado', CuentaMovimiento::ESTADO_PENDIENTE),
            ])
            ->when($idOrganizacion, fn ($q) => $q->where('id_organizacion', $idOrganizacion))
            // Solo personas que son alumnos, tienen movimientos o están vinculadas como alumno.
            ->where(function ($q) {
                $q->whereHas('tipoPersona', fn ($t) => $t->whereRaw('LOWER(nombre) = ?', ['alumno']))
                    ->orWhereHas('cuentaMovimientos')
                    ->orWhereHas('vinculosComoAlumno');
            })
            ->when($searchLower !== '', function ($q) use ($searchLower) {
                $like = '%' . $searchLower . '%';
                $q->where(function ($sub) use ($like) {
                    $sub->whereRaw('LOWER(nombre) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(documento, \'\')) LIKE ?', [$like]);
                });
            })
            ->orderBy('nombre');

        if ($request->boolean('all')) {
            $personas = $query->get();

            return response()->json([
                'data' => $personas->map(fn ($p) => $this->conSaldo($p)),
            ]);
        }

        $paginator = $query->paginate(10);
        $paginator->getCollection()->transform(fn ($p) => $this->conSaldo($p));

        return response()->json($paginator);
    }

    public function movimientos(Request $request, $id)
    {
        $persona = Persona::findOrFail($id);

        if (! $this->enAlcance($persona)) {
            return response()->json(['message' => 'La persona no pertenece a tu organización.'], 403);
        }

        $movimientos = CuentaMovimiento::with(['formaPago', 'pagador', 'sucursal', 'transaccion'])
            ->where('id_persona', $persona->id)
            ->when($request->input('estado'), fn ($q, $estado) => $q->where('estado', $estado))
            ->when($request->input('tipo'), fn ($q, $tipo) => $q->where('tipo', $tipo))
            ->orderByDesc('fecha_hora')
            ->orderByDesc('id')
            ->paginate(20);

        return response()->json([
            'persona' => $persona,
            'resumen' => CuentaAlumnoService::resumen($persona),
            'movimientos' => $movimientos,
        ]);
    }

    public function storeMovimiento(Request $request)
    {
        $data = $request->validate([
            'id_persona' => ['required', 'exists:personas,id'],
            'tipo' => ['required', Rule::in([
                CuentaMovimiento::TIPO_PAGO,
                CuentaMovimiento::TIPO_RECARGA,
                CuentaMovimiento::TIPO_AJUSTE,
                CuentaMovimiento::TIPO_DEVOLUCION,
            ])],
            'monto' => ['required', 'numeric', 'min:0.01'],
            'direccion' => ['nullable', Rule::in([
                CuentaMovimiento::DIRECCION_CARGO,
                CuentaMovimiento::DIRECCION_ABONO,
            ]), 'required_if:tipo,' . CuentaMovimiento::TIPO_AJUSTE],
            'id_forma_pago' => ['nullable', 'exists:forma_pagos,id'],
            'descripcion' => ['nullable', 'string', 'max:255'],
            'fecha_hora' => ['nullable', 'date'],
            'estado' => ['nullable', Rule::in([
                CuentaMovimiento::ESTADO_PENDIENTE,
                CuentaMovimiento::ESTADO_CONFIRMADO,
            ])],
        ]);

        $persona = Persona::findOrFail($data['id_persona']);

        if (! $this->enAlcance($persona)) {
            return response()->json(['message' => 'La persona no pertenece a tu organización.'], 403);
        }

        $movimiento = CuentaAlumnoService::registrar([
            'id_organizacion' => $persona->id_organizacion,
            'id_sucursal' => $this->sucursalDelUsuario(),
            'id_persona' => $persona->id,
            'tipo' => $data['tipo'],
            'direccion' => $data['tipo'] === CuentaMovimiento::TIPO_AJUSTE
                ? $data['direccion']
                : CuentaAlumnoService::direccionDe($data['tipo']),
            'monto' => $data['monto'],
            'id_persona_pagador' => null,
            'id_forma_pago' => $data['id_forma_pago'] ?? null,
            'estado' => $data['estado'] ?? CuentaMovimiento::ESTADO_CONFIRMADO,
            'descripcion' => $data['descripcion'] ?? null,
            'fecha_hora' => $data['fecha_hora'] ?? now(),
        ]);

        return response()->json([
            'message' => 'Movimiento registrado correctamente.',
            'data' => $movimiento,
            'resumen' => CuentaAlumnoService::resumen($persona),
        ], 201);
    }

    public function confirmar($id)
    {
        $movimiento = CuentaMovimiento::with('persona')->findOrFail($id);

        if (! $movimiento->persona || ! $this->enAlcance($movimiento->persona)) {
            return response()->json(['message' => 'El movimiento no pertenece a tu organización.'], 403);
        }

        if ($movimiento->estado !== CuentaMovimiento::ESTADO_PENDIENTE) {
            return response()->json(['message' => 'Solo se pueden confirmar movimientos pendientes.'], 422);
        }

        $movimiento->update([
            'estado' => CuentaMovimiento::ESTADO_CONFIRMADO,
            'UrevUsuario' => 'Confirmado - ' . Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Pago confirmado correctamente.',
            'resumen' => CuentaAlumnoService::resumen($movimiento->persona),
        ]);
    }

    public function anular($id)
    {
        $movimiento = CuentaMovimiento::with('persona')->findOrFail($id);

        if (! $movimiento->persona || ! $this->enAlcance($movimiento->persona)) {
            return response()->json(['message' => 'El movimiento no pertenece a tu organización.'], 403);
        }

        if ($movimiento->tipo === CuentaMovimiento::TIPO_COMPRA) {
            return response()->json([
                'message' => 'Las compras se anulan desde la venta, no desde la cuenta.',
            ], 422);
        }

        if ($movimiento->estado === CuentaMovimiento::ESTADO_ANULADO) {
            return response()->json(['message' => 'El movimiento ya está anulado.'], 422);
        }

        $movimiento->update([
            'estado' => CuentaMovimiento::ESTADO_ANULADO,
            'UrevUsuario' => 'Anulado - ' . Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Movimiento anulado correctamente.',
            'resumen' => CuentaAlumnoService::resumen($movimiento->persona),
        ]);
    }

    private function conSaldo(Persona $persona): Persona
    {
        $cargos = (float) ($persona->cargos_confirmados ?? 0);
        $abonos = (float) ($persona->abonos_confirmados ?? 0);
        $saldo = round($abonos - $cargos, 4);

        $persona->saldo = $saldo;
        $persona->deuda = round(max(0, -$saldo), 4);
        $persona->saldo_favor = round(max(0, $saldo), 4);
        $persona->total_comprado = $cargos;
        $persona->total_pagado = $abonos;
        $persona->pagos_pendientes = (float) ($persona->pagos_pendientes ?? 0);

        return $persona;
    }
}
