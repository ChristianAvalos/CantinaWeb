<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTransaccionDetalleRequest extends FormRequest
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
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
                'codigo_barras' => ['required', 'string', 'not_in:0', 'exists:productos,codigo_barras'],
                'precio_unitario' => ['required', 'numeric', 'gt:0'],
                'cantidad' => ['required', 'numeric', 'gt:0']
                
            ];
        }
        public function messages()
        {
            return [
                'codigo_barras.required' => 'El código de barras es obligatorio',
                'codigo_barras.not_in' => 'El código de barras no puede ser 0',
                'codigo_barras.exists' => 'El código de barras no existe',
                'precio_unitario.required' => 'El precio unitario es obligatorio',
                'precio_unitario.numeric' => 'El precio unitario debe ser numérico',
                'precio_unitario.gt' => 'El precio unitario debe ser mayor a 0',
                'cantidad.required' => 'La cantidad es obligatoria',
                'cantidad.numeric' => 'La cantidad debe ser numérica',
                'cantidad.gt' => 'La cantidad debe ser mayor a 0',
                
            ];
        }
}
