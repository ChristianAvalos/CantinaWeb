<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password as PasswordRules;

class CambiarPasswordRequest extends FormRequest
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
            'currentPassword' => ['required'],
            'newPassword' => [
                'required',
                'confirmed',
                PasswordRules::min(8)->letters()->symbols()->numbers()
            ]
        ];
    }
    public function messages()
    {
        return [
            'currentPassword.required' => 'Debes ingresar la contraseña anterior',
            'newPassword.required' => 'El campo de nueva contraseña es obligatorio',
            'newPassword.confirmed' => 'La confirmación de la nueva contraseña no coincide',
            'newPassword' => 'La contraseña debe contener al menos 8 caracteres, una letra, un símbolo y un número',
        ];
    }
}
