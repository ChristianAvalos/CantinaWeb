<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class OrganizacionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('organizacion')->insert([
            'RazonSocial'   => 'CDSystem.',
            'RUC'           => '5291959',
            'Direccion'     => 'Fortin Yrendague y TTe.Chiriffe',
            'Ciudad_id'     => 4,
            'Pais_id'       => 4,
            'Telefono1'     => '',
            'Telefono2'     => '0961415632',
            'Fax1'          => '',
            'Fax2'          => '',
            'Email'         => 'cdsystempy@gmail.com',
            'Sigla'         => 'CDS',
            'SitioWeb'      => '',
            'Imagen'        => null,
            'UrevUsuario'   => 'Admin',
            'UrevFechaHora' => Carbon::now(),
        ]);
    }
}
