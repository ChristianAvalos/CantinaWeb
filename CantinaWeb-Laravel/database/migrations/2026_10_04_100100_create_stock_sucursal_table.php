<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * STOCK POR SUCURSAL.
 *
 * `productos.stock_actual` pasa a ser un TOTAL (suma) y la fuente de verdad
 * por sede es esta tabla. El único que la escribe es `InventarioService`.
 *
 * Backfill: el stock actual de cada producto se copia a la sucursal principal
 * de cada organización (cada organización administra su propio stock del
 * catálogo global de productos).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_sucursal', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_producto');
            $table->unsignedBigInteger('id_sucursal');
            $table->decimal('stock_actual', 19, 4)->default(0);
            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            $table->unique(['id_producto', 'id_sucursal']);
            $table->foreign('id_producto')->references('id')->on('productos')->cascadeOnDelete();
            $table->foreign('id_sucursal')->references('id')->on('sucursales')->cascadeOnDelete();
        });

        // ── Backfill: stock actual → sucursal principal de cada organización ──
        $now = now();
        $principales = DB::table('sucursales')->where('es_principal', true)->pluck('id');

        if ($principales->isEmpty()) {
            return;
        }

        $productos = DB::table('productos')->select('id', 'stock_actual')->get();

        foreach ($principales as $idSucursal) {
            $rows = [];
            foreach ($productos as $producto) {
                $rows[] = [
                    'id_producto'   => $producto->id,
                    'id_sucursal'   => $idSucursal,
                    'stock_actual'  => $producto->stock_actual ?? 0,
                    'UrevUsuario'   => 'Sistema',
                    'UrevFechaHora' => $now,
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ];
            }

            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('stock_sucursal')->insert($chunk);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_sucursal');
    }
};
