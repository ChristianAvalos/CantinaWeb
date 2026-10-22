<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * IVA por línea de la transacción.
 *
 * El IVA no puede depender del producto: el precio cambia por organización y
 * sucursal, así que la línea es la que manda y queda grabada. Se guarda el tipo
 * (10 / 5 / exenta) y el monto de IVA contenido en el subtotal, para que la
 * factura sea reproducible aunque después cambien los precios.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transacciones_detalles', function (Blueprint $table) {
            $table->string('tipo_iva', 10)->default('10')->after('subtotal');
            $table->decimal('monto_iva', 19, 4)->default(0)->after('tipo_iva');
        });
    }

    public function down(): void
    {
        Schema::table('transacciones_detalles', function (Blueprint $table) {
            $table->dropColumn(['tipo_iva', 'monto_iva']);
        });
    }
};
