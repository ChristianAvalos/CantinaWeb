import { Outlet } from "react-router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../hooks/useAuth";

/**
 * Layout del portal de familias: sin menú administrativo ni acceso al POS.
 */
export default function PortalLayout() {
    const { user, logout } = useAuth({ middleware: 'auth' });

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
                    <div className="flex items-center gap-3">
                        <span className="hidden text-sm text-slate-300 sm:block">{user?.name}</span>
                        <button
                            type="button"
                            onClick={logout}
                            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-6xl px-4 py-6">
                <Outlet />
            </main>

            <ToastContainer />
        </div>
    );
}
