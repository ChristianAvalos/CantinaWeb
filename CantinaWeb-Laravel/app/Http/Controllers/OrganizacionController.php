<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\Organizacion;
use App\Models\Sucursal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\OrganizacionRequest;
use App\Http\Controllers\Concerns\AplicaFiltrosDinamicos;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

class OrganizacionController extends Controller
{
    use AplicaFiltrosDinamicos;
    use PerteneceAOrganizacion;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $filtros = $this->normalizarFiltros($request->input('filtros', []));

        // El Administrador de Sistema ve todas; el resto, solo la suya.
        $filtrarPorOrganizacion = ! $this->esAdminSistema();

        if ($request->query('all')) {
            $organizacionesQuery = Organizacion::with(['ciudad', 'pais', 'tipoEstado'])
                ->when($filtrarPorOrganizacion, fn ($q) => $q->where('id', $this->organizacionDelUsuario()));
            if (!empty($filtros)) {
                $this->aplicarFiltrosDinamicos($organizacionesQuery, $filtros, ['search', 'all']);
            }
            $organizaciones = $organizacionesQuery->get();
        } else {
            $organizacionesQuery = Organizacion::with(['ciudad', 'pais', 'tipoEstado'])
                ->when($filtrarPorOrganizacion, fn ($q) => $q->where('id', $this->organizacionDelUsuario()));

            if ($search) {
                $organizacionesQuery->where('RazonSocial', 'ilike', '%' . $search . '%');
            }

            if (!empty($filtros)) {
                $this->aplicarFiltrosDinamicos($organizacionesQuery, $filtros, ['search', 'all']);
            }

            $organizaciones = $organizacionesQuery->paginate(10);
        }
        return response()->json($organizaciones);

    }
    public function DeleteOrganizacion($id)
    {      
        // Eliminar una organización es una acción del Administrador de Sistema:
        // el administrador de organización puede administrar la suya, no borrarla.
        if (! $this->esAdminSistema()) {
            return response()->json(['message' => 'Solo el Administrador de Sistema puede eliminar organizaciones.'], 403);
        }

        //Elimino la organizacion 
        $organizacion = Organizacion::findOrFail($id);
        $imagenAEliminar = $organizacion->Imagen;

        // Primero eliminar el registro de la BD
        $organizacion->delete();

        // Luego eliminar la imagen física (solo si el delete fue exitoso)
        if (!empty($imagenAEliminar)) {
            $path = public_path('img/organizaciones/' . $imagenAEliminar);
            if (is_file($path)) {
                unlink($path);
            }
        }

        return response()->json(['message' => 'Organizacion eliminado correctamente.'],200);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function createOrganizacion(OrganizacionRequest $request)
    {
                // Crear una organización nueva (otro inquilino) es del Administrador de Sistema.
                if (! $this->esAdminSistema()) {
                    return response()->json(['message' => 'Solo el Administrador de Sistema puede crear organizaciones.'], 403);
                }

                //validar el registro 

                $data = $request->validated();


                // Subir la imagen si está presente
                if ($request->hasFile('imagen')) {
                    // Obtener el archivo
                    $imagen = $request->file('imagen');
        
                    // Obtener la extensión del archivo
                    $extension = $imagen->getClientOriginalExtension();
        
                    // Renombrar el archivo con el nombre de la Razón Social
                    $fileName = $data['name'] . '.' . $extension;

                    // Eliminar la imagen anterior
                    $path = public_path('img/organizaciones/' . $fileName);

                    if (is_file($path)) {
                        unlink($path);
                    }
        
                    // Mover el archivo a la carpeta public/img/organizaciones
                    $imagen->move(public_path('img/organizaciones'), $fileName);
        
                    // Asignar el nombre del archivo a los datos
                    $data['imagen'] = $fileName;
                } else {
                    // Si no se sube imagen, puedes asignar un valor predeterminado
                    $data['imagen'] = null;
                }

                //crear usuario
                $organizacion = Organizacion::create(
                    [
                        'RazonSocial' => $data['name'],
                        'RUC' => $data['ruc'],
                        'Direccion' => $data['direccion'],
                        'Ciudad_id' => $data['ciudad_id'],
                        'Pais_id'=> $data['pais_id'],
                        'Telefono1' => $data['telefono1'],
                        'Telefono2' => $data['telefono2'],
                        'Fax1' => $data['fax1'],
                        'Fax2' => $data['fax2'],
                        'Email' => $data['email'],
                        'Sigla' => $data['sigla'],
                        'SitioWeb'=> $data['sitioWeb'],
                        'Imagen' => $data['imagen'],
                        'id_tipoestado' => 1, // nace Activa
                        'UrevUsuario' => 'Creado - ' . Auth::user()->name,
                        'UrevFechaHora' => Carbon::now()
                    ]
                    );

                // Toda organización nace con su sucursal principal.
                Sucursal::principalDeOCrear($organizacion->id, $organizacion->RazonSocial);

            // Retornar respuesta exitosa
            return response()->json([
                'message' => 'Organizacion creada exitosamente'
            ], 201);
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
    public function show(Organizacion $organizacion)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Organizacion $organizacion)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function updateOrganizacion(OrganizacionRequest $request, $id)
    {
            // Validar los datos de entrada
            $data = $request->validated();
    
    
            // Encontrar la organizacion por su ID
            $organizacion = Organizacion::findOrFail($id);

            // El administrador de organización solo administra la suya.
            if (! $this->esAdminSistema() && (int) $organizacion->id !== (int) $this->organizacionDelUsuario()) {
                return response()->json(['message' => 'Solo podés administrar tu propia organización.'], 403);
            }


            // Manejo de la imagen
            if ($request->has('eliminar_imagen') && $request->eliminar_imagen) {
                // Eliminar la imagen física anterior
                if (!empty($organizacion->Imagen)) {
                    $path = public_path('img/organizaciones/' . $organizacion->Imagen);
                    if (is_file($path)) {
                        unlink($path);
                    }
                }
                $data['imagen'] = null;
            } elseif ($request->hasFile('imagen')) {
                // Obtener el archivo
                $imagen = $request->file('imagen');
    
                // Obtener la extensión del archivo
                $extension = $imagen->getClientOriginalExtension();
    
                // Renombrar el archivo con el nombre de la Razón Social
                $fileName = $data['name'] . '.' . $extension;

                // Eliminar la imagen anterior (usar el nombre viejo)
                if (!empty($organizacion->Imagen)) {
                    $oldPath = public_path('img/organizaciones/' . $organizacion->Imagen);
                    if (is_file($oldPath)) {
                        unlink($oldPath);
                    }
                }
    
                // Mover el archivo a la carpeta public/img/organizaciones
                $imagen->move(public_path('img/organizaciones'), $fileName);
    
                // Asignar el nombre del archivo a los datos
                $data['imagen'] = $fileName;
            } else {
                // Si no se sube imagen, mantener la actual
                $data['imagen'] = $organizacion->Imagen ?? null;
            }
    
            // Actualizar los datos de la organizacion  con los nuevos valores
            $organizacion->RazonSocial = $data['name'];
            $organizacion->RUC = $data['ruc'];
            $organizacion->Direccion = $data['direccion'];
            $organizacion->Ciudad_id = $data['ciudad_id'];
            $organizacion->Pais_id = $data['pais_id'];
            $organizacion->Telefono1 = $data['telefono1'];
            $organizacion->Telefono2 = $data['telefono2'];
            $organizacion->Fax1 = $data['fax1'];
            $organizacion->Fax2 = $data['fax2'];
            $organizacion->Email = $data['email'];
            $organizacion->Sigla = $data['sigla'];
            $organizacion->SitioWeb = $data['sitioWeb'];
            $organizacion->Imagen = $data['imagen'];
            $organizacion->UrevUsuario = 'Actualizado - ' . Auth::user()->name;
            $organizacion->UrevFechaHora = Carbon::now();
    
            // Guardar los cambios en la base de datos
            $organizacion->save();
    
            // Retornar una respuesta exitosa
            return response()->json([
                'message' => 'Organizacion actualizado exitosamente'
            ], 200);
    }

    /**
     * Activa o desactiva una organización.
     */
    public function estadoOrganizacion($id, Request $request)
    {
        // Activar/desactivar una organización es exclusivo del Administrador de
        // Sistema (el admin de organización se dejaría sin acceso).
        if (! $this->esAdminSistema()) {
            return response()->json(['message' => 'Solo el Administrador de Sistema puede activar o desactivar organizaciones.'], 403);
        }

        $organizacion = Organizacion::findOrFail($id);

        $organizacion->id_tipoestado = $request->id_tipoestado;
        $organizacion->UrevUsuario = 'Actualizado - ' . Auth::user()->name;
        $organizacion->UrevFechaHora = Carbon::now();
        $organizacion->save();

        return response()->json(['message' => 'Estado de la organización actualizado correctamente.'], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Organizacion $organizacion)
    {
        //
    }
}
