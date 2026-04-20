import { createRef, useState } from "react"
import { Link } from "react-router-dom"
import Alerta from "../components/Alerta";
import { useAuth } from "../hooks/useAuth";
import Spinner from "../components/Spinner";

export default function Login() {
    const nameUserRef = createRef();
    const passwordRef = createRef();
    const [errores, setErrores] = useState([]);
    const [cargando, setCargando] = useState(false);

    // Definir el middleware inicial como 'guest'
    const [middleware] = useState('guest');
    const [url] = useState('/');

    const { login } = useAuth({ middleware, url });

    const handleSubmit = async e => {
        e.preventDefault();
        const datos = {
            nameUser: nameUserRef.current.value,
            password: passwordRef.current.value,
        }
        setErrores([]);
        setCargando(true);
        try {
            await login(datos, setErrores, setCargando);
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
        } finally {
            setCargando(false);
        }
    }

    return (
        <div className="min-h-screen flex flex-col justify-center items-center">

            <div className="bg-white shadow-lg rounded-2xl px-8 py-10 w-full max-w-md">
                <div className="flex justify-center">
                    <img src="/img/Logo Institucional.png" alt="Logo" className="w-24 mb-4" />
                </div>

                <h1 className="text-3xl font-bold text-center mb-2">Iniciar sesión</h1>
                <p className="text-center text-gray-500 mb-6">Accede a tu cuenta para gestionar tus eventos</p>
                <form onSubmit={handleSubmit} noValidate>
                    {errores && errores.map((error, i) => <Alerta key={i}>{error}</Alerta>)}
                    <div className="mb-4">
                        <label className="sr-only" htmlFor="nameUser">Usuario</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {/* Heroicon: Envelope */}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth ="1.5" stroke="currentColor" className="size-6">
                                    <path strokeLinecap ="round" strokeLinejoin ="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                id="nameUser"
                                className="pl-10 pr-3 py-3 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                                name="nameUser"
                                placeholder="Usuario"
                                ref={nameUserRef}
                            />
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="sr-only" htmlFor="password">Contraseña</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {/* Heroicon: Lock Closed */}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth ="1.5" stroke="currentColor" className="size-6">
                                    <path strokeLinecap ="round" strokeLinejoin ="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                            </span>
                            <input
                                type="password"
                                id="password"
                                className="pl-10 pr-3 py-3 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                                name="password"
                                placeholder="Contraseña"
                                ref={passwordRef}
                            />
                        </div>
                    </div>
                    <input
                        type="submit"
                        value="Iniciar sesión"
                        className="g360-gradient-r hover:opacity-90 w-full py-3 rounded-lg font-semibold transition"
                    />
                    {cargando && errores.length === 0 && <Spinner />}
                </form>
                {/* <nav className="mt-6 text-center">
                    <Link to="/auth/registro" className="text-blue-600 hover:underline">
                        ¿No tienes cuenta? <span className="font-semibold">Crear una</span>
                    </Link>
                </nav> */}
            </div>
        </div>
    )
}