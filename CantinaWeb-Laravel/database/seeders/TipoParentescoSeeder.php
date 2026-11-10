<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TipoParentescoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $registros = [
            'Papá',
            'Mamá',
            'Hermano',
            'Hermana',
            'Tío',
            'Tía',
            'Abuelo',
            'Abuela',
            'Tutor',
        ];

        $now = Carbon::now();

        // updateOrInsert por nombre: re-ejecutar no duplica.
        foreach ($registros as $nombre) {
            DB::table('tipo_parentescos')->updateOrInsert(
                ['nombre' => $nombre],
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
