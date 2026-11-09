<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Libro de la cuenta corriente del alumno.
 *
 * Es la fuente de verdad del saldo: NO se edita un campo "saldo" a mano.
 *   saldo = abonos confirmados - cargos confirmados
 * Positivo => saldo a favor; negativo => deuda.
 *
 * `estado` deja preparado el flujo de pasarela: un pago nace `pendiente` y
 * recién impacta el saldo cuando pasa a `confirmado`. `referencia_externa` y
 * `datos_extra` guardan la respuesta del proveedor cuando se integre.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cuenta_movimientos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_organizacion');
            $table->unsignedBigInteger('id_sucursal')->nullable();
            // Titular de la cuenta (alumno).
            $table->unsignedBigInteger('id_persona');
            // compra | pago | recarga | ajuste | devolucion
            $table->string('tipo', 20);
            // cargo (suma deuda) | abono (reduce deuda / genera saldo a favor)
            $table->string('direccion', 10);
            $table->decimal('monto', 19, 4);
            // Venta que originó el cargo (solo tipo compra).
            $table->unsignedBigInteger('id_transaccion')->nullable();
            // Quién pagó (puede ser el tutor, no el titular).
            $table->unsignedBigInteger('id_persona_pagador')->nullable();
            $table->unsignedBigInteger('id_forma_pago')->nullable();
            // pendiente | confirmado | rechazado | anulado
            $table->string('estado', 20)->default('confirmado');
            // Reservado para la futura pasarela de pagos.
            $table->string('referencia_externa', 100)->nullable();
            $table->string('descripcion', 255)->nullable();
            $table->dateTime('fecha_hora');
            $table->json('datos_extra')->nullable();
            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            $table->index(['id_persona', 'estado']);
            $table->index(['id_organizacion', 'estado']);
            $table->index('id_transaccion');

            $table->foreign('id_organizacion')->references('id')->on('organizacion');
            $table->foreign('id_sucursal')->references('id')->on('sucursales')->nullOnDelete();
            $table->foreign('id_persona')->references('id')->on('personas')->restrictOnDelete();
            $table->foreign('id_transaccion')->references('id')->on('transacciones')->nullOnDelete();
            $table->foreign('id_persona_pagador')->references('id')->on('personas')->nullOnDelete();
            $table->foreign('id_forma_pago')->references('id')->on('forma_pagos')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cuenta_movimientos');
    }
};
