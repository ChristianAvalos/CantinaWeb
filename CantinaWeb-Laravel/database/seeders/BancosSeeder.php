<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class BancosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
    $nombres = [
            'Banco Nacional de Fomento',
            'Banco Itaú Paraguay',
            'Banco Continental',
            'Banco Regional',
            'Visión Banco',
            'Sudameris Bank',
            'Banco Familiar',
            'Banco Atlas',
            'Banco GNB Paraguay',
            'Banco BASA'
        ];

        $abreviaturas = [
            'BNF',
            'ITAU',
            'CONT',
            'REG',
            'VISION',
            'SUDAM',
            'FAMIL',
            'ATLAS',
            'GNB',
            'BASA'
        ];
        $now = Carbon::now();
        foreach ($nombres as $index => $nombre) {
            DB::table('bancos')->insert([
                'nombre'       => $nombre,
                'abreviatura'  => $abreviaturas[$index],
                'UrevUsuario'  => 'Admin',
                'UrevFechaHora'=> $now,
                'created_at'   => $now,
                'updated_at'   => $now,
            ]);
        }
    }
}
