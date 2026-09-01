<?php

namespace App\Http\Controllers;

use App\Models\Cuota;
use App\Models\TipoEstado;
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
        $tipoMovimiento = $request->input('tipo_movimiento'); // 1=compras 2=ventas

        // IDs de estado según la tabla tipo_estados (Pendiente / Finalizado)
        $idPendiente = $this->idEstadoPorDescripcion('Pendiente');
        $idFinalizado = $this->idEstadoPorDescripcion('Finalizado');

        $cuotas = Cuota::with([
            'tipoEstado',
            'transaccion' => function ($q) {
                $q->with(['persona', 'tipoPago', 'tipoEstado']);
            },
        ]);

        // Filtrar cuotas por tipo de movimiento (compras/ventas)
        $cuotas->when($tipoMovimiento, function ($q) use ($tipoMovimiento) {
            $q->whereHas('transaccion', function ($q2) use ($tipoMovimiento) {
                $q2->where('id_TipoMovimiento', (int) $tipoMovimiento);
            });
        });

        // Si no es admin, limitar por la organización del usuario
        if (! $isAdmin) {
            $cuotas->whereHas('transaccion', function ($q) use ($user) {
                $q->where('id_organizacion', $user->id_organizacion);
            });
        }

        $cuotas->when($estado && $estado !== 'todas', function ($q) use ($estado, $idPendiente, $idFinalizado) {
            $q->where('id_TipoEstado', $estado === 'pagada' ? $idFinalizado : $idPendiente);
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

        // Ojo: en PostgreSQL el identificador va entre comillas dobles para respetar
        // las mayúsculas de la columna (en SQL crudo no se escapan automáticamente).
        $cuotas = $cuotas->orderByRaw('CASE WHEN "id_TipoEstado" = ? THEN 0 ELSE 1 END', [$idPendiente])
            ->orderBy('fecha_vencimiento', 'asc')
            ->paginate(10);

        // Totales para el resumen de la página devuelta
        $subtotalPendiente = $cuotas->getCollection()
            ->where('id_TipoEstado', $idPendiente)
            ->sum('monto');
        $subtotalPagado = $cuotas->getCollection()
            ->where('id_TipoEstado', $idFinalizado)
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

        $idFinalizado = $this->idEstadoPorDescripcion('Finalizado');

        if ($cuota->id_TipoEstado === $idFinalizado) {
            return response()->json(['message' => 'La cuota ya está pagada.'], 422);
        }

        $cuota->update([
            'id_TipoEstado' => $idFinalizado,
            'fecha_pago' => $request->input('fecha_pago', now()->format('Y-m-d')),
            'UrevUsuario' => Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Cuota registrada como pagada correctamente.',
            'cuota' => $cuota->load('transaccion.persona', 'tipoEstado'),
        ], 200);
    }

    /**
     * Revierte el pago de una cuota (vuelve a pendiente).
     */
    public function revertirPago($id)
    {
        $cuota = Cuota::findOrFail($id);

        $idPendiente = $this->idEstadoPorDescripcion('Pendiente');

        if ($cuota->id_TipoEstado === $idPendiente) {
            return response()->json(['message' => 'La cuota ya está pendiente.'], 422);
        }

        $cuota->update([
            'id_TipoEstado' => $idPendiente,
            'fecha_pago' => null,
            'UrevUsuario' => Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Pago revertido correctamente.',
            'cuota' => $cuota->load('transaccion.persona', 'tipoEstado'),
        ], 200);
    }

    /**
     * Devuelve el id del estado en tipo_estados según su descripción.
     */
    private function idEstadoPorDescripcion(string $descripcion): ?int
    {
        $id = TipoEstado::where('descripcion', $descripcion)->value('id');

        return $id !== null ? (int) $id : null;
    }
}
