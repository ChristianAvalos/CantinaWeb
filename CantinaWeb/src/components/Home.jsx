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
    { clave: 'cobranzas_pendientes', titulo: 'Cobranzas pendientes', ruta: '/cobranzas', icono: 'fas fa-hand-holding-dollar', color: 'bg-orange-500', permiso: 'Cobranzas' },
    { clave: 'pagos_proveedores_pendientes', titulo: 'Pagos a proveedores pendientes', ruta: '/pagos-proveedores', icono: 'fas fa-file-invoice-dollar', color: 'bg-rose-600', permiso: 'Pagos_Proveedores' },
    { clave: 'transacciones', titulo: 'Transacciones', ruta: '/transacciones', icono: 'ion ion-stats-bars', color: 'bg-green-500', permiso: 'Transacciones', modal: 'transacciones' },
    { clave: 'productos', titulo: 'Productos', ruta: '/productos', icono: 'fas fa-boxes', color: 'bg-blue-500', permiso: 'Productos' },
    { clave: 'personas', titulo: 'Clientes / Proveedores', ruta: '/personas', icono: 'fas fa-users', color: 'bg-teal-500', permiso: 'Personas' },
    { clave: 'categorias', titulo: 'Categorías', ruta: '/categorias', icono: 'fas fa-list', color: 'bg-sky-500', permiso: 'Categorias', modal: 'categoria' },
    { clave: 'precios_venta', titulo: 'Precios de venta', ruta: '/precio-ventas', icono: 'fas fa-tags', color: 'bg-cyan-600', permiso: 'Precio_Ventas' },
    { clave: 'movimientos', titulo: 'Movimientos de inventario', ruta: '/historial-inventario', icono: 'fas fa-clipboard-list', color: 'bg-slate-600', permiso: 'Historial_Inventario' },
    { clave: 'organizaciones', titulo: 'Organizaciones', ruta: '/organizacion', icono: 'fas fa-building', color: 'bg-indigo-500', permiso: 'Organizacion' },
    { clave: 'usuarios', titulo: 'Usuarios registrados', ruta: '/usuarios', icono: 'ion ion-person-add', color: 'bg-yellow-400', permiso: 'Herraminetas_usuarios', modal: 'usuarios' },
    { clave: 'roles', titulo: 'Roles', ruta: '/usuarios/roles', icono: 'ion ion-android-lock', color: 'bg-red-500', permiso: 'Herraminetas_usuarios', modal: 'roles' },
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        {tarjetas.map((tarjeta) => (
                            <div key={tarjeta.clave} className={`${tarjeta.color} rounded-lg shadow-md p-5 flex flex-col justify-between`}>
                                <div>
                                    <h3 className="text-white text-3xl font-bold">{contadores[tarjeta.clave]}</h3>
                                    <p className="text-white text-lg">{tarjeta.titulo}</p>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    {tarjeta.modal ? (
                                        <button
                                            type="button"
                                            onClick={() => openModal('crear', tarjeta.modal)}
                                            title={`Nuevo: ${tarjeta.titulo}`}
                                        >
                                            <i className={`${tarjeta.icono} text-white text-2xl`} />
                                        </button>
                                    ) : (
                                        <i className={`${tarjeta.icono} text-white text-2xl`} />
                                    )}
                                    <Link to={tarjeta.ruta} className="text-white text-sm underline hover:text-gray-200">Más información</Link>
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
