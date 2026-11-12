import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../hooks/useAuth";
import ModalUsuarios from "../views/ModalUsuarios";
import ChangePasswordModal from "../views/ModalPassword";

/**
 * Layout del portal de familias: sin menú administrativo ni acceso al POS.
 */
export default function PortalLayout() {
    const { user, logout, mutate } = useAuth({ middleware: 'auth' });

    const [menuAbierto, setMenuAbierto] = useState(false);
    const [perfilAbierto, setPerfilAbierto] = useState(false);
    const [passwordAbierto, setPasswordAbierto] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const cerrarAlTocarFuera = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuAbierto(false);
            }
        };

        document.addEventListener('mousedown', cerrarAlTocarFuera);
        return () => document.removeEventListener('mousedown', cerrarAlTocarFuera);
    }, []);

    const abrirPerfil = () => {
        setMenuAbierto(false);
        setPerfilAbierto(true);
    };

    const abrirPassword = () => {
        setMenuAbierto(false);
        setPasswordAbierto(true);
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="bg-slate-900 text-white shadow-lg">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
                    <div className="flex items-center gap-3">
                        <img src="/img/Logo Institucional.png" alt="Logo" className="h-10 w-10 rounded-full bg-white p-1" />
                        <div>
                            <p className="text-xs uppercase tracking-widest text-slate-400">CantinaWeb</p>
                            <h1 className="text-lg font-bold leading-tight">Portal de familias</h1>
                        </div>
                    </div>

                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={() => setMenuAbierto((previo) => !previo)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                        >
                            <i className="fas fa-user-circle" aria-hidden="true" />
                            <span className="max-w-[10rem] truncate">{user?.name || 'Mi cuenta'}</span>
                            <i className="fas fa-chevron-down text-[0.6rem]" aria-hidden="true" />
                        </button>

                        {menuAbierto && (
                            <ul className="absolute right-0 top-12 z-30 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-700 shadow-xl">
                                <li>
                                    <button
                                        type="button"
                                        onClick={abrirPerfil}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-100"
                                    >
                                        <i className="fas fa-user w-4 text-center text-sky-500" aria-hidden="true" />
                                        Mi perfil
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        onClick={abrirPassword}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-100"
                                    >
                                        <i className="fas fa-key w-4 text-center text-amber-500" aria-hidden="true" />
                                        Cambiar contraseña
                                    </button>
                                </li>
                                <li className="border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={logout}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                                    >
                                        <i className="fas fa-sign-out-alt w-4 text-center" aria-hidden="true" />
                                        Cerrar sesión
                                    </button>
                                </li>
                            </ul>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-4 py-6">
                <Outlet />
            </main>

            {/* Se reutiliza el mismo modal de perfil del backoffice. */}
            {perfilAbierto && (
                <ModalUsuarios
                    usuario={user}
                    modo="perfil"
                    ocultarRolesYOrganizaciones={true}
                    onClose={() => setPerfilAbierto(false)}
                    // El nombre del header y del portal sale de /api/user.
                    onNombreActualizado={(nombre) => mutate({ ...user, name: nombre })}
                />
            )}

            <ChangePasswordModal
                isOpen={passwordAbierto}
                onClose={() => setPasswordAbierto(false)}
            />

            <ToastContainer />
        </div>
    );
}
