<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class TipoMonedaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $nombres = [
            'Guaraní',
            'Dólar Americano',
            'Euro',
            'Real Brasileño',
            'Peso Argentino'
        ];

        $abreviaturas = ['PYG','USD','EUR','BRL','ARS'];

        $now = Carbon::now();

        foreach ($nombres as $i => $nombre) {
            DB::table('tipo_monedas')->insert([
                'nombre'       => $nombre,
                'abreviatura'  => $abreviaturas[$i],
                'UrevUsuario'  => 'Admin',
                'UrevFechaHora'=> $now,
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
        }
    }
}
