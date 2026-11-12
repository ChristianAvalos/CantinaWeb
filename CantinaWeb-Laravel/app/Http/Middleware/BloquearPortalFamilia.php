<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Impide que una cuenta del portal de familias (rol Familia) use las rutas del
 * backoffice.
 *
 * Excepción: las rutas del PROPIO usuario (perfil y contraseña) son las mismas
 * para todos y las resuelve AuthController, que limita qué puede modificar una
 * cuenta del portal.
 */
class BloquearPortalFamilia
{
    /** Rutas de usuario accesibles también desde el portal. */
    private const RUTAS_DEL_PROPIO_USUARIO = [
        'api/usuarioUpdate/*',
        'api/cambiarpassword',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->esFamilia() && ! $request->is(...self::RUTAS_DEL_PROPIO_USUARIO)) {
            return response()->json([
                'message' => 'Esta cuenta solo tiene acceso al portal de familias.',
            ], 403);
        }

        return $next($request);
    }
}
