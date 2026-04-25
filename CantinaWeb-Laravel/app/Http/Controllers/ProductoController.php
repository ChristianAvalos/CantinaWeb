<?php

namespace App\Http\Controllers;

use DateTime;
use Carbon\Carbon;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\CreateProductoRequest;
use App\Http\Requests\UpdateProductoRequest;

class ProductoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $mes = $request->input('mes');
        $id_organizacion = Auth::user()->id_organizacion;

        // Si el search es una fecha en formato dd/mm/yyyy, la convertimos a yyyy-mm-dd
        if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $search)) {
            $fecha = DateTime::createFromFormat('d/m/Y', $search);
            if ($fecha) {
                $searchFecha = $fecha->format('Y-m-d');
            } else {
                $searchFecha = null;
            }
        } else {
            $searchFecha = null;
        }

        $productos = Producto::with(['categoria', 'tipoEstado', 'unidadMedida'])
            ->whereNull('id_organizacion')
                ->orWhere('id_organizacion', $id_organizacion)
            ->when($search, function ($query, $search) use ($searchFecha) {
                $query->where(function ($q) use ($search, $searchFecha) {
                    $q->where('nombre', 'like', '%' . $search . '%')
                        ->orWhere('precio_compra', 'like', '%' . $search . '%')
                        ->orWhere('codigo_interno', 'like', '%' . $search . '%')
                        ->orWhere('codigo_barras', 'like', '%' . $search . '%')
                        ->orWhere('descripcion', 'like', '%' . $search . '%')
                        ->orWhereHas('categoria', function ($q2) use ($search) {
                            $q2->where('nombre', 'like', '%' . $search . '%');
                        });

                    // Si el search es una fecha válida, buscar por fecha exacta
                    if ($searchFecha) {
                        $q->orWhereDate('UrevFechaHora', $searchFecha);
                    }
                });
            })
            // Filtro por mes si viene el parámetro
            ->when($mes, function ($query, $mes) {
                [$anio, $mesNum] = explode('-', $mes); // $mes debe venir como 'YYYY-MM'
                $query->whereYear('UrevFechaHora', $anio)
                    ->whereMonth('UrevFechaHora', $mesNum);
            })
            ->orderBy('id', 'desc')
            ->paginate(10);

        //sumo los montos de los productos
        $subtotal = $productos->sum('precio_compra');


        return response()->json([
            'productos' => $productos,
            'subtotal' => $subtotal
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function createProducto(CreateProductoRequest $request)
    {
        $data = $request->validated();

        // Subir la imagen si está presente
        if ($request->hasFile('imagen')) {
            // Obtener el archivo
            $imagen = $request->file('imagen');

            // Obtener la extensión del archivo
            $extension = $imagen->getClientOriginalExtension();

            // Renombrar el archivo con el nombre de la Razón Social
            $fileName = $data['nombre'] . '.' . $extension;

            // Eliminar la imagen anterior
            $path = public_path('img/producto/' . $fileName);

            if (file_exists($path)) {
                unlink($path);
            }

            // Mover el archivo a la carpeta public/img
            $imagen->move(public_path('img/producto'), $fileName);

            // Asignar el nombre del archivo a los datos
            $data['imagen'] = $fileName;
        } else {
            // Si no se sube imagen, puedes asignar un valor predeterminado
            $data['imagen'] = null;
        }

        // Crear el producto
        $producto = Producto::create([
            'id_organizacion' => null, 
            'codigo_interno' => $data['codigo_interno'] ?? null,
            'codigo_barras' => $data['codigo_barras'] ?? null,
            'nombre' => $data['nombre'],
            'descripcion' => $data['descripcion'] ?? null,
            'id_Categoria' => $data['id_Categoria'],
            'cantidad_unidad' => $data['cantidad_unidad'] ?? 1,
            'id_TipoUnidadMedida' => $data['id_TipoUnidadMedida'],
            'precio_compra' => $data['precio_compra'],
            'precio_venta' => $data['precio_venta'],
            'stock_minimo' => $data['stock_minimo'],
            'stock_actual' => $data['stock_actual'] ?? 0, // Inicialmente igual al stock mínimo
            'id_TipoEstado' => $data['id_TipoEstado'] ?? null,
            'imagen' => $data['imagen'],
            'created_at' => $data['fecha'] ?? Carbon::now(),
            'UrevUsuario' => 'Creado - ' . Auth::user()->name,
            'UrevFechaHora' => Carbon::now()
        ]);
        // Retornar respuesta exitosa
        return response()->json([
            'message' => 'Producto creado exitosamente'
        ], 201);
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
    public function show(Producto $producto)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Producto $producto)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function updateProducto(UpdateProductoRequest $request, $id)
    {
        $data = $request->validated();

        // Buscar el producto por su ID
        $producto = Producto::findOrFail($id);

        // Subir la imagen si está presente
        if ($request->hasFile('imagen')) {
            // Obtener el archivo
            $imagen = $request->file('imagen');

            // Obtener la extensión del archivo
            $extension = $imagen->getClientOriginalExtension();

            // Renombrar el archivo con el nombre de la Razón Social
            $fileName = $data['nombre'] . '.' . $extension;

            // Eliminar la imagen anterior
            $path = public_path('img/producto/' . $fileName);

            if (file_exists($path)) {
                unlink($path);
            }

            // Mover el archivo a la carpeta public/img
            $imagen->move(public_path('img/producto'), $fileName);

            // Asignar el nombre del archivo a los datos
            $data['imagen'] = $fileName;
        } else {
            // Si no se sube imagen, puedes asignar un valor predeterminado
            $data['imagen'] = $producto->imagen;
        }

        // Actuaizar el producto
        $producto->update([
            'codigo_interno' => $data['codigo_interno'] ?? null,
            'codigo_barras' => $data['codigo_barras'] ?? null,
            'nombre' => $data['nombre'],
            'descripcion' => $data['descripcion'] ?? null,
            'id_Categoria' => $data['id_Categoria'],
            'cantidad_unidad' => $data['cantidad_unidad'] ?? 1,
            'id_TipoUnidadMedida' => $data['id_TipoUnidadMedida'],
            'precio_compra' => $data['precio_compra'],
            'precio_venta' => $data['precio_venta'],
            'stock_minimo' => $data['stock_minimo'],
            'stock_actual' => $data['stock_actual'] ?? $producto->stock_actual,
            'id_TipoEstado' => $data['id_TipoEstado'] ?? null,
            'imagen' => $data['imagen'],
            'created_at' => $data['fecha'] ?? $producto->created_at,
            'UrevUsuario' => 'Editado - ' . Auth::user()->name,
            'UrevFechaHora' => Carbon::now()
        ]);
        // Retornar respuesta exitosa
        return response()->json([
            'message' => 'Producto creado exitosamente'
        ], 201);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function deleteProducto($id)
    {
        // Eliminar el producto por su ID
        $producto = Producto::findOrFail($id);

        // Eliminar la imagen si está presente
        if ($producto->imagen) {
            $path = public_path('/img/producto/' . $producto->imagen);

            if (file_exists($path)) {
                unlink($path);
            }
        }

        $producto->delete();

        return response()->json(['message' => 'Producto eliminado correctamente.'], 200);
    }
    /**
     * Buscar producto por código de barras
     */
    public function buscarPorCodigoBarras(Request $request)
    {
        $codigo_barras = $request->query('codigo_barras');
        $id_organizacion = Auth::user()->id_organizacion;
        if (!$codigo_barras) {
            return response()->json(['message' => 'Código de barras requerido'], 400);
        }
        $producto = Producto::where('codigo_barras', $codigo_barras)
            ->where('id_organizacion', $id_organizacion)
            ->first();
        if ($producto) {
            return response()->json(['producto' => $producto], 200);
        } else {
            return response()->json(['producto' => null], 200);
        }
    }
}
