<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class TipoDocumentoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $registros = [
            ['nombre' => 'C.I.', 'formato' => 'miles'],
            ['nombre' => 'RUC', 'formato' => 'ruc'],
        ];

        $now = Carbon::now();

        // updateOrInsert por nombre: re-ejecutar no duplica.
        foreach ($registros as $registro) {
            DB::table('tipo_documentos')->updateOrInsert(
                ['nombre' => $registro['nombre']],
                [
                    'formato' => $registro['formato'],
                    'UrevUsuario' => 'Admin',
                    'UrevFechaHora' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }
}
