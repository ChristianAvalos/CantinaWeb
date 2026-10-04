<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Estado (Activo/Inactivo) de la ORGANIZACIÓN, igual que usuarios/sucursales.
 *
 * Si la organización o su sucursal están inactivas, el usuario no puede acceder
 * (se valida en el login y en `/api/user`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('organizacion', function (Blueprint $table) {
            $table->unsignedBigInteger('id_tipoestado')->nullable()->default(1);
            $table->foreign('id_tipoestado')->references('id')->on('tipo_estados');
        });

        // Las organizaciones existentes quedan Activas (1).
        DB::table('organizacion')->whereNull('id_tipoestado')->update(['id_tipoestado' => 1]);
    }

    public function down(): void
    {
        Schema::table('organizacion', function (Blueprint $table) {
            $table->dropForeign(['id_tipoestado']);
            $table->dropColumn('id_tipoestado');
        });
    }
};
