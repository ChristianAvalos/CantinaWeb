<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Los datos del emisor se heredan de la organización (RUC, razón social, email)
 * y de la sucursal (domicilio y teléfono del local que emite).
 *
 * En `datos_facturacion` solo quedan como OVERRIDE opcional para los casos en
 * que el dato fiscal difiere del comercial (ej. "CDSystem" vs "CDSystem S.A.").
 * Si están vacíos, la factura usa los de la organización/sucursal.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('datos_facturacion', function (Blueprint $table) {
            $table->string('RUC')->nullable()->change();
            $table->string('RazonSocial')->nullable()->change();
            $table->string('DireccionFiscal')->nullable()->change();
            $table->string('Telefono')->nullable()->change();
            $table->string('Email')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Vuelve a obligatorios; las filas sin dato se completan con vacío para
        // que el cambio de nulabilidad no falle.
        \DB::table('datos_facturacion')->whereNull('RUC')->update(['RUC' => '']);
        \DB::table('datos_facturacion')->whereNull('RazonSocial')->update(['RazonSocial' => '']);

        Schema::table('datos_facturacion', function (Blueprint $table) {
            $table->string('RUC')->nullable(false)->change();
            $table->string('RazonSocial')->nullable(false)->change();
        });
    }
};
