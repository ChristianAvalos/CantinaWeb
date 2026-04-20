<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateRolRequest extends FormRequest
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
                'name' => ['required','string','unique:roles,name']
            ];
        }
        public function messages()
        {
            return [
                'name' => 'El nombre es obligatorio',
                'name.unique' => 'Este nombre ya está en uso, debe ser único' 
            ];
        }
}
