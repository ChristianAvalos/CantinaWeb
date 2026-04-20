<?php

namespace App\Http\Controllers;

use App\Models\TipoPersona;
use Illuminate\Http\Request;

class TipoPersonaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $tiposPersona = TipoPersona::all();
        return response()->json($tiposPersona);
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
    public function show(TipoPersona $tipoPersona)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(TipoPersona $tipoPersona)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, TipoPersona $tipoPersona)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(TipoPersona $tipoPersona)
    {
        //
    }
}
