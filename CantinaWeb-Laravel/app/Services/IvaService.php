<?php

namespace App\Services;

/**
 * Desglose de IVA para una línea de venta.
 *
 * Los precios se manejan con IVA incluido, así que desde el subtotal de la
 * línea se obtiene el IVA contenido y la base imponible.
 *
 * Tipos admitidos:
 *   10     → IVA 10%  (base = subtotal / 1.10)
 *   5      → IVA 5%   (base = subtotal / 1.05)
 *   exenta → sin IVA  (base = subtotal, iva = 0)
 */
class IvaService
{
    public const TIPO_10 = '10';
    public const TIPO_5 = '5';
    public const EXENTA = 'exenta';

    public const TIPOS = [self::TIPO_10, self::TIPO_5, self::EXENTA];

    /** Alícuota aplicable al tipo (0 para exenta). */
    public static function alicuota(string $tipo): float
    {
        return match ($tipo) {
            self::TIPO_10 => 0.10,
            self::TIPO_5 => 0.05,
            default => 0.0,
        };
    }

    public static function esTipoValido(?string $tipo): bool
    {
        return in_array($tipo, self::TIPOS, true);
    }

    /**
     * @return array{tipo_iva: string, base_imponible: float, monto_iva: float}
     */
    public static function desglosar(float $subtotalConIva, string $tipo): array
    {
        $tipo = self::esTipoValido($tipo) ? $tipo : self::TIPO_10;
        $alicuota = self::alicuota($tipo);

        if ($alicuota <= 0) {
            return [
                'tipo_iva' => $tipo,
                'base_imponible' => round($subtotalConIva, 4),
                'monto_iva' => 0.0,
            ];
        }

        $base = $subtotalConIva / (1 + $alicuota);

        return [
            'tipo_iva' => $tipo,
            'base_imponible' => round($base, 4),
            'monto_iva' => round($subtotalConIva - $base, 4),
        ];
    }
}
