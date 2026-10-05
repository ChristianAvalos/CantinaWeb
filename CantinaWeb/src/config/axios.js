import axios from "axios";
import { getErrorMessage } from "../helpers/requestErrors";

const clienteAxios = axios.create({
    baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.trim() : '',
    headers: {
        'Accept' : 'application/json',
        'X-Requested-With' : 'XMLHttpRequest'
    },
    withCredentials: true
})

// Laravel resume los errores de validación (422) en `message` como
// "<primer error> (and N more errors)" — en inglés. Acá se reemplaza por los
// mensajes reales del bag `errors` (en español) para que todos los toasts
// muestren un texto legible y consistente.
clienteAxios.interceptors.response.use(
    (response) => response,
    (error) => {
        const data = error?.response?.data;

        if (error?.response?.status === 422 && data?.errors) {
            const mensaje = getErrorMessage(error, null);
            if (mensaje) {
                data.message = mensaje;
            }
        }

        return Promise.reject(error);
    }
);

export default clienteAxios