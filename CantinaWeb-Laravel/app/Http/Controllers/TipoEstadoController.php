<?php

namespace App\Http\Controllers;

use App\Models\TipoEstado;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TipoEstadoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $id_organizacion = Auth::user()->id_organizacion;

        $query = TipoEstado::whereNull('id_organizacion')
                ->orWhere('id_organizacion', $id_organizacion);


        if ($request->get('filtro') === 'basico') {
            $estadosBasicos = ['Activo', 'Inactivo'];
            $query->whereIn('descripcion', $estadosBasicos);
        }

        $tipoEstados = $query->get();

        return response()->json($tipoEstados);
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
    public function show(TipoEstado $tipoEstado)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(TipoEstado $tipoEstado)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, TipoEstado $tipoEstado)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(TipoEstado $tipoEstado)
    {
        //
    }
}
