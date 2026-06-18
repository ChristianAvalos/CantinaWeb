<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AplicaFiltrosDinamicos;
use App\Http\Requests\CreatePrecioVentaRequest;
use App\Http\Requests\StorePrecioVentaRequest;
use App\Http\Requests\UpdatePrecioVentaRequest;
use App\Http\Resources\PrecioVentaResource;
use App\Models\PrecioVenta;
use App\Models\TipoEstado;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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
            $precio_ventas_Query = PrecioVenta::with(['producto', 'tipoMoneda', 'organizacion', 'tipoEstado']);
            if (!empty($filtros)) {
                $this->aplicarFiltrosDinamicos($precio_ventas_Query, $filtros, ['search', 'all']);
            }
            $precio_ventas = $precio_ventas_Query->get();
        } else {
            $precio_ventas_Query = PrecioVenta::with(['producto', 'tipoMoneda', 'organizacion', 'tipoEstado']);

            if ($search) {
                $precio_ventas_Query->whereHas('producto', function ($q) use ($search) {
                    $q->where('nombre', 'ilike', '%' . $search . '%');
                });
            }

            if (!empty($filtros)) {
                $this->aplicarFiltrosDinamicos($precio_ventas_Query, $filtros, ['search', 'all']);
            }

            $precio_ventas = $precio_ventas_Query->paginate(10);
        }
        return PrecioVentaResource::collection($precio_ventas);

    }

    /**
     * Show the form for creating a new resource.
     */
    public function createPrecioVenta(CreatePrecioVentaRequest $request)
    {
        $validatedData = $request->validated();

        // Agregar información adicional
        $validatedData['id_tipoestado'] = 1; // Asignar un estado predeterminado (por ejemplo, "Activo")
        $validatedData['UrevUsuario'] = Auth::user()->name;
        $validatedData['UrevFechaHora'] = Carbon::now();

        // Crear el registro en la base de datos
        $precioVenta = PrecioVenta::create($validatedData);

        return response()->json(['message' => 'Precio de venta creado correctamente', 'data' => $precioVenta], 201);
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
    public function updatePrecioVenta(UpdatePrecioVentaRequest $request, $id)
    {
        $validatedData = $request->validated();

        // Agregar información adicional
        $validatedData['UrevUsuario'] = 'Actualizado - ' . Auth::user()->name;
        $validatedData['UrevFechaHora'] = Carbon::now();
    
        // Buscar el precio de venta por ID
        $precioVenta = PrecioVenta::findOrFail($id);

        // Actualizar el registro en la base de datos
        $precioVenta->update($validatedData);

        return response()->json(['message' => 'Precio de venta actualizado correctamente', 'data' => $precioVenta], 200);
    }
    public function estadoPrecioVenta($id, Request $request)
    {
        // Formalizar: convertir "Activo"/"Inactivo" al id_tipoestado real
        $tipoEstado = TipoEstado::where('descripcion', $request->id_tipoestado)->firstOrFail();
        
        // Buscar el precio de venta por ID
        $precioVenta = PrecioVenta::findOrFail($id);
        //Asigno el estado del precio de venta
        $precioVenta->id_tipoestado = $tipoEstado->id;
        //Asigno el usuario que realizó la actualización
        $precioVenta->UrevUsuario = Auth::user()->name;
        //Asigno la fecha y hora de la actualización
        $precioVenta->UrevFechaHora = Carbon::now();
        //Guardo los cambios
        $precioVenta->save();

        return response()->json(['message' => 'Estado del precio de venta actualizado correctamente.'], 200);
    }
    public function DeletePrecioVenta($id)
    {
        $precio_ventas = PrecioVenta::findOrFail($id);
        $precio_ventas->delete();

        return response()->json(['message' => 'Precio de venta eliminada correctamente']);
    }
}
