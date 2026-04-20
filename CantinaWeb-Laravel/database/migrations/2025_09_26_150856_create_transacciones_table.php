<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('transacciones', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_organizacion');
            $table->string('nombre');
            $table->unsignedBigInteger('id_TipoMovimiento');
            $table->unsignedBigInteger('id_TipoEstado');
            $table->decimal('monto',19,4)->default(0);
            $table->unsignedBigInteger('id_usuario');
            $table->unsignedBigInteger('id_persona')->nullable();
            $table->unsignedBigInteger('id_TipoPago')->nullable();
            $table->unsignedBigInteger('id_Caja')->nullable();
            $table->unsignedBigInteger('id_FormaPago')->nullable();
            $table->unsignedBigInteger('id_TipoComprobante')->nullable();
            $table->unsignedBigInteger('id_Moneda')->nullable();
            $table->unsignedBigInteger('id_Banco')->nullable();
            $table->string('descripcion')->nullable();
            $table->string(('nro_comprobante'))->nullable();
            $table->string('lote')->nullable();
            $table->date('fecha')->nullable();
            $table->string('UrevUsuario')->nullable(); 
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            $table->foreign('id_organizacion')->references('id')->on('organizacion');
            $table->foreign('id_TipoMovimiento')->references('id')->on('tipo_movimientos');
            $table->foreign('id_TipoEstado')->references('id')->on('tipo_estados');
            $table->foreign('id_usuario')->references('id')->on('users');
            $table->foreign('id_persona')->references('id')->on('personas');
            $table->foreign('id_TipoPago')->references('id')->on('tipo_pagos');
            $table->foreign('id_Caja')->references('id')->on('cajas');
            $table->foreign('id_FormaPago')->references('id')->on('forma_pagos');
            $table->foreign('id_TipoComprobante')->references('id')->on('tipo_comprobantes');
            $table->foreign('id_Moneda')->references('id')->on('tipo_monedas');
            $table->foreign('id_Banco')->references('id')->on('bancos');
        });


        //DB::statement('ALTER TABLE transacciones ADD UrevCalc AS (ISNULL(UrevUsuario, \'\') + \' - \' + ISNULL(FORMAT(UrevFechaHora, \'dd/MM/yyyy HH:mm\'), \'\'))');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transacciones');
    }
};
