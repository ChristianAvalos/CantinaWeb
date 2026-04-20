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
            'nameUser' => ['required','string','exists:users,nameUser'],
            'password' => 'required'
        ];
    }

    public function messages(){
        return[
            'nameUser.required'=> 'El nombre de usuario es obligatorio',
            'nameUser.string'=> 'El nombre de usuario no es valido',
            'nameUser.exists' => 'La cuenta no existe',
            'password' => 'La contraseña es obligatoria'

        ];
    }
}
