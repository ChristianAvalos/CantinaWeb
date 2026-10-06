<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * El código interno de un producto era único a nivel GLOBAL, así que una
 * organización no podía reutilizar un código que ya existía en otra.
 *
 * La unicidad real es POR organización: cada organización maneja su propio
 * catálogo. Es el mismo patrón que ya usa `tipo_movimientos`
 * (tm_org_codigo_unique).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropUnique('productos_codigo_interno_unique');
        });

        Schema::table('productos', function (Blueprint $table) {
            $table->unique(['id_organizacion', 'codigo_interno'], 'productos_org_codigo_interno_unique');
        });
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropUnique('productos_org_codigo_interno_unique');
        });

        Schema::table('productos', function (Blueprint $table) {
            $table->unique('codigo_interno', 'productos_codigo_interno_unique');
        });
    }
};
