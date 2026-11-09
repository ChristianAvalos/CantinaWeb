<?php

namespace App\Http\Controllers;

use App\Models\Persona;
use App\Models\PersonaVinculo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

/**
 * Gestión (staff) de los vínculos alumno–tutor de la organización.
 */
class PersonaVinculoController extends Controller
{
    use PerteneceAOrganizacion;

    public function index(Request $request)
    {
        $idOrganizacion = $this->esAdminSistema()
            ? $request->input('id_organizacion')
            : $this->organizacionDelUsuario();

        if (! $this->esAdminSistema() && ! $idOrganizacion) {
            return response()->json(['message' => 'Tu usuario no tiene una organización asignada.'], 403);
        }

        $search = trim((string) $request->input('search'));

        $query = PersonaVinculo::with(['alumno', 'tutor', 'tipoEstado'])
            ->when($idOrganizacion, fn ($q) => $q->where('id_organizacion', $idOrganizacion))
            ->when($request->input('id_alumno'), fn ($q, $id) => $q->where('id_alumno', $id))
            ->when($request->input('id_tutor'), fn ($q, $id) => $q->where('id_tutor', $id))
            ->when($search !== '', function ($q) use ($search) {
                $like = '%' . mb_strtolower($search) . '%';
                $q->where(function ($sub) use ($like) {
                    $sub->whereHas('alumno', fn ($p) => $p->whereRaw('LOWER(nombre) LIKE ?', [$like]))
                        ->orWhereHas('tutor', fn ($p) => $p->whereRaw('LOWER(nombre) LIKE ?', [$like]));
                });
            })
            ->orderByDesc('id');

        if ($request->boolean('all')) {
            return response()->json(['data' => $query->get()]);
        }

        return response()->json($query->paginate(10));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id_alumno' => ['required', 'exists:personas,id'],
            'id_tutor' => ['required', 'exists:personas,id', 'different:id_alumno'],
            'parentesco' => ['nullable', 'string', 'max:50'],
            'puede_ver_compras' => ['nullable', 'boolean'],
            'puede_ver_saldo' => ['nullable', 'boolean'],
            'puede_pagar' => ['nullable', 'boolean'],
            'id_tipoestado' => ['nullable', 'exists:tipo_estados,id'],
            'fecha_inicio' => ['nullable', 'date'],
            'fecha_fin' => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
        ], [
            'id_tutor.different' => 'El alumno y el tutor deben ser personas distintas.',
        ]);

        $alumno = Persona::findOrFail($data['id_alumno']);
        $tutor = Persona::findOrFail($data['id_tutor']);

        $alumno->loadMissing('tipoPersona');
        $tutor->loadMissing('tipoPersona');

        $tipoAlumno = mb_strtolower(trim((string) $alumno->tipoPersona?->nombre));
        $tipoTutor = mb_strtolower(trim((string) $tutor->tipoPersona?->nombre));

        // Solo un alumno puede ser titular del vínculo: evita cadenas
        // tutor → tutor (una persona que ya es tutor de alguien).
        if ($tipoAlumno !== 'alumno') {
            return response()->json([
                'message' => 'Solo se pueden vincular tutores a una persona de tipo Alumno.',
            ], 422);
        }

        if ($tipoTutor === 'alumno') {
            return response()->json([
                'message' => 'Una persona de tipo Alumno no puede ser tutor de otro alumno.',
            ], 422);
        }

        $idOrganizacion = $this->esAdminSistema()
            ? ($request->input('id_organizacion') ?? $alumno->id_organizacion)
            : $this->organizacionDelUsuario();

        if (! $idOrganizacion) {
            return response()->json(['message' => 'Tu usuario no tiene una organización asignada.'], 403);
        }

        if ((int) $alumno->id_organizacion !== (int) $idOrganizacion
            || (int) $tutor->id_organizacion !== (int) $idOrganizacion) {
            return response()->json([
                'message' => 'El alumno y el tutor deben pertenecer a la misma organización.',
            ], 422);
        }

        if (PersonaVinculo::where('id_alumno', $alumno->id)->where('id_tutor', $tutor->id)->exists()) {
            return response()->json(['message' => 'Ese tutor ya está vinculado a este alumno.'], 422);
        }

        $vinculo = PersonaVinculo::create([
            'id_organizacion' => $idOrganizacion,
            'id_alumno' => $alumno->id,
            'id_tutor' => $tutor->id,
            'parentesco' => $data['parentesco'] ?? null,
            'puede_ver_compras' => $data['puede_ver_compras'] ?? true,
            'puede_ver_saldo' => $data['puede_ver_saldo'] ?? true,
            'puede_pagar' => $data['puede_pagar'] ?? true,
            'id_tipoestado' => $data['id_tipoestado'] ?? 1,
            'fecha_inicio' => $data['fecha_inicio'] ?? now()->toDateString(),
            'fecha_fin' => $data['fecha_fin'] ?? null,
            'UrevUsuario' => 'Creado - ' . Auth::user()->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Tutor vinculado correctamente.',
            'data' => $vinculo->load(['alumno', 'tutor', 'tipoEstado']),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $vinculo = PersonaVinculo::findOrFail($id);

        if (! $this->enAlcance($vinculo)) {
            return response()->json(['message' => 'El vínculo no pertenece a tu organización.'], 403);
        }

        $data = $request->validate([
            'parentesco' => ['nullable', 'string', 'max:50'],
            'puede_ver_compras' => ['nullable', 'boolean'],
            'puede_ver_saldo' => ['nullable', 'boolean'],
            'puede_pagar' => ['nullable', 'boolean'],
            'id_tipoestado' => ['nullable', 'exists:tipo_estados,id'],
            'fecha_inicio' => ['nullable', 'date'],
            'fecha_fin' => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
        ]);

        $data['UrevUsuario'] = 'Actualizado - ' . Auth::user()->name;
        $data['UrevFechaHora'] = now();
        $vinculo->update($data);

        return response()->json([
            'message' => 'Vínculo actualizado correctamente.',
            'data' => $vinculo->load(['alumno', 'tutor', 'tipoEstado']),
        ]);
    }

    public function destroy($id)
    {
        $vinculo = PersonaVinculo::findOrFail($id);

        if (! $this->enAlcance($vinculo)) {
            return response()->json(['message' => 'El vínculo no pertenece a tu organización.'], 403);
        }

        DB::transaction(fn () => $vinculo->delete());

        return response()->json(['message' => 'Vínculo eliminado correctamente.']);
    }
}
