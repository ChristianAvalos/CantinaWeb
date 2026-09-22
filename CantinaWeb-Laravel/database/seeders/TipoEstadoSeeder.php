<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class TipoEstadoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $registros = [
            'Activo',
            'Inactivo',
            'Finalizado',
            'Pendiente',
            'Positivo',
            'Negativo',
            'Anulada'
        ];

        $now = Carbon::now();

        // updateOrInsert por (organizacion, descripcion): re-ejecutar no duplica.
        foreach ($registros as $nombre) {
            DB::table('tipo_estados')->updateOrInsert(
                ['id_organizacion' => 1, 'descripcion' => $nombre],
                [
                    'UrevUsuario' => 'Admin',
                    'UrevFechaHora' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }
}
