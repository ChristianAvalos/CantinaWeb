<?php

namespace App\Http\Controllers;

use App\Http\Requests\CreatePersonaRequest;
use App\Http\Requests\UpdatePersonaRequest;
use Carbon\Carbon;
use App\Models\Persona;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PersonaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        //$id_organizacion = Auth::user()->id_organizacion;
        $search = $request->input('search');
        $all = $request->boolean('all');
        $idTipoPersona = $request->input('id_tipo_persona');
        $tipoPersona = $request->input('tipo_persona');
        $idTipoEstado = $request->input('id_tipoestado');

        $search = is_string($search) ? trim(preg_replace('/\s+/', ' ', $search)) : $search;
        $searchLower = is_string($search) ? mb_strtolower($search) : $search;
        $digitsOnly = is_string($search) ? preg_replace('/\D+/', '', $search) : null;
        $driver = DB::getDriverName();

        $personasQuery = Persona::with('TipoPersona') 
            ->when(is_numeric($idTipoPersona), function ($query) use ($idTipoPersona) {
                $query->where('id_tipo_persona', (int) $idTipoPersona);
            })
            ->when(is_string($tipoPersona) && trim($tipoPersona) !== '', function ($query) use ($tipoPersona) {
                $tipoPersonaLower = mb_strtolower(trim($tipoPersona));

                $query->whereHas('TipoPersona', function ($tipoPersonaQuery) use ($tipoPersonaLower) {
                    $tipoPersonaQuery->whereRaw('LOWER(nombre) = ?', [$tipoPersonaLower]);
                });  
            })
            ->when(is_numeric($idTipoEstado), function ($query) use ($idTipoEstado) {
                $query->where('id_tipoestado', (int) $idTipoEstado);
            })

            ->when($searchLower, function ($query) use ($searchLower, $digitsOnly, $driver) {
                $like = '%' . $searchLower . '%';

                $query->where(function ($searchQuery) use ($like, $digitsOnly, $driver) {
                    $searchQuery->whereRaw('LOWER(nombre) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(documento) LIKE ?', [$like])
                        ->orWhereHas('TipoPersona', function ($q2) use ($like) {
                            $q2->whereRaw('LOWER(nombre) LIKE ?', [$like]);
                        });

                    if (is_string($digitsOnly) && $digitsOnly !== '') {
                        // Comparar documento ignorando separadores comunes (para formatos tipo 1.234.567-8)
                        if ($driver === 'pgsql') {
                            $searchQuery->orWhereRaw("regexp_replace(coalesce(documento,''), '\\D', '', 'g') LIKE ?", ['%' . $digitsOnly . '%']);
                        } else {
                            $expr = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(coalesce(documento,''),'.',''),'-',''),' ',''),'/', ''),'(',''),')','')";
                            $searchQuery->orWhereRaw("{$expr} LIKE ?", ['%' . $digitsOnly . '%']);
                        }
                    }
                });
            })
        ->orderBy('id', 'desc');
        if ($all) {
            $personas = $personasQuery->get();
            return response()->json(['data' => $personas]);
        } else {
            $personas = $personasQuery->paginate(10);
            return response()->json($personas);
        }    
    }

    /**
     * Show the form for creating a new resource.
     */
    public function createPersona(CreatePersonaRequest $request)
    {
        $data = $request->validated();
        //Asigno el urev de usuario
        $data['UrevUsuario'] = 'Creado - ' . Auth::user()->name;
        $data['UrevFechaHora'] = Carbon::now();
        $persona = Persona::create($data);

        return response()->json(['message' => 'Persona creada exitosamente', 'data' => $persona], 201);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Persona $persona)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Persona $persona)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function updatePersona(UpdatePersonaRequest $request, $id)
    {
        $data = $request->validated();
        $persona = Persona::findOrFail($id);
        //Asigno el urev de usuario
        $data['UrevUsuario'] = 'Actualizado - ' . Auth::user()->name;
        $data['UrevFechaHora'] = Carbon::now();
        $persona->update($data);

        return response()->json(['message' => 'Persona actualizada exitosamente', 'data' => $persona], 200);
    }
    /**
     * Remove the specified resource from storage.
     */
    public function DeletePersona($id)
    {
        // Eliminar la persona por su ID
        $persona = Persona::findOrFail($id);
        $persona->delete();

        return response()->json(['message' => 'Persona eliminada correctamente.'], 200);
    }
    public function estadoPersona($id, Request $request)
    {
        // Buscar el usuario por ID
        $persona = Persona::findOrFail($id);
        //Asigno el estado del usuario
        $persona->id_tipoestado = $request->id_tipoestado;
        //Actualizo el urev de usuario
        $persona->UrevUsuario = 'Actualizado - ' . Auth::user()->name;
        $persona->UrevFechaHora = Carbon::now();
        //Guardo los cambios
        $persona->save();

        return response()->json(['message' => 'Estado del usuario actualizado correctamente.'], 200);
    }
}
