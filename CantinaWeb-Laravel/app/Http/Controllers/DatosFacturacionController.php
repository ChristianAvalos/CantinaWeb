<?php

namespace App\Http\Controllers;

use App\Models\DatosFacturacion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

/**
 * Datos para facturación.
 *
 * Versionado: cada organización tiene un registro activo y los anteriores se
 * conservan como histórico, porque las facturas ya emitidas deben poder
 * explicarse con los datos (timbrado, RUC) con los que se emitieron.
 */
class DatosFacturacionController extends Controller
{
    use PerteneceAOrganizacion;

    /** Lista los datos de facturación de la organización del usuario. */
    public function index(Request $request)
    {
        $idOrganizacion = $this->esAdminSistema()
            ? ($request->input('id_organizacion') ?? $this->organizacionDelUsuario())
            : $this->organizacionDelUsuario();

        if (! $idOrganizacion) {
            return response()->json(['data' => [], 'activo' => null]);
        }

        $registros = DatosFacturacion::with('organizacion', 'secuencias.sucursal', 'secuencias.tipoComprobante')
            ->where('id_organizacion', $idOrganizacion)
            ->orderByDesc('activo')
            ->orderByDesc('id')
            ->get()
            ->map(fn (DatosFacturacion $d) => $this->presentar($d));

        return response()->json([
            'data' => $registros,
            'activo' => $registros->firstWhere('activo', true),
            // Disponibilidad de la integración electrónica en esta instalación.
            'emisor_disponible' => (bool) config('facturacion.sifen.habilitado'),
        ]);
    }

    public function store(Request $request)
    {
        $idOrganizacion = $this->organizacionDestino($request);
        $data = $this->validar($request);

        $registro = DatosFacturacion::create($data + [
            'id_organizacion' => $idOrganizacion,
            'activo' => false,
            'UrevUsuario' => Auth::user()?->name,
            'UrevFechaHora' => now(),
        ]);

        // El primero de la organización queda activo automáticamente.
        if (! DatosFacturacion::where('id_organizacion', $idOrganizacion)->where('activo', true)->exists()) {
            $registro->activar();
        }

        return response()->json([
            'message' => 'Datos de facturación creados correctamente.',
            'data' => $this->presentar($registro->fresh()),
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $registro = DatosFacturacion::findOrFail($id);

        if (! $this->enAlcance($registro)) {
            return response()->json(['message' => 'Los datos no pertenecen a tu organización.'], 403);
        }

        $data = $this->validar($request);
        $registro->update($data + [
            'UrevUsuario' => 'Actualizado - ' . Auth::user()?->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Datos de facturación actualizados correctamente.',
            'data' => $this->presentar($registro->fresh()),
        ]);
    }

    /** Deja este registro como el activo (los demás pasan a histórico). */
    public function activar($id)
    {
        $registro = DatosFacturacion::findOrFail($id);

        if (! $this->enAlcance($registro)) {
            return response()->json(['message' => 'Los datos no pertenecen a tu organización.'], 403);
        }

        $registro->activar();

        return response()->json([
            'message' => 'Datos de facturación activados.',
            'data' => $this->presentar($registro->fresh()),
        ]);
    }

    /** Organización destino: el admin de sistema puede indicarla; el resto usa la suya. */
    private function organizacionDestino(Request $request): int
    {
        return $this->esAdminSistema()
            ? (int) ($request->input('id_organizacion') ?? $this->organizacionDelUsuario())
            : (int) $this->organizacionDelUsuario();
    }

    private function validar(Request $request): array
    {
        $request->validate([
            // Opcionales: si se dejan vacíos, la factura usa los de la organización.
            'RUC' => ['nullable', 'string', 'max:20'],
            'RazonSocial' => ['nullable', 'string', 'max:255'],
            'DireccionFiscal' => ['nullable', 'string', 'max:255'],
            'Telefono' => ['nullable', 'string', 'max:50'],
            'Email' => ['nullable', 'email', 'max:255'],
            'ActividadEconomica' => ['nullable', 'string', 'max:255'],
            'ActividadEconomicaCodigo' => ['nullable', 'string', 'max:20'],
            'Timbrado' => ['required', 'string', 'max:20'],
            'TimbradoInicio' => ['nullable', 'date'],
            'TimbradoVencimiento' => ['nullable', 'date', 'after_or_equal:TimbradoInicio'],
            'Ambiente' => ['nullable', Rule::in([DatosFacturacion::AMBIENTE_TEST, DatosFacturacion::AMBIENTE_PRODUCCION])],
            'Emisor' => [
                'nullable',
                Rule::in(DatosFacturacion::EMISORES),
                function ($attribute, $value, $fail) {
                    // Cada organización elige su emisor, pero SIFEN solo se puede
                    // elegir si la integración está habilitada en la instalación.
                    if ($value === DatosFacturacion::EMISOR_SIFEN && ! config('facturacion.sifen.habilitado')) {
                        $fail('La facturación electrónica no está habilitada en esta instalación.');
                    }
                },
            ],
        ], [
            'Timbrado.required' => 'El número de timbrado es obligatorio.',
            'TimbradoVencimiento.after_or_equal' => 'El vencimiento no puede ser anterior al inicio del timbrado.',
        ]);

        $data = $request->only([
            'RUC', 'RazonSocial', 'DireccionFiscal', 'Telefono', 'Email',
            'ActividadEconomica', 'ActividadEconomicaCodigo', 'Timbrado',
            'TimbradoInicio', 'TimbradoVencimiento',
        ]);

        $data['Ambiente'] = $request->input('Ambiente') ?: DatosFacturacion::AMBIENTE_TEST;
        $data['Emisor'] = $request->input('Emisor') ?: DatosFacturacion::EMISOR_IMPRESO;

        return $data;
    }

    private function presentar(DatosFacturacion $registro): array
    {
        // Valores que realmente saldrán impresos: el override si existe, si no
        // los del perfil comercial de la organización.
        $organizacion = $registro->organizacion;

        return [
            'id' => $registro->id,
            'id_organizacion' => $registro->id_organizacion,
            'organizacion' => $organizacion?->RazonSocial,
            'efectivo' => [
                'RUC' => $registro->RUC ?: ($organizacion->RUC ?? ''),
                'RazonSocial' => $registro->RazonSocial ?: ($organizacion->RazonSocial ?? ''),
                'Email' => $registro->Email ?: ($organizacion->Email ?? ''),
                'heredado' => [
                    'RUC' => ! $registro->RUC,
                    'RazonSocial' => ! $registro->RazonSocial,
                    'Email' => ! $registro->Email,
                ],
            ],
            'activo' => (bool) $registro->activo,
            'RUC' => $registro->RUC,
            'RazonSocial' => $registro->RazonSocial,
            'DireccionFiscal' => $registro->DireccionFiscal,
            'Telefono' => $registro->Telefono,
            'Email' => $registro->Email,
            'ActividadEconomica' => $registro->ActividadEconomica,
            'ActividadEconomicaCodigo' => $registro->ActividadEconomicaCodigo,
            'Timbrado' => $registro->Timbrado,
            'TimbradoInicio' => $registro->TimbradoInicio?->format('Y-m-d'),
            'TimbradoVencimiento' => $registro->TimbradoVencimiento?->format('Y-m-d'),
            'timbrado_vigente' => $registro->timbradoVigente(),
            'Ambiente' => $registro->Ambiente,
            'Emisor' => $registro->Emisor ?: DatosFacturacion::EMISOR_IMPRESO,
            'emisor_disponible' => (bool) config('facturacion.sifen.habilitado'),
            'UrevCalc' => $registro->UrevUsuario
                ? $registro->UrevUsuario . ($registro->UrevFechaHora ? ' - ' . $registro->UrevFechaHora->format('d/m/Y H:i') : '')
                : '',
            'secuencias' => $registro->relationLoaded('secuencias')
                ? $registro->secuencias->map(fn ($s) => [
                    'id' => $s->id,
                    'id_sucursal' => $s->id_sucursal,
                    'sucursal' => $s->sucursal?->nombre,
                    'establecimiento' => $s->sucursal?->establecimiento,
                    'punto_expedicion' => $s->sucursal?->punto_expedicion,
                    'tipo_comprobante' => $s->tipoComprobante?->nombre,
                    'ultimo_numero' => $s->ultimo_numero,
                    'proximo_numero' => \App\Services\NumeracionComprobanteService::formatear(
                        $s->sucursal?->establecimiento,
                        $s->sucursal?->punto_expedicion,
                        (int) $s->ultimo_numero + 1
                    ),
                ])->values()
                : [],
        ];
    }
}
