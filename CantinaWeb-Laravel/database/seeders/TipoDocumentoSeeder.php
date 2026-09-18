<?php

namespace Database\Seeders;

use Carbon\Carbon;
use App\Models\TipoDocumento;
use Illuminate\Database\Seeder;
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

        $data = array_map(function ($registro) use ($now) {
            return [
                'nombre' => $registro['nombre'],
                'formato' => $registro['formato'],
                'UrevUsuario' => 'Admin',
                'UrevFechaHora' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }, $registros);

        TipoDocumento::insert($data);
    }
}
