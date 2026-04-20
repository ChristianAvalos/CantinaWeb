<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CategoriaRequest extends FormRequest
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
        $rules = [
            'nombre' => 'required|string|max:100',
        ];

        // Si es PUT o PATCH (actualización), podés agregar más lógica si es necesario
        if ($this->isMethod('put') || $this->isMethod('patch')) {
            // Por ejemplo, podrías ignorar validaciones condicionales aquí
        }

        return $rules;
    }

    public function messages()
    {
        return [
            'nombre.required' => 'El nombre de la categoría es obligatorio.',
            'nombre.max' => 'El nombre no debe superar los 100 caracteres.',
        ];
    }
}
