<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PermissionController extends Controller
{
    public function ObtenerPermisosRole($roleId)
    {
        $role = Role::with('permissions')->findOrFail($roleId);
        $permissions = Permission::all();

        return response()->json([
            'permissions' => $permissions,
            'rolePermissions' => $role->permissions->pluck('id')->toArray(),
        ]);
    }

    public function ActualizarPermisos(Request $request, $roleId)
    {
        $role = Role::findOrFail($roleId);

            // Prepara los datos para sync con campos extra
        $syncData = [];
        foreach ($request->permissions as $permisoId) {
            $syncData[$permisoId] = [
                'UrevUsuario' => 'Actualizado - ' . Auth::user()->name,
                'UrevFechaHora' => Carbon::now(),
            ];
        }

        $role->permissions()->sync($syncData);

        return response()->json(['success' => true]);
    }
}
