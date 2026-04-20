<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\TipoMovimientos;
use Illuminate\Support\Facades\Auth;

class TipoMovimientosController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $id_organizacion = Auth::user()->id_organizacion;
        $tipoMovimientos = TipoMovimientos::where('id_organizacion', $id_organizacion)->get();
        return response()->json($tipoMovimientos);
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
    public function show(TipoMovimientos $tipoMovimientos)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(TipoMovimientos $tipoMovimientos)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, TipoMovimientos $tipoMovimientos)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(TipoMovimientos $tipoMovimientos)
    {
        //
    }
}
