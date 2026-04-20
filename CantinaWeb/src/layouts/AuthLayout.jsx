import { Outlet } from "react-router-dom"
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css"

export default function AuthLayout() {
    return (
        <main className="min-h-screen flex flex-col justify-center items-center g360-gradient">
            <Outlet />
            <ToastContainer />
        </main>
    )
}