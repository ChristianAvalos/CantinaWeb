<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class CiudadesYdepartamentos extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $data = [
            'Central' => ['Asunción', 'San Lorenzo', 'Luque', 'Lambaré', 'Fernando de la Mora', 'Ñemby', 'Villa Elisa', 'Limpio', 'Capiatá', 'Itauguá'],
            'Alto Paraná' => ['Ciudad del Este', 'Hernandarias', 'Presidente Franco', 'Minga Guazú'],
            'Itapúa' => ['Encarnación', 'Hohenau', 'Obligado', 'Bella Vista'],
            'Amambay' => ['Pedro Juan Caballero'],
            'Boquerón' => ['Filadelfia', 'Loma Plata', 'Neuland'],
            'Caaguazú' => ['Coronel Oviedo', 'Caaguazú', 'J. Eulogio Estigarribia'],
            
        ];
        foreach ($data as $departamento => $ciudades) {
            $departamentoId = DB::table('departamento')->insertGetId(['nombre' => $departamento]);

            foreach ($ciudades as $ciudad) {
                DB::table('ciudad')->insert([
                    'departamento_id' => $departamentoId,
                    'nombre' => $ciudad,
                ]);
            }
        }
    }
}
