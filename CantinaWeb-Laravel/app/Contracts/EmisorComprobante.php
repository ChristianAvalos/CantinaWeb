<?php

namespace App\Contracts;

use App\Models\Transacciones;

/**
 * Emisor de comprobantes.
 *
 * El sistema arma un único documento fiscal (ver DocumentoFiscalService) y este
 * contrato define CÓMO se emite. Hoy hay una implementación impresa; cuando la
 * facturación electrónica sea obligatoria se agrega la de SIFEN sin tocar el
 * resto del sistema: solo se cambia la configuración.
 */
interface EmisorComprobante
{
    /** Identificador del emisor (se guarda en el snapshot). */
    public function nombre(): string;

    /** ¿Está operativo? Un emisor deshabilitado no debe usarse. */
    public function habilitado(): bool;

    /**
     * Emite el documento.
     *
     * @param  array  $documento  Documento canónico generado por DocumentoFiscalService.
     * @return array{estado: string, referencia?: string|null}
     */
    public function emitir(array $documento, ?Transacciones $transaccion = null): array;
}
