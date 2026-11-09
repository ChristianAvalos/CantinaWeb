import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import clienteAxios from '../config/axios';
import Spinner from '../components/Spinner';
import { formatearGuarani, formatearMiles } from '../helpers/HelpersNumeros';

const TIPOS_MOVIMIENTO = {
    compra: 'Compra',
    pago: 'Pago',
    recarga: 'Recarga',
    ajuste: 'Ajuste',
    devolucion: 'Devolución',
};

const ESTADOS_MOVIMIENTO = {
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
    rechazado: 'Rechazado',
    anulado: 'Anulado',
};

const claseEstado = (estado) => {
    if (estado === 'pendiente') return 'bg-amber-100 text-amber-800';
    if (estado === 'confirmado') return 'bg-emerald-100 text-emerald-800';
    if (estado === 'anulado' || estado === 'rechazado') return 'bg-slate-200 text-slate-600';
    return 'bg-slate-100 text-slate-700';
};

const PAGO_INICIAL = { monto: '', id_forma_pago: '', referencia: '', descripcion: '' };

export default function PortalFamilia() {
    const token = localStorage.getItem('AUTH_TOKEN');
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    const [alumnos, setAlumnos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [seleccionado, setSeleccionado] = useState(null);
    const [detalle, setDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [tab, setTab] = useState('compras');
    const [formPago, setFormPago] = useState(PAGO_INICIAL);
    const [enviandoPago, setEnviandoPago] = useState(false);

    const cargarResumen = useCallback(async () => {
        setCargando(true);
        try {
            const { data } = await clienteAxios.get('api/portal/resumen', { headers });
            const lista = data?.alumnos ?? [];
            setAlumnos(lista);
            setSeleccionado((prev) => (
                prev && lista.some((a) => a.id === prev) ? prev : (lista[0]?.id ?? null)
            ));
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudieron cargar tus cuentas.');
        } finally {
            setCargando(false);
        }
    }, [headers]);

    const cargarDetalle = useCallback(async (id) => {
        if (!id) {
            setDetalle(null);
            return;
        }

        setCargandoDetalle(true);
        try {
            const { data } = await clienteAxios.get(`api/portal/alumnos/${id}`, { headers });
            setDetalle(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo cargar el detalle.');
            setDetalle(null);
        } finally {
            setCargandoDetalle(false);
        }
    }, [headers]);

    useEffect(() => {
        cargarResumen();
    }, [cargarResumen]);

    useEffect(() => {
        cargarDetalle(seleccionado);
    }, [seleccionado, cargarDetalle]);

    const informarPago = async (event) => {
        event.preventDefault();
        const monto = Number(formPago.monto);

        if (!monto || monto <= 0) {
            toast.warning('Ingresá un monto mayor a cero.');
            return;
        }

        setEnviandoPago(true);
        try {
            const { data } = await clienteAxios.post(
                `api/portal/alumnos/${seleccionado}/pagos`,
                {
                    monto,
                    id_forma_pago: formPago.id_forma_pago || null,
                    referencia: formPago.referencia || null,
                    descripcion: formPago.descripcion || null,
                },
                { headers }
            );
            toast.success(data?.message || 'Pago informado.');
            setFormPago(PAGO_INICIAL);
            await Promise.all([cargarDetalle(seleccionado), cargarResumen()]);
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo informar el pago.');
        } finally {
            setEnviandoPago(false);
        }
    };

    if (cargando) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (alumnos.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <i className="fas fa-user-group mb-3 text-3xl text-slate-300" aria-hidden="true" />
                <h2 className="text-lg font-bold text-slate-800">Sin alumnos vinculados</h2>
                <p className="mt-2 text-sm text-slate-500">
                    La institución todavía no asoció ninguna cuenta a tu usuario. Contactá a la cantina.
                </p>
            </div>
        );
    }

    const alumno = detalle?.alumno;
    const resumen = detalle?.resumen;
    const permisos = alumno?.permisos ?? {};

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">Mis cuentas</h2>
                    <p className="text-sm text-slate-500">Compras, pagos y saldo de cada alumno.</p>
                </div>
            </div>

            {alumnos.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {alumnos.map((a) => (
                        <button
                            key={a.id}
                            type="button"
                            onClick={() => setSeleccionado(a.id)}
                            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                                seleccionado === a.id
                                    ? 'border-blue-600 bg-blue-600 text-white shadow'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                            }`}
                        >
                            {a.nombre}
                        </button>
                    ))}
                </div>
            )}

            {cargandoDetalle ? (
                <div className="flex min-h-[30vh] items-center justify-center"><Spinner /></div>
            ) : !alumno ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                    No se pudo cargar la cuenta.
                </div>
            ) : (
                <>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{alumno.nombre}</h3>
                                <p className="text-xs text-slate-500">
                                    {alumno.documento || 'Sin documento'} · {alumno.parentesco}
                                </p>
                            </div>
                            {permisos.puede_ver_saldo && resumen && (
                                <div className="text-right">
                                    <p className="text-xs uppercase tracking-wide text-slate-400">
                                        {resumen.deuda > 0 ? 'Deuda pendiente' : 'Saldo a favor'}
                                    </p>
                                    <p className={`text-2xl font-extrabold ${resumen.deuda > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        Gs. {formatearGuarani(resumen.deuda > 0 ? resumen.deuda : resumen.saldo_favor)}
                                    </p>
                                </div>
                            )}
                        </div>

                        {permisos.puede_ver_saldo && resumen && (
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-400">Total comprado</p>
                                    <p className="text-sm font-bold text-slate-800">Gs. {formatearGuarani(resumen.total_comprado)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-400">Total pagado</p>
                                    <p className="text-sm font-bold text-slate-800">Gs. {formatearGuarani(resumen.total_pagado)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-400">Pagos pendientes</p>
                                    <p className="text-sm font-bold text-amber-700">Gs. {formatearGuarani(resumen.pagos_pendientes)}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 p-3">
                                    <p className="text-[0.7rem] uppercase tracking-wide text-slate-400">Saldo actual</p>
                                    <p className="text-sm font-bold text-slate-800">Gs. {formatearGuarani(resumen.saldo)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex border-b border-slate-200">
                            {[
                                { key: 'compras', label: 'Compras' },
                                { key: 'movimientos', label: 'Pagos y movimientos' },
                            ].map((opcion) => (
                                <button
                                    key={opcion.key}
                                    type="button"
                                    onClick={() => setTab(opcion.key)}
                                    className={`px-5 py-3 text-sm font-semibold transition ${
                                        tab === opcion.key
                                            ? 'border-b-2 border-blue-600 text-blue-700'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    {opcion.label}
                                </button>
                            ))}
                        </div>

                        <div className="overflow-x-auto p-4">
                            {tab === 'compras' ? (
                                !permisos.puede_ver_compras ? (
                                    <p className="text-sm text-slate-500">No tenés permiso para ver las compras.</p>
                                ) : detalle.compras.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-slate-500">Todavía no hay compras registradas.</p>
                                ) : (
                                    <table className="table table-bordered table-striped w-full">
                                        <thead>
                                            <tr className="g360-gradient text-center font-bold">
                                                <th>Fecha y hora</th>
                                                <th>Sucursal</th>
                                                <th>Detalle</th>
                                                <th>Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detalle.compras.map((compra) => (
                                                <tr key={compra.id}>
                                                    <td className="whitespace-nowrap">{compra.fecha_hora || compra.fecha}</td>
                                                    <td>{compra.sucursal || '—'}</td>
                                                    <td>
                                                        <div className="text-xs text-slate-600">
                                                            {(compra.detalles || []).map((d, i) => (
                                                                <div key={`${compra.id}-${i}`}>
                                                                    {d.cantidad} × {d.producto || 'Producto'} — Gs. {formatearGuarani(d.subtotal)}
                                                                </div>
                                                            ))}
                                                            {(!compra.detalles || compra.detalles.length === 0) && '—'}
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap text-right font-semibold">Gs. {formatearGuarani(compra.monto)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            ) : (
                                !permisos.puede_ver_saldo ? (
                                    <p className="text-sm text-slate-500">No tenés permiso para ver el saldo.</p>
                                ) : detalle.movimientos.length === 0 ? (
                                    <p className="py-6 text-center text-sm text-slate-500">Todavía no hay movimientos.</p>
                                ) : (
                                    <table className="table table-bordered table-striped w-full">
                                        <thead>
                                            <tr className="g360-gradient text-center font-bold">
                                                <th>Fecha y hora</th>
                                                <th>Tipo</th>
                                                <th>Detalle</th>
                                                <th>Monto</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detalle.movimientos.map((m) => (
                                                <tr key={m.id}>
                                                    <td className="whitespace-nowrap">{m.fecha_hora}</td>
                                                    <td>{TIPOS_MOVIMIENTO[m.tipo] || m.tipo}</td>
                                                    <td>
                                                        <div className="text-xs text-slate-600">
                                                            {m.descripcion || '—'}
                                                            {m.forma_pago ? ` · ${m.forma_pago}` : ''}
                                                            {m.pagador ? ` · Pagó ${m.pagador}` : ''}
                                                        </div>
                                                    </td>
                                                    <td className={`whitespace-nowrap text-right font-bold ${m.direccion === 'abono' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {m.direccion === 'abono' ? '+' : '−'} Gs. {formatearGuarani(m.monto)}
                                                    </td>
                                                    <td className="text-center">
                                                        <span className={`rounded-full px-2 py-1 text-[0.7rem] font-bold ${claseEstado(m.estado)}`}>
                                                            {ESTADOS_MOVIMIENTO[m.estado] || m.estado}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            )}
                        </div>
                    </div>

                    {permisos.puede_pagar && (
                        <form onSubmit={informarPago} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="text-base font-bold text-slate-800">Informar un pago</h3>
                            <p className="mt-1 text-xs text-slate-500">
                                El pago queda pendiente hasta que la cantina lo confirme.
                            </p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <label className="block">
                                    <span className="mb-1 block text-xs font-semibold text-slate-600">Monto</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formatearMiles(formPago.monto)}
                                        onChange={(e) => setFormPago({
                                            ...formPago,
                                            monto: e.target.value.replace(/\D/g, ''),
                                        })}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        placeholder="0"
                                        required
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-xs font-semibold text-slate-600">Forma de pago</span>
                                    <select
                                        value={formPago.id_forma_pago}
                                        onChange={(e) => setFormPago({ ...formPago, id_forma_pago: e.target.value })}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {(detalle.formas_pago || []).map((fp) => (
                                            <option key={fp.id} value={fp.id}>{fp.nombre}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-xs font-semibold text-slate-600">Referencia</span>
                                    <input
                                        type="text"
                                        value={formPago.referencia}
                                        onChange={(e) => setFormPago({ ...formPago, referencia: e.target.value })}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        placeholder="N° de transferencia (opcional)"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-xs font-semibold text-slate-600">Descripción</span>
                                    <input
                                        type="text"
                                        value={formPago.descripcion}
                                        onChange={(e) => setFormPago({ ...formPago, descripcion: e.target.value })}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        placeholder="Opcional"
                                    />
                                </label>
                            </div>
                            <button
                                type="submit"
                                disabled={enviandoPago}
                                className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {enviandoPago ? 'Enviando...' : 'Informar pago'}
                            </button>
                        </form>
                    )}
                </>
            )}
        </div>
    );
}
