<?php

namespace App\Enums;

/**
 * Estados posibles de un documento de transacción (tabla `tipo_estados`).
 *
 * Es el subconjunto de `tipo_estados` que aplica a transacciones: el catálogo
 * es compartido (users, productos, personas, precio_venta, cuotas), pero la
 * semántica de posteo es propia del documento.
 *
 * El estado define si el documento ya impactó el kardex: mientras está en
 * ACTIVO es un "borrador" (parqueado, SIN efecto en stock); recién al pasar a
 * un estado posteado (FINALIZADO / POSITIVO / NEGATIVO) se registran los
 * movimientos de inventario y el documento se vuelve inmutable.
 */
enum EstadoTransaccion: int
{
    case ACTIVO     = 1;  // Borrador / parqueado (sin efecto en stock)
    case FINALIZADO = 3;  // Posteado (compra / venta)
    case POSITIVO   = 5;  // Posteado (ajuste de entrada)
    case NEGATIVO   = 6;  // Posteado (ajuste de salida)
    case ANULADA    = 7;  // Anulada (nunca se borra físicamente)

    /**
     * ¿El documento ya impactó el kardex?
     *
     * Finalizado / Positivo / Negativo son los estados POSTEADOS.
     */
    public function estaPosteada(): bool
    {
        return match ($this) {
            self::FINALIZADO, self::POSITIVO, self::NEGATIVO => true,
            default => false,
        };
    }

    /** ¿Es un borrador parqueado (aún sin efecto en stock)? */
    public function esBorrador(): bool
    {
        return $this === self::ACTIVO;
    }

    /** ¿Fue anulada? */
    public function esAnulada(): bool
    {
        return $this === self::ANULADA;
    }
}
