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
        Schema::create('transacciones_detalles', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_transaccion');
            $table->unsignedBigInteger('id_producto');
            $table->decimal('cantidad',19,4);
            $table->string('lote')->nullable();
            $table->date('fecha_vencimiento')->nullable();
            $table->decimal('precio_unitario',19,4);
            $table->decimal('subtotal',19,4);
            // IVA queda grabado en la línea: el precio cambia por organización y
            // sucursal, y la factura debe poder reproducirse igual más adelante.
            $table->string('tipo_iva', 10)->default('10');
            $table->decimal('monto_iva', 19, 4)->default(0);
            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            $table->foreign('id_transaccion')->references('id')->on('transacciones')->onDelete('cascade');
            $table->foreign('id_producto')->references('id')->on('productos');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transacciones_detalles');
    }
};
