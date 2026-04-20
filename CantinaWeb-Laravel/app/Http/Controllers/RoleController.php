<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\CreateRolRequest;

class RoleController extends Controller
{
    public function index(Request $request){
        $search = $request->input('search');
        if ($request->query('all')) {
            $roles = Role::all();
        } else {
            $roles = Role::
            when($search, function ($query, $search) {
                return $query->where('name', 'ilike', '%' . $search . '%');
            })->paginate(10);
        }
        
        return response()->json($roles);

    }

    public function DeleteRol($id)
    {  
        //Actualizo los usuarios que tenga ese rol y los dejo en null para proceder a eliminar 
        User::where('rol_id', $id)->update(['rol_id' => null]);

        // Elimino los permisos asociados al rol en la tabla pivot role_permission
        DB::table('role_permission')->where('rol_id', $id)->delete();
        
        
        //Elimino el rol 
        $role = Role::findOrFail($id);
        $role->delete();

        return response()->json(['message' => 'Rol eliminado correctamente.'],200);
    }

    public function createRol(CreateRolRequest $request){
        //validar el registro 

        $data = $request->validated();

        //crear usuario
        $rol = Role::create(
            [
                'name' => $data['name'],
                'UrevUsuario' => 'Creado - ' . Auth::user()->name,
                'UrevFechaHora' => Carbon::now()
            ]
            );

    // Retornar respuesta exitosa
    return response()->json([
        'message' => 'Rol creado exitosamente',
        'rol' => $rol
    ], 201);
    }

    public function updateRol(CreateRolRequest $request, $id)
    {
        // Validar los datos de entrada
        $data = $request->validated();


        // Encontrar el rol por su ID
        $rol = Role::findOrFail($id);


        // Actualizar los datos del rol con los nuevos valores
        $rol->name = $data['name'];
        $rol->UrevUsuario = 'Actualizado - ' . Auth::user()->name;
        $rol->UrevFechaHora = Carbon::now();

        // Guardar los cambios en la base de datos
        $rol->save();

        // Retornar una respuesta exitosa
        return response()->json([
            'message' => 'Rol actualizado exitosamente',
            'rol' => $rol 
        ], 200);
    }



}
