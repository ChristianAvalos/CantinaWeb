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
        'tipoMoneda'   => $this->tipoMoneda?->nombre,
        'tipoEstado'   => $this->tipoEstado?->descripcion,
        'precio'       => $this->precio
        ];
    }
}
