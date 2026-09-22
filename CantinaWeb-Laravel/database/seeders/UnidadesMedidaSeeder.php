<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
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

        // updateOrInsert por nombre: re-ejecutar no duplica.
        foreach ($registros as $item) {
            DB::table('tipo_unidad_medidas')->updateOrInsert(
                ['nombre' => $item['nombre']],
                [
                    'abreviatura'   => $item['abreviatura'],
                    'UrevUsuario'   => 'Admin',
                    'UrevFechaHora' => $now,
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ]
            );
        }
    }
}
