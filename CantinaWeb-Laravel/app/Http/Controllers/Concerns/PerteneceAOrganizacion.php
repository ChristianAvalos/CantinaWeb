<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Facades\Auth;

/**
 * Verifica la pertenencia a la organización del usuario autenticado.
 *
 * Cada usuario opera ÚNICAMENTE dentro de su organización y, si tiene una
 * sucursal asignada, dentro de esa sucursal.
 *
 * No existe un "administrador global": el rol Administrador también está atado
 * a una organización, por lo que NUNCA se exime del filtro. Si en el futuro se
 * necesita un super-admin, debe modelarse con un rol/bandera explícita y un
 * bypass propio, nunca por el nombre del rol.
 */
trait PerteneceAOrganizacion
{
    /** Organización del usuario autenticado. */
    protected function organizacionDelUsuario(): ?int
    {
        return Auth::user()?->id_organizacion;
    }

    /**
     * Sucursal del usuario autenticado.
     * `null` significa "sin restricción de sucursal".
     */
    protected function sucursalDelUsuario(): ?int
    {
        return Auth::user()?->id_sucursal;
    }

    /**
     * ¿El registro pertenece al ámbito del usuario?
     * Valida siempre la organización y, si `$conSucursal` es true y el usuario
     * tiene sucursal asignada, también la sucursal.
     *
     * Sirve para cualquier modelo con `id_organizacion` (y, si aplica,
     * `id_sucursal`). Ej.: `$this->enAlcance($producto)` o
     * `$this->enAlcance($transaccion, true)`.
     */
    protected function enAlcance($registro, bool $conSucursal = false): bool
    {
        $user = Auth::user();

        if (! $user || ! $registro) {
            return false;
        }

        if ((int) $registro->id_organizacion !== (int) $user->id_organizacion) {
            return false;
        }

        if ($conSucursal && ! empty($user->id_sucursal)
            && (int) $registro->id_sucursal !== (int) $user->id_sucursal) {
            return false;
        }

        return true;
    }
}
