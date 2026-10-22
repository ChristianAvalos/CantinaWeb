import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import clienteAxios from '../config/axios';
import { toast } from 'react-toastify';

const vacio = {
    RUC: '',
    RazonSocial: '',
    DireccionFiscal: '',
    Telefono: '',
    Email: '',
    ActividadEconomica: '',
    ActividadEconomicaCodigo: '',
    Timbrado: '',
    TimbradoInicio: '',
    TimbradoVencimiento: '',
    Ambiente: 'test',
    Emisor: 'impreso',
};

const desdeRegistro = (registro) => ({
    RUC: registro.RUC || '',
    RazonSocial: registro.RazonSocial || '',
    DireccionFiscal: registro.DireccionFiscal || '',
    Telefono: registro.Telefono || '',
    Email: registro.Email || '',
    ActividadEconomica: registro.ActividadEconomica || '',
    ActividadEconomicaCodigo: registro.ActividadEconomicaCodigo || '',
    Timbrado: registro.Timbrado || '',
    TimbradoInicio: registro.TimbradoInicio || '',
    TimbradoVencimiento: registro.TimbradoVencimiento || '',
    Ambiente: registro.Ambiente || 'test',
    Emisor: registro.Emisor || 'impreso',
});

export default function ModalDatosFacturacion({ registro, idOrganizacion = '', onClose, refrescar }) {
    const token = localStorage.getItem('AUTH_TOKEN');
    const esEdicion = Boolean(registro?.id);

    const [form, setForm] = useState(() => (esEdicion ? desdeRegistro(registro) : { ...vacio }));
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    // La integración electrónica se habilita por instalación; la elección es por
    // organización. Si no está disponible, la opción queda deshabilitada.
    const [emisorDisponible, setEmisorDisponible] = useState(false);

    useEffect(() => {
        clienteAxios.get('api/datos_facturacion', { headers: { Authorization: `Bearer ${token}` } })
            .then(({ data }) => setEmisorDisponible(Boolean(data?.emisor_disponible)))
            .catch(() => setEmisorDisponible(false));
    }, [token]);

    const handleChange = (campo, valor) => {
        setForm((prev) => ({ ...prev, [campo]: valor }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrores({});
        setGuardando(true);

        try {
            const headers = { Authorization: `Bearer ${token}` };
            if (esEdicion) {
                await clienteAxios.put(`api/datos_facturacion/${registro.id}`, form, { headers });
                toast.success('Datos de facturación actualizados.');
            } else {
                // El timbrado se asocia a la organización elegida (SaaS).
                const payload = idOrganizacion
                    ? { ...form, id_organizacion: idOrganizacion }
                    : form;
                await clienteAxios.post('api/datos_facturacion', payload, { headers });
                toast.success('Datos de facturación creados.');
            }
            refrescar();
            onClose();
        } catch (error) {
            if (error.response?.status === 422) {
                setErrores(error.response.data.errors || {});
            } else {
                toast.error(error.response?.data?.message || 'No se pudieron guardar los datos.');
            }
        } finally {
            setGuardando(false);
        }
    };

    const inputClass = (campo) => `w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errores[campo] ? 'border-red-500' : 'border-gray-300'}`;
    const errorDe = (campo) => (errores[campo] ? <p className="mt-1 text-sm text-red-500">{errores[campo][0]}</p> : null);

    return (
        <div className="fixed inset-0 z-[1035] flex items-center justify-center">
            <div className="absolute inset-0 bg-gray-800 opacity-75" onClick={onClose}></div>

            <div className="relative z-[1036] max-h-[92vh] w-[95vw] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
                <h2 className="mb-1 text-xl font-bold text-slate-800">
                    {esEdicion ? 'Editar datos de facturación' : 'Nuevo timbrado'}
                </h2>
                <p className="mb-4 text-sm text-slate-500">
                    Estos datos son los que salen impresos en la factura. El perfil comercial de la
                    organización no se modifica.
                </p>

                {esEdicion && (
                    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        Si cambiás de timbrado, creá uno <strong>nuevo</strong> y activalo: así las
                        facturas ya emitidas conservan el suyo.
                    </div>
                )}

                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    <i className="fas fa-circle-info mr-2" aria-hidden="true" />
                    El RUC, la razón social y el correo se toman de la <strong>organización</strong>, y el
                    domicilio y el teléfono de la <strong>sucursal que emite</strong>. Completá estos campos
                    <strong> solo si el dato fiscal es distinto</strong> al comercial.
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">RUC</label>
                        <input type="text" value={form.RUC} onChange={(e) => handleChange('RUC', e.target.value)} className={inputClass('RUC')} placeholder="Se usa el de la organización" />
                        {errorDe('RUC')}
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Razón social</label>
                        <input type="text" value={form.RazonSocial} onChange={(e) => handleChange('RazonSocial', e.target.value)} className={inputClass('RazonSocial')} placeholder="Se usa la de la organización" />
                        {errorDe('RazonSocial')}
                    </div>

                    <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Dirección fiscal</label>
                        <input type="text" value={form.DireccionFiscal} onChange={(e) => handleChange('DireccionFiscal', e.target.value)} className={inputClass('DireccionFiscal')} placeholder="Se usa la de la sucursal que vende" />
                        {errorDe('DireccionFiscal')}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
                        <input type="text" value={form.Telefono} onChange={(e) => handleChange('Telefono', e.target.value)} className={inputClass('Telefono')} placeholder="Se usa el de la sucursal" />
                        {errorDe('Telefono')}
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={form.Email} onChange={(e) => handleChange('Email', e.target.value)} className={inputClass('Email')} placeholder="Se usa el de la organización" />
                        {errorDe('Email')}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Actividad económica</label>
                        <input type="text" value={form.ActividadEconomica} onChange={(e) => handleChange('ActividadEconomica', e.target.value)} className={inputClass('ActividadEconomica')} />
                        {errorDe('ActividadEconomica')}
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Código de actividad</label>
                        <input type="text" value={form.ActividadEconomicaCodigo} onChange={(e) => handleChange('ActividadEconomicaCodigo', e.target.value)} className={inputClass('ActividadEconomicaCodigo')} />
                        {errorDe('ActividadEconomicaCodigo')}
                    </div>

                    <div className="sm:col-span-2 border-t border-slate-200 pt-4">
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Timbrado</h3>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Número de timbrado *</label>
                        <input type="text" value={form.Timbrado} onChange={(e) => handleChange('Timbrado', e.target.value)} className={inputClass('Timbrado')} placeholder="12345678" />
                        {errorDe('Timbrado')}
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Ambiente</label>
                        <select value={form.Ambiente} onChange={(e) => handleChange('Ambiente', e.target.value)} className={inputClass('Ambiente')}>
                            <option value="test">Prueba</option>
                            <option value="produccion">Producción</option>
                        </select>
                        {errorDe('Ambiente')}
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Emisor</label>
                        <select value={form.Emisor} onChange={(e) => handleChange('Emisor', e.target.value)} className={inputClass('Emisor')}>
                            <option value="impreso">Impreso (local)</option>
                            <option value="sifen" disabled={!emisorDisponible}>
                                Electrónico — SIFEN{emisorDisponible ? '' : ' (no disponible)'}
                            </option>
                        </select>
                        {errorDe('Emisor')}
                        <p className="mt-1 text-xs text-slate-500">
                            Cada organización elige cómo emite sus comprobantes.
                        </p>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Vigencia desde</label>
                        <input type="date" value={form.TimbradoInicio} onChange={(e) => handleChange('TimbradoInicio', e.target.value)} className={inputClass('TimbradoInicio')} />
                        {errorDe('TimbradoInicio')}
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Vigencia hasta</label>
                        <input type="date" value={form.TimbradoVencimiento} onChange={(e) => handleChange('TimbradoVencimiento', e.target.value)} className={inputClass('TimbradoVencimiento')} />
                        {errorDe('TimbradoVencimiento')}
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 sm:col-span-2">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={guardando} className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                            {guardando ? 'Guardando…' : (esEdicion ? 'Guardar cambios' : 'Crear')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

ModalDatosFacturacion.propTypes = {
    registro: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        RUC: PropTypes.string,
        RazonSocial: PropTypes.string,
        DireccionFiscal: PropTypes.string,
        Telefono: PropTypes.string,
        Email: PropTypes.string,
        ActividadEconomica: PropTypes.string,
        ActividadEconomicaCodigo: PropTypes.string,
        Timbrado: PropTypes.string,
        TimbradoInicio: PropTypes.string,
        TimbradoVencimiento: PropTypes.string,
        Ambiente: PropTypes.string,
        Emisor: PropTypes.string,
    }),
    idOrganizacion: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    onClose: PropTypes.func.isRequired,
    refrescar: PropTypes.func.isRequired,
};
