import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { obtenerMovimientoHistorial } from '../helpers/HelperMovimientoHistorial';
import { formatearDecimalSinCeros } from '../helpers/HelpersNumeros';
import { formatDateTimeToMinutes } from '../helpers/HelpersFechas';
import NoExistenDatos from '../components/NoExistenDatos';
import FiltrosBar from '../components/FiltrosBar';

// Deben coincidir con TipoMovimientos::DIRECCION_* del backend.
const DIRECCION_ENTRADA = 'entrada';
const DIRECCION_SALIDA = 'salida';

const FILTROS_HISTORIAL = [
    {
        key: 'search',
        label: 'Buscar',
        type: 'text',
        placeholder: 'Producto, código, tipo, motivo...',
    },
    {
        key: 'direccion',
        label: 'Dirección',
        type: 'select',
        options: [
            { key: 'Todas', value: '' },
            { key: 'Entradas', value: DIRECCION_ENTRADA },
            { key: 'Salidas', value: DIRECCION_SALIDA },
        ],
    },
    {
        key: 'fecha_desde',
        label: 'Fecha desde',
        type: 'date',
    },
    {
        key: 'fecha_hasta',
        label: 'Fecha hasta',
        type: 'date',
    },
];

const FILTROS_HISTORIAL_INICIALES = {
    search: '',
    direccion: '',
    fecha_desde: dayjs().startOf('year').format('YYYY-MM-DD'),
    fecha_hasta: dayjs().endOf('year').format('YYYY-MM-DD'),
};

export default function HistorialInventario() {
    const [movimientos, setMovimientos] = useState([]);
    const [totales, setTotales] = useState({ registros: 0, entradas: 0, salidas: 0 });

    //paginacion
    const [paginaActual, setPaginaActual] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    // filtros aplicados
    const [filtrosAplicados, setFiltrosAplicados] = useState(() => ({ ...FILTROS_HISTORIAL_INICIALES }));

    const fetchMovimientos = useCallback(async (page = 1, filtros = filtrosAplicados) => {
        try {
            const data = await obtenerMovimientoHistorial(page, filtros);
            setMovimientos(data.movimientos.data);
            setTotalPaginas(data.movimientos.last_page);
            setPaginaActual(data.movimientos.current_page);
            setTotales(data.totales ?? { registros: 0, entradas: 0, salidas: 0 });
        } catch (error) {
            console.error('Error al cargar el historial de inventario:', error);
        }
    }, [filtrosAplicados]);

    useEffect(() => {
        fetchMovimientos(paginaActual, filtrosAplicados);
    }, [paginaActual, filtrosAplicados, fetchMovimientos]);

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPaginas) {
            setPaginaActual(newPage);
        }
    };

    const handleAplicarFiltros = (nuevosFiltros) => {
        setFiltrosAplicados(nuevosFiltros);
        setPaginaActual(1);
    };

    const renderDireccion = (direccion) => {
        if (direccion === DIRECCION_ENTRADA) {
            return (
                <span className="inline-block rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                    Entrada
                </span>
            );
        }

        if (direccion === DIRECCION_SALIDA) {
            return (
                <span className="inline-block rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                    Salida
                </span>
            );
        }

        return <span className="text-slate-400">—</span>;
    };

    return (
        <div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">

                        <FiltrosBar
                            title="Historial de Inventario"
                            filterDefinitions={FILTROS_HISTORIAL}
                            initialValues={FILTROS_HISTORIAL_INICIALES}
                            onApply={handleAplicarFiltros}
                        />

                        {/* Aqui comienza la tabla */}
                        <div className="card-body">
                            <div className="overflow-x-auto">
                                <table className="table table-bordered table-striped w-full">
                                    <thead>
                                        <tr className="font-bold g360-gradient rounded text-center">
                                            <th>ID</th>
                                            <th>Fecha</th>
                                            <th>Producto</th>
                                            <th>Código</th>
                                            <th>Movimiento</th>
                                            <th>Dirección</th>
                                            <th>Cantidad</th>
                                            <th>Stock antes</th>
                                            <th>Stock después</th>
                                            <th>Documento</th>
                                            <th>Motivo</th>
                                            <th>Usuario</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {movimientos.length === 0 ? (
                                            <NoExistenDatos colSpan={12} mensaje="No existen movimientos de inventario." />
                                        ) : (
                                            movimientos.map((movimiento) => (
                                                <tr key={movimiento.id}>
                                                    <td className="text-center">{movimiento.id}</td>
                                                    <td className="text-center">{formatDateTimeToMinutes(movimiento.fecha)}</td>
                                                    <td>{movimiento.producto_nombre || movimiento.producto?.nombre || 'Producto eliminado'}</td>
                                                    <td className="text-center">{movimiento.producto_codigo || '—'}</td>
                                                    <td>
                                                        {movimiento.tipo_movimiento
                                                            ? `${movimiento.tipo_movimiento.codigo ?? ''} ${movimiento.tipo_movimiento.nombre}`.trim()
                                                            : '—'}
                                                    </td>
                                                    <td className="text-center">{renderDireccion(movimiento.direccion)}</td>
                                                    <td className="text-end">{formatearDecimalSinCeros(movimiento.cantidad)}</td>
                                                    <td className="text-end text-slate-500">{formatearDecimalSinCeros(movimiento.stock_anterior)}</td>
                                                    <td className="text-end font-semibold">{formatearDecimalSinCeros(movimiento.stock_nuevo)}</td>
                                                    <td className="text-center">
                                                        {movimiento.id_transaccion ? `#${movimiento.id_transaccion}` : '—'}
                                                    </td>
                                                    <td className="text-sm text-slate-600">{movimiento.motivo || '—'}</td>
                                                    <td className="text-center text-sm">{movimiento.UrevCalc}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                                <div>
                                    <span className="text-lg font-semibold text-gray-700">Total de registros: </span>
                                    <span className="text-lg font-bold text-gray-700">{totales.registros}</span>
                                </div>
                                <div>
                                    <span className="text-lg font-semibold text-gray-700">Entradas: </span>
                                    <span className="text-lg font-bold text-green-700">{totales.entradas}</span>
                                </div>
                                <div>
                                    <span className="text-lg font-semibold text-gray-700">Salidas: </span>
                                    <span className="text-lg font-bold text-red-700">{totales.salidas}</span>
                                </div>
                            </div>

                            {/* Controles de paginación */}
                            <div className="flex flex-col items-center sm:flex-row sm:justify-between py-4 space-y-2 sm:space-y-0">
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={paginaActual === 1}
                                        className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                    >
                                        Primera
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(paginaActual - 1)}
                                        disabled={paginaActual === 1}
                                        className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                    >
                                        Anterior
                                    </button>
                                </div>

                                <span className="text-sm sm:text-lg font-medium text-center">
                                    Página {paginaActual} de {totalPaginas}
                                </span>

                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => handlePageChange(paginaActual + 1)}
                                        disabled={paginaActual === totalPaginas}
                                        className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === totalPaginas ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                    >
                                        Siguiente
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(totalPaginas)}
                                        disabled={paginaActual === totalPaginas}
                                        className={`px-2 sm:px-4 py-1 sm:py-2 text-sm sm:text-base text-white font-semibold rounded-lg ${paginaActual === totalPaginas ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                                    >
                                        Última
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
