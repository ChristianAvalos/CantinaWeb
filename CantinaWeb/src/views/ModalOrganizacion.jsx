import { useEffect, useState,useRef } from 'react';
import clienteAxios from "../config/axios";
import { toast } from "react-toastify";
export default function ModalOrganizacion({ onClose, modo, refrescarOrganizacion, organizacion = {} }) {
    const [RazonSocial, setRazonSocial] = useState(organizacion.RazonSocial || '');
    const [Ruc, setRuc] = useState(organizacion.RUC || '');
    const [Direccion, setDireccion] = useState(organizacion.Direccion || '');
    const [CiudadSeleccionado, setCiudadSeleccionado] = useState(organizacion.Ciudad_id || '');
    const [paisSeleccionado, setPaisSeleccionado] = useState(organizacion.Pais_id || '');
    const [Telefono1, setTelefono1] = useState(organizacion.Telefono1 || '');
    const [Telefono2, setTelefono2] = useState(organizacion.Telefono2 || '');
    const [Fax1, setFax1] = useState(organizacion.Fax1 || '');
    const [Fax2, setFax2] = useState(organizacion.Fax2 || '');
    const [Email, setEmail] = useState(organizacion.Email || '');
    const [Sigla, setSigla] = useState(organizacion.Sigla || '');
    const [SitioWeb, setSitioWeb] = useState(organizacion.SitioWeb || '');
    const [Paises, setPaises] = useState([]);
    const [Ciudades, setCiudades] = useState([]);
    const [errores, setErrores] = useState({});
    const [Imagen, setImagen] = useState(null);
    const baseURL = clienteAxios.defaults.baseURL;
    const [ImagenURL, setImagenURL] = useState("");
    const [previewImage, setPreviewImage] = useState(null);
    const nombreRef = useRef(null);
    // Obtener el token de autenticación
    const token = localStorage.getItem('AUTH_TOKEN');

    // Enfocar el campo de razón social al abrir el modal
    useEffect(() => {
        if (nombreRef.current) {
            nombreRef.current.focus();
        }
    }, []);

    // Actualizar el estado de la URL de la imagen al cambiar la organización
    useEffect(() => {
        if (organizacion.Imagen) {
            const timestamp = new Date().getTime(); // Generar un timestamp único
            setImagenURL(`${baseURL}/img/${organizacion.Imagen}?t=${timestamp}`);
        } else {
            setImagenURL(""); // Resetear si no hay imagen
        }
    }, [organizacion, baseURL]);


    // Cargar los paises desde la API al cargar el componente
    useEffect(() => {
        const fetchPaises = async () => {
            try {

                const { data } = await clienteAxios.get('api/paises', {
                    headers: {
                        Authorization: `Bearer ${token}` // Configurar el token en los headers
                    }
                });
                setPaises(data);
            } catch (error) {
                console.error("Error al cargar los paises", error);
            }
        };

        fetchPaises();
    }, []);

    // Cargar las ciudades desde la API al cargar el componente
    useEffect(() => {
        const fetchCiudades = async () => {
            try {

                const { data } = await clienteAxios.get('api/ciudades', {
                    headers: {
                        Authorization: `Bearer ${token}` // Configurar el token en los headers
                    }
                });
                setCiudades(data);
            } catch (error) {
                console.error("Error al cargar las ciudades", error);
            }
        };

        fetchCiudades();
    }, []);

    // Actualizar el estado del formulario cuando cambie la organizacion
    useEffect(() => {
        if (modo === 'editar') {
            setRazonSocial(organizacion.RazonSocial || '');
            setRuc(organizacion.RUC || '');
            setDireccion(organizacion.Direccion || '');
            setCiudadSeleccionado(organizacion.Ciudad_id || '');
            setPaisSeleccionado(organizacion.Pais_id || '');
            setTelefono1(organizacion.Telefono1 || '');
            setTelefono2(organizacion.Telefono2 || '');
            setFax1(organizacion.Fax1 || '');
            setFax2(organizacion.Fax2 || '');
            setEmail(organizacion.Email || '');
            setSigla(organizacion.Sigla || '');
            setSitioWeb(organizacion.SitioWeb || '');
        }
    }, [organizacion, modo]); // Dependencia en 'organizacion' y 'modo'

    // Función para manejar la creación o edición la organizacion 
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevenir el comportamiento por defecto del formulario
        setErrores({}); // Resetear errores antes de la validación

        const formData = new FormData();
        formData.append("name", RazonSocial);
        formData.append("ruc", Ruc);
        formData.append("direccion", Direccion);
        formData.append("email", Email);
        formData.append("pais_id", paisSeleccionado);
        formData.append("ciudad_id", CiudadSeleccionado);
        formData.append("telefono1", Telefono1);
        formData.append("telefono2", Telefono2);
        formData.append("fax1", Fax1);
        formData.append("fax2", Fax2);
        formData.append("sigla", Sigla);
        formData.append("sitioWeb", SitioWeb);

        // Si se seleccionó una imagen, la añadimos al FormData
        if (Imagen) {
            formData.append("imagen", Imagen);
        }

        try {
            /*const organizacionData = {
                name: RazonSocial,
                ruc: Ruc,
                direccion: Direccion,
                email: Email,
                pais_id: paisSeleccionado,
                ciudad_id: CiudadSeleccionado,
                telefono1: Telefono1,
                telefono2: Telefono2,
                fax1: Fax1,
                fax2: Fax2,
                sigla: Sigla,
                sitioWeb: SitioWeb,
                imagen: Imagen ? Imagen : null,
            };*/

            if (modo === 'crear') {
                //console.log(formData)
                // Crear un nuevo usuario
                await clienteAxios.post('api/crear_organizacion', formData, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                toast.success('Organizacion creado exitosamente.');

            } else {
                // Editar organizacion existente
                // console.log('Contenido de formData:');
                // for (let pair of formData.entries()) {
                //     console.log(pair[0] + ':', pair[1]);
                // }
                await clienteAxios.post(`api/update_organizacion/${organizacion.id}`, formData, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'X-HTTP-Method-Override': 'PUT'
                    }
                });
                toast.success('Organizacion actualizado exitosamente.');
            }

            // Refrescar la lista de organizacion
            if (refrescarOrganizacion !== null && typeof refrescarOrganizacion === 'function') {
                refrescarOrganizacion();// Refrescar la lista de organizacion
            }

            // Cerrar el modal después de guardar
            onClose();


        } catch (error) {
            if (error.response && error.response.status === 422) {
                // Si la respuesta es un error de validación, capturamos los errores
                setErrores(error.response.data.errors);

            } else {
                console.error('Error al guardar la organizacion', error);
                toast.error('Error al guardar la organizacion'); // Mostrar mensaje de error genérico
            }
        }



    };
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Crear un nuevo nombre de archivo basado en la razón social
            const extension = file.name.split('.').pop(); // Obtener la extensión del archivo
            const razonLimpia = RazonSocial.trim().replace(/\.+$/, '').replace(/\s+/g, '_'); // Limpiar y formatear la razón social
            const newFileName = `${razonLimpia.replace(/\s+/g, '_')}.${extension}`; // Renombrar archivo
            const renamedFile = new File([file], newFileName, { type: file.type }); // Crear un nuevo archivo con el nombre cambiado
            setImagen(renamedFile); // Guardar el archivo renombrado
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Fondo oscuro */}
            <div
                className="bg-gray-800 opacity-75 absolute inset-0"
                onClick={onClose}
            ></div>

            {/* Contenido del modal */}
            <div className="bg-white rounded-lg shadow-lg z-10 p-6 w-full max-w-4xl border border-red-500">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">
                    {modo === "crear" ? "Crear Organización" : "Editar Organización"}
                </h2>

                <form onSubmit={handleSubmit}>
                    {/* Estructura del formulario */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 max-h-[80vh] overflow-y-auto">
                        {/* Campos del formulario */}
                        <div className="col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {/* Razón Social */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Razón Social</label>
                                <input
                                    type="text"
                                    ref={nombreRef}
                                    className={`w-full px-3 py-2 border ${errores.name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Razón Social"
                                    value={RazonSocial}
                                    onChange={(e) => setRazonSocial(e.target.value)}
                                />
                                {errores.name && <p className="text-red-500 text-sm">{errores.name[0]}</p>}
                            </div>
                            {/* RUC */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">RUC</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.ruc ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="RUC"
                                    value={Ruc}
                                    onChange={(e) => setRuc(e.target.value)}
                                />
                                {errores.ruc && <p className="text-red-500 text-sm">{errores.ruc[0]}</p>}
                            </div>

                            {/* Dirección */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Dirección</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.direccion ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Dirección"
                                    value={Direccion}
                                    onChange={(e) => setDireccion(e.target.value)}
                                />
                                {errores.direccion && <p className="text-red-500 text-sm">{errores.direccion[0]}</p>}
                            </div>

                            {/* Correo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Correo</label>
                                <input
                                    type="email"
                                    className={`w-full px-3 py-2 border ${errores.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Correo"
                                    value={Email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                {errores.email && <p className="text-red-500 text-sm">{errores.email[0]}</p>}
                            </div>

                            {/* País */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">País</label>
                                <select
                                    className={`w-full px-3 py-2 border ${errores.pais_id ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    value={paisSeleccionado}
                                    onChange={(e) => setPaisSeleccionado(e.target.value)}
                                >
                                    <option value="">Seleccione un País</option>
                                    {Paises.map((pais) => (
                                        <option key={pais.id} value={pais.id}>
                                            {pais.Name}
                                        </option>
                                    ))}
                                </select>
                                {errores.pais_id && <p className="text-red-500 text-sm">{errores.pais_id[0]}</p>}
                            </div>

                            {/* Ciudad */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ciudad</label>
                                <select
                                    className={`w-full px-3 py-2 border ${errores.ciudad_id ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    value={CiudadSeleccionado}
                                    onChange={(e) => setCiudadSeleccionado(e.target.value)}
                                >
                                    <option value="">Seleccione una Ciudad</option>
                                    {Ciudades.map((ciudad) => (
                                        <option key={ciudad.id} value={ciudad.id}>
                                            {ciudad.nombre}
                                        </option>
                                    ))}
                                </select>
                                {errores.ciudad_id && <p className="text-red-500 text-sm">{errores.ciudad_id[0]}</p>}
                            </div>

                            {/* Teléfonos */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Teléfono 1</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.telefono1 ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Teléfono 1"
                                    value={Telefono1}
                                    onChange={(e) => setTelefono1(e.target.value)}
                                />
                                {errores.telefono1 && <p className="text-red-500 text-sm">{errores.telefono1[0]}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Teléfono 2</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.telefono2 ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Teléfono 2"
                                    value={Telefono2}
                                    onChange={(e) => setTelefono2(e.target.value)}
                                />
                                {errores.telefono2 && <p className="text-red-500 text-sm">{errores.telefono2[0]}</p>}
                            </div>

                            {/* Fax */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fax 1</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.fax1 ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Fax 1"
                                    value={Fax1}
                                    onChange={(e) => setFax1(e.target.value)}
                                />
                                {errores.fax1 && <p className="text-red-500 text-sm">{errores.fax2[0]}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fax 2</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.fax2 ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Fax 2"
                                    value={Fax2}
                                    onChange={(e) => setFax2(e.target.value)}
                                />
                                {errores.fax2 && <p className="text-red-500 text-sm">{errores.fax2[0]}</p>}
                            </div>

                            {/* Siglas */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Siglas</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.sigla ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Siglas"
                                    value={Sigla}
                                    onChange={(e) => setSigla(e.target.value)}
                                />
                                {errores.sigla && <p className="text-red-500 text-sm">{errores.sigla[0]}</p>}
                            </div>

                            {/* Sitio Web */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sitio Web</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 border ${errores.sitioWeb ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    placeholder="Sitio Web"
                                    value={SitioWeb}
                                    onChange={(e) => setSitioWeb(e.target.value)}
                                />
                                {errores.sitioWeb && <p className="text-red-500 text-sm">{errores.sitioWeb[0]}</p>}
                            </div>
                        </div>

                        {/* Columna para la imagen */}

                        <div className="col-span-1 flex flex-col items-center justify-center border-l-2 border-gray-200">
                            <div>
                                <img
                                    src={previewImage ||  (organizacion.Imagen ? `${baseURL}/img/${organizacion.Imagen}` : '/img/Icon/factory.png')}
                                    alt={`Imagen de ${organizacion.RazonSocial}`}
                                    className="max-w-full h-auto rounded"
                                />
                            </div>
                            <input
                                type="file"
                                id="imagen"
                                name="imagen"
                                className="w-full px-3 py-2 border rounded-md text-sm"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end space-x-3 mt-4">
                        <button
                            onClick={onClose}
                            className="g360-danger rounded px-4 py-2 hover:opacity-90 transition text-white"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="g360-gradient rounded px-4 py-2 hover:opacity-90 transition text-white"
                        >
                            {modo === "crear" ? "Crear" : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>



    );
}