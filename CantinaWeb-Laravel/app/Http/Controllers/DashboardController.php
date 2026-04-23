<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Models\Categorias;
use App\Models\Transacciones;

class DashboardController extends Controller
{
    public function contadores()
    {
        return response()->json([
            'usuarios' => User::count(),
            'roles' => Role::count(),
            'categorias' => Categorias::count(),
            'transacciones' => Transacciones::count(),
        ]);
    }
}
