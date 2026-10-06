<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Las personas (clientes/proveedores) pasan a pertenecer a una organización,
 * igual que productos, precios y transacciones.
 *
 * La columna nace nullable para no romper los registros existentes; acto seguido
 * se reasignan los que quedaron en null a la organización del usuario
 * administrador (o, si no se encuentra, a la primera organización).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personas', function (Blueprint $table) {
            $table->unsignedBigInteger('id_organizacion')->nullable();
            $table->foreign('id_organizacion')->references('id')->on('organizacion');
        });

        $idOrganizacion = DB::table('users')
            ->whereNotNull('id_organizacion')
            ->orderBy('id')
            ->value('id_organizacion')
            ?? DB::table('organizacion')->orderBy('id')->value('id');

        if ($idOrganizacion !== null) {
            DB::table('personas')
                ->whereNull('id_organizacion')
                ->update(['id_organizacion' => $idOrganizacion]);
        }
    }

    public function down(): void
    {
        Schema::table('personas', function (Blueprint $table) {
            $table->dropForeign(['id_organizacion']);
            $table->dropColumn('id_organizacion');
        });
    }
};
