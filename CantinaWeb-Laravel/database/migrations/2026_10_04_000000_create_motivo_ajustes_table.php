<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Catálogo de motivos de ajuste de inventario (pérdida, robo, merma, etc.).
 *
 * Un ajuste (transacciones.id_TipoMovimiento = 3) puede referenciar un motivo
 * de este catálogo. El motivo viaja además al kardex (movimiento_historial.motivo)
 * para que el Historial de Inventario explique CADA movimiento de stock.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('motivo_ajustes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100);
            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();
        });

        Schema::table('transacciones', function (Blueprint $table) {
            $table->unsignedBigInteger('id_MotivoAjuste')->nullable();
            $table->foreign('id_MotivoAjuste')
                ->references('id')->on('motivo_ajustes')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transacciones', function (Blueprint $table) {
            $table->dropForeign(['id_MotivoAjuste']);
            $table->dropColumn('id_MotivoAjuste');
        });

        Schema::dropIfExists('motivo_ajustes');
    }
};
