import clienteAxios from "../config/axios";

export const obtenerPersonas = async (page = 1,search = '',mes = '') => {
    try {
        // Obtener el token de autenticación
        const token = localStorage.getItem('AUTH_TOKEN'); 
        
        
        // Realizar la solicitud a la API
        const { data } = await clienteAxios.get(`api/personas?page=${page}&search=${search}&mes=${mes}`, {
            headers: {
                Authorization: `Bearer ${token}` // Configurar el token en los headers
            }
        });
        // Actualizar el estado con los personas obtenidos
        return data;
    } catch (error) {
        console.error('Error al obtener las personas:', error);
        throw error; // Lanza el error para manejarlo donde sea llamado
    }
};