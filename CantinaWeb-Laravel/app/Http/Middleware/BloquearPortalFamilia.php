<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Impide que una cuenta del portal de familias (rol Familia) use las rutas del
 * backoffice. El acceso al portal se resuelve en su propio grupo de rutas.
 */
class BloquearPortalFamilia
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->esFamilia()) {
            return response()->json([
                'message' => 'Esta cuenta solo tiene acceso al portal de familias.',
            ], 403);
        }

        return $next($request);
    }
}
