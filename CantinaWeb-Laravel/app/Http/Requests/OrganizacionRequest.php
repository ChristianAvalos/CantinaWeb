<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OrganizacionRequest extends FormRequest
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
            'name' => ['required','string'],
            'email' => ['required','email','unique:organizacion,email'],
            'pais_id' => ['required', 'exists:Pais,id'],
            'ciudad_id' => ['required', 'exists:Ciudad,id'],
            'ruc' => ['required','string'],
            'direccion' => ['required','string'],
            'telefono1' => 'nullable|string',
            'telefono2' => 'nullable|string',
            'fax1' => 'nullable|string',
            'fax2' => 'nullable|string',
            'email' => 'required|email',
            'sigla' => 'nullable|string|max:10',
            'sitioWeb' => 'nullable|string',
            'imagen' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ];
    }

    public function messages()
    {
        return [
            'name.required' => 'El nombre es obligatorio',
            'email.required' => 'El correo es obligatorio',
            'email.email' => 'El correo no es valido',
            'email.unique' => 'El correo ingresado ya existe',
            'pais_id.exists' => 'El pais seleccionado no es válido',
            'ciudad_id.exists' => 'La ciudad seleccionada no es válido',
            'pais_id.required' => 'El pais seleccionado no es válido',
            'ciudad_id.required' => 'La ciudad seleccionada no es válido',
            'ruc.required' => 'El RUC es obligatorio',
            'direccion.required' => 'La direccion es obligatoria',
            
        ];
    }
}
