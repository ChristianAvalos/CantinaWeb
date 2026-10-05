<?php

namespace App\Http\Requests;

use App\Models\Sucursal;
use App\Models\TipoMovimientos;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateTransaccionRequest extends FormRequest
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
        $esCompra = (int) $this->input('id_TipoMovimiento') === 1;
        $esAjuste = (int) $this->input('id_TipoMovimiento') === 3;

        // Comprobante:
        //  - Compra → siempre Factura (obligatoria).
        //  - Venta  → Factura, Ticket, Nota de Crédito o Nota de Débito (no Boleta).
        //  - Ajuste → opcional, cualquier tipo (no es un documento fiscal).
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
            : ($esCompra
                ? ['required', 'exists:tipo_comprobantes,id', function ($attribute, $value, $fail) {
                    $tipo = \App\Models\TipoComprobante::find($value);
                    if ($tipo && strtolower(trim($tipo->nombre)) !== 'factura') {
                        $fail('En compras, el tipo de comprobante debe ser Factura.');
                    }
                }]
                : ['nullable', 'exists:tipo_comprobantes,id']);

        $rules = [
            'fecha' => 'required|date',
            'lote' => 'nullable',
            'id_organizacion' => 'required|exists:organizacion,id',
            // Con más de una sucursal en la organización, elegir una es obligatorio.
            // Además, la sucursal debe pertenecer a la organización seleccionada.
            'id_sucursal' => [
                Rule::requiredIf(fn () => Sucursal::where('id_organizacion', $this->input('id_organizacion'))->count() > 1),
                'nullable',
                'exists:sucursales,id',
                function ($attribute, $value, $fail) {
                    if ($value === null) {
                        return;
                    }
                    $idOrganizacion = $this->input('id_organizacion');
                    if ($idOrganizacion && ! Sucursal::where('id', $value)->where('id_organizacion', $idOrganizacion)->exists()) {
                        $fail('La sucursal seleccionada no pertenece a la organización.');
                    }
                },
            ],
            'descripcion' => 'nullable|string|max:1000',
            'monto' => 'nullable|numeric',
            'monto_recibido' => 'nullable|numeric',
            'vuelto' => 'nullable|numeric',
            'iva' => 'nullable|numeric',
            'id_TipoEstado' => $esAjuste ? 'nullable|exists:tipo_estados,id' : 'required|exists:tipo_estados,id',
            'id_MotivoAjuste' => $esAjuste ? 'required|exists:motivo_ajustes,id' : 'nullable|exists:motivo_ajustes,id',
            'direccion' => $esAjuste ? 'required|in:entrada,salida' : 'nullable|in:entrada,salida',
            'id_TipoComprobante' => $reglasTipoComprobante,
            // Solo tipos de DOCUMENTO (Compra/Venta/Ajuste). Nunca un movimiento
            // de inventario del kardex (101, 201...), que vive en la misma tabla.
            'id_TipoMovimiento' => [
                'required',
                Rule::exists('tipo_movimientos', 'id')->where('ambito', TipoMovimientos::AMBITO_DOCUMENTO),
            ],
            'nro_comprobante' => $esCompra ? 'required|string|max:100' : 'nullable|string|max:100',
            'id_persona' => $esCompra ? 'required|exists:personas,id' : 'nullable|exists:personas,id',
            'id_TipoPago' => $esAjuste ? 'nullable|exists:tipo_pagos,id' : 'required|exists:tipo_pagos,id',
            'id_FormaPago' => $esAjuste ? 'nullable|exists:forma_pagos,id' : 'required|exists:forma_pagos,id',
            'descripcion' => 'nullable|string'
        ];
        return $rules;
    }
    public function messages()
    {
        return [
            'id_organizacion.required' => 'Debe seleccionar una organización.',
            'id_organizacion.exists' => 'La organización seleccionada no existe.',

            'id_sucursal.required' => 'Debe seleccionar una sucursal.',

            'descripcion.max' => 'La descripción no debe exceder los 1000 caracteres.',

            'monto.numeric' => 'El monto debe ser un número.',

            'id_TipoMovimiento.required' => 'Debe seleccionar un tipo de movimiento.',
            'id_TipoMovimiento.exists' => 'El tipo de movimiento seleccionado no existe.',


            'fecha.required' => 'El campo fecha es obligatorio.',
            'fecha.date' => 'La fecha debe tener un formato válido.',

            'id_TipoEstado.required' => 'Debe seleccionar un tipo de estado.',
            'id_TipoEstado.exists' => 'El tipo de estado seleccionado no existe.',

            'id_MotivoAjuste.required' => 'Debe seleccionar el motivo del ajuste.',
            'id_MotivoAjuste.exists' => 'El motivo del ajuste seleccionado no existe.',

            'direccion.required' => 'Debe seleccionar la dirección del ajuste.',
            'direccion.in' => 'La dirección del ajuste debe ser entrada o salida.',

            'id_TipoComprobante.required' => 'Debe seleccionar un tipo de comprobante.',
            'id_TipoComprobante.exists' => 'El tipo de comprobante seleccionado no existe.',
            
            'nro_comprobante.required' => 'El campo número de comprobante es obligatorio.',
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
