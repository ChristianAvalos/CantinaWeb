<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PRECIOS DE VENTA POR SUCURSAL.
 *
 * `id_sucursal` pasa a ser la clave del precio (antes era por organización).
 * Se mantiene `id_organizacion` (denormalizado) para listados y filtros.
 * El buscador (`ProductoController`) prioriza el precio de la sucursal del
 * usuario y, si no hay, cae al de la organización.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('precio_venta', function (Blueprint $table) {
            $table->unsignedBigInteger('id_sucursal')->nullable();
            $table->foreign('id_sucursal')->references('id')->on('sucursales')->nullOnDelete();
        });

        // La unicidad ahora es por (producto, sucursal), no por organización.
        Schema::table('precio_venta', function (Blueprint $table) {
            $table->dropUnique('uk_precio_venta_producto_org');
        });

        // Backfill: cada precio existente pasa a la sucursal principal de su organización.
        foreach (DB::table('precio_venta')->select('id', 'id_organizacion')->get() as $precio) {
            $idSucursal = DB::table('sucursales')
                ->where('id_organizacion', $precio->id_organizacion)
                ->where('es_principal', true)
                ->value('id');

            if ($idSucursal) {
                DB::table('precio_venta')->where('id', $precio->id)->update(['id_sucursal' => $idSucursal]);
            }
        }

        Schema::table('precio_venta', function (Blueprint $table) {
            $table->unique(['id_producto', 'id_sucursal'], 'uk_precio_venta_producto_sucursal');
        });
    }

    public function down(): void
    {
        Schema::table('precio_venta', function (Blueprint $table) {
            $table->dropUnique('uk_precio_venta_producto_sucursal');
        });

        Schema::table('precio_venta', function (Blueprint $table) {
            $table->dropForeign(['id_sucursal']);
            $table->dropColumn('id_sucursal');
        });

        Schema::table('precio_venta', function (Blueprint $table) {
            $table->unique(['id_producto', 'id_organizacion'], 'uk_precio_venta_producto_org');
        });
    }
};
