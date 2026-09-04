import { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { construirTicketHtml, imprimirTicketHtml } from '../helpers/HelpersTicket';

/**
 * Modal que muestra la vista previa del comprobante (ticket) y permite
 * imprimirlo o descartarlo.
 *
 * modos:
 *  - 'cobro'       : se abre automáticamente al cobrar. Por defecto el foco está
 *                    en "No imprimir (♻ ahorrar papel)" para no gastar papel; el
 *                    comprobante queda guardado igual y se puede reimprimir desde Ventas.
 *  - 'reimpresion' : se abre desde la tabla Ventas para reimprimir el snapshot guardado.
 */
export default function ModalComprobante({ datos, modo = 'cobro', anulada = false, onClose }) {
    const esCobro = modo === 'cobro';
    const botonNoRef = useRef(null);

    // Una única fuente de verdad: mismo HTML para la vista previa y para imprimir.
    const html = useMemo(() => construirTicketHtml(datos, { anulada }), [datos, anulada]);

    // En el flujo de cobro el foco arranca en "No imprimir" (eco: ahorrar papel).
    useEffect(() => {
        if (esCobro) {
            botonNoRef.current?.focus();
        }
    }, [esCobro]);

    const handleImprimir = () => {
        imprimirTicketHtml(html);
        if (esCobro && typeof onClose === 'function') {
            // Tras cobrar y decidir imprimir, se continúa (la pantalla se reinicia).
            setTimeout(onClose, 500);
        }
    };

    const handleNo = () => {
        if (typeof onClose === 'function') {
            onClose();
        }
    };

    const numero = datos?.numero ? `Nº ${datos.numero}` : '';

    return (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-2 sm:p-4">
            {/* Fondo oscuro */}
            <div className="absolute inset-0 bg-gray-800/70" onClick={handleNo} />

            <div className="relative bg-white rounded-lg shadow-xl max-h-[94vh] w-full max-w-md flex flex-col overflow-hidden">
                {/* Cabecera */}
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                    <h2 className="text-lg font-bold text-gray-800 truncate">
                        Comprobante de venta {numero}
                    </h2>
                    <button
                        type="button"
                        onClick={handleNo}
                        aria-label="Cerrar"
                        className="ml-2 text-gray-400 hover:text-gray-700 text-2xl leading-none focus:outline-none"
                    >
                        ×
                    </button>
                </div>

                {/* Vista previa del ticket */}
                <div className="flex-1 overflow-auto bg-slate-100 p-4">
                    <div className="mx-auto w-fit bg-white shadow-md ring-1 ring-gray-200">
                        {/* El HTML incluye su propio <style>; así la previsualización es
                            idéntica a lo que se envía a la impresora. */}
                        <div dangerouslySetInnerHTML={{ __html: html }} />
                    </div>
                </div>

                {/* Acciones */}
                <div className="border-t border-gray-200 px-4 py-3">
                    {esCobro ? (
                        <>
                            <p className="text-xs text-gray-500 mb-2">
                                El comprobante queda guardado y asociado a la venta. Podés
                                reimprimirlo después desde la pantalla de{' '}
                                <span className="font-semibold text-gray-700">Ventas</span>.
                            </p>
                            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                                <button
                                    type="button"
                                    ref={botonNoRef}
                                    onClick={handleNo}
                                    className="px-4 py-2 rounded-md border-2 border-green-600 text-green-700 font-semibold hover:bg-green-50 transition focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    ♻ No imprimir (ahorrar papel)
                                </button>
                                <button
                                    type="button"
                                    onClick={handleImprimir}
                                    className="px-5 py-2 rounded-md bg-green-600 text-white font-bold hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    Imprimir
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-row-reverse sm:flex-row gap-2 sm:justify-end">
                            <button
                                type="button"
                                onClick={handleImprimir}
                                autoFocus
                                className="px-5 py-2 rounded-md bg-green-600 text-white font-bold hover:bg-green-700 transition focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                Imprimir
                            </button>
                            <button
                                type="button"
                                onClick={handleNo}
                                className="px-4 py-2 rounded-md border border-gray-300 text-gray-600 font-semibold hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-gray-400"
                            >
                                Cerrar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

ModalComprobante.propTypes = {
    datos: PropTypes.object,
    modo: PropTypes.oneOf(['cobro', 'reimpresion']),
    anulada: PropTypes.bool,
    onClose: PropTypes.func,
};
