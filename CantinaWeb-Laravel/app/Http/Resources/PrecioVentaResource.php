<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PrecioVentaResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
        'id'           => $this->id,
        'nombre'       => $this->producto?->nombre,
        'codigo_barras' => $this->producto?->codigo_barras,
        'organizacion' => $this->organizacion?->RazonSocial,
        'id_organizacion' => $this->id_organizacion,
        'tipoMoneda'   => $this->tipoMoneda?->nombre,
        'id_tipo_moneda' => $this->id_tipo_moneda,
        'tipoEstado'   => $this->tipoEstado?->descripcion,
        'precio'       => $this->precio
        ];
    }
}
