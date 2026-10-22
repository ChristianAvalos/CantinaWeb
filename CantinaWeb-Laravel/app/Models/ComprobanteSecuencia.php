<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Contador de numeración de comprobantes.
 * Una fila por timbrado + sucursal (punto de expedición) + tipo de comprobante.
 */
class ComprobanteSecuencia extends Model
{
    protected $table = 'comprobante_secuencias';

    protected $fillable = [
        'id_datos_facturacion',
        'id_sucursal',
        'id_tipo_comprobante',
        'ultimo_numero',
    ];

    protected $casts = [
        'ultimo_numero' => 'integer',
    ];

    public function datosFacturacion()
    {
        return $this->belongsTo(DatosFacturacion::class, 'id_datos_facturacion');
    }

    public function sucursal()
    {
        return $this->belongsTo(Sucursal::class, 'id_sucursal');
    }

    public function tipoComprobante()
    {
        return $this->belongsTo(TipoComprobante::class, 'id_tipo_comprobante');
    }
}
