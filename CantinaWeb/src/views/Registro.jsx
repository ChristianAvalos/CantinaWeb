import { createRef, useState } from "react"
import { Link } from "react-router-dom"
import Alerta from "../components/Alerta";
import { useAuth } from "../hooks/useAuth";


export default function Registro() {

    const nameRef = createRef();
    const nameUserRef = createRef();
    const emailRef = createRef();
    const passwordRef = createRef();
    const passwordConfirmationRef = createRef();

    const [errores, setErrores] = useState([]);
    const { registro } = useAuth({ middleware: 'guest', url: '/' })

    const handleSubmit = async e => {
        e.preventDefault();

        const datos = {
            name: nameRef.current.value,
            nameUser: nameUserRef.current.value,
            email: emailRef.current.value,
            password: passwordRef.current.value,
            password_confirmation: passwordConfirmationRef.current.value

        }
        registro(datos, setErrores)

    }


    return (
        <>


            <div className="bg-white shadow-md rounded-md mt-10 px-5 py-4">
                <div className="flex flex-col items-center">
                    <img src="/img/Logo Institucional.png" alt="Logo" className="w-24" />
                    <h1 className="text-3xl font-bold  mb-2">Crear tu cuenta</h1>
                    <p className="mb-6 text-gray-600">Crea tu cuenta llenando el formulario</p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    noValidate
                >

                    {errores ? errores.map((error, i) => <Alerta key={i}>{error}</Alerta>) : null}

                    <div className="mb-6">
                        <label className="sr-only" htmlFor="name">
                            Nombre:
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {/* Heroicon: user */}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                            </span>
                            <input type="text"
                                id="name"
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-10 pr-3 py-3 text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                name="name"
                                placeholder="Nombre"
                                ref={nameRef} />
                        </div>

                    </div>

                    <div className="mb-6">
                        <label className="sr-only" htmlFor="nameUser">
                            Usuario:
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {/* Heroicon: user */}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                            </span>
                            <input type="text"
                                id="nameUser"
                                className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-10 pr-3 py-3 text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                name="nameUser"
                                placeholder="Usuario"
                                ref={nameUserRef} />
                        </div>

                    </div>
                    <div className="mb-6">
                        <label className="sr-only" htmlFor="email">
                            Email:
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {/* Heroicon: Envelope */}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                                </svg>
                            </span>
                            <input type="email"
                            id="email"
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-10 pr-3 py-3 text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            name="email"
                            placeholder="Correo"
                            ref={emailRef} />
                        </div>
                        
                    </div>
                    <div className="mb-6">
                        <label className="sr-only" htmlFor="password">
                            Contraseña:
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {/* Heroicon: Lock Closed */}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                            </span>
                        <input type="password"
                            id="name"
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-10 pr-3 py-3 text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            name="password"
                            placeholder="Contraseña"
                            ref={passwordRef} />
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="sr-only" htmlFor="password_confirmation">
                            Repetir contraseña:
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                {/* Heroicon: Lock Closed */}
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                            </span>
                        <input type="password"
                            id="password_confirmation"
                            className="w-full rounded-lg border border-gray-300 bg-gray-50 pl-10 pr-3 py-3 text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            name="password_confirmation"
                            placeholder="Repite tu contraseña"
                            ref={passwordConfirmationRef} />
                        </div>
                    </div>
                    <input type="submit" value="Crear cuenta"
                        className="g360-gradient-r hover:opacity-90 w-full py-3 rounded-lg font-semibold transition"
                    />
                </form>
                <nav className="mt-3 text-center  ">
                    <Link to="/auth/login"
                        className="text-blue-600 hover:underline"
                    >
                        ¿Ya tienes cuenta? <span className="font-semibold">Inicia sesion</span>
                    </Link>
                </nav>

            </div>

        </>

    )
}
