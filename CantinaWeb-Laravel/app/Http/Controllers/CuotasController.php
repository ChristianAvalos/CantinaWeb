<?php

namespace App\Http\Controllers;

use App\Models\Cuota;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CuotasController extends Controller
{
    /**
     * Lista las cuotas (ventas a crédito/cuotas) con filtros.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $isAdmin = isset($user->rol_id) ? ($user->rol_id === 1) : false;

        $estado = $request->input('estado');            // pendiente | pagada | todas
        $search = $request->input('search');
        $fechaDesde = $request->input('fecha_desde');
        $fechaHasta = $request->input('fecha_hasta');

        $cuotas = Cuota::with([
            'transaccion' => function ($q) {
                $q->with(['persona', 'tipoPago', 'tipoEstado']);
            },
        ]);

        // Si no es admin, limitar por la organización del usuario
        if (! $isAdmin) {
            $cuotas->whereHas('transaccion', function ($q) use ($user) {
                $q->where('id_organizacion', $user->id_organizacion);
            });
        }

        $cuotas->when($estado && $estado !== 'todas', function ($q) use ($estado) {
            $q->where('estado', $estado);
        });

        $cuotas->when($search, function ($q) use ($search) {
            $q->where(function ($s) use ($search) {
                $s->whereHas('transaccion', function ($q2) use ($search) {
                    $q2->where('nombre', 'ilike', '%' . $search . '%')
                        ->orWhereHas('persona', function ($q3) use ($search) {
                            $q3->where('nombre', 'ilike', '%' . $search . '%');
                        });
                });
            });
        });

        $cuotas->when($fechaDesde, function ($q) use ($fechaDesde) {
            $q->whereDate('fecha_vencimiento', '>=', $fechaDesde);
        });

        $cuotas->when($fechaHasta, function ($q) use ($fechaHasta) {
            $q->whereDate('fecha_vencimiento', '<=', $fechaHasta);
        });

        $cuotas = $cuotas->orderByRaw("CASE WHEN estado = 'pendiente' THEN 0 ELSE 1 END")
            ->orderBy('fecha_vencimiento', 'asc')
            ->paginate(10);

        // Totales para el resumen de la página devuelta
        $subtotalPendiente = $cuotas->getCollection()
            ->where('estado', 'pendiente')
            ->sum('monto');
        $subtotalPagado = $cuotas->getCollection()
            ->where('estado', 'pagada')
            ->sum('monto');

        return response()->json([
            'cuotas' => $cuotas,
            'subtotalPendiente' => $subtotalPendiente,
            'subtotalPagado' => $subtotalPagado,
        ]);
    }

    /**
     * Marca una cuota como pagada.
     */
    public function pagar(Request $request, $id)
    {
        $cuota = Cuota::findOrFail($id);

        if ($cuota->estado === 'pagada') {
            return response()->json(['message' => 'La cuota ya está pagada.'], 422);
        }

        $cuota->update([
            'estado' => 'pagada',
            'fecha_pago' => $request->input('fecha_pago', now()->format('Y-m-d')),
            'UrevUsuario' => Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Cuota registrada como pagada correctamente.',
            'cuota' => $cuota->load('transaccion.persona'),
        ], 200);
    }

    /**
     * Revierte el pago de una cuota (vuelve a pendiente).
     */
    public function revertirPago($id)
    {
        $cuota = Cuota::findOrFail($id);

        if ($cuota->estado === 'pendiente') {
            return response()->json(['message' => 'La cuota ya está pendiente.'], 422);
        }

        $cuota->update([
            'estado' => 'pendiente',
            'fecha_pago' => null,
            'UrevUsuario' => Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Pago revertido correctamente.',
            'cuota' => $cuota->load('transaccion.persona'),
        ], 200);
    }
}
