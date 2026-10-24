<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Datos para facturación.
 *
 * Se guardan aparte del perfil comercial de la organización porque cambian en
 * otro momento (cuando la SET emite un timbrado nuevo) y porque cada factura
 * emitida debe conservar copia de los datos con los que se emitió.
 *
 * Se versiona: se guardan todos los timbrados y el que rige hoy es el que cubre
 * la fecha actual (la vigencia no se solapa).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('datos_facturacion', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_organizacion');

            // Identidad fiscal del emisor. Opcional: si está vacía se usa la de
            // la organización (solo se carga cuando el dato fiscal difiere).
            $table->string('RUC')->nullable();
            $table->string('RazonSocial')->nullable();
            $table->string('DireccionFiscal')->nullable();
            $table->string('Telefono')->nullable();
            $table->string('Email')->nullable();

            // Actividad económica declarada ante la SET.
            $table->string('ActividadEconomica')->nullable();
            $table->string('ActividadEconomicaCodigo', 20)->nullable();

            // Timbrado autorizado y su vigencia. Las fechas son obligatorias: un
            // timbrado sin rango valdría para siempre y pisaría al resto.
            $table->string('Timbrado');
            $table->date('TimbradoInicio');
            $table->date('TimbradoVencimiento');

            // Preparado para facturación electrónica (SIFEN).
            $table->string('Ambiente', 20)->default('test');

            // Cada organización elige si emite impreso o electrónico.
            $table->string('Emisor', 20)->default('impreso');

            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            $table->foreign('id_organizacion')->references('id')->on('organizacion');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('datos_facturacion');
    }
};
