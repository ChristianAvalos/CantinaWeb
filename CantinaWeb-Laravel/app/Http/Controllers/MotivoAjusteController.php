<?php

namespace App\Http\Controllers;

use App\Models\MotivoAjuste;

class MotivoAjusteController extends Controller
{
    /**
     * Lista el catálogo de motivos de ajuste para los combos del frontend.
     */
    public function index()
    {
        return response()->json(MotivoAjuste::orderBy('nombre')->get());
    }
}
