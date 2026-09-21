<?php

namespace Database\Seeders;

use Carbon\Carbon;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run()
    {
        // Obtén los roles
        $adminRole = Role::where('name', 'Administrador')->first();
        $userRole = Role::where('name', 'Usuario')->first();

        // Permisos a crear
        $permissions = [
            'Principal',
            'Herraminetas_usuarios',
            'Compras',
            'Ventas',
            'Ajustes',
            'Reporte_Usuarios',
            'Organizacion',
            'Transacciones',
            'Personas',
            'Categorias',
            'Productos',
            'Precio_Ventas',
            'Cobranzas',
            'Pagos_Proveedores',
            'Historial_Inventario'
        ];

        foreach ($permissions as $permission) {
            // firstOrCreate: el seeder se puede volver a correr sin duplicar nada.
            // Así se agregan permisos nuevos sin re-sembrar toda la base.
            $perm = Permission::firstOrCreate(
                ['name' => $permission],
                [
                    'UrevUsuario' => 'Admin',
                    'UrevFechaHora' => Carbon::now(),
                ]
            );

            // Asocia el permiso con el rol de administrador (sin duplicar la relación)
            if ($adminRole) {
                $adminRole->permissions()->syncWithoutDetaching([
                    $perm->id => [
                        'created_at' => Carbon::now(),
                        'updated_at' => Carbon::now(),
                        'UrevUsuario' => 'Admin',
                        'UrevFechaHora' => Carbon::now(),
                    ],
                ]);
            }
        }

        // // Asocia permisos específicos con el rol de usuario
        // $userRole->permissions()->attach(Permission::where('name', 'Reporte_Usuarios')->first()->id,
        // [
        //     'created_at' => Carbon::now(),
        //     'updated_at' => Carbon::now(),
        //     'UrevUsuario' => 'Admin',
        //     'UrevFechaHora' => Carbon::now(),
        // ]
        // );


        // Asocia permisos específicos con el rol de usuario
        // $permisosUsuario = ['Transacciones', 'Categorias','Principal'];

        // foreach ($permisosUsuario as $permisoNombre) {
        //     $permiso = Permission::where('name', $permisoNombre)->first();
        //     if ($permiso) {
        //         $userRole->permissions()->attach($permiso->id, [
        //             'created_at' => Carbon::now(),
        //             'updated_at' => Carbon::now(),
        //             'UrevUsuario' => 'Admin',
        //             'UrevFechaHora' => Carbon::now(),
        //         ]);
        //     }
        // }

    }
}

