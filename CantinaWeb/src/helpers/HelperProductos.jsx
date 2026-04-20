import clienteAxios from "../config/axios";

export const obtenerProductos = async (page = 1,search = '',mes = '') => {
    try {
        // Obtener el token de autenticación
        const token = localStorage.getItem('AUTH_TOKEN'); 
        
        
        // Realizar la solicitud a la API
        const { data } = await clienteAxios.get(`api/productos?page=${page}&search=${search}&mes=${mes}`, {
            headers: {
                Authorization: `Bearer ${token}` // Configurar el token en los headers
            }
        });
        // Actualizar el estado con los productos obtenidos
        return data;
    } catch (error) {
        console.error('Error al obtener los productos:', error);
        throw error; // Lanza el error para manejarlo donde sea llamado
    }
};