import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import clienteAxios from '../config/axios';
import AlertaModal from '../components/AlertaModal';
import FiltrosBar from '../components/FiltrosBar';
import NoExistenDatos from '../components/NoExistenDatos';
import Spinner from '../components/Spinner';
import { formatearGuarani } from '../helpers/HelpersNumeros';

const FILTROS = [
    {
        key: 'search',
        label: 'Buscar alumno',
        type: 'text',
        placeholder: 'Nombre o documento...',
    },
];

const FILTROS_INICIALES = { search: '' };

const TIPOS_MOVIMIENTO = {
    compra: 'Compra',
    pago: 'Pago',
    recarga: 'Recarga',
    ajuste: 'Ajuste',
    devolucion: 'Devolución',
};

const PAGO_INICIAL = {
    tipo: 'pago',
    direccion: 'abono',
    monto: '',
    id_forma_pago: '',
    descripcion: '',
};

const formatearFechaHora = (valor) => {
    if (!valor) return '—';
    return String(valor).replace('T', ' ').slice(0, 16);
};

export default function CuentasAlumnos() {
    const token = localStorage.getItem('AUTH_TOKEN');
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    const [alumnos, setAlumnos] = useState([]);
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);
    const [filtros, setFiltros] = useState(FILTROS_INICIALES);

    const [formasPago, setFormasPago] = useState([]);
    const [detalle, setDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [alumnoMovimiento, setAlumnoMovimiento] = useState(null);
    const [formPago, setFormPago] = useState(PAGO_INICIAL);
    const [guardando, setGuardando] = useState(false);

    const [alerta, setAlerta] = useState(null);

    const cargarAlumnos = useCallback(async (page = 1, filtrosAplicados = filtros) => {
        try {
            const params = new URLSearchParams({ page: String(page) });
            if (filtrosAplicados.search) params.append('search', filtrosAplicados.search);

            const { data } = await clienteAxios.get(`api/cuentas_alumnos?${params.toString()}`, { headers });
            setAlumnos(data.data || []);
            setTotalPaginas(data.last_page || 1);
            setTotalRegistros(data.total || 0);
            setPaginaActual(data.current_page || 1);
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudieron cargar las cuentas.');
        }
    }, [headers, filtros]);

    useEffect(() => {
        cargarAlumnos(paginaActual, filtros);
    }, [paginaActual, filtros, cargarAlumnos]);

    useEffect(() => {
        clienteAxios.get('api/forma_pago', { headers })
            .then(({ data }) => setFormasPago(Array.isArray(data) ? data : (data?.data ?? [])))
            .catch(() => setFormasPago([]));
    }, [headers]);

    const abrirDetalle = async (alumno) => {
        setCargandoDetalle(true);
        setDetalle(null);
        try {
            const { data } = await clienteAxios.get(`api/cuentas_alumnos/${alumno.id}/movimientos`, { headers });
            setDetalle(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo cargar la cuenta.');
        } finally {
            setCargandoDetalle(false);
        }
    };

    const recargarDetalle = async () => {
        if (!detalle?.persona?.id) return;
        await abrirDetalle(detalle.persona);
        await cargarAlumnos(paginaActual, filtros);
    };

    const abrirMovimiento = (alumno) => {
        setAlumnoMovimiento(alumno);
        setFormPago(PAGO_INICIAL);
    };

    const guardarMovimiento = async (event) => {
        event.preventDefault();

        if (!alumnoMovimiento) return;

        const monto = Number(formPago.monto);
        if (!monto || monto <= 0) {
            toast.warning('Ingresá un monto mayor a cero.');
            return;
        }

        setGuardando(true);
        try {
            await clienteAxios.post('api/cuentas_alumnos/movimientos', {
                id_persona: alumnoMovimiento.id,
                tipo: formPago.tipo,
                direccion: formPago.tipo === 'ajuste' ? formPago.direccion : undefined,
                monto,
                id_forma_pago: formPago.id_forma_pago || null,
                descripcion: formPago.descripcion || null,
            }, { headers });

            toast.success('Movimiento registrado.');
            setAlumnoMovimiento(null);
            setFormPago(PAGO_INICIAL);
            await cargarAlumnos(paginaActual, filtros);
            if (detalle?.persona?.id === alumnoMovimiento.id) {
                await abrirDetalle(alumnoMovimiento);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo registrar el movimiento.');
        } finally {
            setGuardando(false);
        }
    };

    const solicitarConfirmar = (movimiento) => {
        setAlerta({
            tipo: 'confirmacion',
            mensaje: `¿Confirmar el pago de Gs. ${formatearGuarani(movimiento.monto)}?`,
            accion: 'confirmar',
            movimiento,
        });
    };

    const solicitarAnular = (movimiento) => {
        setAlerta({
            tipo: 'confirmacion',
            mensaje: `¿Anular este movimiento de Gs. ${formatearGuarani(movimiento.monto)}?`,
            accion: 'anular',
            movimiento,
        });
    };

    const confirmarAccion = async () => {
        if (!alerta?.movimiento) return;

        const endpoint = alerta.accion === 'confirmar'
            ? `api/cuentas_alumnos/movimientos/${alerta.movimiento.id}/confirmar`
            : `api/cuentas_alumnos/movimientos/${alerta.movimiento.id}/anular`;

        try {
            const { data } = await clienteAxios.post(endpoint, {}, { headers });
            toast.success(data?.message || 'Operación realizada.');
            setAlerta(null);
            await recargarDetalle();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo completar la operación.');
            setAlerta(null);
        }
    };

    return (
        <div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">
                        <FiltrosBar
                            title="Cuentas de alumnos"
                            filterDefinitions={FILTROS}
                            initialValues={FILTROS_INICIALES}
                            onApply={(nuevos) => {
                                setFiltros(nuevos);
                                setPaginaActual(1);
                            }}
                        />

                        <div className="card-body">
                            <div className="overflow-x-auto">
                                <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="g360-gradient rounded text-center font-bold">
                                            <th>Alumno</th>
                                            <th>Documento</th>
                                            <th>Deuda</th>
                                            <th>Saldo a favor</th>
                                            <th>Comprado</th>
                                            <th>Pagado</th>
                                            <th>Pendientes</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {alumnos.length === 0 ? (
                                            <NoExistenDatos colSpan={8} mensaje="No existen cuentas de alumnos." />
                                        ) : (
                                            alumnos.map((alumno) => (
                                                <tr key={alumno.id}>
                                                    <td>{alumno.nombre}</td>
                                                    <td>{alumno.documento || '—'}</td>
                                                    <td className={`text-right font-semibold ${Number(alumno.deuda) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                                        Gs. {formatearGuarani(alumno.deuda)}
                                                    </td>
                                                    <td className="text-right font-semibold text-emerald-600">
                                                        Gs. {formatearGuarani(alumno.saldo_favor)}
                                                    </td>
                                                    <td className="text-right">Gs. {formatearGuarani(alumno.total_comprado)}</td>
                                                    <td className="text-right">Gs. {formatearGuarani(alumno.total_pagado)}</td>
                                                    <td className="text-right text-amber-700">Gs. {formatearGuarani(alumno.pagos_pendientes)}</td>
                                                    <td>
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => abrirDetalle(alumno)}
                                                                className="rounded p-1 text-blue-600 hover:bg-blue-50"
                                                                title="Ver movimientos"
                                                            >
                                                                <i className="fas fa-list-ul" aria-hidden="true" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => abrirMovimiento(alumno)}
                                                                className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                                                                title="Registrar pago o recarga"
                                                            >
                                                                <i className="fas fa-money-bill-wave" aria-hidden="true" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-3 flex flex-col items-center justify-between gap-2 sm:flex-row">
                                <span className="text-sm font-semibold text-slate-700">
                                    Total de registros: {totalRegistros}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                                        disabled={paginaActual === 1}
                                        className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                                    >
                                        Anterior
                                    </button>
                                    <span className="text-sm font-medium">Página {paginaActual} de {totalPaginas}</span>
                                    <button
                                        type="button"
                                        onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                                        disabled={paginaActual === totalPaginas}
                                        className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {(detalle || cargandoDetalle) && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4">
                    <div className="my-8 w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    {detalle?.persona?.nombre || 'Cargando cuenta...'}
                                </h3>
                                {detalle?.resumen && (
                                    <p className="text-xs text-slate-500">
                                        Saldo: Gs. {formatearGuarani(detalle.resumen.saldo)} ·
                                        Deuda: Gs. {formatearGuarani(detalle.resumen.deuda)} ·
                                        A favor: Gs. {formatearGuarani(detalle.resumen.saldo_favor)}
                                    </p>
                                )}
                            </div>
                            <button type="button" onClick={() => setDetalle(null)} className="text-2xl text-slate-400 hover:text-slate-700">×</button>
                        </div>

                        <div className="max-h-[65vh] overflow-y-auto p-5">
                            {cargandoDetalle ? (
                                <div className="flex justify-center py-10"><Spinner /></div>
                            ) : (
                                <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="g360-gradient text-center font-bold">
                                            <th>Fecha y hora</th>
                                            <th>Tipo</th>
                                            <th>Detalle</th>
                                            <th>Monto</th>
                                            <th>Estado</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(detalle?.movimientos?.data ?? []).length === 0 ? (
                                            <NoExistenDatos colSpan={6} mensaje="Sin movimientos." />
                                        ) : (
                                            detalle.movimientos.data.map((m) => (
                                                <tr key={m.id}>
                                                    <td className="whitespace-nowrap">{formatearFechaHora(m.fecha_hora)}</td>
                                                    <td>{TIPOS_MOVIMIENTO[m.tipo] || m.tipo}</td>
                                                    <td className="text-xs">
                                                        {m.descripcion || '—'}
                                                        {m.forma_pago?.nombre ? ` · ${m.forma_pago.nombre}` : ''}
                                                        {m.pagador?.nombre ? ` · Pagó ${m.pagador.nombre}` : ''}
                                                    </td>
                                                    <td className={`whitespace-nowrap text-right font-bold ${m.direccion === 'abono' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {m.direccion === 'abono' ? '+' : '−'} Gs. {formatearGuarani(m.monto)}
                                                    </td>
                                                    <td className="text-center">{m.estado}</td>
                                                    <td>
                                                        <div className="flex justify-center gap-2">
                                                            {m.estado === 'pendiente' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => solicitarConfirmar(m)}
                                                                    className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                                                                    title="Confirmar pago"
                                                                >
                                                                    <i className="fas fa-check" aria-hidden="true" />
                                                                </button>
                                                            )}
                                                            {m.tipo !== 'compra' && m.estado !== 'anulado' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => solicitarAnular(m)}
                                                                    className="rounded p-1 text-rose-600 hover:bg-rose-50"
                                                                    title="Anular movimiento"
                                                                >
                                                                    <i className="fas fa-ban" aria-hidden="true" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {alumnoMovimiento && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
                    <form onSubmit={guardarMovimiento} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">
                                Registrar movimiento · {alumnoMovimiento.nombre}
                            </h3>
                            <button type="button" onClick={() => setAlumnoMovimiento(null)} className="text-2xl text-slate-400 hover:text-slate-700">×</button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-600">Tipo</span>
                                <select
                                    value={formPago.tipo}
                                    onChange={(e) => setFormPago({ ...formPago, tipo: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                                >
                                    <option value="pago">Pago</option>
                                    <option value="recarga">Recarga de saldo</option>
                                    <option value="devolucion">Devolución</option>
                                    <option value="ajuste">Ajuste</option>
                                </select>
                            </label>

                            {formPago.tipo === 'ajuste' && (
                                <label className="block">
                                    <span className="mb-1 block text-xs font-semibold text-slate-600">Dirección</span>
                                    <select
                                        value={formPago.direccion}
                                        onChange={(e) => setFormPago({ ...formPago, direccion: e.target.value })}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                                    >
                                        <option value="abono">A favor del alumno (abono)</option>
                                        <option value="cargo">Cargo (aumenta deuda)</option>
                                    </select>
                                </label>
                            )}

                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-600">Monto</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={formPago.monto}
                                    onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                    required
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-xs font-semibold text-slate-600">Forma de pago</span>
                                <select
                                    value={formPago.id_forma_pago}
                                    onChange={(e) => setFormPago({ ...formPago, id_forma_pago: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                                >
                                    <option value="">Seleccionar...</option>
                                    {formasPago.map((fp) => (
                                        <option key={fp.id} value={fp.id}>{fp.nombre}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="block sm:col-span-2">
                                <span className="mb-1 block text-xs font-semibold text-slate-600">Descripción</span>
                                <input
                                    type="text"
                                    value={formPago.descripcion}
                                    onChange={(e) => setFormPago({ ...formPago, descripcion: e.target.value })}
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                                    placeholder="Opcional"
                                />
                            </label>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setAlumnoMovimiento(null)}
                                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={guardando}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                            >
                                {guardando ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {alerta && (
                <AlertaModal
                    tipo={alerta.tipo}
                    mensaje={alerta.mensaje}
                    onClose={() => setAlerta(null)}
                    onConfirm={confirmarAccion}
                />
            )}
        </div>
    );
}
