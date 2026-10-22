<?php

namespace App\Services\Comprobante;

use App\Contracts\EmisorComprobante;
use App\Models\Transacciones;

/**
 * Emisión impresa (la de hoy).
 *
 * No habla con ningún servicio externo: el documento queda guardado como
 * snapshot y el cliente lo imprime en la ticketera o la impresora del local.
 */
class EmisorImpreso implements EmisorComprobante
{
    public function nombre(): string
    {
        return 'impreso';
    }

    public function habilitado(): bool
    {
        return true;
    }

    public function emitir(array $documento, ?Transacciones $transaccion = null): array
    {
        return [
            'estado' => 'impreso',
            'referencia' => null,
        ];
    }
}
