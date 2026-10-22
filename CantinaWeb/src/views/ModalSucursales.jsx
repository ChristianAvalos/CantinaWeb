import { useCallback, useEffect, useState } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal";

/**
 * Administra las sucursales de una organización.
 * Regla: toda organización tiene una sucursal "Principal" (no se puede borrar).
 * Los candados del backend impiden borrar sucursales con stock/usuarios/transacciones.
 */
export default function ModalSucursales({ organizacion, onClose }) {
    const token = localStorage.getItem('AUTH_TOKEN');
    const [sucursales, setSucursales] = useState([]);
    const [form, setForm] = useState({ id: null, nombre: '', establecimiento: '001', punto_expedicion: '001', direccion: '', telefono: '' });
    const [guardando, setGuardando] = useState(false);

    // Alerta de confirmación (activar/desactivar o eliminar)
    const [mostrarAlerta, setMostrarAlerta] = useState(false);
    const [tipoAlerta, setTipoAlerta] = useState('informativo');
    const [mensajeAlerta, setMensajeAlerta] = useState('');
    const [accionPendiente, setAccionPendiente] = useState(null);

    const fetchSucursales = useCallback(async () => {
        try {
            const { data } = await clienteAxios.get(`api/sucursales?id_organizacion=${organizacion.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSucursales(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error al cargar sucursales', error);
        }
    }, [organizacion.id, token]);

    useEffect(() => { fetchSucursales(); }, [fetchSucursales]);

    const limpiar = () => setForm({ id: null, nombre: '', establecimiento: '001', punto_expedicion: '001', direccion: '', telefono: '' });

    const handleGuardar = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) {
            toast.warning('El nombre de la sucursal es obligatorio.');
            return;
        }
        setGuardando(true);
        try {
            const payload = {
                id_organizacion: organizacion.id,
                nombre: form.nombre.trim(),
                establecimiento: form.establecimiento,
                punto_expedicion: form.punto_expedicion,
                direccion: form.direccion,
                telefono: form.telefono,
            };
            if (form.id) {
                await clienteAxios.put(`api/update_sucursal/${form.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Sucursal actualizada.');
            } else {
                await clienteAxios.post('api/crear_sucursal', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Sucursal creada.');
            }
            limpiar();
            fetchSucursales();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo guardar la sucursal.');
        } finally {
            setGuardando(false);
        }
    };

    // Pide confirmación (AlertaModal) antes de eliminar.
    const handleEliminar = (sucursal) => {
        setAccionPendiente({ tipo: 'eliminar', sucursal });
        setTipoAlerta('confirmacion');
        setMensajeAlerta(`¿Eliminar la sucursal "${sucursal.nombre}"? Esta acción no se puede deshacer.`);
        setMostrarAlerta(true);
    };

    // Pide confirmación antes de activar/desactivar (si queda inactiva, sus usuarios no acceden).
    const handleEstado = (sucursal) => {
        const activa = Number(sucursal.id_tipo_estado) === 1;
        setAccionPendiente({ tipo: 'estado', sucursal });
        setTipoAlerta('confirmacion');
        setMensajeAlerta(
            `¿Estás seguro de que deseas ${activa ? 'desactivar' : 'activar'} la sucursal "${sucursal.nombre}"?`
            + (activa ? ' Sus usuarios no podrán acceder.' : '')
        );
        setMostrarAlerta(true);
    };

    const confirmarAccion = async () => {
        const accion = accionPendiente;
        setAccionPendiente(null);
        setMostrarAlerta(false);
        if (!accion) return;

        const { tipo, sucursal } = accion;
        try {
            if (tipo === 'estado') {
                const nuevoEstado = Number(sucursal.id_tipo_estado) === 1 ? 2 : 1;
                await clienteAxios.put(`api/update_sucursal/${sucursal.id}`, {
                    nombre: sucursal.nombre,
                    direccion: sucursal.direccion,
                    telefono: sucursal.telefono,
                    id_tipo_estado: nuevoEstado,
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success(`Sucursal ${nuevoEstado === 1 ? 'activada' : 'desactivada'} correctamente.`);
            } else {
                await clienteAxios.delete(`api/sucursal/${sucursal.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Sucursal eliminada.');
            }
            fetchSucursales();
        } catch (error) {
            setTipoAlerta('informativo');
            setMensajeAlerta(error.response?.data?.message || 'No se pudo completar la acción.');
            setMostrarAlerta(true);
        }
    };

    const handleConfirm = () => confirmarAccion();

    const handleClose = () => {
        setMostrarAlerta(false);
        setAccionPendiente(null);
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[1035]">
            <div className="bg-gray-800 opacity-75 absolute inset-0" onClick={onClose}></div>

            <div className="relative z-[1036] w-[95vw] max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
                <h2 className="text-xl font-bold text-slate-800">Sucursales</h2>
                <p className="mb-4 text-sm text-slate-500">{organizacion.RazonSocial}</p>

                <div className="mb-4 overflow-hidden rounded-xl border border-gray-200">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Sucursal</th>
                                <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-gray-500">Expedición</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">Dirección</th>
                                <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-gray-500">Estado</th>
                                <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-500">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {sucursales.map((s) => (
                                <tr key={s.id}>
                                    <td className="px-3 py-2 text-sm font-medium text-gray-800">
                                        {s.nombre}
                                        {s.es_principal && (
                                            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Principal</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-center text-sm tabular-nums text-gray-600">
                                        {s.establecimiento || '001'}-{s.punto_expedicion || '001'}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-600">{s.direccion || '—'}</td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${Number(s.id_tipo_estado) === 1 ? 'bg-green-100 text-green-700 ring-green-200' : 'bg-red-100 text-red-700 ring-red-200'}`}>
                                            {Number(s.id_tipo_estado) === 1 ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <button
                                            type="button"
                                            onClick={() => setForm({
                                            id: s.id,
                                            nombre: s.nombre,
                                            establecimiento: s.establecimiento || '001',
                                            punto_expedicion: s.punto_expedicion || '001',
                                            direccion: s.direccion || '',
                                            telefono: s.telefono || '',
                                        })}
                                            className="rounded p-1 hover:bg-gray-200"
                                            title="Editar"
                                        >
                                            <i className="fas fa-pen-to-square h-4 w-4 text-[0.95rem] text-center text-blue-600" role="img" aria-label="Editar" title="Editar" />
                                        </button>
                                        {!s.es_principal && (
                                            <button
                                                type="button"
                                                onClick={() => handleEliminar(s)}
                                                className="rounded p-1 hover:bg-red-100"
                                                title="Eliminar"
                                            >
                                                <i className="fas fa-trash-can h-4 w-4 text-[0.95rem] text-center text-rose-600" role="img" aria-label="Eliminar" title="Eliminar" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleEstado(s)}
                                            className="rounded p-1 hover:bg-gray-200"
                                            title={Number(s.id_tipo_estado) === 1 ? 'Desactivar' : 'Activar'}
                                        >
                                            {Number(s.id_tipo_estado) === 1 ? (
                                                <i className="fas fa-toggle-on h-5 w-5 text-[1.15rem] text-center text-emerald-600" role="img" aria-label="Activo" title="Activo" />
                                            ) : (
                                                <i className="fas fa-toggle-off h-5 w-5 text-[1.15rem] text-center text-slate-400" role="img" aria-label="Inactivo" title="Inactivo" />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sucursales.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-400">No hay sucursales.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <form onSubmit={handleGuardar} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-12">
                    <div className="sm:col-span-2 lg:col-span-4">
                        <label className="mb-1 flex min-h-[2.25rem] items-end text-sm font-medium leading-tight text-gray-700">Nombre</label>
                        <input
                            type="text"
                            value={form.nombre}
                            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Sucursal Centro"
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="mb-1 flex min-h-[2.25rem] items-end text-sm font-medium leading-tight text-gray-700" title="Primer bloque del número de factura">Establecimiento</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={3}
                            value={form.establecimiento}
                            onChange={(e) => setForm({ ...form, establecimiento: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="001"
                        />
                    </div>
                    <div className="lg:col-span-3">
                        <label className="mb-1 flex min-h-[2.25rem] items-end whitespace-nowrap text-sm font-medium leading-tight text-gray-700" title="Segundo bloque del número de factura">Punto de expedición</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={3}
                            value={form.punto_expedicion}
                            onChange={(e) => setForm({ ...form, punto_expedicion: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="001"
                        />
                    </div>
                    <div className="lg:col-span-3">
                        <label className="mb-1 flex min-h-[2.25rem] items-end text-sm font-medium leading-tight text-gray-700">Teléfono</label>
                        <input
                            type="text"
                            value={form.telefono}
                            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Teléfono"
                        />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-12">
                        <label className="mb-1 flex min-h-[2.25rem] items-end text-sm font-medium leading-tight text-gray-700">Dirección</label>
                        <input
                            type="text"
                            value={form.direccion}
                            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Dirección"
                        />
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-3 sm:col-span-2 lg:col-span-12">
                        {form.id && (
                            <button
                                type="button"
                                onClick={limpiar}
                                className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancelar edición
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={guardando}
                            className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                            {guardando ? 'Guardando...' : (form.id ? 'Guardar cambios' : 'Agregar sucursal')}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cerrar
                        </button>
                    </div>
                </form>
            </div>

            {mostrarAlerta && (
                <AlertaModal
                    tipo={tipoAlerta}
                    mensaje={mensajeAlerta}
                    onClose={handleClose}
                    onConfirm={handleConfirm}
                />
            )}
        </div>
    );
}
