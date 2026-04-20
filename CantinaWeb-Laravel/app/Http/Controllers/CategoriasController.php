<?php

namespace App\Http\Controllers;

use App\Models\Categorias;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\CategoriaRequest;

class CategoriasController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $id_organizacion = Auth::user()->id_organizacion;
        $search = $request->input('search');
        $all = $request->input('all');

        $categoriasQuery = Categorias::where(function ($query) use ($id_organizacion) {
            $query->whereNull('id_organizacion')
                ->orWhere('id_organizacion', $id_organizacion);
        })
            ->when($search, function ($query, $search) {
                $query->where('nombre', 'like', '%' . $search . '%');
            });
        if ($all) {
            $categorias = $categoriasQuery->get();
            return response()->json(['data' => $categorias]);
        } else {
            $categorias = $categoriasQuery->paginate(10);
            return response()->json($categorias);
        }
    }

    /**
     * Show the form for creating a new resource.
     */
    public function createCategoria(CategoriaRequest $request)
    {
        $data = $request->validated();

        $categoria = Categorias::create([
            'nombre' => $data['nombre'],
            'id_organizacion' => Auth::user()->id_organizacion,
            'UrevUsuario' => Auth::user()->name,
            'UrevFechaHora' => now()
        ]);

        return response()->json($categoria, 201);
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
    public function show(Categorias $categorias)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Categorias $categorias)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function updateCategoria(CategoriaRequest $request, $id)
    {
        $categoria = Categorias::findOrFail($id);

        $data = $request->validated();

        $categoria->update([
            'nombre' => $data['nombre'],
            'UrevUsuario' => 'Actualizado -' . Auth::user()->name,
            'UrevFechaHora' => now(),

        ]);

        return response()->json($categoria);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function DeleteCategoria($id)
    {
        $categoria = Categorias::findOrFail($id);
        $categoria->delete();

        return response()->json(['message' => 'Categoria eliminada correctamente']);
    }
}
