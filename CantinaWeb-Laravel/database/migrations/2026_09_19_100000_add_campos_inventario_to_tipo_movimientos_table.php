<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Unifica el catálogo de movimientos en `tipo_movimientos`.
 *
 * Antes esa tabla solo tenía los tipos de DOCUMENTO (Compra, Venta, Ajuste).
 * Ahora también contiene los tipos de movimiento de INVENTARIO (101, 102, 201...),
 * distinguidos por `ambito`:
 *
 *   ambito = 'documento'  → Compra (1), Venta (2), Ajuste (3). Sin dirección.
 *   ambito = 'inventario' → 101, 102, 201, ... Con `direccion` y con
 *                           `id_tipo_movimiento_documento` indicando a qué
 *                           documento pertenecen (101 → Compra, entrada).
 *
 * Así el kardex no necesita ninguna constante escrita en PHP: el código de
 * movimiento, su dirección y su documento de origen son DATOS de esta tabla.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tipo_movimientos', function (Blueprint $table) {
            $table->string('codigo', 10)->nullable()->after('nombre')
                ->comment('Código del movimiento de inventario (101, 201...). NULL para tipos de documento.');

            // enum() en Postgres genera varchar + CHECK: la BASE rechaza cualquier
            // valor fuera de la lista, no solo las constantes de PHP.
            $table->enum('ambito', ['documento', 'inventario'])->default('documento')->after('codigo')
                ->comment("documento | inventario");

            $table->enum('direccion', ['entrada', 'salida'])->nullable()->after('ambito')
                ->comment('entrada | salida. Solo aplica a ambito = inventario.');

            $table->unsignedBigInteger('id_tipo_movimiento_documento')->nullable()->after('direccion')
                ->comment('Para ambito = inventario: a qué tipo de documento pertenece (Compra/Venta/Ajuste).');

            $table->foreign('id_tipo_movimiento_documento')
                ->references('id')->on('tipo_movimientos')
                ->nullOnDelete();

            $table->unique(['id_organizacion', 'codigo'], 'tm_org_codigo_unique');
            $table->index(['ambito', 'id_tipo_movimiento_documento', 'direccion'], 'tm_ambito_doc_dir_index');
        });
    }

    public function down(): void
    {
        Schema::table('tipo_movimientos', function (Blueprint $table) {
            $table->dropForeign(['id_tipo_movimiento_documento']);
            $table->dropUnique('tm_org_codigo_unique');
            $table->dropIndex('tm_ambito_doc_dir_index');
            $table->dropColumn(['codigo', 'ambito', 'direccion', 'id_tipo_movimiento_documento']);
        });
    }
};
