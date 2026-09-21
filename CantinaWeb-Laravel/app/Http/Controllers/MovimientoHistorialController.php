<?php

namespace App\Http\Controllers;

use App\Models\MovimientoHistorial;
use App\Models\TipoMovimientos;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Concerns\AplicaFiltrosDinamicos;

/**
 * Kardex: historial de movimientos de stock.
 *
 * Solo lectura. Cada fila explica de dónde salió o a dónde fue el stock,
 * con el stock anterior y posterior como snapshot.
 */
class MovimientoHistorialController extends Controller
{
    use AplicaFiltrosDinamicos;

    /**
     * Listado paginado del kardex con filtros.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $direccion = $request->input('direccion');
        $idProducto = $request->input('id_producto');
        $idTransaccion = $request->input('id_transaccion');
        $fechaDesde = $request->input('fecha_desde');
        $fechaHasta = $request->input('fecha_hasta');
        $idOrganizacion = Auth::user()->id_organizacion;
        $filtros = $this->normalizarFiltros($request->input('filtros', []));

        $query = MovimientoHistorial::with(['producto', 'tipoMovimiento', 'transaccion', 'usuario'])
            ->when($idOrganizacion, function ($q) use ($idOrganizacion) {
                $q->where(function ($q2) use ($idOrganizacion) {
                    $q2->whereNull('id_organizacion')
                        ->orWhere('id_organizacion', $idOrganizacion);
                });
            })
            ->when($direccion, function ($q, $direccion) {
                $q->where('direccion', $direccion);
            })
            ->when($idProducto, function ($q, $idProducto) {
                $q->where('id_producto', $idProducto);
            })
            ->when($idTransaccion, function ($q, $idTransaccion) {
                $q->where('id_transaccion', $idTransaccion);
            })
            ->when($fechaDesde, function ($q, $fechaDesde) {
                $q->whereDate('fecha', '>=', $fechaDesde);
            })
            ->when($fechaHasta, function ($q, $fechaHasta) {
                $q->whereDate('fecha', '<=', $fechaHasta);
            })
            ->when($search, function ($q, $search) {
                $term = '%' . mb_strtolower($search) . '%';

                $q->where(function ($q2) use ($term) {
                    $q2->whereRaw('LOWER(producto_nombre) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(producto_codigo) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(motivo) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(referencia) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(UrevUsuario) LIKE ?', [$term])
                        ->orWhereHas('tipoMovimiento', function ($q3) use ($term) {
                            $q3->whereRaw('LOWER(nombre) LIKE ?', [$term])
                                ->orWhereRaw('LOWER(codigo) LIKE ?', [$term]);
                        });
                });
            })
            ->when(!empty($filtros), function ($q) use ($filtros) {
                return $this->aplicarFiltrosDinamicos($q, $filtros, [
                    'search',
                    'direccion',
                    'id_producto',
                    'id_transaccion',
                    'fecha_desde',
                    'fecha_hasta',
                ]);
            });

        // Totales del filtro completo (no de la página). Se cuentan movimientos,
        // no cantidades: sumar kg con unidades no tendría sentido.
        $totales = (clone $query)
            ->reorder()
            ->selectRaw('COUNT(*) AS registros')
            ->selectRaw('SUM(CASE WHEN direccion = ? THEN 1 ELSE 0 END) AS entradas', [TipoMovimientos::DIRECCION_ENTRADA])
            ->selectRaw('SUM(CASE WHEN direccion = ? THEN 1 ELSE 0 END) AS salidas', [TipoMovimientos::DIRECCION_SALIDA])
            ->first();

        $movimientos = $query
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->paginate(15);

        return response()->json([
            'movimientos' => $movimientos,
            'totales' => [
                'registros' => (int) ($totales->registros ?? 0),
                'entradas' => (int) ($totales->entradas ?? 0),
                'salidas' => (int) ($totales->salidas ?? 0),
            ],
        ]);
    }
}
