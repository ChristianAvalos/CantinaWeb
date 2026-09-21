<?php

namespace Database\Seeders;

use Carbon\Carbon;
use App\Models\Organizacion;
use App\Models\TipoMovimientos;
use Illuminate\Database\Seeder;

/**
 * Catálogo unificado de movimientos.
 *
 * - ambito = 'documento'  → tipos de DOCUMENTO que usa `transacciones` (Compra, Venta, Ajuste).
 * - ambito = 'inventario' → tipos de MOVIMIENTO de stock que usa el kardex (101, 201...).
 *   Cada uno declara su `direccion` y a qué documento pertenece
 *   (`id_tipo_movimiento_documento`), de modo que InventarioService no
 *   necesita ninguna constante escrita en PHP.
 *
 * Es idempotente: se puede correr varias veces sin duplicar filas.
 */
class TipoMovimientosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $idOrganizacion = Organizacion::orderBy('id')->value('id') ?? 1;
        $ahora = Carbon::now();

        // 1) Tipos de DOCUMENTO (los que ya existían).
        $documentos = ['Compra', 'Venta', 'Ajuste'];

        foreach ($documentos as $nombre) {
            TipoMovimientos::updateOrCreate(
                [
                    'id_organizacion' => $idOrganizacion,
                    'nombre' => $nombre,
                    'ambito' => TipoMovimientos::AMBITO_DOCUMENTO,
                ],
                [
                    'codigo' => null,
                    'direccion' => null,
                    'id_tipo_movimiento_documento' => null,
                    'UrevUsuario' => 'Admin',
                    'UrevFechaHora' => $ahora,
                ]
            );
        }

        // 2) Tipos de movimiento de INVENTARIO, ligados a su documento.
        //    [codigo, nombre, direccion, nombre del documento]
        $inventario = [
            ['101', 'Recepción por compra',          TipoMovimientos::DIRECCION_ENTRADA, 'Compra'],
            ['102', 'Reversa de recepción',          TipoMovimientos::DIRECCION_SALIDA,  'Compra'],
            ['201', 'Salida por venta',              TipoMovimientos::DIRECCION_SALIDA,  'Venta'],
            ['202', 'Reversa de venta',              TipoMovimientos::DIRECCION_ENTRADA, 'Venta'],
            ['701', 'Ajuste positivo de inventario', TipoMovimientos::DIRECCION_ENTRADA, 'Ajuste'],
            ['702', 'Ajuste negativo de inventario', TipoMovimientos::DIRECCION_SALIDA,  'Ajuste'],
        ];

        foreach ($inventario as [$codigo, $nombre, $direccion, $nombreDocumento]) {
            $idDocumento = TipoMovimientos::where('id_organizacion', $idOrganizacion)
                ->where('nombre', $nombreDocumento)
                ->where('ambito', TipoMovimientos::AMBITO_DOCUMENTO)
                ->value('id');

            if (! $idDocumento) {
                continue;
            }

            TipoMovimientos::updateOrCreate(
                [
                    'id_organizacion' => $idOrganizacion,
                    'codigo' => $codigo,
                ],
                [
                    'nombre' => $nombre,
                    'ambito' => TipoMovimientos::AMBITO_INVENTARIO,
                    'direccion' => $direccion,
                    'id_tipo_movimiento_documento' => $idDocumento,
                    'UrevUsuario' => 'Admin',
                    'UrevFechaHora' => $ahora,
                ]
            );
        }
    }
}
