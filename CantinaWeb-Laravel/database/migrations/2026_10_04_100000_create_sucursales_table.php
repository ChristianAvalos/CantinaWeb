<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * SUCURSALES.
 *
 * Toda organización tiene al menos UNA sucursal: la "principal"
 * (`es_principal = true`), que representa a la organización cuando no tiene
 * más de una sucursal. Si la organización tiene 2+, se eligen entre ellas.
 *
 * Se agregan además las FKs `id_sucursal` en users, transacciones y
 * movimiento_historial, y se hace el backfill de los datos existentes a la
 * sucursal principal de su organización.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sucursales', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_organizacion');
            $table->string('nombre', 150);
            $table->string('direccion')->nullable();
            $table->unsignedBigInteger('ciudad_id')->nullable();
            $table->string('telefono')->nullable();
            $table->boolean('es_principal')->default(false);
            $table->unsignedBigInteger('id_tipo_estado')->default(1);
            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            $table->foreign('id_organizacion')->references('id')->on('organizacion')->cascadeOnDelete();
            $table->foreign('ciudad_id')->references('id')->on('ciudad')->nullOnDelete();
            $table->foreign('id_tipo_estado')->references('id')->on('tipo_estados');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('id_sucursal')->nullable();
            $table->foreign('id_sucursal')->references('id')->on('sucursales')->nullOnDelete();
        });

        Schema::table('transacciones', function (Blueprint $table) {
            $table->unsignedBigInteger('id_sucursal')->nullable();
            $table->foreign('id_sucursal')->references('id')->on('sucursales')->nullOnDelete();
        });

        Schema::table('movimiento_historial', function (Blueprint $table) {
            $table->unsignedBigInteger('id_sucursal')->nullable();
            $table->foreign('id_sucursal')->references('id')->on('sucursales')->nullOnDelete();
        });

        // ── Backfill: una sucursal principal por organización existente ──
        $now = now();

        foreach (DB::table('organizacion')->select('id', 'RazonSocial')->get() as $org) {
            $sucursalId = DB::table('sucursales')->insertGetId([
                'id_organizacion' => $org->id,
                'nombre'          => $org->RazonSocial ?: 'Principal',
                'es_principal'    => true,
                'id_tipo_estado'  => 1,
                'UrevUsuario'     => 'Sistema',
                'UrevFechaHora'   => $now,
                'created_at'      => $now,
                'updated_at'      => $now,
            ]);

            DB::table('users')->where('id_organizacion', $org->id)->update(['id_sucursal' => $sucursalId]);
            DB::table('transacciones')->where('id_organizacion', $org->id)->update(['id_sucursal' => $sucursalId]);
            DB::table('movimiento_historial')->where('id_organizacion', $org->id)->update(['id_sucursal' => $sucursalId]);
        }
    }

    public function down(): void
    {
        Schema::table('movimiento_historial', function (Blueprint $table) {
            $table->dropForeign(['id_sucursal']);
            $table->dropColumn('id_sucursal');
        });

        Schema::table('transacciones', function (Blueprint $table) {
            $table->dropForeign(['id_sucursal']);
            $table->dropColumn('id_sucursal');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['id_sucursal']);
            $table->dropColumn('id_sucursal');
        });

        Schema::dropIfExists('sucursales');
    }
};
