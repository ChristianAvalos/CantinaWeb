<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Auth;

class ReportController extends Controller
{
    
    public function generateUserReport()
    {
        $users = User::with(['role', 'role.permissions'])->get();
        return response()->json($users);
    }

    public function downloadUserReport(Request $request)
    {
        //Esto es para el general sin el filtro
        // $users = User::with(['role', 'role.permissions'])->get();

        // Obtener el nombre del usuario autenticado
        $userName = Auth::check() ? Auth::user()->name : 'Usuario desconocido';


        $users = $request->input('users');

        $pdf = Pdf::loadView('reports.userReport', compact('users','userName'));
        
        return $pdf->download('user_report.pdf');


        //Para pruebas estaticas
    //     $users = [
    //         (object) [
    //             'name' => 'Pedro',
    //             'role' => (object) [
    //                 'name' => 'Administrador',
    //                 'permissions' => collect([
    //                     (object) ['name' => 'Crear usuarios'],
    //                     (object) ['name' => 'Eliminar usuarios']
    //                 ])
    //             ]
    //         ],
    //         (object) [
    //             'name' => 'Juan',
    //             'role' => null // Sin rol
    //         ],
    //         (object) [
    //             'name' => 'Maria',
    //             'role' => (object) [
    //                 'name' => 'Empleado',
    //                 'permissions' => collect([])
    //             ]
    //         ]
    //     ];

    // // Retornar la vista 'reports.userReport' y pasar los usuarios estáticos
    // return view('reports.userReport', compact('users','userName'));


    }
}
