import useSWR from "swr";
import { useLocation, useNavigate } from "react-router-dom";
import clienteAxios from '../config/axios.js'
import { useEffect } from "react";
import { toast } from "react-toastify";
import { getErrorMessages, isConnectionError, isUnauthorizedError } from "../helpers/requestErrors";

const CONNECTION_TOAST_ID = 'backend-connection-error';



export const useAuth = ({middleware,url}) =>{

    const token = localStorage.getItem('AUTH_TOKEN');
    const navigate = useNavigate();
    const location = useLocation();

    const safeNavigate = (to) => {
        if (location.pathname !== to) {
            navigate(to, { replace: true });
        }
    };

    const clearSession = () => {
        localStorage.removeItem('AUTH_TOKEN');
        localStorage.removeItem('AUTH_USER_ID');
        window.dispatchEvent(new Event('auth:userChanged'));
    };

    const {data: user, error,mutate}= useSWR(
        token ? '/api/user' : null,
        () => clienteAxios('/api/user', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then(res => res.data),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            shouldRetryOnError: false,
            dedupingInterval: 10000,
            errorRetryCount: 0,
        }
    )

    const login = async (datos,setErrores) =>{
        try {
            const {data} = await clienteAxios.post('/api/login',datos)
            localStorage.setItem('AUTH_TOKEN',data.token);
            if (data?.user?.id != null) {
                localStorage.setItem('AUTH_USER_ID', String(data.user.id));
                window.dispatchEvent(new Event('auth:userChanged'));
            }
            setErrores([]);
            mutate(data.user, false);
        } catch (error) {
            if (isConnectionError(error)) {
                setErrores(['Sin conexion con el servidor. Intenta nuevamente.']);
                toast.error('Sin conexion con el servidor. Intenta nuevamente.', { toastId: CONNECTION_TOAST_ID });
                return;
            }

            setErrores(getErrorMessages(error, 'No se pudo iniciar sesion.'));
            mutate(null,false);
        }

    }

    const registro = async (datos,setErrores)=>{
        try {
            const {data} = await clienteAxios.post('/api/registro',datos)
            localStorage.setItem('AUTH_TOKEN',data.token)
            if (data?.user?.id != null) {
                localStorage.setItem('AUTH_USER_ID', String(data.user.id));
                window.dispatchEvent(new Event('auth:userChanged'));
            }
            setErrores([])
            await mutate()
        } catch (error) {
            if (isConnectionError(error)) {
                setErrores(['Sin conexion con el servidor. Intenta nuevamente.']);
                toast.error('Sin conexion con el servidor. Intenta nuevamente.', { toastId: CONNECTION_TOAST_ID });
                return;
            }

            setErrores(getErrorMessages(error, 'No se pudo completar el registro.'));
        }
    }

    const logout = async ()=>{
        try {
            await clienteAxios.post('/api/logout',null,{
                headers:{
                    Authorization: `Bearer ${token}`
                }
            })
            clearSession();
            await mutate(undefined)
            safeNavigate('/auth/login');
        } catch (error) {
            if (isUnauthorizedError(error)) {
                clearSession();
                safeNavigate('/auth/login');
                return;
            }

            if (isConnectionError(error)) {
                toast.error('No se pudo conectar con el servidor.', { toastId: CONNECTION_TOAST_ID });
                return;
            }

            throw Error (error?.response?.data?.errors)
        }
    }

    useEffect(() => {
        if (token && error && isConnectionError(error)) {
            toast.error('Sin conexion con el servidor. Intenta nuevamente.', { toastId: CONNECTION_TOAST_ID });
        }
    }, [error, token]);

    useEffect(() => {
        if (user?.id != null) {
            localStorage.setItem('AUTH_USER_ID', String(user.id));
            window.dispatchEvent(new Event('auth:userChanged'));
        }
    }, [user?.id]);


    useEffect(() => {
        
        if (middleware === 'guest' && url && user){
            safeNavigate(url);
        }

        //Si su estado es inactivo va a error por mas que sea administrador no podra hacer nada
        if (user && Number(user.id_tipoestado) !== 1){
            console.log('user',user)
            safeNavigate('/errorEstadoUsuario');
            return;
        }

        //Si es un usuario y no tiene definido su rol le va a aparecer en la pagina de error 
        if (middleware === 'guest' && user && (Number(user.rol_id) === undefined || Number(user.rol_id)  === null) ){
            safeNavigate('/error');
            return;
        }
        
        //  //Si no tiene definido su organizacion le va a aparecer en la pagina de error
        if (middleware === 'guest' && user && (Number(user.id_organizacion) === undefined || Number(user.id_organizacion) === null) ){
            safeNavigate('/error');
            return;
        }

        //Si es un usuario y su rol es diferente de su rol administrador ingresa a la vista general 
        if (middleware === 'guest' && user && Number(user.rol_id) !== 1){
            safeNavigate('/iniciousuarios');
            return;
        }

        //Para este caso no importa que sea administrador o no, si es un usuario inactivo lo redirige a error
        if (user && middleware === 'guest'){
            safeNavigate('/');
            return;
        }

        //Si la autenticacion es erronea retorna al login con los errores 
        if(middleware === 'auth' && error && isUnauthorizedError(error) ){
            clearSession();
            safeNavigate('/auth/login');
        }
    },[user,error,middleware,url,location.pathname]
    )

    return {
        login,
        registro,
        logout,
        user,
        error
    }

}