<?php

namespace App\Http\Controllers;

use App\Models\TipoParentesco;

/**
 * Catálogo de parentescos (solo lectura desde la API).
 */
class TipoParentescoController extends Controller
{
    public function index()
    {
        return response()->json(TipoParentesco::orderBy('id')->get());
    }
}
