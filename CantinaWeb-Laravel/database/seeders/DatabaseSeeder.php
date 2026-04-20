<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Database\Seeders\PaisSeeder;
use Database\Seeders\RolesSeeder;
use Database\Seeders\BancosSeeder;
use Database\Seeders\TipoPagoSeeder;
use Database\Seeders\FormaPagoSeeder;
use Database\Seeders\TipoEstadoSeeder;
use Database\Seeders\TipoMonedaSeeder;
use Database\Seeders\TipoPersonaSeeder;
use Database\Seeders\UserAdministrador;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\UnidadesMedidaSeeder;
use Database\Seeders\TipoComprobanteSeeder;
use Database\Seeders\TipoMovimientosSeeder;
use Database\Seeders\CiudadesYdepartamentos;
use Database\Seeders\PermissionsTableSeeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        
        $this->call(RolesSeeder::class);
        $this->call(PaisSeeder::class);
        $this->call(CiudadesYdepartamentos::class);
        $this->call(OrganizacionSeeder::class);
        $this->call(TipoEstadoSeeder::class);
        $this->call(UserAdministrador::class);
        $this->call(PermissionsTableSeeder::class);
        $this->call(RolePermissionSeeder::class);
        $this->call(TipoMovimientosSeeder::class);
        $this->call(CategoriasSeeder::class);
        $this->call(UnidadesMedidaSeeder::class);
        $this->call(TipoPersonaSeeder::class);
        $this->call(BancosSeeder::class);
        $this->call(TipoMonedaSeeder::class);
        $this->call(TipoPagoSeeder::class);
        $this->call(FormaPagoSeeder::class);
        $this->call(TipoComprobanteSeeder::class);
    }
}
