import { useCallback, useEffect, useState } from 'react';
import clienteAxios from '../config/axios';
import { toast } from 'react-toastify';
import NoExistenDatos from '../components/NoExistenDatos';
import ModalDatosFacturacion from './ModalDatosFacturacion';
import useAuthPermisos from '../hooks/useAuthPermisos';
import { useAuth } from '../hooks/useAuth';

/**
 * Datos para facturación.
 *
 * Se versionan: cada organización tiene un registro activo (con el que se
 * emiten los comprobantes) y los anteriores quedan como histórico, para poder
 * explicar las facturas ya emitidas.
 */
export default function DatosFacturacion() {
    const token = localStorage.getItem('AUTH_TOKEN');
    const [registros, setRegistros] = useState([]);
    const [activo, setActivo] = useState(null);
    const [cargando, setCargando] = useState(true);

    const [mostrarModal, setMostrarModal] = useState(false);
    const [registroSeleccionado, setRegistroSeleccionado] = useState(null);

    // El Administrador de Sistema elige a qué organización pertenece el timbrado.
    // El resto queda fijo en la suya.
    const { isAdmin } = useAuthPermisos();
    const { user } = useAuth({ middleware: 'auth' });
    const [organizaciones, setOrganizaciones] = useState([]);
    const [organizacionSeleccionada, setOrganizacionSeleccionada] = useState('');

    const fetchDatos = useCallback(async () => {
        setCargando(true);
        try {
            const { data } = await clienteAxios.get('api/datos_facturacion', {
                params: organizacionSeleccionada ? { id_organizacion: organizacionSeleccionada } : {},
                headers: { Authorization: `Bearer ${token}` },
            });
            setRegistros(Array.isArray(data?.data) ? data.data : []);
            setActivo(data?.activo ?? null);
        } catch (error) {
            console.error('Error al cargar los datos de facturación:', error);
            toast.error(error.response?.data?.message || 'No se pudieron cargar los datos de facturación.');
        } finally {
            setCargando(false);
        }
    }, [token, organizacionSeleccionada]);

    useEffect(() => { fetchDatos(); }, [fetchDatos]);

    // Organizaciones disponibles (solo para el Administrador de Sistema).
    useEffect(() => {
        if (!isAdmin) {
            return;
        }

        clienteAxios.get('api/organizacion?all=true', { headers: { Authorization: `Bearer ${token}` } })
            .then(({ data }) => {
                const lista = Array.isArray(data) ? data : [];
                setOrganizaciones(lista);
                const propia = lista.find((o) => String(o.id) === String(user?.id_organizacion));
                setOrganizacionSeleccionada((prev) => prev || (lista.length > 0 ? String(propia?.id ?? lista[0].id) : ''));
            })
            .catch(() => setOrganizaciones([]));
    }, [isAdmin, token, user?.id_organizacion]);

    const abrirNuevo = () => {
        setRegistroSeleccionado(null);
        setMostrarModal(true);
    };

    const abrirEditar = (registro) => {
        setRegistroSeleccionado(registro);
        setMostrarModal(true);
    };

    const activar = async (registro) => {
        try {
            await clienteAxios.post(`api/datos_facturacion/${registro.id}/activar`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast.success('Datos de facturación activados.');
            fetchDatos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo activar.');
        }
    };

    const vigencia = (registro) => {
        if (!registro.TimbradoInicio && !registro.TimbradoVencimiento) {
            return 'Sin vigencia declarada';
        }
        const desde = registro.TimbradoInicio || '—';
        const hasta = registro.TimbradoVencimiento || '—';
        return `${desde} al ${hasta}`;
    };

    return (
        <div>
            <section className="content">
                <div className="container-fluid">
                    <div className="rounded-3xl border border-slate-200 bg-white shadow-md">
                        <div className="flex flex-col gap-3 rounded-t-3xl g360-gradient px-4 py-4 text-white md:flex-row md:items-center md:justify-between md:px-6">
                            <div>
                                <h1 className="text-2xl font-extrabold tracking-tight">Datos para facturación</h1>
                                <p className="text-sm text-white/80">
                                    Timbrado, RUC del emisor y numeración de comprobantes.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {isAdmin && (
                                    <label className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm">
                                        <span className="font-semibold">Organización</span>
                                        <select
                                            value={organizacionSeleccionada}
                                            onChange={(e) => setOrganizacionSeleccionada(e.target.value)}
                                            className="rounded-lg border border-white/30 bg-white px-2 py-1.5 font-semibold text-slate-700 outline-none"
                                        >
                                            {organizaciones.map((organizacion) => (
                                                <option key={organizacion.id} value={organizacion.id}>
                                                    {organizacion.RazonSocial}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                                <button
                                    type="button"
                                    onClick={abrirNuevo}
                                    disabled={isAdmin && !organizacionSeleccionada}
                                    className="rounded-2xl bg-white/15 px-4 py-2.5 font-bold text-white transition hover:bg-white/25 disabled:opacity-50"
                                >
                                    Nuevo timbrado
                                </button>
                            </div>
                        </div>

                        {!cargando && !activo && (
                            <div className="mx-4 mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 md:mx-6">
                                <i className="fas fa-triangle-exclamation mr-2" aria-hidden="true" />
                                No hay datos de facturación activos. Sin timbrado vigente no se puede emitir Factura.
                            </div>
                        )}

                        {!cargando && activo && !activo.timbrado_vigente && (
                            <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:mx-6">
                                <i className="fas fa-circle-exclamation mr-2" aria-hidden="true" />
                                El timbrado activo no está vigente. Cargá uno nuevo para poder facturar.
                            </div>
                        )}

                        <div className="overflow-x-auto p-4 md:p-6">
                            <table className="table table-bordered table-striped w-full">
                                <thead>
                                    <tr className="font-bold g360-gradient rounded text-center">
                                        <th>Estado</th>
                                        <th>RUC</th>
                                        <th>Razón social</th>
                                        <th>Timbrado</th>
                                        <th>Vigencia</th>
                                        <th>Ambiente</th>
                                        <th>Emisor</th>
                                        <th>Secuencias</th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cargando ? (
                                        <tr>
                                            <td colSpan={9} className="py-6 text-center text-sm text-slate-500">Cargando…</td>
                                        </tr>
                                    ) : registros.length === 0 ? (
                                        <NoExistenDatos colSpan={9} mensaje="No hay datos de facturación cargados." />
                                    ) : (
                                        registros.map((registro) => (
                                            <tr key={registro.id}>
                                                <td className="text-center">
                                                    {registro.activo ? (
                                                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-200">Activo</span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">Histórico</span>
                                                    )}
                                                </td>
                                                <td className="text-center tabular-nums">
                                                    {registro.RUC || (
                                                        <span className="text-slate-400" title="Se usa el de la organización">
                                                            {registro.efectivo?.RUC || '—'} <em className="text-xs">(org.)</em>
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {registro.RazonSocial || (
                                                        <span className="text-slate-400" title="Se usa la de la organización">
                                                            {registro.efectivo?.RazonSocial || '—'} <em className="text-xs">(org.)</em>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-center tabular-nums">{registro.Timbrado}</td>
                                                <td className="text-center">
                                                    <div className="text-sm">{vigencia(registro)}</div>
                                                    {!registro.timbrado_vigente && (
                                                        <span className="text-xs font-semibold text-red-600">Vencido</span>
                                                    )}
                                                </td>
                                                <td className="text-center capitalize">{registro.Ambiente}</td>
                                                <td className="text-center">
                                                    {registro.Emisor === 'sifen' ? 'Electrónico' : 'Impreso'}
                                                </td>
                                                <td>
                                                    {registro.secuencias?.length ? (
                                                        <ul className="space-y-0.5 text-sm">
                                                            {registro.secuencias.map((s) => (
                                                                <li key={s.id}>
                                                                    <span className="font-semibold tabular-nums">{s.proximo_numero}</span>
                                                                    {' '}
                                                                    <span className="text-slate-500">
                                                                        {s.sucursal || `Sucursal #${s.id_sucursal}`} · {s.tipo_comprobante}
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">Sin emitir</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => abrirEditar(registro)}
                                                            title="Editar"
                                                            className="rounded p-1 hover:bg-gray-200 focus:outline-none"
                                                        >
                                                            <i className="fas fa-pen-to-square text-blue-600" role="img" aria-label="Editar" title="Editar" />
                                                        </button>
                                                        {!registro.activo && (
                                                            <button
                                                                type="button"
                                                                onClick={() => activar(registro)}
                                                                title="Activar"
                                                                className="rounded p-1 hover:bg-green-100 focus:outline-none"
                                                            >
                                                                <i className="fas fa-circle-check text-green-600" role="img" aria-label="Activar" title="Activar" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {mostrarModal && (
                <ModalDatosFacturacion
                    registro={registroSeleccionado}
                    idOrganizacion={organizacionSeleccionada}
                    onClose={() => setMostrarModal(false)}
                    refrescar={fetchDatos}
                />
            )}
        </div>
    );
}
