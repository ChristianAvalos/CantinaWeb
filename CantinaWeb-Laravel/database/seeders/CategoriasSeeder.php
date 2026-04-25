<?php

namespace Database\Seeders;

use Carbon\Carbon;
use App\Models\Categorias;
use Illuminate\Database\Seeder;
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

        $data = array_map(function ($nombre) use ($now) {
            return [
                'id_organizacion' => null,
                'nombre' => $nombre,
                'UrevUsuario' => 'Admin',
                'UrevFechaHora' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }, $registros);

        Categorias::insert($data);
    }
}
