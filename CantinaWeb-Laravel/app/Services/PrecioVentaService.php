<?php

namespace App\Services;

use App\Models\PrecioVenta;
use App\Models\Producto;

/**
 * Precio de venta vigente para un producto en una organización/sucursal.
 *
 * Es la ÚNICA fuente de verdad del precio que se cobra: tanto la consulta del
 * POS como la venta usan esta misma resolución. Así el backend no depende del
 * precio que mande el cliente.
 */
class PrecioVentaService
{
    /** Prioridad: precio de la SUCURSAL; si no hay, el de la organización. */
    public static function precioDe(Producto $producto, ?int $idOrganizacion, ?int $idSucursal): float
    {
        $precio = null;

        if ($idSucursal) {
            $precio = PrecioVenta::where('id_producto', $producto->id)
                ->where('id_sucursal', $idSucursal)
                ->where('id_tipoestado', 1)
                ->first();
        }

        if (! $precio && $idOrganizacion) {
            $precio = PrecioVenta::where('id_producto', $producto->id)
                ->where('id_organizacion', $idOrganizacion)
                ->where('id_tipoestado', 1)
                ->first();
        }

        if ($precio) {
            return (float) $precio->precio;
        }

        // Mismo fallback que usa el POS: si no hay precio de venta, el de compra.
        return (float) ($producto->precio_venta ?: $producto->precio_compra);
    }
}
