<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTransaccionRequest extends FormRequest
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
        $esVenta = (int) $this->input('id_TipoMovimiento') === 2;

        // En compras el tipo de comprobante debe ser SIEMPRE Factura.
        // En ventas se permiten Factura, Ticket, Nota de Crédito y Nota de Débito (no Boleta).
        $reglasTipoComprobante = $esVenta
            ? ['nullable', 'exists:tipo_comprobantes,id', function ($attribute, $value, $fail) {
                if ($value === null) {
                    return;
                }
                $tipo = \App\Models\TipoComprobante::find($value);
                $permitidosVenta = ['factura', 'ticket', 'nota de crédito', 'nota de debito'];
                if ($tipo && !in_array(strtolower(trim($tipo->nombre)), $permitidosVenta, true)) {
                    $fail('El tipo de comprobante seleccionado no es válido para ventas.');
                }
            }]
            : ['required', 'exists:tipo_comprobantes,id', function ($attribute, $value, $fail) {
                $tipo = \App\Models\TipoComprobante::find($value);
                if ($tipo && strtolower(trim($tipo->nombre)) !== 'factura') {
                    $fail('En compras, el tipo de comprobante debe ser Factura.');
                }
            }];

        $rules = [
            'nombre' => 'required|string|max:255',
            'fecha' => 'required|date',
            'lote' => 'nullable',
            'id_organizacion' => 'required|exists:organizacion,id',
            'descripcion' => 'nullable|string|max:1000',
            'monto' => 'nullable|numeric',
            'id_TipoEstado' => 'required|exists:tipo_estados,id',
            'id_TipoComprobante' => $reglasTipoComprobante,
            'id_TipoMovimiento' => 'required|exists:tipo_movimientos,id',
            'nro_comprobante' => $esVenta ? 'nullable|string|max:100' : 'required|string|max:100',
            'id_persona' => $esVenta ? 'nullable|exists:personas,id' : 'required|exists:personas,id',
            'id_TipoPago' => 'required|exists:tipo_pagos,id',
            'id_FormaPago' => 'required|exists:forma_pagos,id',
            'descripcion' => 'nullable|string'
        ];
        return $rules;
    }

    public function messages()
    {
        return [
            'nombre.required' => 'El campo nombre es obligatorio.',
            'nombre.string' => 'El nombre debe ser una cadena de texto.',
            'nombre.max' => 'El nombre no debe exceder los 255 caracteres.',

            'id_organizacion.required' => 'Debe seleccionar una organización.',
            'id_organizacion.exists' => 'La organización seleccionada no existe.',

            'descripcion.max' => 'La descripción no debe exceder los 1000 caracteres.',

            'monto.numeric' => 'El monto debe ser un número.',

            'id_TipoMovimiento.required' => 'Debe seleccionar un tipo de movimiento.',
            'id_TipoMovimiento.exists' => 'El tipo de movimiento seleccionado no existe.',

            'fecha.required' => 'El campo fecha es obligatorio.',
            'fecha.date' => 'La fecha debe tener un formato válido.',

            'id_TipoEstado.required' => 'Debe seleccionar un tipo de estado.',
            'id_TipoEstado.exists' => 'El tipo de estado seleccionado no existe.',

            'id_TipoComprobante.exists' => 'El tipo de comprobante seleccionado no existe.',

            'nro_comprobante.string' => 'El número de comprobante debe ser una cadena de texto.',
            'nro_comprobante.max' => 'El número de comprobante no debe exceder los 100 caracteres.',

            'id_persona.required' => 'Debe seleccionar una persona.',
            'id_persona.exists' => 'La persona seleccionada no existe.',

            'id_TipoPago.required' => 'Debe seleccionar un tipo de pago.',
            'id_TipoPago.exists' => 'El tipo de pago seleccionado no existe.',

            'id_FormaPago.required' => 'Debe seleccionar una forma de pago.',
            'id_FormaPago.exists' => 'La forma de pago seleccionada no existe.',

            'descripcion.string' => 'La descripción debe ser una cadena de texto.'
        ];
    }
}
