<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class TipoPersonaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {



        $registros = [
            'Cliente',
            'Proveedor',
        ];

        $now = Carbon::now();

        // updateOrInsert por nombre: re-ejecutar no duplica.
        // OJO: la tabla es `tipo_persona` (singular), no `tipo_personas`.
        foreach ($registros as $nombre) {
            DB::table('tipo_persona')->updateOrInsert(
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
