import { Outlet } from "react-router-dom"
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css"
import Header from "../components/Header"
import SideNav from "../components/SideNav"
import Footer from "../components/Footer"
export default function Layout() {
    return (
        <div className="wrapper">
            <Header />

            <aside className="main-sidebar g360-sidenav g360-gradient font-bold text-white elevation-4 !z-[1040]">
                <SideNav />
            </aside>
                <main className="content-wrapper flex-1 h-screen overflow-y-scroll bg-gray-100 p-3">
                    <Outlet />
                </main>

            <Footer />

            <ToastContainer />
        </div>
    )
}
