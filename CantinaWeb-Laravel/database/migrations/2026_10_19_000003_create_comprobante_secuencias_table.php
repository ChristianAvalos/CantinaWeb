<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Contador de numeración de comprobantes.
 *
 * Cuelga del dato de facturación (timbrado) porque la numeración autorizada es
 * la de ese timbrado: al emitirse uno nuevo, el secuencial arranca de cero.
 * Se separa además por sucursal (punto de expedición) y tipo de comprobante.
 *
 * El contador se incrementa con bloqueo de fila dentro de la misma transacción
 * que crea la venta, para no repetir ni saltear números.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comprobante_secuencias', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_datos_facturacion');
            $table->unsignedBigInteger('id_sucursal');
            $table->unsignedBigInteger('id_tipo_comprobante');
            $table->unsignedBigInteger('ultimo_numero')->default(0);
            $table->timestamps();

            $table->unique(
                ['id_datos_facturacion', 'id_sucursal', 'id_tipo_comprobante'],
                'comp_seq_unica'
            );

            $table->foreign('id_datos_facturacion')->references('id')->on('datos_facturacion')->cascadeOnDelete();
            $table->foreign('id_sucursal')->references('id')->on('sucursales')->cascadeOnDelete();
            $table->foreign('id_tipo_comprobante')->references('id')->on('tipo_comprobantes')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comprobante_secuencias');
    }
};
