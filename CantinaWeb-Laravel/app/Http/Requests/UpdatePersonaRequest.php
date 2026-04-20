<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePersonaRequest extends FormRequest
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
                'nombre' => ['required','string'],
                'documento' => ['required','string'],
                'direccion' => ['nullable','string'],
                'telefono' => ['nullable','string'],
                'email' => ['nullable','email'],
                'id_tipo_persona' => ['required','integer'],
                'id_tipoestado' => ['nullable','integer']
            ];
    }
    public function messages()
    {
        return [
            'nombre' => 'El nombre es obligatorio',
            'documento' => 'El documento es obligatorio',
            'direccion' => 'La dirección debe ser una cadena de texto',
            'telefono' => 'El teléfono debe ser una cadena de texto',
            'email' => 'El email debe ser una dirección de correo válida',
            'id_tipo_persona' => 'El tipo de persona es obligatorio',
            'id_tipoestado' => 'El estado es obligatorio'
        ];
    }
}
