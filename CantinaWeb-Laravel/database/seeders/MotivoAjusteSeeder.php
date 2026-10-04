<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MotivoAjusteSeeder extends Seeder
{
    /**
     * Motivos base de ajuste de inventario. Idempotente: usa updateOrInsert
     * por `nombre`, así re-ejecutarlo no duplica filas.
     */
    public function run(): void
    {
        $nombres = [
            'Pérdida',
            'Robo',
            'Merma',
            'Vencimiento',
            'Error de inventario',
            'Devolución',
            'Otro',
        ];

        $now = Carbon::now();

        foreach ($nombres as $nombre) {
            DB::table('motivo_ajustes')->updateOrInsert(
                ['nombre' => $nombre],
                [
                    'UrevUsuario'   => 'Admin',
                    'UrevFechaHora' => $now,
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ]
            );
        }
    }
}
