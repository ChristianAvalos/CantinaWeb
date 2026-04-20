<?php

namespace Database\Seeders;

use Carbon\Carbon;
use App\Models\TipoMovimientos;
use Illuminate\Database\Seeder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class TipoMovimientosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $registros = [
            'Compra', 'Venta','Ajuste'
        ];

        $now = Carbon::now();

        $data = array_map(function ($nombre) use ($now) {
            return [
                'id_organizacion' => 1,
                'nombre' => $nombre,
                'UrevUsuario' => 'Admin',
                'UrevFechaHora' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }, $registros);

        TipoMovimientos::insert($data);
    }
}
