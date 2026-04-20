<?php

namespace App\Http\Controllers;

use Log;
use Carbon\Carbon;
use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Requests\LoginRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Http\Requests\RegistroRequest;
use App\Http\Requests\CreateUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Requests\CambiarPasswordRequest;


class AuthController extends Controller
{
    public function index(Request $request)
    {
        $search = $request->input('search');
        $usuarios = User::with('role', 'organizacion')->when($search, function ($query, $search) {
            return $query->where('name', 'ilike', '%' . $search . '%')
                ->orWhere('email', 'ilike', '%' . $search . '%');
        })
            ->paginate(10);
        //$cantidadUsuarios = User::all()->count(); 
        return response()->json([
            'usuarios' => $usuarios/*,
            'cantidad' => $cantidadUsuarios,*/
        ]);
    }


    public function register(RegistroRequest $request)
    {
        //validar el registro 

        $data = $request->validated();

        //crear usuario
        $user = User::create(
            [
                'name' => $data['name'],
                'nameUser' => $data['nameUser'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'rol_id' => 2, //por defecto se crea como usuario
                'id_tipoestado' => 1, //por defecto se crea con estado Activo
                'UrevUsuario' => 'Registrado - ' . $data['name'],
                'UrevFechaHora' => Carbon::now()

            ]
        );
        //retorna una respuesta
        return [
            'token' => $user->createToken('token')->plainTextToken,
            'user' => $user
        ];
    }

    public function createUser(CreateUserRequest $request)
    {
        //validar el registro 

        $data = $request->validated();

        //crear usuario
        $user = User::create(
            [
                'name' => $data['name'],
                'nameUser' => $data['nameUser'],
                'email' => $data['email'],
                'password' => Hash::make('123456'),
                'rol_id' => $data['rol_id'],
                'id_organizacion' => $data['id_organizacion'],
                'id_tipoestado' => 1, //por defecto se crea con estado Activo
                'UrevUsuario' => 'Creado - ' . Auth::user()->name,
                'UrevFechaHora' => Carbon::now()
            ]
        );

        // Retornar respuesta exitosa
        return response()->json([
            'message' => 'Usuario creado exitosamente',
            'user' => $user
        ], 201);
    }

    public function updateUser(UpdateUserRequest $request, $id)
    {
        // Validar los datos de entrada
        $data = $request->validated();


        // Encontrar el usuario por su ID
        $usuario = User::findOrFail($id);


        // Actualizar los datos del usuario con los nuevos valores
        $usuario->name = $data['name'];
        $usuario->nameUser = $data['nameUser'];
        $usuario->email = $data['email'];
        $usuario->rol_id = $data['rol_id'];
        $usuario->id_organizacion = $data['id_organizacion'];
        $usuario->UrevUsuario = 'Actualizado - ' . Auth::user()->name;
        $usuario->UrevFechaHora = Carbon::now();

        // Guardar los cambios en la base de datos
        $usuario->save();

        // Retornar una respuesta exitosa
        return response()->json([
            'message' => 'Usuario actualizado exitosamente',
            'usuario' => $usuario
        ], 200);
    }



    public function login(LoginRequest $request)
    {
        $data = $request->validated();

        //Revisar el password 
        if (!Auth::attempt($data)) {
            return response([
                'errors' => ['El nombre de usuario o la contraseña no son correctas']
            ], 422);
        }

        //Autenticar al usuario
        $user = Auth::user();
        //retorna una respuesta
        return [
            'token' => $user->createToken('token')->plainTextToken,
            'user' => $user
        ];
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

        return [
            'user' => null
        ];
    }



    public function ObtenerPermisosUsuario()
    {
        $user = Auth::user();

        // Verifica si el usuario tiene un rol asignado
        if (!$user->role) {
            return response()->json(['error' => 'El usuario no tiene un rol asignado.'], 404);
        }

        // Obtener los permisos del usuario a través del rol
        $permissions = $user->role->permissions->pluck('name')->unique();

        return $user;
    }


    public function DeleteUser($id)
    {
        // Buscar el usuario por ID
        $user = User::findOrFail($id);

        //eliminar el usuario
        $user->delete();

        return response()->json(['message' => 'Usuario eliminado correctamente.'], 200);
    }


    public function cambiarpassword(CambiarPasswordRequest $request)
    {

        try {
            $data = $request->validated();
            $user = Auth::user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Usuario no autenticado',
                ], 401);
            }

            // Verificar si la contraseña actual es correcta
            if (!Hash::check($request->currentPassword, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'La contraseña actual no es correcta',
                ], 400);
            }

            // Actualizar la contraseña
            $user->password = Hash::make($request->newPassword);
            $user->UrevUsuario = 'Actualizado - ' . Auth::user()->name;
            $user->UrevFechaHora = Carbon::now();
            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Contraseña actualizada con éxito',
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ocurrió un error inesperado: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function resetPassword($id)
    {
        // Buscar el usuario por ID
        $usuario = User::find($id);

        // Verificar si el usuario existe
        if (!$usuario) {
            return response()->json(['error' => 'Usuario no encontrado'], 404);
        }

        // Asignar la contraseña por defecto y encriptarla
        $usuario->password = Hash::make('123456');

        // Guardar los cambios en la base de datos
        $usuario->save();

        // Devolver una respuesta exitosa
        return response()->json(['message' => 'Contraseña restablecida correctamente']);
    }


    public function estadoUser($id, Request $request)
    {
        // Buscar el usuario por ID
        $user = User::findOrFail($id);
        //Asigno el estado del usuario
        $user->id_tipoestado = $request->id_tipoestado;
        //Actualizo el urev de usuario
        $user->UrevUsuario = 'Actualizado - ' . Auth::user()->name;
        $user->UrevFechaHora = Carbon::now();
        //Guardo los cambios
        $user->save();

        return response()->json(['message' => 'Estado del usuario actualizado correctamente.'], 200);
    }
}
