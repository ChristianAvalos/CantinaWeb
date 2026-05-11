import clienteAxios from "../config/axios";

export const obtenerTransacciones = async (page = 1, search = '', mes = '', tipo = '', filtros = {}) => {
    try {
        const token = localStorage.getItem('AUTH_TOKEN');

        const params = new URLSearchParams();

        const queryValues = {
            page,
            search,
            mes,
            tipo,
        };

        Object.entries(queryValues).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.append(key, String(value));
            }
        });

        const filtrosLimpios = Object.fromEntries(
            Object.entries(filtros || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
        );

        if (Object.keys(filtrosLimpios).length > 0) {
            params.append('filtros', JSON.stringify(filtrosLimpios));
        }

        const { data } = await clienteAxios.get(`api/transacciones?${params.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return data;
    } catch (error) {
        console.error('Error al obtener las transacciones:', error);
        throw error;
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
