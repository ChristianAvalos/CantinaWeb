import { useEffect, useState } from 'react';
import { Outlet } from "react-router-dom"
import { ToastContainer } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css"
import Header from "../components/Header"
import SideNav from "../components/SideNav"
import Footer from "../components/Footer"
import { useTheme } from '../context/ThemeContext';

export default function Layout() {
    const { theme } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }

        return window.innerWidth >= 1024;
    });

    useEffect(() => {
        const syncSidebarWithViewport = () => {
            setIsSidebarOpen(window.innerWidth >= 1024);
        };

        syncSidebarWithViewport();
        window.addEventListener('resize', syncSidebarWithViewport);

        return () => {
            window.removeEventListener('resize', syncSidebarWithViewport);
        };
    }, []);

    const toggleSidebar = () => {
        setIsSidebarOpen((prev) => !prev);
    };

    const closeSidebar = () => {
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    };

    const sidebarShellStyle = {
        backgroundColor: `rgb(${theme.from})`,
        backgroundImage: `linear-gradient(180deg, rgb(${theme.from}) 0%, rgb(${theme.to}) 100%)`,
        color: `rgb(${theme.on})`,
    };

    return (
        <div className="app-shell min-h-screen bg-slate-100">
            <aside className={`app-sidebar fixed inset-y-0 left-0 z-40 w-72 transform overflow-hidden shadow-2xl transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`} style={sidebarShellStyle}>
                <SideNav />
            </aside>
            {isSidebarOpen && <button type="button" className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-[2px] lg:hidden" onClick={closeSidebar} aria-label="Cerrar menu lateral" />}
            <div className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-out ${isSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
                <Header onToggleSidebar={toggleSidebar} />
                <main className="w-full flex-1 px-4 py-4 md:px-6 md:py-5">
                    <Outlet />
                </main>
                <Footer />
            </div>
            <ToastContainer />
        </div>
    )
}
