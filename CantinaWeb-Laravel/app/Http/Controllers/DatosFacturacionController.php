<?php

namespace App\Http\Controllers;

use App\Models\ComprobanteSecuencia;
use App\Models\DatosFacturacion;
use App\Services\VigenciaTimbradoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use App\Http\Controllers\Concerns\PerteneceAOrganizacion;

/**
 * Datos para facturación.
 *
 * Versionado: se conservan todos los timbrados, porque las facturas ya emitidas
 * deben poder explicarse con los datos con los que se emitieron. El que rige es
 * el que cubre la fecha de hoy; no hay que marcarlo a mano.
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
            return response()->json(['data' => [], 'vigente' => null]);
        }

        $registros = DatosFacturacion::with('organizacion', 'secuencias.sucursal', 'secuencias.tipoComprobante')
            ->where('id_organizacion', $idOrganizacion)
            ->orderByDesc('TimbradoInicio')
            ->orderByDesc('id')
            ->get()
            ->map(fn (DatosFacturacion $d) => $this->presentar($d));

        return response()->json([
            'data' => $registros,
            // El que rige hoy sale de las fechas, no de un flag.
            'vigente' => $registros->firstWhere('estado_vigencia', 'vigente'),
            // Disponibilidad de la integración electrónica en esta instalación.
            'emisor_disponible' => (bool) config('facturacion.sifen.habilitado'),
        ]);
    }

    public function store(Request $request)
    {
        $idOrganizacion = $this->organizacionDestino($request);
        $data = $this->validar($request);

        if ($conflictos = VigenciaTimbradoService::conflictos($idOrganizacion, $data)) {
            return $this->respuestaConflicto($conflictos);
        }

        $registro = DatosFacturacion::create($data + [
            'id_organizacion' => $idOrganizacion,
            'UrevUsuario' => Auth::user()?->name,
            'UrevFechaHora' => now(),
        ]);

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

        if ($conflictos = VigenciaTimbradoService::conflictos((int) $registro->id_organizacion, $data, $registro->id)) {
            return $this->respuestaConflicto($conflictos);
        }

        // Cambiar el número de timbrado de una serie ya usada seguiría numerando
        // desde el último comprobante emitido. El timbrado nuevo va aparte.
        if ((string) $registro->Timbrado !== (string) $data['Timbrado']
            && ComprobanteSecuencia::where('id_datos_facturacion', $registro->id)->where('ultimo_numero', '>', 0)->exists()) {
            return $this->respuestaConflicto([
                'Timbrado' => "Este registro ya emitió comprobantes con el timbrado {$registro->Timbrado}. Cargá el timbrado {$data['Timbrado']} como un registro nuevo para que el correlativo arranque de cero.",
            ]);
        }

        $registro->update($data + [
            'UrevUsuario' => 'Actualizado - ' . Auth::user()?->name,
            'UrevFechaHora' => now(),
        ]);

        return response()->json([
            'message' => 'Datos de facturación actualizados correctamente.',
            'data' => $this->presentar($registro->fresh()),
        ]);
    }

    /** 'vigente' | 'vencido' | 'proximo' según la fecha de hoy. */
    private function estadoVigencia(DatosFacturacion $registro): string
    {
        $hoy = now()->startOfDay();

        if ($registro->TimbradoInicio && $hoy->lt($registro->TimbradoInicio->copy()->startOfDay())) {
            return 'proximo';
        }

        if ($registro->TimbradoVencimiento && $hoy->gt($registro->TimbradoVencimiento->copy()->endOfDay())) {
            return 'vencido';
        }

        return 'vigente';
    }

    /** 422 con el mismo formato que devuelve `$request->validate()`. */
    private function respuestaConflicto(array $conflictos)
    {
        return response()->json([
            'message' => reset($conflictos),
            'errors' => array_map(fn ($mensaje) => [$mensaje], $conflictos),
        ], 422);
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
            // El timbrado siempre tiene vigencia autorizada por la SET: sin fechas
            // valdría para siempre y se solaparía con el resto del historial.
            'TimbradoInicio' => ['required', 'date'],
            'TimbradoVencimiento' => ['required', 'date', 'after_or_equal:TimbradoInicio'],
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
            'TimbradoInicio.required' => 'La fecha de inicio de la vigencia es obligatoria.',
            'TimbradoVencimiento.required' => 'La fecha de vencimiento es obligatoria.',
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
            // Distingue vencido de "todavía no empieza": la pantalla no debe
            // decir "Vencido" en un timbrado que aún no rige.
            'estado_vigencia' => $this->estadoVigencia($registro),
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
