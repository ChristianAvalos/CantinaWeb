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

        DB::table('roles')->insert([
            'name' => 'Administrador',
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
            'UrevUsuario' => 'Admin', 
            'UrevFechaHora' => Carbon::now(),
        ]);

        DB::table('roles')->insert([
            'name' => 'Usuario',
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
            'UrevUsuario' => 'Admin', 
            'UrevFechaHora' => Carbon::now(),
        ]);
    }
}
