<?php

namespace Database\Seeders;

use Carbon\Carbon;
use App\Models\TipoEstado;
use Illuminate\Database\Seeder;
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
            'Negativo'
        ];

        $now = Carbon::now();

        $data = array_map(function ($nombre) use ($now) {
            return [
                'id_organizacion' => 1,
                'descripcion' => $nombre,
                'UrevUsuario' => 'Admin',
                'UrevFechaHora' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }, $registros);

        TipoEstado::insert($data);
    }
}
