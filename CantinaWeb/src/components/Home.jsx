import { Link } from "react-router"
import clienteAxios from "../config/axios";
import { useEffect, useState } from 'react';
import { obtenerContadoresDashboard } from '../helpers/HelpersUsuarios';
import useAuthPermisos from '../hooks/useAuthPermisos';
import ModalUsuarios from '../views/ModalUsuarios';
import ModalRol from '../views/ModalRol';
import ModalTransacciones from '../components/ModalTransaccion';
import ModalCategoria from "../components/ModalCategoria";
import ResumenPanel from "./ResumenPanel";

/**
 * Tarjetas del panel.
 *
 * Cada tarjeta se muestra solo si el backend devuelve su contador (es decir, si
 * corresponde al ámbito del usuario: su organización o, para el Administrador de
 * Sistema, todas) y si además tiene permiso sobre el módulo.
 */
const TARJETAS = [
    { clave: 'cobranzas_pendientes', titulo: 'Cobranzas pendientes', ruta: '/cobranzas', icono: 'fas fa-hand-holding-dollar', acento: 'text-orange-600', chip: 'bg-orange-100 text-orange-700', permiso: 'Cobranzas' },
    { clave: 'pagos_proveedores_pendientes', titulo: 'Pagos a proveedores pendientes', ruta: '/pagos-proveedores', icono: 'fas fa-file-invoice-dollar', acento: 'text-rose-600', chip: 'bg-rose-100 text-rose-700', permiso: 'Pagos_Proveedores' },
    { clave: 'transacciones', titulo: 'Transacciones', ruta: '/transacciones', icono: 'fas fa-chart-column', acento: 'text-emerald-600', chip: 'bg-emerald-100 text-emerald-700', permiso: 'Transacciones', modal: 'transacciones' },
    { clave: 'productos', titulo: 'Productos', ruta: '/productos', icono: 'fas fa-boxes', acento: 'text-blue-600', chip: 'bg-blue-100 text-blue-700', permiso: 'Productos' },
    { clave: 'personas', titulo: 'Clientes / Proveedores', ruta: '/personas', icono: 'fas fa-users', acento: 'text-teal-600', chip: 'bg-teal-100 text-teal-700', permiso: 'Personas' },
    { clave: 'categorias', titulo: 'Categorías', ruta: '/categorias', icono: 'fas fa-list', acento: 'text-sky-600', chip: 'bg-sky-100 text-sky-700', permiso: 'Categorias', modal: 'categoria' },
    { clave: 'precios_venta', titulo: 'Precios de venta', ruta: '/precio-ventas', icono: 'fas fa-tags', acento: 'text-cyan-600', chip: 'bg-cyan-100 text-cyan-700', permiso: 'Precio_Ventas' },
    { clave: 'movimientos', titulo: 'Movimientos de inventario', ruta: '/historial-inventario', icono: 'fas fa-clipboard-list', acento: 'text-slate-600', chip: 'bg-slate-100 text-slate-700', permiso: 'Historial_Inventario' },
    { clave: 'organizaciones', titulo: 'Organizaciones', ruta: '/organizacion', icono: 'fas fa-building', acento: 'text-indigo-600', chip: 'bg-indigo-100 text-indigo-700', permiso: 'Organizacion' },
    { clave: 'usuarios', titulo: 'Usuarios registrados', ruta: '/usuarios', icono: 'fas fa-user-plus', acento: 'text-amber-600', chip: 'bg-amber-100 text-amber-700', permiso: 'Herraminetas_usuarios', modal: 'usuarios' },
    { clave: 'roles', titulo: 'Roles', ruta: '/usuarios/roles', icono: 'fas fa-user-shield', acento: 'text-red-600', chip: 'bg-red-100 text-red-700', permiso: 'Herraminetas_usuarios', modal: 'roles' },
];

export default function Home() {

    const { hasPermission, loading: cargandoPermisos } = useAuthPermisos();

    // Contadores del panel (ya acotados a la organización del usuario)
    const [contadores, setContadores] = useState({});

    // Resumen de dinero del mes seleccionado
    const [resumen, setResumen] = useState(null);

    //modal de usuarios
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    //para los tipos de vistas
    const [isModalVista, setModalVista] = useState('');

    //para la selección del mes
    const [mesSeleccionado, setMesSeleccionado] = useState(() => {
        const hoy = new Date();
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    });

    // Cargar todos los contadores desde el endpoint único
    const cargarContadores = async () => {
        try {
            const data = await obtenerContadoresDashboard();
            setContadores(data || {});
        } catch (error) {
            console.error('Error al cargar los contadores:', error);
        }
    };

    // Resumen de ventas/compras y cuotas pendientes del mes
    const cargarResumen = async (mes = mesSeleccionado) => {
        try {
            const token = localStorage.getItem('AUTH_TOKEN');
            const { data } = await clienteAxios.get('/api/transacciones/grafico', {
                params: { mes },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setResumen(data);
        } catch (error) {
            console.error('Error al cargar el resumen del mes:', error);
        }
    };

    //para abrir el modal
    const openModal = (modo, vista) => {
        setModalVista(vista);
        setModalMode(modo);
        setModalOpen(true);
    };

    //para cerrar el modal
    const closeModal = () => {
        setModalOpen(false);
    };

    // Refresca contadores y resumen después de crear/editar desde un modal
    const refrescar = () => {
        cargarContadores();
        cargarResumen();
    };

    useEffect(() => {
        cargarContadores();
    }, []);

    useEffect(() => {
        cargarResumen(mesSeleccionado);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mesSeleccionado]);

    // Solo se listan las tarjetas que el backend devuelve y que el usuario puede abrir
    const tarjetas = TARJETAS.filter((tarjeta) => contadores[tarjeta.clave] !== undefined
        && (cargandoPermisos || hasPermission(tarjeta.permiso)));

    return (
        <>
            {/* Encabezado */}
            <div className="py-4 px-6 bg-white border-b">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
                    <nav className="text-sm text-gray-500 flex items-center space-x-2">
                        <Link to="/" className="hover:underline">Principal</Link>
                        <span>/</span>
                        <span className="text-gray-700">Panel de control</span>
                    </nav>
                </div>
            </div>

            {/* Contenido principal */}
            <section className="p-6 bg-gray-50 min-h-[calc(100vh-120px)]">
                <div className="max-w-7xl mx-auto">
                    {/* Cajas resumen */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                        {tarjetas.map((tarjeta) => (
                            <div
                                key={tarjeta.clave}
                                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500" title={tarjeta.titulo}>
                                            {tarjeta.titulo}
                                        </p>
                                        <h3 className={`mt-1 text-3xl font-bold tabular-nums ${tarjeta.acento}`}>
                                            {contadores[tarjeta.clave]}
                                        </h3>
                                    </div>
                                    {tarjeta.modal ? (
                                        <button
                                            type="button"
                                            onClick={() => openModal('crear', tarjeta.modal)}
                                            title={`Nuevo: ${tarjeta.titulo}`}
                                            aria-label={`Nuevo: ${tarjeta.titulo}`}
                                            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-slate-300 ${tarjeta.chip}`}
                                        >
                                            <i className={tarjeta.icono} />
                                        </button>
                                    ) : (
                                        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${tarjeta.chip}`}>
                                            <i className={tarjeta.icono} />
                                        </span>
                                    )}
                                </div>
                                <div className="mt-4 border-t border-slate-100 pt-3">
                                    <Link to={tarjeta.ruta} className={`inline-flex items-center gap-1.5 text-sm font-semibold hover:underline ${tarjeta.acento}`}>
                                        Más información
                                        <i className="fas fa-arrow-right text-[10px]" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Resumen del mes y comparativa de los últimos 6 meses */}
                    <div className="mt-8">
                        <ResumenPanel
                            resumen={resumen}
                            mesSeleccionado={mesSeleccionado}
                            handleMesChange={setMesSeleccionado}
                        />
                    </div>
                </div>
            </section>

            {/* Modales */}
            {isModalOpen && isModalVista === 'usuarios' && (
                <ModalUsuarios
                    refrescarUsuarios={refrescar}
                    modo={modalMode}
                    onClose={closeModal}
                />
            )}
            {isModalOpen && isModalVista === 'roles' && (
                <ModalRol
                    refrescarRoles={refrescar}
                    modo={modalMode}
                    onClose={closeModal}
                />
            )}
            {isModalOpen && isModalVista === 'transacciones' && (
                <ModalTransacciones
                    refrescarTransacciones={refrescar}
                    refrescarGastos={cargarResumen}
                    modo={modalMode}
                    onClose={closeModal}
                />
            )}
            {isModalOpen && isModalVista === 'categoria' && (
                <ModalCategoria
                    refrescarCategorias={refrescar}
                    modo={modalMode}
                    onClose={closeModal}
                />
            )}
        </>
    )
}
