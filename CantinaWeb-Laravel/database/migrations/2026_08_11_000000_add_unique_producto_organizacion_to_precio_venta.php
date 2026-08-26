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
        Schema::table('precio_venta', function (Blueprint $table) {
            $table->unique(['id_producto', 'id_organizacion'], 'uk_precio_venta_producto_org');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('precio_venta', function (Blueprint $table) {
            $table->dropUnique('uk_precio_venta_producto_org');
        });
    }
};
