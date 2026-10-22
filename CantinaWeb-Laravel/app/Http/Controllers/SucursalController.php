<?php

namespace App\Http\Controllers;

use App\Models\Sucursal;
use App\Models\Transacciones;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

class SucursalController extends Controller
{
    use PerteneceAOrganizacion;

    /**
     * Lista las sucursales de una organización (por defecto, la del usuario).
     */
    public function index(Request $request)
    {
        // El Administrador de Sistema ve todas; el resto, solo la suya.
        $idOrganizacion = $request->input('id_organizacion');

        if (! $idOrganizacion && ! $this->esAdminSistema()) {
            $idOrganizacion = $this->organizacionDelUsuario();
        }

        $query = Sucursal::with('ciudad')
            ->orderByDesc('es_principal')
            ->orderBy('nombre');

        if ($idOrganizacion) {
            $query->where('id_organizacion', $idOrganizacion);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id_organizacion' => 'required|exists:organizacion,id',
            'nombre'          => 'required|string|max:150',
            'establecimiento' => 'nullable|digits:3',
            // El punto de expedición no se puede repetir dentro de la organización:
            // cada uno lleva su propia numeración y se pisarían los correlativos.
            'punto_expedicion' => [
                'nullable', 'digits:3',
                Rule::unique('sucursales', 'punto_expedicion')
                    ->where(fn ($q) => $q->where('id_organizacion', $request->input('id_organizacion'))
                        ->where('establecimiento', $request->input('establecimiento') ?: '001')),
            ],
            'direccion'       => 'nullable|string',
            'ciudad_id'       => 'nullable|exists:ciudad,id',
            'telefono'        => 'nullable|string',
        ], $this->mensajesExpedicion());

        // El Administrador de Sistema puede crear en cualquier organización; el
        // administrador de organización, solo en la suya.
        if (! $this->esAdminSistema() && (int) $data['id_organizacion'] !== (int) $this->organizacionDelUsuario()) {
            return response()->json(['message' => 'Solo podés crear sucursales en tu propia organización.'], 403);
        }

        // Si la organización todavía no tiene sucursales, esta pasa a ser la principal.
        $esPrimera = ! Sucursal::where('id_organizacion', $data['id_organizacion'])->exists();

        $sucursal = Sucursal::create([
            'id_organizacion' => $data['id_organizacion'],
            'nombre'          => $data['nombre'],
            'establecimiento' => $data['establecimiento'] ?? '001',
            'punto_expedicion' => $data['punto_expedicion'] ?? '001',
            'direccion'       => $data['direccion'] ?? null,
            'ciudad_id'       => $data['ciudad_id'] ?? null,
            'telefono'        => $data['telefono'] ?? null,
            'es_principal'    => $esPrimera,
            'id_tipo_estado'  => 1,
            'UrevUsuario'     => Auth::user()?->name,
            'UrevFechaHora'   => now(),
        ]);

        return response()->json([
            'message'  => 'Sucursal creada correctamente.',
            'sucursal' => $sucursal,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $sucursal = Sucursal::findOrFail($id);

        if (! $this->enAlcance($sucursal)) {
            return response()->json(['message' => 'La sucursal no pertenece a tu organización.'], 403);
        }

        $data = $request->validate([
            'nombre'         => 'required|string|max:150',
            'establecimiento' => 'nullable|digits:3',
            'punto_expedicion' => [
                'nullable', 'digits:3',
                Rule::unique('sucursales', 'punto_expedicion')
                    ->where(fn ($q) => $q->where('id_organizacion', $sucursal->id_organizacion)
                        ->where('establecimiento', $request->input('establecimiento') ?: $sucursal->establecimiento))
                    ->ignore($sucursal->id),
            ],
            'direccion'      => 'nullable|string',
            'ciudad_id'      => 'nullable|exists:ciudad,id',
            'telefono'       => 'nullable|string',
            'id_tipo_estado' => 'nullable|exists:tipo_estados,id',
        ], $this->mensajesExpedicion());

        $sucursal->update([
            'nombre'         => $data['nombre'],
            'establecimiento' => $data['establecimiento'] ?? $sucursal->establecimiento,
            'punto_expedicion' => $data['punto_expedicion'] ?? $sucursal->punto_expedicion,
            'direccion'      => $data['direccion'] ?? null,
            'ciudad_id'      => $data['ciudad_id'] ?? null,
            'telefono'       => $data['telefono'] ?? null,
            'id_tipo_estado' => $data['id_tipo_estado'] ?? $sucursal->id_tipo_estado,
            'UrevUsuario'    => Auth::user()?->name,
            'UrevFechaHora'  => now(),
        ]);

        return response()->json([
            'message'  => 'Sucursal actualizada correctamente.',
            'sucursal' => $sucursal,
        ]);
    }

    /** Mensajes de los campos de expedición (3 dígitos, como exige el timbrado). */
    private function mensajesExpedicion(): array
    {
        return [
            'establecimiento.digits' => 'El establecimiento debe tener exactamente 3 dígitos.',
            'punto_expedicion.digits' => 'El punto de expedición debe tener exactamente 3 dígitos.',
            'punto_expedicion.unique' => 'Ese punto de expedición ya está en uso en la organización.',
        ];
    }

    public function destroy($id)
    {
        $sucursal = Sucursal::findOrFail($id);

        if (! $this->enAlcance($sucursal)) {
            return response()->json(['message' => 'La sucursal no pertenece a tu organización.'], 403);
        }

        if ($sucursal->es_principal) {
            return response()->json(['message' => 'No se puede eliminar la sucursal principal.'], 422);
        }
        if ($sucursal->stocks()->where('stock_actual', '!=', 0)->exists()) {
            return response()->json(['message' => 'La sucursal tiene stock: no se puede eliminar.'], 422);
        }
        if (User::where('id_sucursal', $sucursal->id)->exists()) {
            return response()->json(['message' => 'La sucursal tiene usuarios asignados: no se puede eliminar.'], 422);
        }
        if (Transacciones::where('id_sucursal', $sucursal->id)->exists()) {
            return response()->json(['message' => 'La sucursal tiene transacciones: no se puede eliminar.'], 422);
        }

        $sucursal->delete();

        return response()->json(['message' => 'Sucursal eliminada correctamente.']);
    }
}
