<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Facades\Auth;

/**
 * Verifica la pertenencia a la organización del usuario autenticado.
 *
 * Cada usuario opera ÚNICAMENTE dentro de su organización y, si tiene una
 * sucursal asignada, dentro de esa sucursal.
 *
 * La única excepción es el rol Administrador de Sistema (`rol_id` 1), que ve y
 * opera todas las organizaciones; el "Administrador de Organización" NO está
 * exento, queda acotado a la suya. El bypass se decide por el rol explícito
 * (`esAdminSistema`), nunca por el nombre del rol.
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
     * ¿Es Administrador de Sistema (rol 1)?
     * Ese rol es el único que ve y opera TODAS las organizaciones; el resto
     * (incluido el Administrador de Organización) queda acotado a la suya.
     */
    protected function esAdminSistema(): bool
    {
        return (int) (Auth::user()?->rol_id) === 1;
    }

    /**
     * ¿El registro pertenece al ámbito del usuario?
     * El Administrador de Sistema siempre pasa. Para el resto valida la
     * organización y, si `$conSucursal` es true y el usuario tiene sucursal
     * asignada, también la sucursal.
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

        if ($this->esAdminSistema()) {
            return true;
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
