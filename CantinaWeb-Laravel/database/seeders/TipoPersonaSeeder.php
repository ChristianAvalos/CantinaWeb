<?php

namespace Database\Seeders;

use Carbon\Carbon;
use App\Models\TipoPersona;
use Illuminate\Database\Seeder;
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

        $data = array_map(function ($nombre) use ($now) {
            return [
                'nombre' => $nombre,
                'UrevUsuario' => 'Admin',
                'UrevFechaHora' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }, $registros);

        TipoPersona::insert($data);
    }
}
