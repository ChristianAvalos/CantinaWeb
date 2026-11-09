<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Catálogos mínimos para que el portal de familias funcione sin depender de
 * volver a correr los seeders en cada despliegue.
 *
 * Idempotente: usa updateOrInsert y comprueba duplicados antes de asociar.
 */
return new class extends Migration
{
    private const PERMISOS_STAFF = ['Cuentas_Alumnos', 'Vinculos_Personas'];
    private const PERMISO_PORTAL = 'Portal_Familia';

    public function up(): void
    {
        $now = now();

        // Tipos de persona educativos (el catálogo ya distingue Cliente/Proveedor).
        foreach (['Alumno', 'Tutor'] as $nombre) {
            DB::table('tipo_persona')->updateOrInsert(
                ['nombre' => $nombre],
                [
                    'UrevUsuario' => 'Admin',
                    'UrevFechaHora' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        // Los roles base se aseguran ANTES de crear Familia. Varios puntos del
        // sistema asumen ids fijos (administrador de sistema = 1, administrador
        // de organización = 3); si esta migración corriera sobre una base sin
        // seeders, Familia no debe quedarse con el id 1.
        foreach (['Administrador - Sistema', 'Usuario', 'Administrador - Organizacion'] as $nombre) {
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

        // Rol de solo portal: no entra al backoffice ni al POS.
        DB::table('roles')->updateOrInsert(
            ['name' => 'Familia'],
            [
                'UrevUsuario' => 'Admin',
                'UrevFechaHora' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        foreach (array_merge(self::PERMISOS_STAFF, [self::PERMISO_PORTAL]) as $nombre) {
            DB::table('permissions')->updateOrInsert(
                ['name' => $nombre],
                [
                    'UrevUsuario' => 'Admin',
                    'UrevFechaHora' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );
        }

        $idFamilia = DB::table('roles')->where('name', 'Familia')->value('id');
        $idAdminSistema = DB::table('roles')->where('name', 'Administrador - Sistema')->value('id');
        $idAdminOrganizacion = DB::table('roles')->where('name', 'Administrador - Organizacion')->value('id');

        $idsStaff = DB::table('permissions')->whereIn('name', self::PERMISOS_STAFF)->pluck('id');
        $idPortal = DB::table('permissions')->where('name', self::PERMISO_PORTAL)->value('id');

        foreach (array_filter([$idAdminSistema, $idAdminOrganizacion]) as $idRol) {
            foreach ($idsStaff as $idPermiso) {
                $this->asociar($idRol, $idPermiso, $now);
            }
        }

        if ($idFamilia && $idPortal) {
            $this->asociar($idFamilia, $idPortal, $now);
        }
    }

    public function down(): void
    {
        $idFamilia = DB::table('roles')->where('name', 'Familia')->value('id');

        if ($idFamilia) {
            DB::table('role_permission')->where('rol_id', $idFamilia)->delete();
            DB::table('roles')->where('id', $idFamilia)->delete();
        }

        $idsPermisos = DB::table('permissions')
            ->whereIn('name', array_merge(self::PERMISOS_STAFF, [self::PERMISO_PORTAL]))
            ->pluck('id');

        if ($idsPermisos->isNotEmpty()) {
            DB::table('role_permission')->whereIn('permission_id', $idsPermisos)->delete();
            DB::table('permissions')->whereIn('id', $idsPermisos)->delete();
        }

        DB::table('tipo_persona')->whereIn('nombre', ['Alumno', 'Tutor'])->delete();
    }

    private function asociar($idRol, $idPermiso, $now): void
    {
        $existe = DB::table('role_permission')
            ->where('rol_id', $idRol)
            ->where('permission_id', $idPermiso)
            ->exists();

        if ($existe) {
            return;
        }

        DB::table('role_permission')->insert([
            'rol_id' => $idRol,
            'permission_id' => $idPermiso,
            'UrevUsuario' => 'Admin',
            'UrevFechaHora' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }
};
