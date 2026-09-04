<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Comprobantes de venta (snapshot impreso).
     *
     * Almacena una copia JSON fiel de TODO lo que se imprime en el comprobante
     * al cobrar (empresa, cliente, ítems, totales, medio de pago, etc.). Se usa
     * para reimprimir desde "Ventas" exactamente lo mismo que se imprimió la
     * primera vez, aunque las tablas relacionadas (productos, personas, org)
     * cambien su valor después de la venta.
     *
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('comprobantes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_transaccion');
            $table->unsignedBigInteger('id_organizacion')->nullable();
            $table->json('datos'); // Snapshot estructurado de lo impreso
            $table->unsignedBigInteger('id_usuario')->nullable(); // Cajero que generó el comprobante
            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            $table->foreign('id_transaccion')->references('id')->on('transacciones')->onDelete('cascade');
            $table->foreign('id_organizacion')->references('id')->on('organizacion')->onDelete('cascade');
            $table->foreign('id_usuario')->references('id')->on('users')->onDelete('set null');
            $table->index('id_transaccion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comprobantes');
    }
};
