<?php

namespace App\Services\Comprobante;

use App\Models\DatosFacturacion;
use App\Models\Transacciones;
use App\Services\IvaService;

/**
 * Documento fiscal canónico.
 *
 * Arma UNA sola estructura con todo lo que exige un comprobante y la devuelve
 * igual para imprimir hoy o para enviar a SIFEN mañana. El snapshot guardado es
 * una copia de esta estructura, para que la reimpresión sea siempre fiel aunque
 * después cambien productos, clientes, precios o el timbrado.
 */
class DocumentoFiscalService
{
    /** Tipos de comprobante que se emiten como venta. */
    private const TITULOS = [
        'factura' => 'FACTURA',
        'ticket' => 'TICKET',
        'nota de crédito' => 'NOTA DE CRÉDITO',
        'nota de debito' => 'NOTA DE DÉBITO',
    ];

    public static function construir(Transacciones $transaccion): array
    {
        $transaccion->loadMissing(['organizacion', 'sucursal', 'persona', 'tipoComprobante', 'tipoPago', 'formaPago', 'cuotas']);

        $nombreComprobante = trim((string) ($transaccion->tipoComprobante?->nombre ?? ''));
        $nombreNormalizado = mb_strtolower($nombreComprobante);
        $esFactura = $nombreNormalizado === 'factura';
        $esNotaCredito = $nombreNormalizado === 'nota de crédito';
        $esFiscal = $esFactura || $esNotaCredito || $nombreNormalizado === 'nota de debito';

        // Datos fiscales con los que se emitió. Si el documento ya tiene
        // snapshot, este servicio no se usa (se reimprime el guardado).
        $datosFiscales = DatosFacturacion::activoDe((int) $transaccion->id_organizacion);

        $detalles = $transaccion->transacionDetalles()->with('producto')->get();

        $items = $detalles->map(function ($d) {
            $subtotal = (float) $d->subtotal;
            $tipoIva = $d->tipo_iva ?: IvaService::TIPO_10;

            return [
                'codigo' => $d->producto->codigo_barras ?? '',
                'producto' => $d->producto->nombre ?? ('Producto #' . $d->id_producto),
                'cantidad' => (float) $d->cantidad,
                'precio_unitario' => (float) $d->precio_unitario,
                'subtotal' => $subtotal,
                'tipo_iva' => $tipoIva,
                'monto_iva' => (float) ($d->monto_iva ?? 0),
            ];
        })->values()->toArray();

        // Totales discriminados: es lo que la SET exige ver en la factura.
        $gravada10 = $gravada5 = $exenta = $iva10 = $iva5 = 0.0;
        foreach ($items as $item) {
            if ($item['tipo_iva'] === IvaService::TIPO_10) {
                $gravada10 += $item['subtotal'] - $item['monto_iva'];
                $iva10 += $item['monto_iva'];
            } elseif ($item['tipo_iva'] === IvaService::TIPO_5) {
                $gravada5 += $item['subtotal'] - $item['monto_iva'];
                $iva5 += $item['monto_iva'];
            } else {
                $exenta += $item['subtotal'];
            }
        }

        $total = (float) $transaccion->monto;

        return [
            'emisor_nombre' => EmisorComprobanteService::resolver($datosFiscales)->nombre(),
            'tipo_comprobante' => $nombreComprobante,
            'titulo' => self::TITULOS[$nombreNormalizado] ?? 'COMPROBANTE DE VENTA',
            'es_fiscal' => $esFiscal,
            'numero' => (string) ($transaccion->nro_comprobante ?: $transaccion->id),
            'fecha' => \Carbon\Carbon::parse($transaccion->created_at ?? now())->format('d/m/Y H:i'),

            // Timbrado y punto de expedición: solo los documentos fiscales los llevan.
            'timbrado' => $esFiscal ? [
                'numero' => $datosFiscales->Timbrado ?? '',
                'inicio' => $datosFiscales?->TimbradoInicio?->format('d/m/Y') ?? '',
                'vencimiento' => $datosFiscales?->TimbradoVencimiento?->format('d/m/Y') ?? '',
            ] : null,
            'punto_expedicion' => $esFiscal ? [
                'establecimiento' => $transaccion->sucursal->establecimiento ?? '001',
                'punto' => $transaccion->sucursal->punto_expedicion ?? '001',
            ] : null,

            // Datos del emisor. Se heredan del perfil comercial y del local que
            // emite; `datos_facturacion` solo los pisa si hay un override fiscal.
            //
            // - RUC y razón social: del contribuyente (organización).
            // - Domicilio y teléfono: del ESTABLECIMIENTO (sucursal que vende),
            //   porque la factura se emite desde ese local.
            'empresa' => self::datosEmisor($transaccion, $datosFiscales),

            'cliente' => $transaccion->persona ? [
                'nombre' => $transaccion->persona->nombre ?? '',
                'documento' => $transaccion->persona->documento ?? '',
                'direccion' => $transaccion->persona->direccion ?? '',
            ] : null,

            'condicion_venta' => self::condicionVenta($transaccion),

            'forma_pago' => $transaccion->formaPago->nombre ?? '',
            'tipo_pago' => $transaccion->tipoPago->nombre ?? '',
            'cajero' => $transaccion->UrevUsuario ?? '',

            'items' => $items,

            'totales' => [
                'gravada10' => round($gravada10, 2),
                'iva10' => round($iva10, 2),
                'gravada5' => round($gravada5, 2),
                'iva5' => round($iva5, 2),
                'exenta' => round($exenta, 2),
                'iva' => round($iva10 + $iva5, 2),
                'subtotal' => round($gravada10 + $gravada5 + $exenta, 2),
                'total' => round($total, 2),
            ],

            'monto_recibido' => round((float) ($transaccion->monto_recibido ?? 0), 2),
            'vuelto' => round((float) ($transaccion->vuelto ?? 0), 2),

            'referencia' => self::referencia($transaccion),
        ];
    }

    /**
     * Datos del emisor que salen impresos, con la precedencia del modelo híbrido.
     *
     * @return array<string, string>
     */
    private static function datosEmisor(Transacciones $transaccion, ?DatosFacturacion $datosFiscales): array
    {
        $organizacion = $transaccion->organizacion;
        $sucursal = $transaccion->sucursal;

        return [
            // Identidad fiscal del contribuyente.
            'RUC' => $datosFiscales->RUC ?? $organizacion->RUC ?? '',
            'RazonSocial' => $datosFiscales->RazonSocial ?? $organizacion->RazonSocial ?? '',
            'Sigla' => $organizacion->Sigla ?? '',
            'Email' => $datosFiscales->Email ?? $organizacion->Email ?? '',

            // Domicilio del establecimiento que emite.
            'Direccion' => $sucursal->direccion
                ?: ($organizacion->Direccion ?? ''),
            'Telefono' => $sucursal->telefono
                ?: ($datosFiscales->Telefono ?? $organizacion->Telefono1 ?? ''),

            'ActividadEconomica' => $datosFiscales->ActividadEconomica ?? '',
        ];
    }

    /** "Contado" o "Crédito — N cuotas". */
    private static function condicionVenta(Transacciones $transaccion): array
    {
        $cuotas = $transaccion->cuotas ?? collect();
        $esCredito = $cuotas->count() > 0;

        return [
            'tipo' => $esCredito ? 'credito' : 'contado',
            'etiqueta' => $esCredito
                ? sprintf('Crédito — %d cuota(s)', $cuotas->count())
                : 'Contado',
            'cuotas' => $esCredito
                ? $cuotas->map(fn ($c) => [
                    'numero' => (int) $c->numero,
                    'monto' => (float) $c->monto,
                    'vencimiento' => $c->fecha_vencimiento
                        ? \Carbon\Carbon::parse($c->fecha_vencimiento)->format('d/m/Y')
                        : '',
                ])->values()->toArray()
                : [],
        ];
    }

    /** Para Notas de Crédito: factura que revierten. */
    private static function referencia(Transacciones $transaccion): ?array
    {
        if (! $transaccion->id_transaccion_origen) {
            return null;
        }

        $origen = Transacciones::with('tipoComprobante')->find($transaccion->id_transaccion_origen);

        if (! $origen) {
            return null;
        }

        return [
            'id_transaccion' => $origen->id,
            'tipo_comprobante' => $origen->tipoComprobante->nombre ?? '',
            'numero' => (string) ($origen->nro_comprobante ?: $origen->id),
            'fecha' => \Carbon\Carbon::parse($origen->created_at ?? now())->format('d/m/Y'),
        ];
    }
}
