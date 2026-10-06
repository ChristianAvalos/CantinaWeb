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
        $adminSRole = Role::where('name', 'Administrador - Sistema')->first();
        $adminORole = Role::where('name', 'Administrador - Organizacion')->first();
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

        // El Administrador de Organización administra la suya —por eso SÍ tiene
        // el permiso Organizacion—, pero NO gestiona usuarios del sistema.
        $excluidosAdminOrganizacion = ['Herraminetas_usuarios'];

        // Datos de la tabla pivote role_permission.
        $pivote = fn (): array => [
            'created_at'    => Carbon::now(),
            'updated_at'    => Carbon::now(),
            'UrevUsuario'   => 'Admin',
            'UrevFechaHora' => Carbon::now(),
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

            // Administrador de Sistema: todos los permisos.
            if ($adminSRole) {
                $adminSRole->permissions()->syncWithoutDetaching([$perm->id => $pivote()]);
            }

            // Administrador de Organización: todo menos los excluidos.
            if ($adminORole && ! in_array($permission, $excluidosAdminOrganizacion, true)) {
                $adminORole->permissions()->syncWithoutDetaching([$perm->id => $pivote()]);
            }
        }

        // Refuerzo: quita de Administrador de Organización cualquier permiso
        // excluido que hubiera quedado asociado por error.
        if ($adminORole) {
            $idsExcluidos = Permission::whereIn('name', $excluidosAdminOrganizacion)->pluck('id');
            $adminORole->permissions()->detach($idsExcluidos);
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

