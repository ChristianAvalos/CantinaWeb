<?php

namespace App\Http\Requests;

use App\Models\Sucursal;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreatePrecioVentaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'id_organizacion' => 'required|exists:organizacion,id',
            'id_sucursal' => [
                'required',
                'exists:sucursales,id',
                // El Administrador de Sistema cotiza en cualquier sucursal de la
                // organización elegida; un usuario con sucursal asignada, solo en
                // la suya. La sucursal debe pertenecer a la organización destino.
                function ($attribute, $value, $fail) {
                    $user = $this->user();
                    $esAdminSistema = (int) ($user?->rol_id) === 1;
                    $idOrganizacionDestino = $esAdminSistema
                        ? ($this->input('id_organizacion') ?? $user?->id_organizacion)
                        : $user?->id_organizacion;

                    if (! $esAdminSistema && $user?->id_sucursal
                        && (int) $value !== (int) $user->id_sucursal) {
                        $fail('Solo podés cotizar en tu propia sucursal.');
                        return;
                    }

                    if (! Sucursal::where('id', $value)->where('id_organizacion', $idOrganizacionDestino)->exists()) {
                        $fail('La sucursal seleccionada no pertenece a la organización.');
                    }
                },
            ],
            'id_tipo_moneda' => 'required|exists:tipo_monedas,id',
            'codigo_barras' => 'required|string|max:255',
            'id_producto' => [
                'required',
                'exists:productos,id',
                Rule::unique('precio_venta')->where(function ($query) {
                    return $query->where('id_sucursal', $this->id_sucursal);
                }),
            ],
            'nombre' => 'required|string|max:255',
            'precio' => 'required|numeric|min:0',
        ];
    }
    public function messages()
    {
        return [
            'id_organizacion.required' => 'El campo organizacion es obligatorio.',
            'id_organizacion.exists' => 'La organizacion proporcionada no existe.',
            'id_sucursal.required' => 'El campo sucursal es obligatorio.',
            'id_sucursal.exists' => 'La sucursal proporcionada no existe.',
            'id_tipo_moneda.required' => 'El campo tipo de moneda es obligatorio.',
            'id_tipo_moneda.exists' => 'El tipo de moneda proporcionado no existe.',
            'codigo_barras.required' => 'El campo codigo de barras es obligatorio.',
            'codigo_barras.string' => 'El campo codigo de barras debe ser una cadena de texto.',
            'codigo_barras.max' => 'El campo codigo de barras no debe exceder los 255 caracteres.',
            'nombre.required' => 'El campo nombre es obligatorio.',
            'nombre.string' => 'El campo nombre debe ser una cadena de texto.',
            'nombre.max' => 'El campo nombre no debe exceder los 255 caracteres.',
            'precio.required' => 'El campo precio es obligatorio.',
            'precio.numeric' => 'El campo precio debe ser un número.',
            'precio.min' => 'El campo precio debe ser mayor o igual a 0.',
            'id_producto.required' => 'El campo producto es obligatorio.',
            'id_producto.exists' => 'El producto proporcionado no existe.',
            'id_producto.unique' => 'Ya existe un precio de venta para este producto en la organización seleccionada.',
        ];
    }
}
