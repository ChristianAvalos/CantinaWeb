<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KARDEX: historial de todos los movimientos de stock.
 *
 * Regla de oro: `productos.stock_actual` NUNCA se escribe directo.
 * Todo cambio de stock pasa por InventarioService, que inserta una fila acá
 * y recién después actualiza el stock del producto. Así el stock es la suma
 * de sus movimientos y siempre se puede explicar de dónde salió.
 *
 * El tipo de movimiento apunta al catálogo unificado `tipo_movimientos`
 * (filas con ambito = 'inventario').
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimiento_historial', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_organizacion')->nullable();

            // Nullable + snapshot: si un producto se elimina, el kardex NO se rompe
            // (la FK se anula pero queda registrado qué producto era).
            $table->unsignedBigInteger('id_producto')->nullable();
            $table->string('producto_codigo', 100)->nullable();
            $table->string('producto_nombre', 255)->nullable();

            $table->unsignedBigInteger('id_TipoMovimiento')
                ->comment('Tipo de movimiento de inventario: fila de tipo_movimientos con ambito = inventario.');

            // Denormalizado desde el catálogo para poder filtrar sin join.
            // enum() en Postgres = varchar + CHECK: la base rechaza valores inválidos.
            $table->enum('direccion', ['entrada', 'salida'])->comment('entrada | salida');

            $table->decimal('cantidad', 19, 4);
            $table->decimal('costo_unitario', 19, 4)->nullable();

            // Snapshots: hacen el kardex reconstruible y auditable.
            $table->decimal('stock_anterior', 19, 4)->default(0);
            $table->decimal('stock_nuevo', 19, 4)->default(0);

            // Documento que originó el movimiento.
            $table->unsignedBigInteger('id_transaccion')->nullable();
            $table->unsignedBigInteger('id_transaccion_detalle')->nullable();

            // Auto-referencia: una reversa (ej. 102) apunta al movimiento que revierte (ej. 101).
            $table->unsignedBigInteger('id_movimiento_origen')->nullable();

            $table->string('motivo')->nullable();
            $table->string('referencia')->nullable();
            $table->dateTime('fecha');

            $table->unsignedBigInteger('id_usuario')->nullable();
            $table->string('UrevUsuario')->nullable();
            $table->dateTime('UrevFechaHora')->nullable();
            $table->timestamps();

            $table->foreign('id_organizacion')->references('id')->on('organizacion');
            $table->foreign('id_producto')->references('id')->on('productos')->nullOnDelete();
            $table->foreign('id_TipoMovimiento')->references('id')->on('tipo_movimientos');
            $table->foreign('id_transaccion')->references('id')->on('transacciones')->nullOnDelete();
            $table->foreign('id_transaccion_detalle')->references('id')->on('transacciones_detalles')->nullOnDelete();
            $table->foreign('id_movimiento_origen')->references('id')->on('movimiento_historial')->nullOnDelete();
            $table->foreign('id_usuario')->references('id')->on('users');

            $table->index(['id_producto', 'fecha'], 'mh_producto_fecha_index');
            $table->index('id_transaccion', 'mh_transaccion_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimiento_historial');
    }
};
