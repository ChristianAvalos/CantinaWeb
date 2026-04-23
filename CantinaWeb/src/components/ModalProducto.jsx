import { useEffect, useState, useRef } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
import { formatearMiles, formatearGuarani, limpiarFormato,formatearDecimalSinCeros } from '../helpers/HelpersNumeros';
import { formatDateToInput } from '../helpers/HelpersFechas';

export default function ModalProducto({ onClose, modo, producto = {}, refrescarProductos }) {
    // Estado para los campos del formulario
    const [form, setForm] = useState({
        codigo_barras: producto.codigo_barras || '',
        codigo_interno: producto.codigo_interno || '',
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        id_Categoria: producto.id_Categoria || '',
        cantidad_unidad: producto.cantidad_unidad || '',
        id_TipoUnidadMedida: producto.id_TipoUnidadMedida || '',
        precio_compra: producto.precio_compra || '',
        precio_venta: producto.precio_venta || '',
        stock_minimo: producto.stock_minimo || '',
        id_TipoEstado: producto.id_TipoEstado || '',
        UrevCalc: producto.UrevCalc || '',
        fecha: producto.created_at ? formatDateToInput(producto.created_at) : formatDateToInput(new Date())
    });

    const [categorias, setCategorias] = useState([]);
    const [tipoUnidadMedida, setTipoUnidadMedida] = useState([]);
    const [tipoEstado, setTipoEstado] = useState([]);
    const [Imagen, setImagen] = useState(null);
    const baseURL = clienteAxios.defaults.baseURL;
    const [ImagenURL, setImagenURL] = useState("");
    const [previewImage, setPreviewImage] = useState(null);

    const [errores, setErrores] = useState({});


    const token = localStorage.getItem('AUTH_TOKEN');
    //Para que el cursor inicie en el campo codigo de barras
    const codigoBarrasRef = useRef(null);

    useEffect(() => {
        if (codigoBarrasRef.current) {
            codigoBarrasRef.current.focus();
        }
    }, []);

    // Actualizar el estado del formulario cuando cambie el producto
    useEffect(() => {
        if (modo === 'editar') {
            setForm({
                codigo_barras: producto.codigo_barras || '',
                codigo_interno: producto.codigo_interno || '',
                nombre: producto.nombre || '',
                descripcion: producto.descripcion || '',
                id_Categoria: producto.id_Categoria || '',
                cantidad_unidad: producto.cantidad_unidad || '',
                id_TipoUnidadMedida: producto.id_TipoUnidadMedida || '',
                precio_compra: producto.precio_compra || '',
                precio_venta: producto.precio_venta || '',
                stock_minimo: producto.stock_minimo || '',
                id_TipoEstado: producto.id_TipoEstado || '',
                UrevCalc: producto.UrevCalc || '',
                fecha: producto.created_at ? formatDateToInput(producto.created_at) : formatDateToInput(new Date())
            });
        }
    }, [producto, modo]);

    // Cargar los tipos de unidad de medida desde la API al cargar el componente
    useEffect(() => {
        const fetchTipoUnidadMedida = async () => {
            try {

                const { data } = await clienteAxios.get('api/tipo_unidad_medida', {
                    headers: {
                        Authorization: `Bearer ${token}` // Configurar el token en los headers
                    }
                });
                setTipoUnidadMedida(data);
            } catch (error) {
                console.error("Error al cargar los tipos de unidad de medida", error);
            }
        };

        fetchTipoUnidadMedida();
    }, []);

        // Cargar los tipos de estados desde la API al cargar el componente
    useEffect(() => {
        const fetchTipoEstado = async () => {
            try {

                const { data } = await clienteAxios.get('api/tipo_estado?filtro=basico', {
                    headers: {
                        Authorization: `Bearer ${token}` // Configurar el token en los headers
                    }
                });
                setTipoEstado(data);
            } catch (error) {
                console.error("Error al cargar los tipos de estados", error);
            }
        };

        fetchTipoEstado();
    }, []);

    // Cargar las categorias desde la API al cargar el componente
    useEffect(() => {
        const fetchCategorias = async () => {
            try {

                const { data } = await clienteAxios.get('api/categorias?all=1', {
                    headers: {
                        Authorization: `Bearer ${token}` // Configurar el token en los headers
                    }
                });
                setCategorias(data.data);
            } catch (error) {
                console.error("Error al cargar las categorias", error);
            }
        };

        fetchCategorias();
    }, []);

    // Función para manejar la creación o edición del producto
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
        setErrores({}); // Resetear errores antes de la validación

        try {
            // Usar FormData para enviar la imagen y los datos
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                formData.append(key, value);
            });
            if (Imagen) {
                formData.append('imagen', Imagen);
            }
            // --- Agrega este bloque para ver el contenido del FormData ---
            // for (let pair of formData.entries()) {
            //     console.log(pair[0] + ':', pair[1]);
            // }
            if (modo === 'crear') {

                // Crear un nuevo producto
                await clienteAxios.post('api/crearproducto', formData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Producto creado exitosamente.');
            } else {
                // Editar producto existente
                await clienteAxios.post(`api/update_producto/${producto.id}`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'X-HTTP-Method-Override': 'PUT'
                    }
                });
                toast.success('Producto actualizado exitosamente.');
            }

            // Refrescar la lista de productos
            if (refrescarProductos !== null && typeof refrescarProductos === 'function') {
                refrescarProductos();
            }
            // Cerrar el modal después de guardar
            onClose();
        } catch (error) {
            if (error.response && error.response.status === 422) {
                // Si la respuesta es un error de validación, capturamos los errores
                setErrores(error.response.data.errors);

            } else {
                console.error('Error al guardar el producto', error);
                toast.error('Error al guardar el producto');
            }
        }
    };
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Crear un nuevo nombre de archivo basado en la razón social
            const extension = file.name.split('.').pop(); // Obtener la extensión del archivo
            let nombreLimpio = form.nombre.trim().replace(/\.+$/, '').replace(/\s+/g, '_'); // Limpiar y formatear la razón social
            
            if (!nombreLimpio) {
                nombreLimpio = 'producto'; // Nombre por defecto si está vacío
            }
            const newFileName = `${nombreLimpio.replace(/\s+/g, '_')}.${extension}`; // Renombrar archivo
            const renamedFile = new File([file], newFileName, { type: file.type }); // Crear un nuevo archivo con el nombre cambiado
            setImagen(renamedFile); // Guardar el archivo renombrado
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    // Actualizar el estado de la URL de la imagen al cambiar la organización
    useEffect(() => {
        if (producto.Imagen) {
            const timestamp = new Date().getTime(); // Generar un timestamp único
            setImagenURL(`${baseURL}/img/producto/${producto.Imagen}?t=${timestamp}`);
            console.log("URL de la imagen actualizada:", `${baseURL}/img/producto/${producto.Imagen}?t=${timestamp}`);
        } else {
            setImagenURL(""); // Resetear si no hay imagen
        }
    }, [producto, baseURL]);

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Fondo oscuro semi-transparente */}
            <div className="bg-gray-800 opacity-75 absolute inset-0" onClick={onClose}></div>

            {/* Contenido del modal */}
            <div className="bg-white rounded-lg shadow-lg z-10 p-6 w-full max-w-5xl border border-red-500">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                    {modo === 'crear' ? 'Crear Producto' : 'Editar Producto'}
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 max-h-[80vh] overflow-y-auto">
                        {/* Campos del formulario */}
                        <div className="col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {/* Campo para codigo_barras */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Codigo de barras</label>
                                <input
                                    type="text"
                                    ref={codigoBarrasRef}
                                    className={`w-full px-3 py-2 border ${errores.codigo_barras ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el codigo de barras"
                                    value={form.codigo_barras}
                                    onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
                                />
                                {errores.codigo_barras && <p className="text-red-500 text-sm">{errores.codigo_barras[0]}</p>}
                            </div>

                            {/* Campo para codigo_interno */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Codigo Interno</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.codigo_interno ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el codigo interno"
                                    value={form.codigo_interno}
                                    onChange={(e) => setForm({ ...form, codigo_interno: e.target.value })}
                                />
                                {errores.codigo_interno && <p className="text-red-500 text-sm">{errores.codigo_interno[0]}</p>}
                            </div>

                            {/* Campo para Nombre */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.nombre ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el nombre"
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                />
                                {errores.nombre && <p className="text-red-500 text-sm">{errores.nombre[0]}</p>}
                            </div>

                            {/* Campo para descripcion */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.descripcion ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce la descripción"
                                    value={form.descripcion}
                                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                />
                                {errores.descripcion && <p className="text-red-500 text-sm">{errores.descripcion[0]}</p>}
                            </div>
                            {/* Campo para categoria */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Categoria</label>
                                <select
                                    className={`w-full px-3 py-2 border ${errores.id_Categoria ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    value={form.id_Categoria}
                                    onChange={(e) => setForm({ ...form, id_Categoria: e.target.value })}
                                >
                                    <option value="">Seleccione una categoria</option>
                                    {categorias.map((categoria) => (
                                        <option key={categoria.id} value={categoria.id}>
                                            {categoria.nombre}
                                        </option>
                                    ))}
                                </select>
                                {errores.id_Categoria && <p className="text-red-500 text-sm">{errores.id_Categoria[0]}</p>}
                            </div>


                            {/* Campo para cantidad de medida */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad en medida</label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    className={`w-full px-3 py-2 border ${errores.cantidad_unidad ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce la cantidad"
                                    value={formatearDecimalSinCeros(form.cantidad_unidad)}
                                    onChange={(e) => setForm({ ...form, cantidad_unidad: e.target.value })}
                                />
                                {errores.cantidad_unidad && <p className="text-red-500 text-sm">{errores.cantidad_unidad[0]}</p>}
                            </div>

                            {/* Tipo de medida */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de movimientos</label>
                                <select
                                    className={`w-full px-3 py-2 border ${errores.id_TipoMovimiento ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    value={form.id_TipoUnidadMedida}
                                    onChange={(e) => setForm({ ...form, id_TipoUnidadMedida: e.target.value })}
                                >
                                    <option value="">Seleccione el tipo de medida</option>
                                    {tipoUnidadMedida.map((tipoUnidadMedida) => (
                                        <option key={tipoUnidadMedida.id} value={tipoUnidadMedida.id}>
                                            {tipoUnidadMedida.nombre}
                                        </option>
                                    ))}
                                </select>
                                {errores.tipoUnidadMedida && <p className="text-red-500 text-sm">{errores.tipoUnidadMedida[0]}</p>}
                            </div>

                            {/* Campo para precio compra */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Precio de compra</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.precio_compra ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el precio de compra"
                                    value={formatearGuarani(form.precio_compra)}
                                    onChange={(e) => {
                                        const valorDigitado = e.target.value;
                                        // Eliminamos puntos y caracteres no numéricos
                                        const soloNumeros = valorDigitado.replace(/\D/g, '');
                                        setForm({ ...form, precio_compra: soloNumeros });
                                    }}
                                />
                                {errores.precio_compra && <p className="text-red-500 text-sm">{errores.precio_compra[0]}</p>}
                            </div>

                            {/* Campo para precio venta */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.precio_venta ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el precio de venta"
                                    value={formatearGuarani(form.precio_venta)}
                                    onChange={(e) => {
                                        const valorDigitado = e.target.value;
                                        // Eliminamos puntos y caracteres no numéricos
                                        const soloNumeros = valorDigitado.replace(/\D/g, '');
                                        setForm({ ...form, precio_venta: soloNumeros });
                                    }}
                                />
                                {errores.precio_venta && <p className="text-red-500 text-sm">{errores.precio_venta[0]}</p>}
                            </div>

                            {/* Campo para stock minimo */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Minimo</label>
                                <input
                                    type="number"
                                    min="0"
                                    className={`w-full px-3 py-2 border ${errores.stock_minimo ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el stock minimo"
                                    value={form.stock_minimo}
                                    onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
                                />
                                {errores.stock_minimo && <p className="text-red-500 text-sm">{errores.stock_minimo[0]}</p>}
                            </div>



                            {/* Tipo de estado */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tipo de estado</label>
                                <select
                                    className={`w-full px-3 py-2 border ${errores.id_TipoEstado ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    value={form.id_TipoEstado}
                                    onChange={(e) => setForm({ ...form, id_TipoEstado: e.target.value })}
                                >
                                    <option value="">Seleccione el tipo de estado</option>
                                    {tipoEstado.map((tipoEstado) => (
                                        <option key={tipoEstado.id} value={tipoEstado.id}>
                                            {tipoEstado.descripcion}
                                        </option>
                                    ))}
                                </select>
                                {errores.tipoEstado && <p className="text-red-500 text-sm">{errores.tipoEstado[0]}</p>}
                            </div>


                            {/* Campo para fecha */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                <input
                                    type="date"
                                    className={`w-full px-3 py-2 border ${errores.fecha ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Introduce el nombre"
                                    value={form.fecha}
                                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                                />

                                {errores.fecha && <p className="text-red-500 text-sm">{errores.fecha[0]}</p>}
                            </div>
                        </div>
                        {/* Columna para la imagen */}

                        <div className="col-span-1 flex flex-col items-center justify-center border-l-2 border-gray-200">
                            <div>
                                <img
                                    src={previewImage || (producto.imagen ? `${baseURL}/img/producto/${producto.imagen}` : '/img/Icon/product-filled.png')}
                                    alt={`Imagen de ${producto.name}`}
                                    className="max-w-full h-auto rounded"
                                />
                            </div>
                            <label class="bg-slate-700 text-white rounded px-2 py-1 hover:bg-slate-900 transition" for="imagen">
                                Imagen
                            </label>
                            <input
                                type="file"
                                id="imagen"
                                name="imagen"
                                className="opacity-0 w-full px-3 py-2 border rounded-md text-sm"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>
                    </div>
                    {/* Botones para cerrar y guardar */}
                    <div className="flex justify-end space-x-3 mt-3">
                        <button
                            onClick={onClose}
                            className="bg-red-500 text-white rounded px-4 py-2 hover:bg-red-600 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 transition"
                        >
                            {modo === 'crear' ? 'Crear Producto' : 'Guardar Cambios'}
                        </button>
                    </div>


                </form>
            </div>
        </div>

    );
}
