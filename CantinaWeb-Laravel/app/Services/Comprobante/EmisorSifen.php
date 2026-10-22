<?php

namespace App\Services\Comprobante;

use App\Contracts\EmisorComprobante;
use App\Models\Transacciones;

/**
 * Emisión electrónica (SIFEN) — PREPARADA, NO IMPLEMENTADA.
 *
 * Deja el punto de extensión listo: cuando la facturación electrónica sea
 * obligatoria, acá se arma el XML, se firma con el certificado, se envía a la
 * API y se guarda el CDC. El resto del sistema no cambia.
 */
class EmisorSifen implements EmisorComprobante
{
    public function nombre(): string
    {
        return 'sifen';
    }

    public function habilitado(): bool
    {
        return (bool) config('facturacion.sifen.habilitado', false);
    }

    public function emitir(array $documento, ?Transacciones $transaccion = null): array
    {
        if (! $this->habilitado()) {
            throw new \RuntimeException('La facturación electrónica (SIFEN) todavía no está habilitada.');
        }

        // TODO(SIFEN): generar XML, firmar, enviar y guardar el CDC.
        throw new \RuntimeException('La emisión electrónica (SIFEN) aún no está implementada.');
    }
}
