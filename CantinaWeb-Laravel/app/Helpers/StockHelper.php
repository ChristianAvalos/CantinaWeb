<?php

namespace App\Helpers;

use App\Models\Producto;

class StockHelper
{
    /**
     * Calcula y actualiza el stock de un producto según el tipo de operación.
     *
     * @param int    $id_producto   ID del producto
     * @param float  $cantidad      Cantidad a sumar/restar (en actualización es la diferencia)
     * @param string $tipoOperacion 'entrada' | 'salida' | 'actualizacion'
     * @param string $usuario       Nombre del usuario que realiza la operación
     * @return float                Nuevo stock total
     */
    public static function calcular(int $id_producto, float $cantidad, string $tipoOperacion, string $usuario): float
    {
        $stockAnterior = (float) Producto::where('id', $id_producto)->value('stock_actual');

        $stocktotal = match ($tipoOperacion) {
            'salida'         => $stockAnterior - $cantidad,
            'entrada'        => $stockAnterior + $cantidad,
            'actualizacion'  => $stockAnterior + $cantidad, // $cantidad es la diferencia
            default          => $stockAnterior,
        };

        if ($stocktotal < 0) {
            $stocktotal = 0;
        }

        Producto::where('id', $id_producto)->update([
            'stock_actual'  => $stocktotal,
            'UrevUsuario'   => $usuario,
            'UrevFechaHora' => now(),
        ]);

        return $stocktotal;
    }
}
