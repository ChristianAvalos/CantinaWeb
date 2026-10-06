<?php

namespace App\Http\Controllers;

use App\Models\Categorias;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\CategoriaRequest;
use App\Http\Controllers\Concerns\AplicaFiltrosDinamicos;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

class CategoriasController extends Controller
{
    use PerteneceAOrganizacion;
    use AplicaFiltrosDinamicos;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $id_organizacion = $this->organizacionDelUsuario();
        $search = $request->input('search');
        $all = $request->input('all');
        $filtros = $this->normalizarFiltros($request->input('filtros', []));

        $categoriasQuery = Categorias::query()
            // Aislamiento por organización; el Administrador de Sistema ve todas.
            ->when(! $this->esAdminSistema(), function ($query) use ($id_organizacion) {
                $query->where(function ($q2) use ($id_organizacion) {
                    $q2->whereNull('id_organizacion')
                        ->orWhere('id_organizacion', $id_organizacion);
                });
            })
            ->when($search, function ($query, $search) {
                $query->where('nombre', 'like', '%' . $search . '%');
            });

        if (!empty($filtros)) {
            $this->aplicarFiltrosDinamicos($categoriasQuery, $filtros, ['search', 'all']);
        }

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
            'id_organizacion' => $this->esAdminSistema()
                ? ($data['id_organizacion'] ?? $this->organizacionDelUsuario())
                : $this->organizacionDelUsuario(),
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

        if ($categoria->id_organizacion === null) {
            return response()->json(['message' => 'Las categorías del sistema no se pueden editar.'], 403);
        }

        if (! $this->enAlcance($categoria)) {
            return response()->json(['message' => 'La categoría no pertenece a tu organización.'], 403);
        }

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

        if ($categoria->id_organizacion === null) {
            return response()->json(['message' => 'Las categorías del sistema no se pueden eliminar.'], 403);
        }

        if (! $this->enAlcance($categoria)) {
            return response()->json(['message' => 'La categoría no pertenece a tu organización.'], 403);
        }

        $categoria->delete();

        return response()->json(['message' => 'Categoria eliminada correctamente']);
    }
}
