
export default function Alerta({children}) {
    return (
        <div className="flex items-center gap-2 my-3 px-4 py-3 rounded-lg g360-alert-danger shadow">
            {/* Icono de advertencia */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
            </svg>
            <span className="font-semibold">{children}</span>
        </div>
    )
}
