import clienteAxios from "../config/axios";
import { useCallback, useEffect, useState } from 'react';
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal";
import ModalOrganizacion from "./ModalOrganizacion";
import ModalSucursales from "./ModalSucursales";
import NoExistenDatos from "../components/NoExistenDatos";
import FiltrosBar from "../components/FiltrosBar";
import useAuthPermisos from "../hooks/useAuthPermisos";

const FILTROS_ORGANIZACION = [
    {
        key: 'search',
        label: 'Buscar organización',
        type: 'text',
        placeholder: 'Buscar organización...',
    },
];

const FILTROS_ORGANIZACION_INICIALES = {
    search: '',
};


export default function Organizacion() {
    // Solo el Administrador de Sistema puede crear o eliminar organizaciones.
    const { isAdmin } = useAuthPermisos();    //grilla de organizacion
    const [organizacion, setOrganizacion,] = useState([]);
    const [organizacionSeleccionado, setorganizacionSeleccionado] = useState(null);
    // organización cuyas sucursales se están administrando (null = modal cerrado)
    const [organizacionSucursales, setOrganizacionSucursales] = useState(null);

    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [organizacionAEliminar, setOrganizacionAEliminar] = useState(null);
    // organización cuyo estado se está cambiando
    const [organizacionEstado, setOrganizacionEstado] = useState(null);


    //paginacion
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    //session total
    const [totalRegistros, setTotalRegistros] = useState(0);

    // filtros aplicados
    const [filtrosAplicados, setFiltrosAplicados] = useState(() => ({ ...FILTROS_ORGANIZACION_INICIALES }));
    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    //funcion para obtener las organizaciones
    const fetchOrganizacion = useCallback(async (page = 1, filtros = filtrosAplicados) => {
        try {
            const search = filtros.search ?? '';

            // Realizar la solicitud a la API
            const { data } = await clienteAxios.get(`api/organizacion?page=${page}&search=${search}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            // Actualizar el estado con los usuarios obtenidos
            setOrganizacion(data.data);
            setTotalPaginas(data.last_page);
            setTotalRegistros(data.total);
            setPaginaActual(data.current_page);

        } catch (error) {
            console.error('Error al obtener las organizaciones:', error);
            throw error; // Lanza el error para manejarlo donde sea llamado
        }
    }, [filtrosAplicados, token]);

    //llamo con la pagina para obtener la lista 
    useEffect(() => {
        fetchOrganizacion(paginaActual, filtrosAplicados);
    }, [paginaActual, filtrosAplicados, fetchOrganizacion]);




    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };

    //apertura del modal
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    const openModal = (modo, organizacionSeleccionado = {}) => {
        setModalMode(modo);
        setorganizacionSeleccionado(organizacionSeleccionado);
        setModalOpen(true);
    };


    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
    };



    const handleAplicarFiltros = (nuevosFiltros) => {
        setFiltrosAplicados(nuevosFiltros);
        setPaginaActual(1);
    };

    //para la eliminacion de organizacion
    const handleDelete = async (id) => {

        setOrganizacionAEliminar(id);
        setAccionConfirmadaModal('delete');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal('¿Estás seguro de que deseas eliminar esta organización?');
        setMostrarAlertaModal(true);
    };

    //para activar/desactivar organización (si queda inactiva, sus usuarios no acceden)
    const handleEstado = (organizacion) => {
        const activa = Number(organizacion.id_tipoestado) === 1;
        setOrganizacionEstado(organizacion);
        setAccionConfirmadaModal('estado');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal(
            `¿Estás seguro de que deseas ${activa ? 'desactivar' : 'activar'} la organización "${organizacion.RazonSocial}"?`
            + (activa ? ' Sus usuarios no podrán acceder.' : '')
        );
        setMostrarAlertaModal(true);
    };

    const confirmarEstado = async () => {
        const org = organizacionEstado;
        setOrganizacionEstado(null);
        if (!org) return;
        try {
            const nuevoEstado = Number(org.id_tipoestado) === 1 ? 2 : 1;
            await clienteAxios.post(`api/organizacion_estado/${org.id}`, { id_tipoestado: nuevoEstado }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Organización ${nuevoEstado === 1 ? 'activada' : 'desactivada'} correctamente.`);
            fetchOrganizacion();
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal(error.response?.data?.message || 'No se pudo cambiar el estado.');
            setMostrarAlertaModal(true);
        }
    };

    const confirmarEliminacion = async () => {
        try {
            const response = await clienteAxios.delete(`api/organizacion/${organizacionAEliminar}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            toast.success('Organización eliminado correctamente.');
            fetchOrganizacion();
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal('Hubo un problema al eliminar la organización.');
            setMostrarAlertaModal(true);
        } finally {
            setOrganizacionAEliminar(null);
        }
    }



    const handleClose = () => {
        setMostrarAlertaModal(false);
        setAccionConfirmadaModal(null);
        setOrganizacionEstado(null);
    };

    const handleConfirm = () => {
        setMostrarAlertaModal(false);
        if (accionConfirmadaModal === 'estado') {
            confirmarEstado();
        } else {
            confirmarEliminacion();
        }
    };


    const handleAdd = () => {
        openModal('crear')// Reemplaza con tu lógica para agregar
    };




    return (
        <div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">
                        <FiltrosBar
                            title="Organización"
                            buttonLabel="Añadir organización"
                            onAdd={isAdmin ? handleAdd : undefined}
                            filterDefinitions={FILTROS_ORGANIZACION}
                            initialValues={FILTROS_ORGANIZACION_INICIALES}
                            onApply={handleAplicarFiltros}
                        />
                        <div className="card-body">
                            <div className="overflow-x-auto">
                                <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="font-bold g360-gradient rounded text-center">
                                            <th>ID</th>
                                            <th>Razón social</th>
                                            <th>RUC</th>
                                            <th>Dirección</th>
                                            <th>Ciudad</th>
                                            <th>Pais</th>
                                            <th>Telefono(s)</th>
                                            <th>Fax(s)</th>
                                            <th>Email</th>
                                            <th>Sigla</th>
                                            <th>Sitio web</th>
                                            <th>Estado</th>
                                            <th>Utilidades</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {organizacion.length === 0 ? (
                                            <NoExistenDatos colSpan={13} mensaje="No existen organizaciones registradas." />    
                                        ) : (
                                        organizacion.map((organizacion) => (
                                            <tr key={organizacion.id}>
                                                <td>{organizacion.id}</td>
                                                <td>{organizacion.RazonSocial}</td>
                                                <td>{organizacion.RUC}</td>
                                                <td>{organizacion.Direccion}</td>
                                                <td>{organizacion.ciudad ? organizacion.ciudad.nombre : 'Sin ciudad seleccionada'}</td>
                                                <td>{organizacion.pais ? organizacion.pais.Name : 'Sin pais seleccionado'}</td>
                                                <td>{organizacion.Telefono}</td>
                                                <td>{organizacion.Fax}</td>
                                                <td>{organizacion.Email}</td>
                                                <td>{organizacion.Sigla}</td>
                                                <td>{organizacion.SitioWeb}</td>
                                                <td className="text-center">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${Number(organizacion.id_tipoestado) === 1 ? 'bg-green-100 text-green-700 ring-green-200' : 'bg-red-100 text-red-700 ring-red-200'}`}>
                                                        {organizacion.tipo_estado?.descripcion || (Number(organizacion.id_tipoestado) === 1 ? 'Activo' : 'Inactivo')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex space-x-2">
                                                        <button onClick={() => setOrganizacionSucursales(organizacion)} title="Sucursales" className="flex items-center rounded p-1 hover:bg-gray-200 focus:outline-none">
                                                            <img src="/img/Icon/organogram.png" alt="Sucursales" />
                                                        </button>
                                                        <button onClick={() => openModal('editar', organizacion)} className="flex items-center focus:outline-none">
                                                            <img src="/img/Icon/edit.png" alt="Edit Rol" />
                                                        </button>
                                                        {isAdmin && (
                                                            <button onClick={() => handleDelete(organizacion.id)} className="flex items-center focus:outline-none">
                                                                <img src="/img/Icon/trash_bin-remove.png" alt="Delete Rol" />
                                                            </button>
                                                        )}
                                                        {isAdmin && (
                                                            <button onClick={() => handleEstado(organizacion)} title={Number(organizacion.id_tipoestado) === 1 ? 'Desactivar' : 'Activar'} className="flex items-center focus:outline-none">
                                                                {Number(organizacion.id_tipoestado) === 1 ? (
                                                                    <img src="/img/Icon/toggle-on.png" alt="Activo" className="w-5 h-5" />
                                                                ) : (
                                                                    <img src="/img/Icon/toggle-off.png" alt="Inactivo" className="w-5 h-5" />
                                                                )}
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
                            <div className="">
                                <span className="text-lg font-semibold text-gray-700">Total de registros:</span>
                                <span className="text-lg font-bold text-gray-700">{totalRegistros}</span> {/* Aquí el total dinámico */}
                            </div>

                            {/* Controles de paginación */}
                            <div className="flex flex-col items-center sm:flex-row sm:justify-between py-4 space-y-2 sm:space-y-0">
                                {/* Botones para la primera y anterior página */}
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={paginaActual === 1}
                                        className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                    >
                                        Primera
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(paginaActual - 1)}
                                        disabled={paginaActual === 1}
                                        className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                    >
                                        Anterior
                                    </button>
                                </div>

                                {/* Información de la página actual */}
                                <span className="text-sm sm:text-lg font-medium text-center">
                                    Página {paginaActual} de {totalPaginas}
                                </span>

                                {/* Botones para la siguiente y última página */}
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handlePageChange(paginaActual + 1)}
                                        disabled={paginaActual === totalPaginas}
                                        className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === totalPaginas ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                    >
                                        Siguiente
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(totalPaginas)}
                                        disabled={paginaActual === totalPaginas}
                                        className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === totalPaginas ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                    >
                                        Última
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </section>
            {/* Renderizar el modal */}
            {isModalOpen && (
                <ModalOrganizacion
                    organizacion={organizacionSeleccionado}
                    refrescarOrganizacion={fetchOrganizacion}
                    modo={modalMode}
                    onClose={closeModal}
                />
            )}

            {/* Administrar sucursales de una organización */}
            {organizacionSucursales && (
                <ModalSucursales
                    organizacion={organizacionSucursales}
                    onClose={() => setOrganizacionSucursales(null)}
                />
            )}

            {/* Mostrar alerta solo si es necesario */}
            {mostrarAlertaModal && (
                <AlertaModal
                    tipo={tipoAlertaModal}
                    mensaje={mensajeAlertaModal}
                    onClose={handleClose}
                    onConfirm={handleConfirm}
                />
            )}

        </div>
    )
}
