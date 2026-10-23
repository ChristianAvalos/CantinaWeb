<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Completa el IVA de las líneas históricas.
 *
 * Las líneas creadas antes de que existiera `monto_iva` quedaron en 0 aunque su
 * tipo sea 10% o 5%. Se recalcula desde el subtotal para que los reportes y las
 * reimpresiones no muestren IVA en cero.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('transacciones_detalles')
            ->whereIn('tipo_iva', ['10', '5'])
            ->where('monto_iva', 0)
            ->where('subtotal', '<>', 0)
            ->orderBy('id')
            ->chunkById(500, function ($detalles) {
                foreach ($detalles as $detalle) {
                    $subtotal = (float) $detalle->subtotal;
                    $alicuota = $detalle->tipo_iva === '5' ? 0.05 : 0.10;

                    DB::table('transacciones_detalles')->where('id', $detalle->id)->update([
                        'monto_iva' => round($subtotal - ($subtotal / (1 + $alicuota)), 4),
                    ]);
                }
            });
    }

    public function down(): void
    {
        // Dato derivado: no se revierte para no borrar IVA ya calculado.
    }
};
