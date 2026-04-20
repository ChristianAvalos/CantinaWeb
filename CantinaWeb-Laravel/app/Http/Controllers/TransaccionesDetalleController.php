<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\TransaccionesDetalle;
use App\Models\Transacciones;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\UpdateTransaccionDetalleRequest; 
use App\Http\Requests\CreateTransaccionDetalleRequest; 

class TransaccionesDetalleController extends Controller
{
    private function recalcularMontoCabecera($idTransaccion): float
    {
        $subtotal = TransaccionesDetalle::where('id_transaccion', $idTransaccion)->sum('subtotal');
        $subtotal = (float) $subtotal;

        Transacciones::where('id', $idTransaccion)->update([
            'monto' => $subtotal,
            'UrevUsuario' => Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return $subtotal;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $id_organizacion = Auth::user()->id_organizacion;
        $search = $request->input('search');
        $id_transaccion = $request->input('id_transaccion');

        // Si no hay id_transaccion, retornar vacío
        if (!$id_transaccion) {
            return response()->json([
                'transaccionesDetalle' => [
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'total' => 0,
                ]
            ]);
        }

        $transaccionesDetalle = TransaccionesDetalle::with(['producto'])
            ->whereHas('transaccion', function ($query) use ($id_organizacion, $id_transaccion) {
                $query->where('id_organizacion', $id_organizacion);
                if ($id_transaccion) {
                    $query->where('id', $id_transaccion);
                }
            })
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('cantidad', 'like', '%' . $search . '%')
                        ->orWhere('precio_unitario', 'like', '%' . $search . '%')
                        ->orWhereHas('producto', function ($q2) use ($search) {
                            $q2->where('nombre', 'like', '%' . $search . '%');
                        });
                });
            })
            ->orderBy('id', 'desc')
            ->paginate(5);

        $subtotal = TransaccionesDetalle::where('id_transaccion', $id_transaccion)
            ->whereHas('transaccion', function ($query) use ($id_organizacion) {
                $query->where('id_organizacion', $id_organizacion);
            })
            ->sum('subtotal');

        return response()->json([
            'transaccionesDetalle' => $transaccionesDetalle,
            'subtotal' => $subtotal
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function createTransaccionDetalle(CreateTransaccionDetalleRequest $request)
    {
        $data = $request->validated();

        $id_organizacion = Auth::user()->id_organizacion;
        $usuario = Auth::user()->name;

        // Buscar el producto por código de barras y organización
        $producto = \App\Models\Producto::where('codigo_barras', $request->codigo_barras)
            ->where('id_organizacion', $id_organizacion)
            ->first();
        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        // Aquí deberías recibir el id_transaccion desde el frontend, si no, ajusta según tu lógica
        $id_transaccion = $request->input('id_transaccion');
        if (!$id_transaccion) {
            return response()->json(['message' => 'ID de transacción requerido'], 422);
        }

        $cantidad = (float) $request->cantidad;
        $precioUnitario = (float) $request->precio_unitario;
        $subtotal = $cantidad * $precioUnitario;

        $detalle = TransaccionesDetalle::create([
            'id_transaccion' => $id_transaccion,
            'id_producto' => $producto->id,
            'cantidad' => $cantidad,
            'precio_unitario' => $precioUnitario,
            'subtotal' => $subtotal,
            'UrevUsuario' => $usuario,
            'UrevFechaHora' => $request->Fecha ?? now(),
        ]);

        $montoCabecera = $this->recalcularMontoCabecera($id_transaccion);

        return response()->json([
            'message' => 'Detalle creado exitosamente.',
            'detalle' => $detalle,
            'monto_cabecera' => $montoCabecera
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
    public function show(TransaccionesDetalle $transaccionesDetalle)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(TransaccionesDetalle $transaccionesDetalle)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function updateTransaccionDetalle(UpdateTransaccionDetalleRequest $request, $id)
    {
        $data = $request->validated();
        $detalle = TransaccionesDetalle::findOrFail($id);

        $id_organizacion = Auth::user()->id_organizacion;
        $usuario = Auth::user()->name;

        // Buscar el producto por código de barras y organización
        $producto = \App\Models\Producto::where('codigo_barras', $data['codigo_barras'])
            ->where('id_organizacion', $id_organizacion)
            ->first();

        if (!$producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        $cantidad = (float) $data['cantidad'];
        $precioUnitario = (float) $data['precio_unitario'];
        $subtotal = $cantidad * $precioUnitario;

        // Guardar directamente usando update (fillable)
        $detalle->update([
            'id_producto' => $producto->id,
            'cantidad' => $cantidad,
            'precio_unitario' => $precioUnitario,
            'subtotal' => $subtotal,
            'UrevUsuario' => $usuario,
            'UrevFechaHora' => now(),
        ]);

        $montoCabecera = $this->recalcularMontoCabecera($detalle->id_transaccion);

        return response()->json([
            'message' => 'Detalle actualizado exitosamente.',
            'detalle' => $detalle->load('producto'),
            'monto_cabecera' => $montoCabecera,
        ], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function deleteTransaccionDetalle($id)
    {
        // Eliminar la transacción por su ID
        $transaccionesDetalle = TransaccionesDetalle::findOrFail($id);
        $idTransaccion = $transaccionesDetalle->id_transaccion;
        $transaccionesDetalle->delete();

        $montoCabecera = $this->recalcularMontoCabecera($idTransaccion);

        return response()->json([
            'message' => 'Transacción eliminada correctamente.',
            'monto_cabecera' => $montoCabecera
        ], 200);
    }
}
