<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateProductoRequest extends FormRequest
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
                'nombre' => ['required','string','unique:productos,nombre'],
                'codigo_interno' => ['nullable','string','unique:productos,codigo_interno'],
                'codigo_barras' => ['nullable','string','unique:productos,codigo_barras'],
                'descripcion' => ['nullable','string'],
                'id_Categoria' => ['required','integer'],
                'id_TipoUnidadMedida' => ['required','integer'],
                'precio_compra' => ['required','numeric'],
                'precio_venta' => ['required','numeric'],
                'stock_minimo' => ['required','integer'],
                'id_TipoEstado' => ['nullable','integer'],
                'imagen' => ['nullable','image','mimes:jpeg,png,jpg,gif,svg','max:2048'],
                'fecha' => ['required','date']
            ];
        }
        public function messages()
        {
            return [
                'nombre' => 'El nombre es obligatorio',
                'nombre.unique' => 'Este nombre ya está en uso, debe ser único',
                'codigo_interno.unique' => 'Este código interno ya está en uso, debe ser único',
                'codigo_barras.unique' => 'Este código de barras ya está en uso, debe ser único',
                'id_Categoria' => 'La categoría es obligatoria',
                'id_TipoUnidadMedida' => 'La unidad de medida es obligatoria',
                'precio_compra' => 'El precio de compra es obligatorio',
                'precio_venta' => 'El precio de venta es obligatorio',
                'stock_minimo' => 'El stock mínimo es obligatorio',
                'id_TipoEstado' => 'El estado es obligatorio',
                'imagen.image' => 'El archivo debe ser una imagen',
                'imagen.mimes' => 'La imagen debe ser un archivo de tipo: jpeg, png, jpg, gif, svg',
                'imagen.max' => 'La imagen no debe ser mayor a 2MB',
                'fecha.required' => 'La fecha de creación es obligatoria',
                'fecha.date' => 'La fecha de creación debe ser una fecha válida'
            ];
        }
}
