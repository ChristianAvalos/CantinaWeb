<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class CategoriasSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $registros = [
            'Gaseosas',
            'Jabones', 
            'Escobas', 
            'Otras categorias'
        ];

        $now = Carbon::now();

        // updateOrInsert por (organizacion, nombre): re-ejecutar no duplica.
        foreach ($registros as $nombre) {
            DB::table('categorias')->updateOrInsert(
                ['id_organizacion' => null, 'nombre' => $nombre],
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
