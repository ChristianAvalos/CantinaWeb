<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * IVA por producto.
 *
 * El POS cobraba siempre IVA 10% porque no había forma de saber la condición
 * fiscal del producto. Con esta columna el precio incluye el IVA del producto y
 * la factura desglosa 10%, 5% o exenta según corresponda.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->string('tipo_iva', 10)->default('10')->after('precio_venta');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('tipo_iva');
        });
    }
};
