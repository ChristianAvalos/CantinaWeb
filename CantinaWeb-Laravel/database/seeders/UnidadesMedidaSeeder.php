<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use App\Models\TipoUnidadMedida;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class UnidadesMedidaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $registros = [
            ['nombre' => 'Unidad',     'abreviatura' => 'un'],
            ['nombre' => 'Miligramo',  'abreviatura' => 'mg'],
            ['nombre' => 'Gramo',      'abreviatura' => 'g'],
            ['nombre' => 'Kilogramo',  'abreviatura' => 'kg'],
            ['nombre' => 'Mililitro',  'abreviatura' => 'ml'],
            ['nombre' => 'Litro',      'abreviatura' => 'L'],
            ['nombre' => 'Caja',       'abreviatura' => 'caja'],
        ];

        $now = Carbon::now();

        $data = array_map(function ($item) use ($now) {
            return [
                'nombre'        => $item['nombre'],
                'abreviatura'   => $item['abreviatura'],
                'UrevUsuario'   => 'Admin',
                'UrevFechaHora' => $now,
                'created_at'    => $now,
                'updated_at'    => $now,
            ];
        }, $registros);

        TipoUnidadMedida::insert($data);
    }
}
