<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
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
            // Puede ser el nombre de usuario o el documento (con o sin puntos).
            'nameUser' => ['required','string'],
            'password' => ['required','string'],
        ];
    }

    public function messages(){
        return[
            'nameUser.required'=> 'El usuario o documento es obligatorio',
            'nameUser.string'=> 'El usuario o documento no es válido',
            'password.required' => 'La contraseña es obligatoria',
        ];
    }
}
