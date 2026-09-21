import clienteAxios from "../config/axios";

/**
 * Obtiene el kardex (historial de movimientos de stock) paginado.
 *
 * @param {number} page
 * @param {object} filtros  search, direccion, fecha_desde, fecha_hasta, id_producto, id_transaccion
 */
export const obtenerMovimientoHistorial = async (page = 1, filtros = {}) => {
    try {
        const token = localStorage.getItem('AUTH_TOKEN');

        const { data } = await clienteAxios.get('api/movimiento_historial', {
            params: { page, ...filtros },
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return data;
    } catch (error) {
        console.error('Error al obtener el historial de inventario:', error);
        throw error;
    }
};
