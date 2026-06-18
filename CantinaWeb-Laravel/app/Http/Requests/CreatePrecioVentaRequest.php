<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

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
            'id_tipo_moneda' => 'required|exists:tipo_monedas,id',
            'codigo_barras' => 'required|string|max:255',
            'id_producto' => 'required|exists:productos,id',
            'nombre' => 'required|string|max:255',
            'precio' => 'required|numeric|min:0',
        ];
    }
    public function messages()
    {
        return [
            'id_organizacion.required' => 'El campo organizacion es obligatorio.',
            'id_organizacion.exists' => 'La organizacion proporcionada no existe.',
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
        ];
    }
}
