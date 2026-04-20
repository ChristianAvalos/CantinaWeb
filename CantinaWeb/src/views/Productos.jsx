import clienteAxios from "../config/axios";
import { useEffect, useState, useRef } from 'react';
import ModalProducto from '../components/ModalProducto';
import { toast } from "react-toastify";
import AlertaModal from "../components/AlertaModal"
import { obtenerProductos } from '../helpers/HelperProductos';
import SearchBar from "../components/SearchBar";
import { formatearMiles, formatearGuarani } from '../helpers/HelpersNumeros';
import dayjs from "dayjs";
import NoExistenDatos from "../components/NoExistenDatos";

export default function Productos() {
    //grilla de productos 
    const [productos, setProductos] = useState([]);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    //base url
    const baseURL = clienteAxios.defaults.baseURL;
    //tipo estado del producto
    const [tipoEstadoSeleccionado, setTipoEstadoSeleccionado] = useState(null);


    //paginacion
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    //session total
    const [totalRegistros, setTotalRegistros] = useState(0);
    const [subTotal, setSubTotal] = useState(0);

    //buscador 
    const [searchTerm, setSearchTerm] = useState('');

    //Esta parte es de las alertas
    const [mostrarAlertaModal, setMostrarAlertaModal] = useState(false);
    const [tipoAlertaModal, setTipoAlertaModal] = useState('informativo');
    const [mensajeAlertaModal, setMensajeAlertaModal] = useState('');
    const [accionConfirmadaModal, setAccionConfirmadaModal] = useState(null);
    const [productoAEliminar, setProductoAEliminar] = useState(null);

    //apertura del modal
    const [isModalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('crear');

    // Estado para el mes seleccionado
    const [mesSeleccionado, setMesSeleccionado] = useState();
    const inputRef = useRef(null);

    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    const openModal = (modo, productoSeleccionado = {}) => {
        setModalMode(modo);
        setProductoSeleccionado(productoSeleccionado);
        setModalOpen(true);
    };

    //cierre del modal
    const closeModal = () => {
        setModalOpen(false);
    };


    //funcion para obtener las productos
    const fetchProductos = async (page = 1, search = '', mes = mesSeleccionado) => {
        try {
            const productos = await obtenerProductos(page, search, mes);
            setProductos(productos.productos.data);
            setTotalPaginas(productos.productos.last_page);
            setTotalRegistros(productos.productos.total);
            setPaginaActual(productos.productos.current_page);
            setSubTotal(productos.subtotal);
        } catch (error) {
            console.error('Error al cargar los productos:', error);
        }
    };

    //llamo con la pagina para obtener la lista 
    useEffect(() => {

        fetchProductos(paginaActual, searchTerm, mesSeleccionado);
    }, [paginaActual, mesSeleccionado]);

    // Maneja el cambio de mes
    const handleMesChange = (e) => {
        setMesSeleccionado(e.target.value);
        setPaginaActual(1); // Reinicia a la primera página al cambiar de mes
    };

    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage); // Actualizar la página actual
        }
    };

    //para la eliminacion de productos seleccionados 
    const handleDelete = async (id) => {

        setProductoAEliminar(id);
        setAccionConfirmadaModal('delete');
        setTipoAlertaModal('confirmacion');
        setMensajeAlertaModal('¿Estás seguro de que deseas eliminar este producto?');
        setMostrarAlertaModal(true);
    };

    const confirmarEliminacion = async () => {
        try {
            const response = await clienteAxios.delete(`api/productos/${productoAEliminar}`, {
                headers: {
                    Authorization: `Bearer ${token}` // Configurar el token en los headers
                }
            });

            toast.success('Producto eliminado correctamente.');
            fetchProductos();
        } catch (error) {
            setTipoAlertaModal('informativo');
            setMensajeAlertaModal('Hubo un problema al eliminar el producto.');
            setMostrarAlertaModal(true);
        } finally {
            setProductoAEliminar(null);
        }
    }


    const handleClose = () => {
        setMostrarAlertaModal(false);
        setAccionConfirmadaModal(null);
    };

    const handleConfirm = () => {
        setMostrarAlertaModal(false);
        if (accionConfirmadaModal == 'delete') {
            confirmarEliminacion();
        }

    };

    const handleSearch = (term) => {
        setSearchTerm(term);
        // console.log("Buscando:", term); 
        fetchProductos(1, term, mesSeleccionado);
    };

    const handleAdd = () => {
        openModal('crear')
    };


    return (
        <div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">

                        <SearchBar
                            title="Productos"
                            placeholder="Buscar producto..."
                            buttonLabel="Añadir producto"
                            onSearch={handleSearch}
                            onAdd={handleAdd}
                        />


                        {/* Aqui comienza la tabla  */}
                        <div className="card-body">
                            {/* Selector de mes */}
                            <div className="flex justify-end mb-2">
                                <label className="mr-2 font-semibold text-gray-700 whitespace-nowrap">Selecciona el mes:</label>
                                <div className="relative w-full sm:w-auto max-w-xs">
                                    <input
                                        type="month"
                                        ref={inputRef}
                                        value={mesSeleccionado}
                                        onChange={handleMesChange}
                                        className="border rounded px-2 py-1 pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                                        onClick={() => {
                                            if (inputRef.current) {
                                                if (inputRef.current.showPicker) {
                                                    inputRef.current.showPicker();
                                                } else {
                                                    inputRef.current.focus();
                                                }
                                            }
                                        }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="font-bold g360-gradient rounded text-center">
                                            <th>Imagen</th>
                                            <th>ID</th>
                                            <th>Organización</th>
                                            <th>Codigo interno</th>
                                            <th>Codigo de barra</th>
                                            <th>Nombre</th>
                                            <th>Descripcción</th>
                                            <th>Categoria</th>
                                            <th>Unidad de medida</th>
                                            <th>Tipo de medida</th>
                                            <th>Precio compra</th>
                                            <th>Precio venta</th>
                                            <th>Stock minimo</th>
                                            <th>Stock actual</th>
                                            <th>Estado</th>
                                            <th>Urev</th>
                                            <th>Utilidades</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productos.length === 0 ? (
                                            <NoExistenDatos colSpan={17} mensaje="No existen productos." />
                                        ) : (

                                            productos.map((producto) => (
                                                <tr key={producto.id}>
                                                    <td className="text-center">
                                                        {producto.imagen ? (
                                                            <img 
                                                                src={`${baseURL}/img/producto/${producto.imagen}`}
                                                                alt={producto.nombre}
                                                                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                                                            />
                                                        ) : (
                                                            <img 
                                                                src='/img/Icon/product-filled.png'
                                                                alt={producto.nombre}
                                                                style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                                                            />
                                                        )}
                                                    </td>
                                                    <td>{producto.id}</td>
                                                    <td>{producto.id_organizacion}</td>
                                                    <td>{producto.codigo_interno}</td>
                                                    <td>{producto.codigo_barras}</td>
                                                    <td>{producto.nombre}</td>
                                                    <td>{producto.descripcion}</td>
                                                    <td className="text-center">{producto.categoria ? producto.categoria.nombre : 'Sin categoria'}</td>
                                                    <td className="text-center">{producto.cantidad_unidad}</td>
                                                    <td className="text-center">{producto.unidad_medida ? producto.unidad_medida.nombre : 'Sin unidad'}</td>
                                                    <td className="text-end">{formatearGuarani(producto.precio_compra)}</td>
                                                    <td className="text-end">{formatearGuarani(producto.precio_venta)}</td>
                                                    <td className="text-end">{formatearMiles(producto.stock_minimo)}</td>
                                                    <td className="text-end">{formatearMiles(producto.stock_actual)}</td>
                                                    <td className="text-center">{producto.tipo_estado ? producto.tipo_estado.descripcion : 'Sin estado'}</td>

                                                    <td className="text-center">{producto.UrevCalc}</td>
                                                    <td>
                                                        <div className="flex space-x-2">
                                                            <button onClick={() => openModal('editar', producto)} className="flex items-center  rounded hover:bg-gray-200 focus:outline-none">
                                                                <img src="/img/Icon/edit.png" alt="Edit" />
                                                            </button>
                                                            <button onClick={() => handleDelete(producto.id)} className="flex items-center rounded hover:bg-gray-200 focus:outline-none">
                                                                <img src="/img/Icon/trash_bin-remove.png" alt="Delete User" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))


                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="">
                                <span className="text-lg font-semibold text-gray-700">Total de registros: </span>
                                <span className="text-lg font-bold text-gray-700">{totalRegistros}</span> {/* Aquí el total dinámico */}

                            </div>
                            <div>
                                <span className="text-lg font-semibold text-gray-700">Sub Total: </span>
                                <span className="text-lg font-bold text-gray-700">{formatearGuarani(subTotal)} gs.</span>
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
                <ModalProducto
                    refrescarProductos={fetchProductos}
                    producto={productoSeleccionado}
                    modo={modalMode}
                    onClose={closeModal}
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
    );
}

