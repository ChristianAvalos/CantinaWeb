<?php

namespace App\Services;

use App\Models\MovimientoHistorial;
use App\Models\Producto;
use App\Models\TipoMovimientos;
use App\Models\Transacciones;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Único punto de entrada para modificar stock.
 *
 * REGLA DE ORO: nadie más escribe `productos.stock_actual`.
 * Todo cambio de stock pasa por acá, que en una sola transacción de BD:
 *   1. resuelve el tipo de movimiento contra el catálogo `tipo_movimientos`,
 *   2. bloquea el producto (lockForUpdate) para evitar condiciones de carrera,
 *   3. valida que la salida no deje el stock negativo,
 *   4. inserta el movimiento en el kardex con snapshot de stock_anterior/stock_nuevo,
 *   5. recién después actualiza el stock del producto.
 *
 * No hay ningún código de movimiento escrito en PHP: los códigos (101, 201...),
 * su dirección y su documento de origen son DATOS de `tipo_movimientos`.
 */
class InventarioService
{
    /**
     * Registra un movimiento de stock y actualiza el stock del producto.
     *
     * @param  int   $idTipoMovimiento  Fila de `tipo_movimientos` con ambito = inventario.
     * @param  array{
     *     id_organizacion?: int|null,
     *     id_transaccion?: int|null,
     *     id_transaccion_detalle?: int|null,
     *     id_movimiento_origen?: int|null,
     *     costo_unitario?: float|null,
     *     motivo?: string|null,
     *     referencia?: string|null,
     *     fecha?: \DateTimeInterface|string|null
     * } $opciones
     *
     * @throws \InvalidArgumentException|\RuntimeException
     */
    public static function registrar(int $idProducto, float $cantidad, int $idTipoMovimiento, array $opciones = []): MovimientoHistorial
    {
        if ($cantidad <= 0) {
            throw new \InvalidArgumentException('La cantidad del movimiento debe ser mayor a cero.');
        }

        return DB::transaction(function () use ($idProducto, $cantidad, $idTipoMovimiento, $opciones) {
            $tipo = TipoMovimientos::where('ambito', TipoMovimientos::AMBITO_INVENTARIO)
                ->find($idTipoMovimiento);

            if (! $tipo) {
                throw new \RuntimeException(
                    "El tipo de movimiento #{$idTipoMovimiento} no existe o no es un movimiento de inventario."
                );
            }

            // Bloqueo pesimista: dos operaciones simultáneas sobre el mismo producto
            // se serializan acá en vez de pisarse el stock.
            $producto = Producto::whereKey($idProducto)->lockForUpdate()->first();

            if (! $producto) {
                throw new \RuntimeException("Producto #{$idProducto} no encontrado.");
            }

            $stockAnterior = (float) $producto->stock_actual;
            $stockNuevo = $tipo->esEntrada()
                ? $stockAnterior + $cantidad
                : $stockAnterior - $cantidad;

            if ($stockNuevo < 0) {
                throw new \RuntimeException(sprintf(
                    'Stock insuficiente para %s (disponible: %s, requerido: %s).',
                    $producto->nombre,
                    self::formatoCantidad($stockAnterior),
                    self::formatoCantidad($cantidad)
                ));
            }

            $usuario = Auth::user();

            $movimiento = MovimientoHistorial::create([
                'id_organizacion'        => $opciones['id_organizacion'] ?? $producto->id_organizacion,
                'id_producto'            => $producto->id,
                'producto_codigo'        => $producto->codigo_barras ?? $producto->codigo_interno,
                'producto_nombre'        => $producto->nombre,
                'id_TipoMovimiento'      => $tipo->id,
                'direccion'              => $tipo->direccion,
                'cantidad'               => $cantidad,
                'costo_unitario'         => $opciones['costo_unitario'] ?? null,
                'stock_anterior'         => $stockAnterior,
                'stock_nuevo'            => $stockNuevo,
                'id_transaccion'         => $opciones['id_transaccion'] ?? null,
                'id_transaccion_detalle' => $opciones['id_transaccion_detalle'] ?? null,
                'id_movimiento_origen'   => $opciones['id_movimiento_origen'] ?? null,
                'motivo'                 => $opciones['motivo'] ?? null,
                'referencia'             => $opciones['referencia'] ?? null,
                'fecha'                  => $opciones['fecha'] ?? now(),
                'id_usuario'             => $usuario?->id,
                'UrevUsuario'            => $usuario?->name,
                'UrevFechaHora'          => now(),
            ]);

            $producto->update([
                'stock_actual'  => $stockNuevo,
                'UrevUsuario'   => $usuario?->name,
                'UrevFechaHora' => now(),
            ]);

            return $movimiento;
        });
    }

    /**
     * Registra el movimiento originado por una transacción (compra/venta/ajuste).
     *
     * El tipo de movimiento se resuelve buscando en el catálogo la fila que
     * declara ese documento y esa dirección. Si falta la configuración, se
     * avisa explícitamente en vez de adivinar.
     */
    public static function registrarDocumento(
        Transacciones $documento,
        int $idProducto,
        float $cantidad,
        string $direccion,
        array $opciones = []
    ): MovimientoHistorial {
        $tipo = TipoMovimientos::query()
            ->where('ambito', TipoMovimientos::AMBITO_INVENTARIO)
            ->where('id_tipo_movimiento_documento', $documento->id_TipoMovimiento)
            ->where('direccion', $direccion)
            ->first();

        if (! $tipo) {
            throw new \RuntimeException(sprintf(
                'No hay un tipo de movimiento de inventario configurado para el documento "%s" con dirección "%s". Revisá el catálogo en TipoMovimientosSeeder.',
                $documento->tipoMovimiento->nombre ?? "ID {$documento->id_TipoMovimiento}",
                $direccion
            ));
        }

        return self::registrar($idProducto, $cantidad, $tipo->id, array_merge([
            'id_organizacion' => $documento->id_organizacion,
            'id_transaccion'  => $documento->id,
        ], $opciones));
    }

    /**
     * Busca el movimiento ORIGINAL (no reversa) de un renglón, para que la
     * reversa quede enlazada con lo que revierte.
     */
    public static function buscarMovimientoOrigen(?int $idTransaccionDetalle, int $idProducto): ?int
    {
        if (! $idTransaccionDetalle) {
            return null;
        }

        return MovimientoHistorial::query()
            ->where('id_transaccion_detalle', $idTransaccionDetalle)
            ->where('id_producto', $idProducto)
            ->originales()
            ->orderByDesc('id')
            ->value('id');
    }

    /**
     * Stock de un producto calculado desde el kardex.
     * Debe coincidir con `productos.stock_actual`: sirve para verificar el cuadre.
     */
    public static function stockSegunKardex(int $idProducto): float
    {
        $total = MovimientoHistorial::query()
            ->where('id_producto', $idProducto)
            ->selectRaw(
                'SUM(CASE WHEN direccion = ? THEN cantidad ELSE -cantidad END) AS total',
                [TipoMovimientos::DIRECCION_ENTRADA]
            )
            ->value('total');

        return (float) ($total ?? 0);
    }

    /** Formatea una cantidad sin ceros decimales sobrantes (13,0000 → 13). */
    private static function formatoCantidad(float $cantidad): string
    {
        return rtrim(rtrim(number_format($cantidad, 4, '.', ''), '0'), '.') ?: '0';
    }
}
