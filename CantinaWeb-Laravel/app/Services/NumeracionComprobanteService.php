<?php

namespace App\Services;

use App\Models\ComprobanteSecuencia;
use App\Models\DatosFacturacion;
use App\Models\Sucursal;

/**
 * Numeración de comprobantes.
 *
 * Paraguay: el número de factura tiene la forma EEE-PPP-NNNNNNN, donde
 *   EEE = establecimiento, PPP = punto de expedición (ambos de la sucursal) y
 *   NNNNNNN = secuencial dentro de ese punto.
 *
 * El secuencial no se puede repetir ni saltear, así que se incrementa con
 * bloqueo de fila (`lockForUpdate`) DENTRO de la transacción que crea la venta:
 * si la venta falla, el número también se revierte.
 *
 * OJO: siempre hay que llamarlo dentro de una transacción de BD.
 */
class NumeracionComprobanteService
{
    /**
     * Reserva el próximo número y devuelve el comprobante ya formateado.
     *
     * @throws \RuntimeException si falta el dato de facturación o la sucursal.
     */
    public static function siguiente(int $idOrganizacion, int $idSucursal, int $idTipoComprobante): string
    {
        $datos = DatosFacturacion::activoDe($idOrganizacion);

        if (! $datos) {
            throw new \RuntimeException('La organización no tiene datos de facturación cargados.');
        }

        $sucursal = Sucursal::find($idSucursal);

        if (! $sucursal) {
            throw new \RuntimeException('La sucursal no existe: no se puede numerar el comprobante.');
        }

        // firstOrCreate + lock: la fila que se bloquea es siempre la misma para
        // ese punto de expedición, así dos cajas no pueden tomar el mismo número.
        $secuencia = ComprobanteSecuencia::firstOrCreate(
            [
                'id_datos_facturacion' => $datos->id,
                'id_sucursal' => $idSucursal,
                'id_tipo_comprobante' => $idTipoComprobante,
            ],
            ['ultimo_numero' => 0]
        );

        $secuencia = ComprobanteSecuencia::whereKey($secuencia->id)->lockForUpdate()->first();

        $secuencia->ultimo_numero = (int) $secuencia->ultimo_numero + 1;
        $secuencia->save();

        return self::formatear(
            $sucursal->establecimiento,
            $sucursal->punto_expedicion,
            $secuencia->ultimo_numero
        );
    }

    /** EEE-PPP-NNNNNNN */
    public static function formatear(?string $establecimiento, ?string $puntoExpedicion, int $numero): string
    {
        return sprintf(
            '%03d-%03d-%07d',
            (int) ($establecimiento ?: 1),
            (int) ($puntoExpedicion ?: 1),
            $numero
        );
    }
}
