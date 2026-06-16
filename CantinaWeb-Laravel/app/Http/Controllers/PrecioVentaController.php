<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePrecioVentaRequest;
use App\Http\Requests\UpdatePrecioVentaRequest;
use App\Models\PrecioVenta;
use Illuminate\Http\Request;
use App\Http\Controllers\Concerns\AplicaFiltrosDinamicos;

class PrecioVentaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    use AplicaFiltrosDinamicos;

    public function index(Request $request)
    {
        $search = $request->input('search');
        $filtros = $this->normalizarFiltros($request->input('filtros', []));

        if ($request->query('all')) {
            $precio_ventas_Query = PrecioVenta::with(['producto', 'tipoMoneda', 'organizacion']);
            if (!empty($filtros)) {
                $this->aplicarFiltrosDinamicos($precio_ventas_Query, $filtros, ['search', 'all']);
            }
            $precio_ventas = $precio_ventas_Query->get();
        } else {
            $precio_ventas_Query = PrecioVenta::with(['producto', 'tipoMoneda', 'organizacion']);

            if ($search) {
                $precio_ventas_Query->where('nombre', 'ilike', '%' . $search . '%');
            }

            if (!empty($filtros)) {
                $this->aplicarFiltrosDinamicos($precio_ventas_Query, $filtros, ['search', 'all']);
            }

            $precio_ventas = $precio_ventas_Query->paginate(10);
        }
        return response()->json($precio_ventas);

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
    public function store(StorePrecioVentaRequest $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(PrecioVenta $precioVenta)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(PrecioVenta $precioVenta)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePrecioVentaRequest $request, PrecioVenta $precioVenta)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(PrecioVenta $precioVenta)
    {
        //
    }
}
