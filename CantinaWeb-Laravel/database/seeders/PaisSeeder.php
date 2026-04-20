<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class PaisSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $paises = [
            ['Name' => 'Argentina', 'GentilicioMasculino' => 'Argentino', 'GentilicioFemenino' => 'Argentina'],
            ['Name' => 'Brasil', 'GentilicioMasculino' => 'Brasileño', 'GentilicioFemenino' => 'Brasileña'],
            ['Name' => 'Chile', 'GentilicioMasculino' => 'Chileno', 'GentilicioFemenino' => 'Chilena'],
            ['Name' => 'Paraguay', 'GentilicioMasculino' => 'Paraguayo', 'GentilicioFemenino' => 'Paraguaya'],
            ['Name' => 'Uruguay', 'GentilicioMasculino' => 'Uruguayo', 'GentilicioFemenino' => 'Uruguaya'],
            ['Name' => 'España', 'GentilicioMasculino' => 'Español', 'GentilicioFemenino' => 'Española'],
            ['Name' => 'Francia', 'GentilicioMasculino' => 'Francés', 'GentilicioFemenino' => 'Francesa'],
            ['Name' => 'Italia', 'GentilicioMasculino' => 'Italiano', 'GentilicioFemenino' => 'Italiana'],
            ['Name' => 'Estados Unidos', 'GentilicioMasculino' => 'Estadounidense', 'GentilicioFemenino' => 'Estadounidense'],
            ['Name' => 'México', 'GentilicioMasculino' => 'Mexicano', 'GentilicioFemenino' => 'Mexicana'],
            ['Name' => 'Perú', 'GentilicioMasculino' => 'Peruano', 'GentilicioFemenino' => 'Peruana'],
            ['Name' => 'Colombia', 'GentilicioMasculino' => 'Colombiano', 'GentilicioFemenino' => 'Colombiana'],
            ['Name' => 'Venezuela', 'GentilicioMasculino' => 'Venezolano', 'GentilicioFemenino' => 'Venezolana'],
            ['Name' => 'Canadá', 'GentilicioMasculino' => 'Canadiense', 'GentilicioFemenino' => 'Canadiense'],
            ['Name' => 'Japón', 'GentilicioMasculino' => 'Japonés', 'GentilicioFemenino' => 'Japonesa'],
            ['Name' => 'China', 'GentilicioMasculino' => 'Chino', 'GentilicioFemenino' => 'China'],
            ['Name' => 'Alemania', 'GentilicioMasculino' => 'Alemán', 'GentilicioFemenino' => 'Alemana'],
            ['Name' => 'Rusia', 'GentilicioMasculino' => 'Ruso', 'GentilicioFemenino' => 'Rusa'],
            ['Name' => 'Reino Unido', 'GentilicioMasculino' => 'Británico', 'GentilicioFemenino' => 'Británica'],
            ['Name' => 'Australia', 'GentilicioMasculino' => 'Australiano', 'GentilicioFemenino' => 'Australiana']
        ];
        foreach ($paises as $pais) {
            DB::table('pais')->insert($pais);
        }
    }
}
