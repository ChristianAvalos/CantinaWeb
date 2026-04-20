<?php

namespace App\Http\Controllers;

use App\Models\Ciudad;
use App\Models\Departamento;
use Illuminate\Http\Request;

class CiudadController extends Controller
{
    public function index()
    {
        $ciudades = Ciudad::all();
        return response()->json($ciudades);
    }

    public function create()
    {
        $departamentos = Departamento::all();
        return view('ciudades.create', compact('departamentos'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'departamento_id' => 'required|exists:departamento,id',
        ]);

        Ciudad::create($request->all());

        return redirect()->route('ciudades.index')->with('success', 'Ciudad creada con éxito.');
    }

    public function show(Ciudad $ciudad)
    {
        return view('ciudades.show', compact('ciudad'));
    }

    public function edit(Ciudad $ciudad)
    {
        $departamentos = Departamento::all();
        return view('ciudades.edit', compact('ciudad', 'departamentos'));
    }

    public function update(Request $request, Ciudad $ciudad)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
            'departamento_id' => 'required|exists:departamento,id',
        ]);

        $ciudad->update($request->all());

        return redirect()->route('ciudades.index')->with('success', 'Ciudad actualizada con éxito.');
    }

    public function destroy(Ciudad $ciudad)
    {
        $ciudad->delete();

        return redirect()->route('ciudades.index')->with('success', 'Ciudad eliminada con éxito.');
    }
}
