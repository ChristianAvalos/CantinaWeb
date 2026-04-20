import clienteAxios from "../config/axios";

export const obtenerTransacciones = async (page = 1,search = '',mes = '',tipo='') => {
    try {
        // Obtener el token de autenticación
        const token = localStorage.getItem('AUTH_TOKEN'); 
        
        
        // Realizar la solicitud a la API
        const { data } = await clienteAxios.get(`api/transacciones?page=${page}&search=${search}&mes=${mes}&tipo=${tipo}`, {
            headers: {
                Authorization: `Bearer ${token}` // Configurar el token en los headers
            }
        });
        // Actualizar el estado con las transacciones obtenidas
        return data;
    } catch (error) {
        console.error('Error al obtener las transacciones:', error);
        throw error; // Lanza el error para manejarlo donde sea llamado
    }
};

export const obtenerTransaccionesDetalle = async (page = 1,search = '',id_transaccion='') => {
    try {
        // Obtener el token de autenticación
        const token = localStorage.getItem('AUTH_TOKEN'); 
        
        
        // Realizar la solicitud a la API
        const { data } = await clienteAxios.get(`api/transacciones_detalle?page=${page}&search=${search}&id_transaccion=${id_transaccion}`, {
            headers: {
                Authorization: `Bearer ${token}` // Configurar el token en los headers
            }
        });
        // Actualizar el estado con las transacciones obtenidas
        return data;
    } catch (error) {
        console.error('Error al obtener las transacciones detalles:', error);
        throw error; // Lanza el error para manejarlo donde sea llamado
    }
};
