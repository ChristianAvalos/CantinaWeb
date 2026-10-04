<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Dirección del stock para AJUSTES (entrada|salida).
 *
 * Antes la dirección del ajuste se sobrecargaba en `id_TipoEstado`
 * (5 Positivo / 6 Negativo), pero esos estados son POSTEADOS: un ajuste
 * borrador quedaba marcado como finalizado y bloqueaba editar el detalle.
 *
 * Con esta columna la dirección se persiste SIEMPRE (incluso en borrador) y el
 * estado queda reservado para el ciclo borrador(1) → posteado(5/6) → anulada(7).
 * En compras/ventas la dirección se deriva del tipo de movimiento (1 entrada,
 * 2 salida), por eso la columna queda NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transacciones', function (Blueprint $table) {
            $table->enum('direccion', ['entrada', 'salida'])->nullable()
                ->comment('Dirección del stock en ajustes. NULL en compras/ventas.');
        });

        // Backfill de ajustes existentes desde su estado (datos previos a esta columna).
        DB::table('transacciones')->where('id_TipoMovimiento', 3)->where('id_TipoEstado', 6)
            ->update(['direccion' => 'salida']);
        DB::table('transacciones')->where('id_TipoMovimiento', 3)->where('id_TipoEstado', 5)
            ->update(['direccion' => 'entrada']);
    }

    public function down(): void
    {
        Schema::table('transacciones', function (Blueprint $table) {
            $table->dropColumn('direccion');
        });
    }
};
