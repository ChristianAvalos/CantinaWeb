<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\Organizacion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Http\Requests\OrganizacionRequest;

class OrganizacionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        if ($request->query('all')) {
            $organizaciones = Organizacion::with(['ciudad', 'pais'])->get();
        } else {
            $organizaciones = Organizacion::with(['ciudad', 'pais'])
            ->when($search, function ($query, $search) {
                return $query->where('RazonSocial', 'ilike', '%' . $search . '%');
            })->paginate(10);
        }
        return response()->json($organizaciones);

    }
    public function DeleteOrganizacion($id)
    {      
        //Elimino la organizacion 
        $organizacion = Organizacion::findOrFail($id);

        // Eliminar la imagen si está presente
        if (!empty($organizacion->Imagen)) {
            $path = public_path('img/' . $organizacion->Imagen);

            if (is_file($path)) {
                unlink($path);
            }
        }
        $organizacion->delete();

        return response()->json(['message' => 'Organizacion eliminado correctamente.'],200);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function createOrganizacion(OrganizacionRequest $request)
    {
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
                    $path = public_path('img/' . $fileName);

                    if (is_file($path)) {
                        unlink($path);
                    }
        
                    // Mover el archivo a la carpeta public/img
                    $imagen->move(public_path('img'), $fileName);
        
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
                        'UrevUsuario' => 'Creado - ' . Auth::user()->name,
                        'UrevFechaHora' => Carbon::now()
                    ]
                    );
        
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


            // Subir la imagen si está presente
            if ($request->hasFile('imagen')) {
                // Obtener el archivo
                $imagen = $request->file('imagen');
    
                // Obtener la extensión del archivo
                $extension = $imagen->getClientOriginalExtension();
    
                // Renombrar el archivo con el nombre de la Razón Social
                $fileName = $data['name'] . '.' . $extension;


                // Eliminar la imagen anterior
                $path = public_path('img/' . $organizacion->Imagen);

                if (!empty($organizacion->Imagen) && is_file($path)) {
                    unlink($path);
                }
    
                // Mover el archivo a la carpeta public/img
                $imagen->move(public_path('img'), $fileName);
    
                // Asignar el nombre del archivo a los datos
                $data['imagen'] = $fileName;
            } else {
                // Si no se sube imagen, puedes asignar un valor predeterminado
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
     * Remove the specified resource from storage.
     */
    public function destroy(Organizacion $organizacion)
    {
        //
    }
}
