<?php

namespace App\Http\Controllers;

use App\Models\TipoMoneda;
use Illuminate\Http\Request;
use App\Http\Controllers\Concerns\AplicaFiltrosDinamicos;

class TipoMonedaController extends Controller
{
    use AplicaFiltrosDinamicos;
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $filtros = $this->normalizarFiltros($request->input('filtros', []));

        if ($request->query('all')) {
            $tipoMonedasQuery = TipoMoneda::query();
            if (!empty($filtros)) {
                $this->aplicarFiltrosDinamicos($tipoMonedasQuery, $filtros, ['search', 'all']);
            }
            $tipoMonedas = $tipoMonedasQuery->get();
        } else {
            $tipoMonedasQuery = TipoMoneda::query();

            if ($search) {
                $tipoMonedasQuery->where('nombre', 'ilike', '%' . $search . '%');
            }

            if (!empty($filtros)) {
                $this->aplicarFiltrosDinamicos($tipoMonedasQuery, $filtros, ['search', 'all']);
            }

            $tipoMonedas = $tipoMonedasQuery->paginate(10);
        }
        return response()->json($tipoMonedas);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
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
    public function show(TipoMoneda $tipoMoneda)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(TipoMoneda $tipoMoneda)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, TipoMoneda $tipoMoneda)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(TipoMoneda $tipoMoneda)
    {
        //
    }
}
