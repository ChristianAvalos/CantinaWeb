<?php

namespace App\Http\Controllers;

use DateTime;
use Illuminate\Http\Request;
use App\Models\Transacciones;
use App\Models\TransaccionesDetalle;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\CreateTransaccionRequest;
use App\Http\Requests\UpdateTransaccionRequest;

class TransaccionesController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $isAdmin = isset($user->rol_id) ? ($user->rol_id === 1) : false;

        $search = $request->input('search');
        $mes = $request->input('mes');
        $tipo = $request->input('tipo');

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
            'caja'
        ]);
        // Si NO es admin, limitar por la organización del usuario
        if (! $isAdmin) {
            $transacciones->where('id_organizacion', $user->id_organizacion);
        }

        $transacciones = $transacciones->when($search, function ($q, $search) use ($searchFecha) {
                $q->where(function ($s) use ($search, $searchFecha) {
                    $s->where('nombre', 'like', '%' . $search . '%')
                        ->orWhere('monto', 'like', '%' . $search . '%')
                        ->orWhereHas('persona', function ($q2) use ($search) {
                            $q2->where('nombre', 'like', '%' . $search . '%');
                        })
                        ->orWhereHas('tipoMovimiento', function ($q3) use ($search) {
                            $q3->where('nombre', 'like', '%' . $search . '%');
                        });

                    // Si el search es una fecha válida, buscar por fecha exacta
                    if ($searchFecha) {
                        $s->orWhereDate('UrevFechaHora', $searchFecha);
                    }
                });
            })
            ->when($tipo, function ($q, $tipo) {
                $q->where('id_TipoMovimiento', $tipo);
            })
            // Filtro por mes si viene el parámetro
            ->when($mes, function ($q, $mes) {
                [$anio, $mesNum] = explode('-', $mes); // $mes debe venir como 'YYYY-MM'
                $q->whereYear('UrevFechaHora', $anio)
                    ->whereMonth('UrevFechaHora', $mesNum);
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
            'id_persona' => $data['id_persona'],
            'id_TipoEstado' => $data['id_TipoEstado'],
            'id_TipoComprobante' => $data['id_TipoComprobante'] ?? null,
            'nro_comprobante' => $data['nro_comprobante'] ?? null,
            'id_TipoPago' => $data['id_TipoPago'],
            'id_FormaPago' => $data['id_FormaPago'],
            'id_TipoMoneda' => $data['id_TipoMoneda'] ?? null,
            'id_TipoMovimiento' => $data['id_TipoMovimiento'],
            'monto' => $data['monto'] ?? 0,
            'id_usuario' => Auth::user()->id,
            'id_Caja' => $data['id_Caja'] ?? null,
            'id_Banco' => $data['id_Banco'] ?? null,
            'UrevUsuario' => Auth::user()->name,
            'UrevFechaHora' => now()

        ]);

        return response()->json($transaccion, 201);
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

        $detalleQuery = TransaccionesDetalle::where('id_transaccion', $transaccion->id);
        $tieneDetalles = $detalleQuery->exists();
        $montoDetalles = (float) $detalleQuery->sum('subtotal');
        $montoNormalizado = $tieneDetalles ? $montoDetalles : (float) ($data['monto'] ?? 0);

        

        $transaccion->update([
            'nombre' => $data['nombre'],
            'descripcion' => $data['descripcion'] ?? null,
            'fecha' => $data['fecha'],
            'lote' => $data['lote'] ?? null,
            'id_persona' => $data['id_persona'],
            'id_TipoEstado' => $data['id_TipoEstado'],
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
            'UrevUsuario' => Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json($transaccion, 200);
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
     * Remove the specified resource from storage.
     */

    public function DeleteTransaccion($id)
    {
        // Eliminar la transacción por su ID
        $transaccion = Transacciones::findOrFail($id);
        $transaccion->delete();

        return response()->json(['message' => 'Transacción eliminada correctamente.'], 200);
    }
}
