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
        DB::table('users')->updateOrInsert(
            ['email' => 'admin@admin.com.py'],
            [
                'name' => 'Administrador',
                'nameUser' => 'admin',
                'password' => Hash::make('#admin#'),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
                'rol_id' => 1,
                'id_tipoestado' => 1,
                'id_organizacion' => 1,
                'UrevUsuario' => 'Admin',
                'UrevFechaHora' => Carbon::now(),
            ]
        );
    }
}
