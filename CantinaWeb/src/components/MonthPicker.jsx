import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';

const MESES_CORTOS = [
    { value: '01', label: 'ene.' },
    { value: '02', label: 'feb.' },
    { value: '03', label: 'mar.' },
    { value: '04', label: 'abr.' },
    { value: '05', label: 'may.' },
    { value: '06', label: 'jun.' },
    { value: '07', label: 'jul.' },
    { value: '08', label: 'ago.' },
    { value: '09', label: 'sep.' },
    { value: '10', label: 'oct.' },
    { value: '11', label: 'nov.' },
    { value: '12', label: 'dic.' },
];

const MESES_LARGOS = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
];

export default function MonthPicker({
    value,
    onChange,
    label = 'Selecciona el mes:',
    minYear = 1900,
    maxYear = dayjs().year() + 5,
    className = '',
}) {
    const buttonRef = useRef(null);
    const popupRef = useRef(null);
    const [abierto, setAbierto] = useState(false);
    const [anioVista, setAnioVista] = useState(dayjs().year());
    const [popupStyle, setPopupStyle] = useState(null);

    const anioSeleccionado = value ? Number(value.split('-')[0]) : null;

    useEffect(() => {
        if (anioSeleccionado !== null) {
            setAnioVista(anioSeleccionado);
        }
    }, [anioSeleccionado]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const clickEnBoton = buttonRef.current?.contains(event.target);
            const clickEnPopup = popupRef.current?.contains(event.target);

            if (!clickEnBoton && !clickEnPopup) {
                setAbierto(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setAbierto(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    useEffect(() => {
        if (!abierto) {
            return undefined;
        }

        const actualizarPosicion = () => {
            const boton = buttonRef.current;

            if (!boton) {
                return;
            }

            const rect = boton.getBoundingClientRect();
            const anchoPopup = 288;
            const altoPopupEstimado = 280;
            const margen = 8;
            const espacioAbajo = window.innerHeight - rect.bottom;
            const mostrarArriba = espacioAbajo < altoPopupEstimado && rect.top > altoPopupEstimado;
            const top = mostrarArriba
                ? Math.max(margen, rect.top - altoPopupEstimado - margen)
                : Math.min(window.innerHeight - altoPopupEstimado - margen, rect.bottom + margen);
            const centroBoton = rect.left + (rect.width / 2);
            const left = Math.min(
                window.innerWidth - anchoPopup / 2 - margen,
                Math.max(anchoPopup / 2 + margen, centroBoton)
            );

            setPopupStyle({
                position: 'fixed',
                top,
                left,
                transform: 'translateX(-50%)',
                width: `${anchoPopup}px`,
                zIndex: 2000,
            });
        };

        actualizarPosicion();
        window.addEventListener('resize', actualizarPosicion);
        window.addEventListener('scroll', actualizarPosicion, true);

        return () => {
            window.removeEventListener('resize', actualizarPosicion);
            window.removeEventListener('scroll', actualizarPosicion, true);
        };
    }, [abierto]);

    const formatearValor = (currentValue) => {
        if (!currentValue) {
            return 'Selecciona el mes';
        }

        const [anio, mes] = currentValue.split('-');
        const mesEncontrado = MESES_LARGOS.find((item) => item.value === mes);

        return `${mesEncontrado ? mesEncontrado.label : mes} de ${anio}`;
    };

    const seleccionarMes = (mes) => {
        if (typeof onChange === 'function') {
            onChange(`${anioVista}-${mes}`);
        }

        setAbierto(false);
    };

    const irAlMesActual = () => {
        const hoy = dayjs();
        const siguienteValor = hoy.format('YYYY-MM');

        if (typeof onChange === 'function') {
            onChange(siguienteValor);
        }

        setAnioVista(hoy.year());
        setAbierto(false);
    };

    return (
        <div className={`flex items-center justify-end mb-2 ${className}`.trim()}>
            {label ? <label className="mr-2 font-semibold text-gray-700 whitespace-nowrap">{label}</label> : null}

            <div className="relative w-full sm:w-auto max-w-xs">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setAbierto((estadoAnterior) => !estadoAnterior)}
                    className="relative flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-center shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <span className="text-center text-gray-900">{formatearValor(value)}</span>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </span>
                </button>

                {abierto && popupStyle && createPortal(
                    <div
                        ref={popupRef}
                        className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl"
                        style={popupStyle}
                    >
                        <div>
                            <div className="mb-3 flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setAnioVista((anio) => Math.max(minYear, anio - 1))}
                                    className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Año anterior"
                                    disabled={anioVista <= minYear}
                                >
                                    ‹
                                </button>
                                <div className="text-sm font-semibold text-gray-700">{anioVista}</div>
                                <button
                                    type="button"
                                    onClick={() => setAnioVista((anio) => Math.min(maxYear, anio + 1))}
                                    className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Año siguiente"
                                    disabled={anioVista >= maxYear}
                                >
                                    ›
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-sm">
                                {MESES_CORTOS.map((mes) => {
                                    const estaSeleccionado = value === `${anioVista}-${mes.value}`;

                                    return (
                                        <button
                                            key={mes.value}
                                            type="button"
                                            onClick={() => seleccionarMes(mes.value)}
                                            className={`rounded-md px-3 py-2 text-left transition ${estaSeleccionado ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-blue-50'}`}
                                        >
                                            {mes.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
                                <button
                                    type="button"
                                    onClick={irAlMesActual}
                                    className="text-blue-600 hover:underline"
                                >
                                    Este mes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAbierto(false)}
                                    className="text-blue-600 hover:underline"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
}