<?php

namespace App\Http\Controllers;

use App\Models\TipoEstado;
use Illuminate\Http\Request;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

class TipoEstadoController extends Controller
{
    use PerteneceAOrganizacion;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $id_organizacion = $this->organizacionDelUsuario();

        // El Administrador de Sistema ve todos los estados.
        $query = TipoEstado::query()
            ->when(! $this->esAdminSistema(), function ($query) use ($id_organizacion) {
                $query->where(function ($q2) use ($id_organizacion) {
                    $q2->whereNull('id_organizacion')
                        ->orWhere('id_organizacion', $id_organizacion);
                });
            });


        if ($request->get('filtro') === 'basico') {
            $estadosBasicos = ['Activo', 'Inactivo'];
            $query->whereIn('descripcion', $estadosBasicos);
        } elseif (in_array($request->get('filtro'), ['compra', 'venta'], true)) {
            // Compras y ventas: Activo, Inactivo y Finalizado
            $estadosOperacion = ['Activo', 'Inactivo', 'Finalizado'];
            $query->whereIn('descripcion', $estadosOperacion);
        }

        // Orden estable: garantiza que "Activo" (id 1) sea el primero, usado como
        // estado por defecto al crear una transacción (borrador parqueado).
        $tipoEstados = $query->orderBy('id')->get();

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
