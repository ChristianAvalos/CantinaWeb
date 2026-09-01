<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cuotas', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_transaccion');
            $table->unsignedInteger('numero');
            $table->decimal('monto', 19, 4);
            $table->date('fecha_vencimiento');
            $table->unsignedBigInteger('id_TipoEstado'); // FK a tipo_estados (Pendiente / Finalizado)
            $table->date('fecha_pago')->nullable();
            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            $table->foreign('id_transaccion')->references('id')->on('transacciones')->onDelete('cascade');
            $table->foreign('id_TipoEstado')->references('id')->on('tipo_estados');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cuotas');
    }
};
