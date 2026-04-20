<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class TipoPagoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $nombres = ['Contado','Crédito','Cuotas'];
        $abreviaturas = ['CO','CR','CU'];

        $now = Carbon::now();

        foreach ($nombres as $i => $nombre) {
            DB::table('tipo_pagos')->insert([
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
