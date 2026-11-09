<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RolesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {

        $now = Carbon::now();

        // updateOrInsert por name: re-ejecutar no duplica roles.
        // El orden importa: el código asume Administrador de Sistema = id 1 y
        // Administrador de Organización = id 3 (ver PerteneceAOrganizacion).
        foreach (['Administrador - Sistema', 'Usuario', 'Administrador - Organizacion', 'Familia'] as $nombre) {
            DB::table('roles')->updateOrInsert(
                ['name' => $nombre],
                [
                    'UrevUsuario' => 'Admin',
                    'UrevFechaHora' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }
    }
}
