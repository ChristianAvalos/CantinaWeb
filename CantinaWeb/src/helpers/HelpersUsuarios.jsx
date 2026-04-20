import clienteAxios from "../config/axios";

// Obtener todos los contadores del dashboard en un solo endpoint
export const obtenerContadoresDashboard = async () => {
    try {
        const token = localStorage.getItem('AUTH_TOKEN');

        const { data } = await clienteAxios.get('api/dashboard/contadores', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        return data;
    } catch (error) {
        console.error('Error al obtener los contadores del dashboard:', error);
        throw error;
    }
};

export const obtenerUsuarios = async (page = 1,search = '') => {
    try {
        // Obtener el token de autenticación
        const token = localStorage.getItem('AUTH_TOKEN'); 
        
        
        // Realizar la solicitud a la API
        const { data } = await clienteAxios.get(`api/usuarios?page=${page}&search=${search}`, {
            headers: {
                Authorization: `Bearer ${token}` // Configurar el token en los headers
            }
        });
        // Actualizar el estado con los usuarios obtenidos
        return data;
    } catch (error) {
        console.error('Error al obtener los usuarios:', error);
        throw error; // Lanza el error para manejarlo donde sea llamado
    }
};

export const obtenerRoles = async (page = 1,search = '') => {
    try {
        // Obtener el token de autenticación
        const token = localStorage.getItem('AUTH_TOKEN'); 
        
        
        // Realizar la solicitud a la API
        const { data } = await clienteAxios.get(`api/roles?page=${page}&search=${search}`, {
            headers: {
                Authorization: `Bearer ${token}` // Configurar el token en los headers
            }
        });
        // Actualizar el estado con los roles obtenidos
        return data;
    } catch (error) {
        console.error('Error al obtener los roles:', error);
        throw error; // Lanza el error para manejarlo donde sea llamado
    }
};


export const obtenerCategorias = async (page = 1,search = '') => {
    try {
        // Obtener el token de autenticación
        const token = localStorage.getItem('AUTH_TOKEN'); 
        
        
        // Realizar la solicitud a la API
        const { data } = await clienteAxios.get(`api/categorias?page=${page}&search=${search}`, {
            headers: {
                Authorization: `Bearer ${token}` // Configurar el token en los headers
            }
        });
        // Actualizar el estado con las categorias obtenidos
        return data;
    } catch (error) {
        console.error('Error al obtener las categorias:', error);
        throw error; // Lanza el error para manejarlo donde sea llamado
    }
};