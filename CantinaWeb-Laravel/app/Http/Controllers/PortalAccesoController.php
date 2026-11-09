<?php

namespace App\Http\Controllers;

use App\Models\Persona;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

/**
 * Alta y administración de las cuentas de acceso al portal de familias.
 *
 * La escuela crea el acceso del tutor (o del alumno) desde el backoffice y lo
 * deja vinculado a su persona. El usuario resultante tiene rol Familia, sin
 * sucursal y sin acceso a las pantallas internas.
 */
class PortalAccesoController extends Controller
{
    use PerteneceAOrganizacion;

    public function index(Request $request)
    {
        $data = $request->validate([
            'id_persona' => ['required', 'exists:personas,id'],
        ]);

        $persona = Persona::findOrFail($data['id_persona']);
        $this->autorizarPersona($persona);

        return response()->json([
            'data' => User::where('id_persona', $persona->id)
                ->get(['id', 'name', 'nameUser', 'email', 'id_tipoestado', 'created_at']),
            'password_inicial' => '123456',
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id_persona' => ['required', 'exists:personas,id'],
            'nameUser' => ['required', 'string', 'max:100', 'unique:users,nameUser'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
        ], [
            'nameUser.unique' => 'Ese nombre de usuario ya existe.',
            'email.unique' => 'Ese correo ya está registrado.',
        ]);

        $persona = Persona::findOrFail($data['id_persona']);
        $this->autorizarPersona($persona);

        $rolFamilia = Role::where('name', 'Familia')->first();

        if (! $rolFamilia) {
            return response()->json([
                'message' => 'Falta configurar el rol Familia. Ejecutá las migraciones pendientes.',
            ], 422);
        }

        // La escuela no define contraseñas: se entrega una inicial y se cambia
        // luego desde el portal o se restablece desde acá.
        $password = '123456';

        $user = User::create([
            'name' => $persona->nombre,
            'nameUser' => $data['nameUser'],
            'email' => $data['email'],
            'password' => Hash::make($password),
            'rol_id' => $rolFamilia->id,
            'id_organizacion' => $persona->id_organizacion,
            // Las cuentas de portal no pertenecen a una sucursal: ven las compras
            // de todas las sucursales de su organización.
            'id_sucursal' => null,
            'id_persona' => $persona->id,
            'id_tipoestado' => 1,
            'UrevUsuario' => 'Creado - ' . Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Acceso al portal creado correctamente.',
            'user' => $user,
            'password_inicial' => $password,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::with('persona')->findOrFail($id);

        if (! $user->persona) {
            return response()->json(['message' => 'La cuenta no está vinculada a una persona.'], 422);
        }

        $this->autorizarPersona($user->persona);

        $data = $request->validate([
            'nameUser' => [
                'required', 'string', 'max:100',
                Rule::unique('users', 'nameUser')->ignore($user->id),
            ],
            'email' => [
                'required', 'email', 'max:150',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ], [
            'nameUser.unique' => 'Ese nombre de usuario ya existe.',
            'email.unique' => 'Ese correo ya está registrado.',
        ]);

        $user->update([
            'nameUser' => $data['nameUser'],
            'email' => $data['email'],
            'UrevUsuario' => 'Actualizado - ' . Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Acceso al portal actualizado.',
            'user' => $user->fresh(),
        ]);
    }

    public function resetPassword($id)
    {
        $user = User::with('persona')->findOrFail($id);

        if (! $user->persona) {
            return response()->json(['message' => 'La cuenta no está vinculada a una persona.'], 422);
        }

        $this->autorizarPersona($user->persona);

        // Siempre se restablece a la contraseña por defecto: la escuela no
        // define ni conoce la contraseña del tutor.
        $user->update([
            'password' => Hash::make('123456'),
            'UrevUsuario' => 'Reset - ' . Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Contraseña restablecida a la inicial.',
            'password_inicial' => '123456',
        ]);
    }

    public function estado(Request $request, $id)
    {
        $data = $request->validate([
            'id_tipoestado' => ['required', 'exists:tipo_estados,id'],
        ]);

        $user = User::with('persona')->findOrFail($id);

        if (! $user->persona) {
            return response()->json(['message' => 'La cuenta no está vinculada a una persona.'], 422);
        }

        $this->autorizarPersona($user->persona);
        $user->update([
            'id_tipoestado' => $data['id_tipoestado'],
            'UrevUsuario' => 'Actualizado - ' . Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json(['message' => 'Estado de la cuenta actualizado.']);
    }

    private function autorizarPersona(Persona $persona): void
    {
        if (! $this->enAlcance($persona)) {
            abort(response()->json([
                'message' => 'La persona no pertenece a tu organización.',
            ], 403));
        }
    }
}
