<?php

namespace App\Http\Controllers;

use DateTime;
use Carbon\Carbon;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\CreateProductoRequest;
use App\Http\Requests\UpdateProductoRequest;
use App\Http\Controllers\Concerns\AplicaFiltrosDinamicos;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

class ProductoController extends Controller
{
    use PerteneceAOrganizacion;
    use AplicaFiltrosDinamicos;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $mes = $request->input('mes');
        $id_organizacion = $this->organizacionDelUsuario();
        $filtros = $this->normalizarFiltros($request->input('filtros', []));

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

        // Aislamiento estricto: cada organización ve solo sus productos.
        $productos = Producto::with(['categoria', 'tipoEstado', 'unidadMedida'])
            ->where('id_organizacion', $id_organizacion)
            ->when($search, function ($query, $search) use ($searchFecha) {
                $query->where(function ($q) use ($search, $searchFecha) {
                    $term = '%' . strtolower($search) . '%';
                    $q->whereRaw('LOWER(nombre) LIKE ?', [$term])
                        ->orWhere('precio_compra', 'like', '%' . $search . '%')
                        ->orWhereRaw('LOWER(codigo_interno) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(codigo_barras) LIKE ?', [$term])
                        ->orWhereRaw('LOWER(descripcion) LIKE ?', [$term])
                        ->orWhereHas('categoria', function ($q2) use ($term) {
                            $q2->whereRaw('LOWER(nombre) LIKE ?', [$term]);
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
            ->when(!empty($filtros), function ($query) use ($filtros) {
                return $this->aplicarFiltrosDinamicos($query, $filtros, ['search', 'mes']);
            })
            ->orderBy('id', 'desc')
            ->paginate(10);

        // Solo cuando lo pide el POS (?precio_org=1): aplicar el precio de venta
        // personalizado de la organización a cada producto, para que la búsqueda
        // por nombre muestre el MISMO precio que al escanear por código de barras.
        if ($request->boolean('precio_org')) {
            $productos->getCollection()->transform(function ($producto) {
                $producto = $this->aplicarPrecioPersonalizado($producto);

                return $this->aplicarStockSucursal($producto);
            });
        }

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
            'id_organizacion' => $this->organizacionDelUsuario(),
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

        if (! $this->enAlcance($producto)) {
            return response()->json(['message' => 'El producto no pertenece a tu organización.'], 403);
        }

        // Subir la imagen si está presente
        if ($request->has('eliminar_imagen') && $request->eliminar_imagen) {
            // Eliminar la imagen física anterior
            if ($producto->imagen) {
                $path = public_path('img/producto/' . $producto->imagen);
                if (file_exists($path)) {
                    unlink($path);
                }
            }
            $data['imagen'] = null;
        } elseif ($request->hasFile('imagen')) {
            // Obtener el archivo
            $imagen = $request->file('imagen');

            // Obtener la extensión del archivo
            $extension = $imagen->getClientOriginalExtension();

            // Renombrar el archivo con el nombre de la Razón Social
            $fileName = $data['nombre'] . '.' . $extension;

            // Eliminar la imagen anterior (usar el nombre viejo, no el nuevo)
            if ($producto->imagen) {
                $oldPath = public_path('img/producto/' . $producto->imagen);
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
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
            // stock_actual NO se actualiza aquí a propósito: el stock solo se
            // mueve mediante transacciones (compra/venta/ajuste) vía InventarioService,
            // que deja el movimiento registrado en el kardex (movimiento_historial).
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

        if (! $this->enAlcance($producto)) {
            return response()->json(['message' => 'El producto no pertenece a tu organización.'], 403);
        }

        $imagenAEliminar = $producto->imagen;

        // Primero eliminar el registro de la BD
        $producto->delete();

        // Luego eliminar la imagen física (solo si el delete fue exitoso)
        if ($imagenAEliminar) {
            $path = public_path('/img/producto/' . $imagenAEliminar);
            if (file_exists($path)) {
                unlink($path);
            }
        }

        return response()->json(['message' => 'Producto eliminado correctamente.'], 200);
    }
    /**
     * Buscar producto por código de barras.
     * Si el usuario pertenece a una organización y dicha organización tiene
     * un precio de venta personalizado para el producto, se devuelve ese precio
     * en lugar del precio_venta de referencia de la tabla productos.
     */
    public function buscarPorCodigoBarras(Request $request)
    {
        $codigo_barras = $request->query('codigo_barras');
        if (!$codigo_barras) {
            return response()->json(['message' => 'Código de barras requerido'], 400);
        }

        $producto = Producto::where('codigo_barras', $codigo_barras)
            ->where('id_TipoEstado', 1)
            ->where('id_organizacion', $this->organizacionDelUsuario())
            ->first();

        if ($producto) {
            // Aplicar el precio de venta personalizado de la organización
            $this->aplicarPrecioPersonalizado($producto);
            // Exponer el stock de la sucursal del usuario (el POS valida con esto).
            $this->aplicarStockSucursal($producto);

            return response()->json(['producto' => $producto], 200);
        } else {
            return response()->json(['producto' => null], 200);
        }
    }

    /**
     * Agrega `stock_sucursal` con el stock del producto en la sucursal del
     * usuario (si tiene). Si no tiene sucursal, deja el total del producto.
     */
    private function aplicarStockSucursal(Producto $producto): Producto
    {
        $idSucursal = $this->sucursalDelUsuario();

        $producto->stock_sucursal = $idSucursal
            ? \App\Services\InventarioService::stockEnSucursal($producto->id, $idSucursal)
            : (float) $producto->stock_actual;

        return $producto;
    }

    /**
     * Si el usuario pertenece a una organización y dicha organización tiene
     * un precio de venta personalizado para el producto, aplica ese precio
     * sobre el producto (devuelve el producto con el precio actualizado).
     * Se usa tanto en la búsqueda por código de barras como por nombre,
     * para que el precio mostrado en el POS sea siempre consistente.
     */
    private function aplicarPrecioPersonalizado(Producto $producto): Producto
    {
        $idOrganizacion = $this->organizacionDelUsuario();
        $idSucursal = $this->sucursalDelUsuario();

        // Prioridad: precio de la SUCURSAL del usuario; si no hay, el de la organización.
        $precio = null;

        if ($idSucursal) {
            $precio = \App\Models\PrecioVenta::where('id_producto', $producto->id)
                ->where('id_sucursal', $idSucursal)
                ->where('id_tipoestado', 1) // solo precios activos
                ->first();
        }

        if (! $precio && $idOrganizacion) {
            $precio = \App\Models\PrecioVenta::where('id_producto', $producto->id)
                ->where('id_organizacion', $idOrganizacion)
                ->where('id_tipoestado', 1)
                ->first();
        }

        if ($precio) {
            $producto->precio_venta = $precio->precio;
        }

        return $producto;
    }
}
