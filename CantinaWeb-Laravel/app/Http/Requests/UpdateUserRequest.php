<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
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
        $userId = $this->route('id'); 
        return [
            'name' => ['required','string'],
            'nameUser' => ['required','string'],
            'email' => ['required', 'email', 'unique:users,email,' . $userId],
            'rol_id' => ['required', 'exists:roles,id'],
            'id_organizacion' => ['required', 'exists:organizacion,id']
        ];
    }
    public function messages()
    {
        return [
            'name' => 'El nombre es obligatorio',
            'name.required' => 'El nombre es obligatorio',
            'nameUser.required' => 'El nombre de usuario es obligatorio',
            'email.required' => 'El correo es obligatorio',
            'email.email' => 'El correo no es valido',
            'email.unique' => 'El correo ingresado ya existe',
            'rol_id.required' => 'El rol seleccionado no es válido',
            'rol_id.exists' => 'El rol seleccionado no es válido',
            'id_organizacion.required' => 'La organizacion es obligatoria',
        ];
    }
}
