<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class FormaPagoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $nombres = [
            'Efectivo',
            'Tarjeta de Débito',
            'Tarjeta de Crédito',
            'Transferencia Bancaria',
            'Cheque',
            'Billetera Electrónica',
        ];

        $abreviaturas = ['EF','TD','TC','TR','CH','BE'];
        $now = Carbon::now();
        foreach ($nombres as $i => $nombre) {
            DB::table('forma_pagos')->insert([
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
