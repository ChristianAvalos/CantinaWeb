<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class UserAdministrador extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Se resuelve por nombre, no por id fijo: el catálogo de roles puede
        // haberse ampliado (por ejemplo, con el rol Familia).
        $rolAdmin = DB::table('roles')->where('name', 'Administrador - Sistema')->value('id') ?? 1;

        DB::table('users')->updateOrInsert(
            ['email' => 'admin@admin.com.py'],
            [
                'name' => 'Administrador',
                'nameUser' => 'admin',
                'password' => Hash::make('#admin#'),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
                'rol_id' => $rolAdmin,
                'id_tipoestado' => 1,
                'id_organizacion' => 1,
                'UrevUsuario' => 'Admin',
                'UrevFechaHora' => Carbon::now(),
            ]
        );
    }
}
