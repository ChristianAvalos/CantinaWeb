import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import PropTypes from 'prop-types';
import clienteAxios from '../config/axios';
import AlertaModal from './AlertaModal';

const VINCULO_INICIAL = {
    tutorSeleccionado: null,
    parentesco: '',
    puede_ver_compras: true,
    puede_ver_saldo: true,
    puede_pagar: true,
};

const ACCESO_INICIAL = {
    idPersona: null,
    nameUser: '',
    email: '',
};

/**
 * Gestión de tutores de un alumno y de sus accesos al portal.
 *
 * Los permisos se guardan por vínculo: un mismo tutor puede ver las compras de
 * un hijo y no las de otro.
 */
export default function ModalVinculos({ alumno, onClose }) {
    const token = localStorage.getItem('AUTH_TOKEN');
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    const [vinculos, setVinculos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [buscarTutor, setBuscarTutor] = useState('');
    const [resultados, setResultados] = useState([]);
    const [buscando, setBuscando] = useState(false);
    const [nuevo, setNuevo] = useState(VINCULO_INICIAL);
    const [guardando, setGuardando] = useState(false);

    const [accesos, setAccesos] = useState({});
    const [formAcceso, setFormAcceso] = useState(ACCESO_INICIAL);
    const [creandoAcceso, setCreandoAcceso] = useState(false);
    const [cuentaEditando, setCuentaEditando] = useState(null);
    const [guardandoCuenta, setGuardandoCuenta] = useState(false);
    // Confirmaciones con el modal del sistema (no el del navegador).
    const [alerta, setAlerta] = useState(null);

    const confirmar = (mensaje, accion) => setAlerta({ mensaje, accion });

    const ejecutarConfirmacion = async () => {
        const accion = alerta?.accion;
        setAlerta(null);
        if (typeof accion === 'function') {
            await accion();
        }
    };

    const cargarVinculos = useCallback(async () => {
        setCargando(true);
        try {
            const { data } = await clienteAxios.get(
                `api/vinculos?id_alumno=${alumno.id}&all=true`,
                { headers }
            );
            const lista = data?.data ?? [];
            setVinculos(lista);

            const tutores = [...new Set(lista.map((v) => v.id_tutor))];
            const respuestas = await Promise.all(
                tutores.map((idTutor) => clienteAxios
                    .get(`api/portal_accesos?id_persona=${idTutor}`, { headers })
                    .then(({ data: d }) => [idTutor, d?.data ?? []])
                    .catch(() => [idTutor, []]))
            );
            setAccesos(Object.fromEntries(respuestas));
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudieron cargar los tutores.');
        } finally {
            setCargando(false);
        }
    }, [alumno.id, headers]);

    useEffect(() => {
        cargarVinculos();
    }, [cargarVinculos]);

    const buscarPersonas = async (texto) => {
        setBuscarTutor(texto);
        if (texto.trim().length < 2) {
            setResultados([]);
            return;
        }

        setBuscando(true);
        try {
            const { data } = await clienteAxios.get(
                `api/personas?all=true&search=${encodeURIComponent(texto.trim())}`,
                { headers }
            );
            const vinculados = new Set(vinculos.map((v) => v.id_tutor));
            setResultados((data?.data ?? []).filter((p) => {
                const esAlumno = (p?.tipo_persona?.nombre || '').trim().toLowerCase() === 'alumno';
                // Un alumno no puede ser tutor de otro alumno.
                return p.id !== alumno.id && !vinculados.has(p.id) && !esAlumno;
            }));
        } catch {
            setResultados([]);
        } finally {
            setBuscando(false);
        }
    };

    const seleccionarTutor = (persona) => {
        setNuevo((prev) => ({ ...prev, tutorSeleccionado: persona }));
        setBuscarTutor('');
        setResultados([]);
    };

    const agregarVinculo = async (event) => {
        event.preventDefault();

        if (!nuevo.tutorSeleccionado) {
            toast.warning('Seleccioná un tutor.');
            return;
        }

        setGuardando(true);
        try {
            await clienteAxios.post('api/crear_vinculo', {
                id_alumno: alumno.id,
                id_tutor: nuevo.tutorSeleccionado.id,
                parentesco: nuevo.parentesco || null,
                puede_ver_compras: nuevo.puede_ver_compras,
                puede_ver_saldo: nuevo.puede_ver_saldo,
                puede_pagar: nuevo.puede_pagar,
            }, { headers });

            toast.success('Tutor vinculado.');
            setNuevo(VINCULO_INICIAL);
            await cargarVinculos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo vincular al tutor.');
        } finally {
            setGuardando(false);
        }
    };

    const actualizarPermiso = async (vinculo, campo, valor) => {
        try {
            await clienteAxios.put(`api/update_vinculo/${vinculo.id}`, {
                [campo]: valor,
            }, { headers });

            setVinculos((prev) => prev.map((v) => (
                v.id === vinculo.id ? { ...v, [campo]: valor } : v
            )));
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo actualizar el permiso.');
        }
    };

    const revocar = (vinculo) => {
        confirmar(`¿Quitar a ${vinculo.tutor?.nombre} como tutor de este alumno?`, async () => {
            try {
                await clienteAxios.delete(`api/vinculos/${vinculo.id}`, { headers });
                toast.success('Vínculo eliminado.');
                await cargarVinculos();
            } catch (error) {
                toast.error(error.response?.data?.message || 'No se pudo quitar el vínculo.');
            }
        });
    };

    const crearAcceso = async (event) => {
        event.preventDefault();

        if (!formAcceso.idPersona) return;

        setCreandoAcceso(true);
        try {
            const { data } = await clienteAxios.post('api/portal_accesos', {
                id_persona: formAcceso.idPersona,
                nameUser: formAcceso.nameUser,
                email: formAcceso.email,
            }, { headers });

            const mensaje = data?.password_inicial
                ? `Acceso creado. Contraseña inicial: ${data.password_inicial}`
                : 'Acceso creado.';
            toast.success(mensaje, { autoClose: 8000 });
            setFormAcceso(ACCESO_INICIAL);
            await cargarVinculos();
        } catch (error) {
            const errores = error.response?.data?.errors;
            const primerError = errores ? Object.values(errores).flat()[0] : null;
            toast.error(primerError || error.response?.data?.message || 'No se pudo crear el acceso.');
        } finally {
            setCreandoAcceso(false);
        }
    };

    const guardarCuenta = async (event) => {
        event.preventDefault();

        if (!cuentaEditando) return;

        setGuardandoCuenta(true);
        try {
            await clienteAxios.put(`api/portal_accesos/${cuentaEditando.id}`, {
                nameUser: cuentaEditando.nameUser,
                email: cuentaEditando.email,
            }, { headers });

            toast.success('Acceso actualizado.');
            setCuentaEditando(null);
            await cargarVinculos();
        } catch (error) {
            const errores = error.response?.data?.errors;
            const primerError = errores ? Object.values(errores).flat()[0] : null;
            toast.error(primerError || error.response?.data?.message || 'No se pudo actualizar el acceso.');
        } finally {
            setGuardandoCuenta(false);
        }
    };

    const restablecerCuenta = (cuenta) => {
        confirmar(`¿Restablecer la contraseña de "${cuenta.nameUser}" a 123456?`, async () => {
            try {
                const { data } = await clienteAxios.post(
                    `api/portal_accesos/${cuenta.id}/reset-password`,
                    {},
                    { headers }
                );
                toast.success(
                    `${data?.message || 'Contraseña restablecida.'} Contraseña: ${data?.password_inicial || '123456'}`,
                    { autoClose: 8000 }
                );
            } catch (error) {
                toast.error(error.response?.data?.message || 'No se pudo restablecer la contraseña.');
            }
        });
    };

    const cambiarEstadoCuenta = (cuenta) => {
        const nuevoEstado = Number(cuenta.id_tipoestado) === 1 ? 2 : 1;
        const accion = nuevoEstado === 2 ? 'Desactivar' : 'Activar';

        confirmar(`¿${accion} el acceso de "${cuenta.nameUser}"?`, async () => {
            try {
                await clienteAxios.post(
                    `api/portal_accesos/${cuenta.id}/estado`,
                    { id_tipoestado: nuevoEstado },
                    { headers }
                );
                toast.success(`Acceso ${nuevoEstado === 2 ? 'desactivado' : 'activado'}.`);
                await cargarVinculos();
            } catch (error) {
                toast.error(error.response?.data?.message || 'No se pudo cambiar el estado del acceso.');
            }
        });
    };

    return (
        <>
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4">
            <div className="my-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Tutores del alumno</h3>
                        <p className="text-xs text-slate-500">{alumno.nombre}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-700">×</button>
                </div>

                <div className="space-y-5 p-5">
                    <section>
                        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Vinculados</h4>

                        {cargando ? (
                            <p className="py-4 text-center text-sm text-slate-500">Cargando...</p>
                        ) : vinculos.length === 0 ? (
                            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                                Este alumno todavía no tiene tutores vinculados.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {vinculos.map((vinculo) => {
                                    const cuentas = accesos[vinculo.id_tutor] || [];
                                    const cuenta = cuentas[0] || null;
                                    const creando = formAcceso.idPersona === vinculo.id_tutor;
                                    const editando = cuenta && cuentaEditando?.id === cuenta.id;

                                    return (
                                        <div key={vinculo.id} className="rounded-xl border border-slate-200 p-3">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-semibold text-slate-800">{vinculo.tutor?.nombre}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {vinculo.parentesco || 'Sin parentesco'} ·
                                                        {vinculo.tutor?.documento ? ` Doc. ${vinculo.tutor.documento}` : ' Sin documento'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {cuenta ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className={`rounded-full px-2 py-1 text-[0.7rem] font-bold ${Number(cuenta.id_tipoestado) === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                                                Portal: {cuenta.nameUser}
                                                                {Number(cuenta.id_tipoestado) !== 1 ? ' (inactivo)' : ''}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setCuentaEditando({ id: cuenta.id, nameUser: cuenta.nameUser, email: cuenta.email })}
                                                                className="rounded p-1 text-blue-600 hover:bg-blue-50"
                                                                title="Editar usuario y correo"
                                                            >
                                                                <i className="fas fa-pen-to-square" aria-hidden="true" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => restablecerCuenta(cuenta)}
                                                                className="rounded p-1 text-amber-600 hover:bg-amber-50"
                                                                title="Restablecer contraseña a 123456"
                                                            >
                                                                <i className="fas fa-key" aria-hidden="true" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => cambiarEstadoCuenta(cuenta)}
                                                                className="rounded p-1 hover:bg-slate-100"
                                                                title={Number(cuenta.id_tipoestado) === 1 ? 'Desactivar acceso' : 'Activar acceso'}
                                                            >
                                                                <i
                                                                    className={`fas ${Number(cuenta.id_tipoestado) === 1 ? 'fa-toggle-on text-emerald-600' : 'fa-toggle-off text-slate-400'}`}
                                                                    aria-hidden="true"
                                                                />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormAcceso({
                                                                ...ACCESO_INICIAL,
                                                                idPersona: vinculo.id_tutor,
                                                                email: vinculo.tutor?.email || '',
                                                                nameUser: (vinculo.tutor?.documento || '').toString(),
                                                            })}
                                                            className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                                                        >
                                                            Crear acceso
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => revocar(vinculo)}
                                                        className="rounded p-1 text-rose-600 hover:bg-rose-50"
                                                        title="Quitar vínculo"
                                                    >
                                                        <i className="fas fa-user-minus" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
                                                {[
                                                    ['puede_ver_compras', 'Ver compras'],
                                                    ['puede_ver_saldo', 'Ver saldo'],
                                                    ['puede_pagar', 'Informar pagos'],
                                                ].map(([campo, etiqueta]) => (
                                                    <label key={campo} className="flex items-center gap-1.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(vinculo[campo])}
                                                            onChange={(e) => actualizarPermiso(vinculo, campo, e.target.checked)}
                                                        />
                                                        {etiqueta}
                                                    </label>
                                                ))}
                                            </div>

                                            {editando && (
                                                <form onSubmit={guardarCuenta} className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                                                    <label className="block">
                                                        <span className="mb-1 block text-[0.7rem] font-semibold text-slate-600">Usuario</span>
                                                        <input
                                                            type="text"
                                                            value={cuentaEditando.nameUser}
                                                            onChange={(e) => setCuentaEditando({ ...cuentaEditando, nameUser: e.target.value })}
                                                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                                            required
                                                        />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[0.7rem] font-semibold text-slate-600">Correo</span>
                                                        <input
                                                            type="email"
                                                            value={cuentaEditando.email}
                                                            onChange={(e) => setCuentaEditando({ ...cuentaEditando, email: e.target.value })}
                                                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                                            required
                                                        />
                                                    </label>
                                                    <div className="flex items-end gap-2 sm:col-span-2">
                                                        <button
                                                            type="submit"
                                                            disabled={guardandoCuenta}
                                                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                                                        >
                                                            {guardandoCuenta ? 'Guardando...' : 'Guardar cambios'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setCuentaEditando(null)}
                                                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600"
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <span className="ml-auto self-center text-[0.7rem] text-slate-500">
                                                            La contraseña se restablece con el botón de la llave.
                                                        </span>
                                                    </div>
                                                </form>
                                            )}

                                            {creando && (
                                                <form onSubmit={crearAcceso} className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                                                    <label className="block">
                                                        <span className="mb-1 block text-[0.7rem] font-semibold text-slate-600">Usuario</span>
                                                        <input
                                                            type="text"
                                                            value={formAcceso.nameUser}
                                                            onChange={(e) => setFormAcceso({ ...formAcceso, nameUser: e.target.value })}
                                                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                                            required
                                                        />
                                                    </label>
                                                    <label className="block">
                                                        <span className="mb-1 block text-[0.7rem] font-semibold text-slate-600">Correo</span>
                                                        <input
                                                            type="email"
                                                            value={formAcceso.email}
                                                            onChange={(e) => setFormAcceso({ ...formAcceso, email: e.target.value })}
                                                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                                            required
                                                        />
                                                    </label>
                                                    <div className="flex items-end gap-2 sm:col-span-2">
                                                        <button
                                                            type="submit"
                                                            disabled={creandoAcceso}
                                                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                                                        >
                                                            {creandoAcceso ? 'Creando...' : 'Crear acceso'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormAcceso(ACCESO_INICIAL)}
                                                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600"
                                                        >
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </form>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="border-t border-slate-200 pt-4">
                        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Vincular un tutor</h4>

                        <label className="block">
                            <span className="mb-1 block text-xs font-semibold text-slate-600">Buscar persona</span>
                            <input
                                type="text"
                                value={buscarTutor}
                                onChange={(e) => buscarPersonas(e.target.value)}
                                placeholder="Nombre o documento..."
                                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                            />
                        </label>

                        {buscando && <p className="mt-1 text-xs text-slate-500">Buscando...</p>}

                        {resultados.length > 0 && (
                            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200">
                                {resultados.map((persona) => (
                                    <button
                                        key={persona.id}
                                        type="button"
                                        onClick={() => seleccionarTutor(persona)}
                                        className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-blue-50"
                                    >
                                        <span className="font-medium text-slate-700">{persona.nombre}</span>
                                        {persona.documento && <span className="ml-2 text-xs text-slate-400">{persona.documento}</span>}
                                    </button>
                                ))}
                            </div>
                        )}

                        {nuevo.tutorSeleccionado && (
                            <form onSubmit={agregarVinculo} className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
                                <p className="text-sm font-semibold text-slate-700">
                                    Tutor seleccionado: {nuevo.tutorSeleccionado.nombre}
                                </p>

                                <div className="grid gap-2 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-1 block text-xs font-semibold text-slate-600">Parentesco</span>
                                        <input
                                            type="text"
                                            value={nuevo.parentesco}
                                            onChange={(e) => setNuevo({ ...nuevo, parentesco: e.target.value })}
                                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                                            placeholder="Madre, padre, tutor legal..."
                                        />
                                    </label>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                        {[
                                            ['puede_ver_compras', 'Ver compras'],
                                            ['puede_ver_saldo', 'Ver saldo'],
                                            ['puede_pagar', 'Informar pagos'],
                                        ].map(([campo, etiqueta]) => (
                                            <label key={campo} className="flex items-center gap-1.5">
                                                <input
                                                    type="checkbox"
                                                    checked={nuevo[campo]}
                                                    onChange={(e) => setNuevo({ ...nuevo, [campo]: e.target.checked })}
                                                />
                                                {etiqueta}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={guardando}
                                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                                >
                                    {guardando ? 'Vinculando...' : 'Vincular tutor'}
                                </button>
                            </form>
                        )}
                    </section>
                </div>
            </div>
        </div>

        {alerta && (
            <AlertaModal
                tipo="confirmacion"
                mensaje={alerta.mensaje}
                onClose={() => setAlerta(null)}
                onConfirm={ejecutarConfirmacion}
            />
        )}
        </>
    );
}

ModalVinculos.propTypes = {
    alumno: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
        nombre: PropTypes.string,
    }).isRequired,
    onClose: PropTypes.func.isRequired,
};
