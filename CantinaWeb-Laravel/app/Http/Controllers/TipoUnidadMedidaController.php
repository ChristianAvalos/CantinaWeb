<?php

namespace App\Http\Controllers;

use App\Models\TipoUnidadMedida;
use Illuminate\Http\Request;

class TipoUnidadMedidaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $tipoUnidadMedida = TipoUnidadMedida::all();
        return response()->json($tipoUnidadMedida);
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
    public function show(TipoUnidadMedida $tipoUnidadMedida)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(TipoUnidadMedida $tipoUnidadMedida)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, TipoUnidadMedida $tipoUnidadMedida)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(TipoUnidadMedida $tipoUnidadMedida)
    {
        //
    }
}
