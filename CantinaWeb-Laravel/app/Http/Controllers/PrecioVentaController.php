<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AplicaFiltrosDinamicos;
use App\Http\Requests\CreatePrecioVentaRequest;
use App\Http\Requests\UpdatePrecioVentaRequest;
use App\Http\Resources\PrecioVentaResource;
use App\Models\PrecioVenta;
use App\Models\TipoEstado;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\QueryException;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

class PrecioVentaController extends Controller
{
    use PerteneceAOrganizacion;

    /**
     * Display a listing of the resource.
     */
    use AplicaFiltrosDinamicos;

    public function index(Request $request)
    {
        $search = $request->input('search');
        $filtros = $this->normalizarFiltros($request->input('filtros', []));

        if ($request->query('all')) {
            $precio_ventas_Query = PrecioVenta::with(['producto', 'tipoMoneda', 'organizacion', 'sucursal', 'tipoEstado'])
                ->when(! $this->esAdminSistema(), fn ($q) => $q->where('id_organizacion', $this->organizacionDelUsuario()));
            if (!empty($filtros)) {
                $this->aplicarFiltrosDinamicos($precio_ventas_Query, $filtros, ['search', 'all']);
            }

            $precio_ventas = $precio_ventas_Query->get()
                ->map(fn ($p) => (new PrecioVentaResource($p))->resolve())
                ->values();

            return response()->json(['data' => $precio_ventas]);
        }

        // Aislamiento por organización; el Administrador de Sistema ve todos.
        $precio_ventas_Query = PrecioVenta::with(['producto', 'tipoMoneda', 'organizacion', 'sucursal', 'tipoEstado'])
            ->when(! $this->esAdminSistema(), fn ($q) => $q->where('id_organizacion', $this->organizacionDelUsuario()));

        if ($search) {
            $precio_ventas_Query->whereHas('producto', function ($q) use ($search) {
                $q->where('nombre', 'ilike', '%' . $search . '%');
            });
        }

        if (!empty($filtros)) {
            $this->aplicarFiltrosDinamicos($precio_ventas_Query, $filtros, ['search', 'all']);
        }

        $precio_ventas = $precio_ventas_Query->orderBy('id', 'desc')->paginate(10);
        $precio_ventas->through(fn ($p) => (new PrecioVentaResource($p))->resolve());

        return response()->json($precio_ventas);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function createPrecioVenta(CreatePrecioVentaRequest $request)
    {
        $validatedData = $request->validated();

        // La organización la elige el Administrador de Sistema; el resto, la suya.
        $validatedData['id_organizacion'] = $this->esAdminSistema()
            ? ($validatedData['id_organizacion'] ?? $this->organizacionDelUsuario())
            : $this->organizacionDelUsuario();

        // Agregar información adicional
        $validatedData['id_tipoestado'] = 1; // Asignar un estado predeterminado (por ejemplo, "Activo")
        $validatedData['UrevUsuario'] = Auth::user()->name;
        $validatedData['UrevFechaHora'] = Carbon::now();

        try {
            // Crear el registro en la base de datos
            $precioVenta = PrecioVenta::create($validatedData);

            return response()->json(['message' => 'Precio de venta creado correctamente', 'data' => $precioVenta], 201);
        } catch (QueryException $e) {
            if ($e->getCode() == 23505 || $e->getCode() == 1062) {
                return response()->json([
                    'errors' => [
                        'id_producto' => ['Ya existe un precio de venta para este producto en la sucursal seleccionada.']
                    ]
                ], 422);
            }
            throw $e;
        }
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

        if (! $this->enAlcance($precioVenta)) {
            return response()->json(['message' => 'El precio de venta no pertenece a tu organización.'], 403);
        }

        // La organización no se puede reasignar.
        $validatedData['id_organizacion'] = $precioVenta->id_organizacion;

        try {
            // Actualizar el registro en la base de datos
            $precioVenta->update($validatedData);

            return response()->json(['message' => 'Precio de venta actualizado correctamente', 'data' => $precioVenta], 200);
        } catch (QueryException $e) {
            if ($e->getCode() == 23505 || $e->getCode() == 1062) {
                return response()->json([
                    'errors' => [
                        'id_producto' => ['Ya existe un precio de venta para este producto en la sucursal seleccionada.']
                    ]
                ], 422);
            }
            throw $e;
        }
    }
    public function estadoPrecioVenta($id, Request $request)
    {
        // Formalizar: convertir "Activo"/"Inactivo" al id_tipoestado real
        $tipoEstado = TipoEstado::where('descripcion', $request->id_tipoestado)->firstOrFail();
        
        // Buscar el precio de venta por ID
        $precioVenta = PrecioVenta::findOrFail($id);

        if (! $this->enAlcance($precioVenta)) {
            return response()->json(['message' => 'El precio de venta no pertenece a tu organización.'], 403);
        }

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

        if (! $this->enAlcance($precio_ventas)) {
            return response()->json(['message' => 'El precio de venta no pertenece a tu organización.'], 403);
        }

        $precio_ventas->delete();

        return response()->json(['message' => 'Precio de venta eliminada correctamente']);
    }
}
