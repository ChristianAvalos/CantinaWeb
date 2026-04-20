<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class TipoComprobanteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $nombres = ['Factura','Ticket','Boleta','Nota de Crédito','Nota de Débito'];
        $abreviaturas = ['FAC','TIC','BOL','NC','ND'];

        $now = Carbon::now();
        foreach ($nombres as $i => $nombre) {
            DB::table('tipo_comprobantes')->insert([
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
