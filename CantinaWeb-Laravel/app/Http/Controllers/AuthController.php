<?php

namespace App\Http\Controllers;

use Log;
use Carbon\Carbon;
use App\Models\User;
use App\Models\Role;
use App\Models\Sucursal;
use Illuminate\Http\Request;
use App\Http\Requests\LoginRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Http\Requests\RegistroRequest;
use App\Http\Requests\CreateUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Requests\CambiarPasswordRequest;
use App\Http\Controllers\Concerns\AplicaFiltrosDinamicos;


class AuthController extends Controller
{
    use AplicaFiltrosDinamicos;

    public function index(Request $request)
    {
        $search = $request->input('search');
        $filtros = $this->normalizarFiltros($request->input('filtros', []));

        $usuarios = User::with('role', 'organizacion', 'sucursal');

        if ($search) {
            $usuarios->where(function ($query) use ($search) {
                $query->where('name', 'ilike', '%' . $search . '%')
                    ->orWhere('email', 'ilike', '%' . $search . '%');
            });
        }

        if (!empty($filtros)) {
            $this->aplicarFiltrosDinamicos($usuarios, $filtros, ['search']);
        }

        $usuarios = $usuarios->paginate(10);
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

        // El rol se resuelve por nombre: los ids pueden variar entre entornos.
        $rolUsuario = DB::table('roles')->where('name', 'Usuario')->value('id') ?? 2;

        //crear usuario
        $user = User::create(
            [
                'name' => $data['name'],
                'nameUser' => $data['nameUser'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'debe_cambiar_password' => false,
                'rol_id' => $rolUsuario, //por defecto se crea como usuario
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

        // Las cuentas del portal necesitan una persona vinculada: se crean
        // únicamente desde Personas > Alumno > Tutores.
        if (Role::whereKey($data['rol_id'])->where('name', 'Familia')->exists()) {
            return response()->json([
                'message' => 'Las cuentas del portal se crean desde la ficha del alumno (Tutores).',
            ], 422);
        }

        //crear usuario
        $user = User::create(
            [
                'name' => $data['name'],
                'nameUser' => $data['nameUser'],
                'email' => $data['email'],
                'password' => Hash::make('123456'),
                // Contraseña por defecto: se exige cambiarla al ingresar.
                'debe_cambiar_password' => true,
                'rol_id' => $data['rol_id'],
                'id_organizacion' => $data['id_organizacion'],
                'id_sucursal' => $data['id_sucursal'] ?? Sucursal::principalDeOCrear((int) $data['id_organizacion'])->id,
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
        $autenticado = Auth::user();

        // Una cuenta del portal solo puede editar SU propio usuario y nunca su
        // rol, organización o sucursal (evita escalar privilegios).
        if ($autenticado->esFamilia()) {
            if ((int) $autenticado->id !== (int) $usuario->id) {
                return response()->json([
                    'message' => 'Solo podés modificar tu propio usuario.',
                ], 403);
            }

            $data['rol_id'] = $usuario->rol_id;
            $data['id_organizacion'] = $usuario->id_organizacion;
            $data['id_sucursal'] = $usuario->id_sucursal;
        }

        // Actualizar los datos del usuario con los nuevos valores
        $usuario->name = $data['name'];
        $usuario->nameUser = $data['nameUser'];
        $usuario->email = $data['email'];
        $usuario->rol_id = $data['rol_id'];
        $usuario->id_organizacion = $data['id_organizacion'];
        $usuario->id_sucursal = $data['id_sucursal'] ?? $usuario->id_sucursal;
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
        $identificador = trim((string) $data['nameUser']);

        // Se puede ingresar con el nombre de usuario o con el documento
        // (4.545.544 y 4545544 son equivalentes).
        $user = User::where('nameUser', $identificador)->first();

        if (! $user && $this->pareceDocumento($identificador)) {
            $candidatos = $this->usuariosPorDocumento($identificador);

            if ($candidatos->count() > 1) {
                return response([
                    'errors' => ['El documento está asociado a más de una cuenta. Ingresá con tu usuario.'],
                ], 422);
            }

            $user = $candidatos->first();
        }

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response([
                'errors' => ['El usuario/documento o la contraseña no son correctos']
            ], 422);
        }

        Auth::login($user);

        // El usuario no accede si él, su organización o su sucursal están inactivos.
        $motivo = $user->motivoBloqueo();
        if ($motivo) {
            Auth::logout();
            return response(['errors' => [$motivo]], 422);
        }

        //retorna una respuesta
        return [
            'token' => $user->createToken('token')->plainTextToken,
            // El frontend usa el rol para decidir entre backoffice y portal.
            'user' => $user->load('role', 'persona'),
        ];
    }

    /** ¿El valor ingresado parece un documento (solo dígitos y separadores)? */
    private function pareceDocumento(string $valor): bool
    {
        return $valor !== '' && preg_match('/^[\d.\-\s]+$/', $valor) === 1;
    }

    /**
     * Usuarios cuya persona tiene ese documento, comparando solo los dígitos.
     * Se usa una expresión por motor para ignorar puntos, guiones y espacios.
     */
    private function usuariosPorDocumento(string $documento)
    {
        $digitos = preg_replace('/\D+/', '', $documento);

        if ($digitos === '') {
            return collect();
        }

        $driver = DB::getDriverName();
        $expresion = $driver === 'pgsql'
            ? "regexp_replace(COALESCE(documento, ''), '\\D', '', 'g')"
            : "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(documento, ''), '.', ''), '-', ''), ' ', ''), '/', ''), '(', ''), ')', '')";

        $idsPersonas = DB::table('personas')
            ->whereRaw("{$expresion} = ?", [$digitos])
            ->pluck('id');

        if ($idsPersonas->isEmpty()) {
            return collect();
        }

        return User::whereIn('id_persona', $idsPersonas)->get();
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

            // La contraseña actual solo se exige cuando NO es la inicial: si el
            // usuario debe cambiarla, ya conocemos la clave por defecto.
            if (! $user->debe_cambiar_password
                && ! Hash::check((string) $request->currentPassword, $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'La contraseña actual no es correcta',
                ], 400);
            }

            // Actualizar la contraseña
            $user->password = Hash::make($request->newPassword);
            $user->debe_cambiar_password = false;
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
        // Deberá cambiarla en el próximo inicio de sesión.
        $usuario->debe_cambiar_password = true;

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
