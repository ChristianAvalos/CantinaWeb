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
 * Se versiona: solo un registro activo por organización y los anteriores quedan
 * como histórico.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('datos_facturacion', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_organizacion');
            $table->boolean('activo')->default(false);

            // Identidad fiscal del emisor (puede diferir del perfil comercial).
            $table->string('RUC');
            $table->string('RazonSocial');
            $table->string('DireccionFiscal')->nullable();
            $table->string('Telefono')->nullable();
            $table->string('Email')->nullable();

            // Actividad económica declarada ante la SET.
            $table->string('ActividadEconomica')->nullable();
            $table->string('ActividadEconomicaCodigo', 20)->nullable();

            // Timbrado autorizado y su vigencia.
            $table->string('Timbrado');
            $table->date('TimbradoInicio')->nullable();
            $table->date('TimbradoVencimiento')->nullable();

            // Preparado para facturación electrónica (SIFEN).
            $table->string('Ambiente', 20)->default('test');

            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            $table->foreign('id_organizacion')->references('id')->on('organizacion')->cascadeOnDelete();
            $table->index(['id_organizacion', 'activo'], 'df_org_activo_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('datos_facturacion');
    }
};
