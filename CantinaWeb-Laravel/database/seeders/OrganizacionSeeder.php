<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OrganizacionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {

        $organizacionExistente = DB::table('organizacion')->first();
        if (!$organizacionExistente) {
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
            $organizacionExistente = DB::table('organizacion')->first();
        }

        // Toda organización tiene su sucursal principal (idempotente).
        $tieneSucursal = DB::table('sucursales')
            ->where('id_organizacion', $organizacionExistente->id)
            ->exists();

        if (! $tieneSucursal) {
            DB::table('sucursales')->insert([
                'id_organizacion' => $organizacionExistente->id,
                'nombre'          => $organizacionExistente->RazonSocial ?: 'Principal',
                'es_principal'    => true,
                'id_tipo_estado'  => 1,
                'UrevUsuario'     => 'Admin',
                'UrevFechaHora'   => Carbon::now(),
                'created_at'      => Carbon::now(),
                'updated_at'      => Carbon::now(),
            ]);
        }
    }
}
