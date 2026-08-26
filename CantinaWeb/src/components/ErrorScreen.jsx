export default function ErrorScreen({ error }) {
    const message = error?.message || 'Ocurrió un error inesperado.';
    const isDynamicImportError = /Failed to fetch dynamically imported module/i.test(message);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Ups, algo salió mal</h1>
                <p className="text-gray-600 mb-6">
                    {isDynamicImportError
                        ? 'No se pudo cargar un módulo de la aplicación. Esto suele ocurrir si el servidor de desarrollo no está corriendo o si hubo una actualización reciente de la aplicación.'
                        : 'Ocurrió un error inesperado mientras se cargaba la página.'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                >
                    Recargar página
                </button>
                <details className="mt-4 text-left">
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">Ver detalle técnico</summary>
                    <pre className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 overflow-auto text-left whitespace-pre-wrap break-words">
                        {message}
                    </pre>
                </details>
            </div>
        </div>
    );
}
