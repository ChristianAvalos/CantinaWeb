<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

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
     * Organización destino del producto.
     *
     * Solo el Administrador de Sistema (rol 1) puede crear en otra organización;
     * para el resto se usa siempre la suya.
     */
    private function idOrganizacion(): ?int
    {
        $user = $this->user();

        if ((int) ($user?->rol_id) === 1 && $this->filled('id_organizacion')) {
            return (int) $this->input('id_organizacion');
        }

        return $user?->id_organizacion;
    }

    /**
     * Unicidad DENTRO de la organización: dos organizaciones distintas pueden
     * repetir nombre y códigos en su propio catálogo.
     */
    private function unicoEnOrganizacion(string $columna): Unique
    {
        $idOrganizacion = $this->idOrganizacion();

        return Rule::unique('productos', $columna)
            ->where(fn ($query) => $idOrganizacion === null
                ? $query->whereNull('id_organizacion')
                : $query->where('id_organizacion', $idOrganizacion));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
                // Opcional: solo lo usa el Administrador de Sistema para crear en
                // otra organización. Para el resto se fuerza la suya.
                'id_organizacion' => ['nullable','integer','exists:organizacion,id'],
                'nombre' => ['required','string', $this->unicoEnOrganizacion('nombre')],
                'codigo_interno' => ['nullable','string', $this->unicoEnOrganizacion('codigo_interno')],
                'codigo_barras' => ['nullable','string', $this->unicoEnOrganizacion('codigo_barras')],
                'descripcion' => ['nullable','string'],
                'id_Categoria' => ['required','integer'],
                'cantidad_unidad' => ['required','numeric'],
                'id_TipoUnidadMedida' => ['required','integer'],
                'precio_compra' => ['required','numeric'],
                'precio_venta' => ['required','numeric'],
                'stock_minimo' => ['required','integer'],
                'id_TipoEstado' => ['required','nullable','integer'],
                'imagen' => ['nullable','image','mimes:jpeg,png,jpg,gif,svg','max:2048'],
                'fecha' => ['required','date']
            ];
        }
        public function messages()
        {
            return [
                'nombre' => 'El nombre es obligatorio',
                'nombre.unique' => 'Este nombre ya está en uso en tu organización',
                'codigo_interno.unique' => 'Este código interno ya está en uso en tu organización',
                'codigo_barras.unique' => 'Este código de barras ya está en uso en tu organización',
                'id_Categoria' => 'La categoría es obligatoria',
                'id_TipoUnidadMedida' => 'La unidad de medida es obligatoria',
                'cantidad_unidad' => 'La cantidad en medida es obligatoria',
                'precio_compra' => 'El precio de compra es obligatorio',
                'precio_venta' => 'El precio de venta es obligatorio',
                'stock_minimo' => 'El stock mínimo es obligatorio',
                'id_TipoEstado.required' => 'El estado es obligatorio',
                'imagen.image' => 'El archivo debe ser una imagen',
                'imagen.mimes' => 'La imagen debe ser un archivo de tipo: jpeg, png, jpg, gif, svg',
                'imagen.max' => 'La imagen no debe ser mayor a 2MB',
                'fecha.required' => 'La fecha de creación es obligatoria',
                'fecha.date' => 'La fecha de creación debe ser una fecha válida'
            ];
        }
}
