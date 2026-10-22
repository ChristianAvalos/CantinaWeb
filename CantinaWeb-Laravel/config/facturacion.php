<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Emisor de comprobantes (valor por defecto)
    |--------------------------------------------------------------------------
    |
    | IMPORTANTE: el emisor es una decisión POR ORGANIZACIÓN y se guarda en
    | `datos_facturacion.Emisor`. Esto de acá es solo el valor por defecto
    | para organizaciones que todavía no eligieron.
    |
    | "impreso"  → la factura/ticket se imprime en el local (hoy).
    | "sifen"    → facturación electrónica (preparado, deshabilitado).
    |
    */
    'emisor' => env('FACTURACION_EMISOR', 'impreso'),

    'sifen' => [
        // Disponibilidad de la integración en esta instalación (infraestructura).
        // Una organización NO puede elegir "sifen" si esto está en false.
        // El ambiente (prueba/producción) sí es por organización y vive en
        // `datos_facturacion.Ambiente`.
        'habilitado' => env('FACTURACION_SIFEN_HABILITADO', false),
        'url' => env('FACTURACION_SIFEN_URL'),
        // El certificado y el CSC NO se guardan acá: son secretos y se cargan
        // cifrados cuando se implemente el envío.
    ],
];
