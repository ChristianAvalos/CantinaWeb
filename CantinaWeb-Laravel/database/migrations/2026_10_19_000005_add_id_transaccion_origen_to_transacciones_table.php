<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Vínculo de una Nota de Crédito con la factura que revierte.
 *
 * La anulación de una venta facturada no borra la factura: se emite una Nota de
 * Crédito que la referencia, así el historial fiscal queda completo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transacciones', function (Blueprint $table) {
            $table->unsignedBigInteger('id_transaccion_origen')->nullable()->after('id_TipoComprobante');
            $table->foreign('id_transaccion_origen')->references('id')->on('transacciones')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transacciones', function (Blueprint $table) {
            $table->dropForeign(['id_transaccion_origen']);
            $table->dropColumn('id_transaccion_origen');
        });
    }
};
