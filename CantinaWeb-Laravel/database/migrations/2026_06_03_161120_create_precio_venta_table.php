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
        Schema::create('precio_venta', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_producto');
            $table->unsignedBigInteger('id_organizacion');    
            $table->unsignedBigInteger('id_tipoestado'); // 1: Activo, 2: Inactivo
            $table->unsignedBigInteger('id_tipo_moneda');
            $table->decimal('precio', 15, 2);
            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();


            $table->foreign('id_tipoestado')->references('id')->on('tipo_estados');
            $table->foreign('id_tipo_moneda')->references('id')->on('tipo_monedas');
            $table->foreign('id_producto')->references('id')->on('productos');
            $table->foreign('id_organizacion')->references('id')->on('organizacion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('precio_venta');
    }
};
