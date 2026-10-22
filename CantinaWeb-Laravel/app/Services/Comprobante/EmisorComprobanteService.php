<?php

namespace App\Services\Comprobante;

use App\Contracts\EmisorComprobante;
use App\Models\DatosFacturacion;
use InvalidArgumentException;

/**
 * Resuelve el emisor de una organización.
 *
 * El emisor es una decisión POR ORGANIZACIÓN (SaaS): cada inquilino guarda el
 * suyo en `datos_facturacion.Emisor`. La configuración global solo aporta el
 * valor por defecto para organizaciones sin preferencia y los datos de
 * infraestructura (URL de SIFEN).
 */
class EmisorComprobanteService
{
    public static function resolver(?DatosFacturacion $datos = null): EmisorComprobante
    {
        $emisor = $datos?->Emisor ?: config('facturacion.emisor', DatosFacturacion::EMISOR_IMPRESO);

        return match ($emisor) {
            DatosFacturacion::EMISOR_SIFEN => new EmisorSifen(),
            DatosFacturacion::EMISOR_IMPRESO => new EmisorImpreso(),
            default => throw new InvalidArgumentException('Emisor de comprobantes no válido: ' . $emisor),
        };
    }
}
