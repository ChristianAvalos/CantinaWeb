<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `productos.stock_actual` era integer, pero `transacciones_detalles.cantidad`
 * es decimal(19,4). Se alinea a decimal para poder manejar fracciones
 * (kg, litros) sin perder precisión ni descuadrar el kardex.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->decimal('stock_actual', 19, 4)->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->integer('stock_actual')->default(0)->change();
        });
    }
};
