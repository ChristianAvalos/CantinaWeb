<?php

namespace App\Http\Requests;

use App\Models\Producto;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

class UpdateProductoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Organización contra la que se valida la unicidad.
     *
     * Un producto nunca cambia de organización, así que para el Administrador de
     * Sistema (rol 1), que puede editar productos de cualquier organización, se
     * usa la del propio producto; el resto solo edita los suyos.
     */
    private function idOrganizacion(): ?int
    {
        $user = $this->user();

        if ((int) ($user?->rol_id) === 1) {
            return Producto::find($this->route('id'))?->id_organizacion
                ?? $user?->id_organizacion;
        }

        return $user?->id_organizacion;
    }

    /**
     * Unicidad DENTRO de la organización, ignorando el producto que se edita.
     */
    private function unicoEnOrganizacion(string $columna): Unique
    {
        $idOrganizacion = $this->idOrganizacion();

        return Rule::unique('productos', $columna)
            ->ignore($this->route('id'))
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
                'nombre' => ['required','string', $this->unicoEnOrganizacion('nombre')],
                'codigo_interno' => ['nullable','string', $this->unicoEnOrganizacion('codigo_interno')],
                'codigo_barras' => ['nullable','string', $this->unicoEnOrganizacion('codigo_barras')],
                'descripcion' => ['nullable','string'],
                'id_Categoria' => ['required','integer'],
                'id_TipoUnidadMedida' => ['required','integer'],
                'cantidad_unidad' => ['required','numeric'],
                'precio_compra' => ['required','numeric'],
                'precio_venta' => ['required','numeric'],
                'stock_minimo' => ['required','integer'],
                'id_TipoEstado' => ['nullable','integer'],
                'imagen' => ['nullable','image','mimes:jpeg,png,jpg,gif,svg','max:5048'],
                'eliminar_imagen' => ['nullable'],
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
                'id_TipoEstado' => 'El estado es obligatorio',
                'imagen.image' => 'El archivo debe ser una imagen',
                'imagen.mimes' => 'La imagen debe ser un archivo de tipo: jpeg, png, jpg, gif, svg',
                'imagen.max' => 'La imagen no debe ser mayor a 2MB',
                'fecha.required' => 'La fecha de creación es obligatoria',
                'fecha.date' => 'La fecha de creación debe ser una fecha válida'
            ];
        }
}
