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
        Schema::create('organizacion', function (Blueprint $table) {
            $table->id();
            $table->string('RazonSocial')->nullable();
            $table->string('RUC')->nullable();
            $table->string('Direccion')->nullable();
            $table->bigInteger('Ciudad_id')->nullable();
            $table->bigInteger('Pais_id')->nullable();
            $table->string('Telefono1')->nullable();
            $table->string('Telefono2')->nullable();
            $table->string('Fax1')->nullable();
            $table->string('Fax2')->nullable();
            $table->string('Email')->nullable();
            $table->string('Sigla')->nullable();
            $table->string('SitioWeb')->nullable();
            $table->string('Imagen')->nullable();
            $table->string('UrevUsuario')->nullable(); 
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            $table->foreign('Ciudad_id')->references('id')->on('ciudad');
            $table->foreign('Pais_id')->references('id')->on('pais');

        });
        //DB::statement('ALTER TABLE organizacion ADD UrevCalc AS (ISNULL(UrevUsuario, \'\') + \' - \' + ISNULL(FORMAT(UrevFechaHora, \'dd/MM/yyyy HH:mm\'), \'\'))');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('organizacion');
    }
};
