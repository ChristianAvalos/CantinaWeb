import { useState, useEffect, useRef, useCallback } from 'react';
import clienteAxios from '../config/axios';
import { toast } from 'react-toastify';
import { formatearGuarani } from '../helpers/HelpersNumeros';
import { useAuth } from '../hooks/useAuth';
import AlertaModal from '../components/AlertaModal';

// ─── Debounce helper ────────────────────────────────────────────────
function useDebounce(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

// ─── Ícono SVG inline ───────────────────────────────────────────────
const IconSearch = () => (
    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);
const IconTrash = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);
const IconBarcode = () => (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v1m0 4v1m0 4v1m4-10v1m0 4v1m0 4v1m4-10v1m0 4v1m0-5h2m-2 4h2m-2 4h2M20 7v1m0 4v1m0 4v1" />
    </svg>
);
const IconCart = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
);
const IconCash = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);
const IconUser = () => (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

// ─── Componente principal ───────────────────────────────────────────
export default function VentasRapidas() {
    const { user } = useAuth({ middleware: 'auth' });
    const token = localStorage.getItem('AUTH_TOKEN');
    const searchInputRef = useRef(null);

    // ─── Estados del carrito ───────────────────────────────────────
    const [cart, setCart] = useState([]);

    // ─── Estados de búsqueda ──────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isSearching, setIsSearching] = useState(false);
    const searchContainerRef = useRef(null);

    const debouncedSearch = useDebounce(searchTerm, 250);

    // ─── Estados de pago ──────────────────────────────────────────
    const [tipoPago, setTipoPago] = useState([]);
    const [formaPago, setFormaPago] = useState([]);
    const [selectedTipoPago, setSelectedTipoPago] = useState('');
    const [selectedFormaPago, setSelectedFormaPago] = useState('');

    // ─── Estados de cliente ───────────────────────────────────────
    const [clientes, setClientes] = useState([]);
    const [clienteSearch, setClienteSearch] = useState('');
    const [selectedCliente, setSelectedCliente] = useState({ id: '', nombre: 'Consumidor Final' });
    const [showClienteDropdown, setShowClienteDropdown] = useState(false);
    const clienteContainerRef = useRef(null);

    // ─── Estados de alerta ────────────────────────────────────────
    const [mostrarAlerta, setMostrarAlerta] = useState(false);
    const [alertaConfig, setAlertaConfig] = useState({ tipo: 'informativo', mensaje: '', onConfirm: null });

    // ─── Estado de carga / proceso de pago ───────────────────────
    const [isProcessing, setIsProcessing] = useState(false);
    const [ventaCompletada, setVentaCompletada] = useState(false);
    const [ultimaVentaId, setUltimaVentaId] = useState(null);
    const [pagoRecibido, setPagoRecibido] = useState('');
    const [vuelto, setVuelto] = useState(0);

    // ─── Totales calculados ──────────────────────────────────────
    const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
    const total = subtotal; // sin impuestos por ahora

    // ─── Enfocar siempre el input de búsqueda ─────────────────────
    useEffect(() => {
        const focusSearch = () => {
            if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
                // Solo reenfocar si no está en un input de cantidad o en el input de pago
                const tag = document.activeElement?.tagName?.toLowerCase();
                if (tag !== 'input' || document.activeElement === searchInputRef.current) {
                    return;
                }
                // No reenfocar si el foco está en inputs del panel derecho
                if (document.activeElement?.closest('[data-panel="derecho"]')) {
                    return;
                }
            }
        };
        // Enfocar al montar
        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 100);
        document.addEventListener('click', focusSearch);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', focusSearch);
        };
    }, []);

    // Mantener foco en el buscador después de añadir producto
    useEffect(() => {
        if (!isProcessing && !mostrarAlerta) {
            searchInputRef.current?.focus();
        }
    }, [cart, isProcessing, mostrarAlerta]);

    // ─── Cargar tipos de pago y formas de pago ────────────────────
    useEffect(() => {
        const fetchOpcionesPago = async () => {
            try {
                const [tpRes, fpRes] = await Promise.all([
                    clienteAxios.get('api/tipo_pago', { headers: { Authorization: `Bearer ${token}` } }),
                    clienteAxios.get('api/forma_pago', { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                setTipoPago(tpRes.data || []);
                setFormaPago(fpRes.data || []);
                // Seleccionar primer valor por defecto
                if (tpRes.data?.length) setSelectedTipoPago(String(tpRes.data[0].id));
                if (fpRes.data?.length) setSelectedFormaPago(String(fpRes.data[0].id));
            } catch (err) {
                console.error('Error cargando opciones de pago:', err);
            }
        };
        fetchOpcionesPago();
    }, [token]);

    // ─── Búsqueda de productos (debounced) ────────────────────────
    useEffect(() => {
        if (!debouncedSearch || debouncedSearch.trim().length === 0) {
            setSearchResults([]);
            setShowDropdown(false);
            setSelectedIndex(-1);
            return;
        }

        let cancelled = false;

        const buscar = async () => {
            setIsSearching(true);
            try {
                const term = debouncedSearch.trim();
                // Primero intentar búsqueda exacta por código de barras
                const { data: barcodeData } = await clienteAxios.get(`api/productos/buscar?codigo_barras=${encodeURIComponent(term)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (cancelled) return;

                if (barcodeData?.producto) {
                    // Coincidencia exacta: añadir directamente y limpiar
                    addProductoToCart(barcodeData.producto);
                    setSearchTerm('');
                    setSearchResults([]);
                    setShowDropdown(false);
                    setIsSearching(false);
                    return;
                }

                // Si no hay coincidencia exacta, buscar por nombre/código
                const { data: searchData } = await clienteAxios.get(`api/productos?search=${encodeURIComponent(term)}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (cancelled) return;

                const results = searchData?.productos?.data || [];
                const activos = Array.isArray(results) ? results.filter(p => Number(p.id_TipoEstado) === 1) : [];
                setSearchResults(activos);
                setShowDropdown(activos.length > 0);
                setSelectedIndex(-1);
            } catch (err) {
                if (!cancelled) {
                    console.error('Error buscando productos:', err);
                    setSearchResults([]);
                    setShowDropdown(false);
                }
            } finally {
                if (!cancelled) setIsSearching(false);
            }
        };

        buscar();
        return () => { cancelled = true; };
    }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Cerrar dropdown al hacer clic fuera ──────────────────────
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
            if (clienteContainerRef.current && !clienteContainerRef.current.contains(e.target)) {
                setShowClienteDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ─── Buscar clientes ──────────────────────────────────────────
    const buscarClientes = useCallback(async (term = '') => {
        try {
            const params = new URLSearchParams({ all: '1', tipo_persona: 'Cliente', id_tipoestado: '1' });
            if (term) params.append('search', term);
            const { data } = await clienteAxios.get(`api/personas?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setClientes(data?.data || data || []);
        } catch (err) {
            console.error('Error buscando clientes:', err);
        }
    }, [token]);

    // ─── Añadir producto al carrito (versión estable para el efecto de búsqueda) ──
    const addProductoToCart = useCallback((producto) => {
        const precioVenta = Number(producto.precio_venta) || Number(producto.precio_compra) || 0;

        setCart(prev => {
            const existingIdx = prev.findIndex(item => item.id_producto === producto.id);
            if (existingIdx >= 0) {
                const updated = [...prev];
                const item = { ...updated[existingIdx] };
                item.cantidad += 1;
                item.subtotal = item.cantidad * item.precio_venta;
                updated[existingIdx] = item;
                return updated;
            }
            return [...prev, {
                cartId: Date.now() + Math.random(),
                id_producto: producto.id,
                codigo_barras: producto.codigo_barras || '',
                nombre: producto.nombre,
                precio_venta: precioVenta,
                cantidad: 1,
                unidad_medida: producto.unidad_medida?.nombre || producto.unidad_medida || 'UN',
                subtotal: precioVenta,
            }];
        });
        toast.success(`${producto.nombre} agregado`, { autoClose: 800, hideProgressBar: true, position: 'bottom-right' });
    }, []);

    // ─── Actualizar cantidad ──────────────────────────────────────
    const updateCantidad = (cartId, nuevaCantidad) => {
        const cant = Math.max(0, parseInt(nuevaCantidad, 10) || 0);
        if (cant === 0) {
            removeFromCart(cartId);
            return;
        }
        setCart(prev => prev.map(item =>
            item.cartId === cartId
                ? { ...item, cantidad: cant, subtotal: cant * item.precio_venta }
                : item
        ));
    };

    // ─── Eliminar del carrito ─────────────────────────────────────
    const removeFromCart = (cartId) => {
        setCart(prev => prev.filter(item => item.cartId !== cartId));
    };

    // ─── Cancelar pedido ──────────────────────────────────────────
    const cancelarPedido = () => {
        if (cart.length === 0) return;
        setAlertaConfig({
            tipo: 'confirmacion',
            mensaje: '¿Estás seguro de que deseas cancelar el pedido actual? Se perderán todos los productos agregados.',
            onConfirm: 'cancelar',
        });
        setMostrarAlerta(true);
    };

    const confirmarCancelacion = () => {
        setCart([]);
        setSearchTerm('');
        setSearchResults([]);
        setShowDropdown(false);
        setPagoRecibido('');
        setVuelto(0);
        setVentaCompletada(false);
        toast.info('Pedido cancelado', { autoClose: 1000, hideProgressBar: true });
    };

    // ─── Procesar pago ────────────────────────────────────────────
    const procesarPago = async () => {
        if (cart.length === 0) {
            toast.warning('No hay productos en el carrito');
            return;
        }
        if (!selectedTipoPago || !selectedFormaPago) {
            toast.warning('Selecciona un método de pago');
            return;
        }

        setIsProcessing(true);

        try {
            // 1. Crear la transacción cabecera
            const fechaActual = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const transactionPayload = {
                nombre: `Venta POS - ${new Date().toLocaleString('es-PY')}`,
                descripcion: `Venta rápida - ${cart.length} producto(s)`,
                fecha: fechaActual,
                id_organizacion: user?.id_organizacion || '',
                id_TipoEstado: '2',        // Completado
                id_TipoMovimiento: '2',    // Venta
                id_persona: selectedCliente.id || '',
                id_TipoPago: selectedTipoPago,
                id_FormaPago: selectedFormaPago,
                monto: total,
            };

            const { data: transaccionCreada } = await clienteAxios.post('api/creartransaccion', transactionPayload, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const idTransaccion = transaccionCreada?.id;
            if (!idTransaccion) throw new Error('No se recibió ID de transacción');

            // 2. Crear los detalles uno por uno
            for (const item of cart) {
                await clienteAxios.post('api/creartransaccion_detalle', {
                    id_transaccion: idTransaccion,
                    codigo_barras: item.codigo_barras,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_venta,
                }, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            }

            // 3. Éxito
            setUltimaVentaId(idTransaccion);
            setVentaCompletada(true);
            toast.success('¡Venta completada con éxito!', { autoClose: 2000 });

            // Limpiar carrito después de 2 segundos
            setTimeout(() => {
                setCart([]);
                setVentaCompletada(false);
                setPagoRecibido('');
                setVuelto(0);
                setSearchTerm('');
                searchInputRef.current?.focus();
            }, 2500);

        } catch (err) {
            console.error('Error al procesar la venta:', err);
            const mensaje = err.response?.data?.message || err.response?.data?.errors
                ? Object.values(err.response.data.errors).flat().join(', ')
                : 'Error al procesar la venta';
            toast.error(mensaje);
        } finally {
            setIsProcessing(false);
        }
    };

    // ─── Manejar teclas ───────────────────────────────────────────
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setSearchTerm('');
            setSearchResults([]);
            setShowDropdown(false);
            setSelectedIndex(-1);
            searchInputRef.current?.focus();
            return;
        }

        if (!showDropdown || searchResults.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
                selectProduct(searchResults[selectedIndex]);
            } else if (searchResults.length === 1) {
                selectProduct(searchResults[0]);
            }
        }
    };

    const selectProduct = (producto) => {
        addProductoToCart(producto);
        setSearchTerm('');
        setSearchResults([]);
        setShowDropdown(false);
        setSelectedIndex(-1);
        searchInputRef.current?.focus();
    };

    // ─── Calcular vuelto ──────────────────────────────────────────
    useEffect(() => {
        const pago = parseFloat(pagoRecibido) || 0;
        setVuelto(Math.max(0, pago - total));
    }, [pagoRecibido, total]);

    // ─── Seleccionar cliente ──────────────────────────────────────
    const selectCliente = (cliente) => {
        setSelectedCliente({ id: cliente.id, nombre: cliente.nombre });
        setClienteSearch(cliente.nombre);
        setShowClienteDropdown(false);
    };

    // ─── Render ────────────────────────────────────────────────────
    return (
        <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-10rem)] min-h-[600px]">
            {/* ═══════════════ PANEL IZQUIERDO: BÚSQUEDA + CARRITO ═══════════════ */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* ── Barra de búsqueda ── */}
                <div className="flex-shrink-0 mb-3" ref={searchContainerRef}>
                    <div className="relative">
                        <div className="flex items-center bg-white rounded-2xl shadow-lg border-2 border-blue-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 transition-all duration-200">
                            <div className="pl-4 pr-2">
                                <IconSearch />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                                placeholder="Escanear código o buscar producto por nombre..."
                                className="w-full py-4 pr-4 text-lg bg-transparent outline-none text-slate-700 placeholder-slate-400"
                                autoComplete="off"
                                disabled={isProcessing}
                            />
                            {isSearching && (
                                <div className="pr-4">
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
                                </div>
                            )}
                            <div className="pr-3 flex items-center gap-1 bg-blue-600 text-white rounded-r-2xl px-4 py-4">
                                <IconBarcode />
                                <span className="text-xs font-semibold hidden sm:inline">ESCÁNER</span>
                            </div>
                        </div>

                        {/* ── Dropdown de resultados ── */}
                        {showDropdown && searchResults.length > 0 && (
                            <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-72 overflow-y-auto">
                                {searchResults.slice(0, 15).map((prod, idx) => (
                                    <button
                                        key={prod.id}
                                        type="button"
                                        onClick={() => selectProduct(prod)}
                                        className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors duration-100 border-b border-slate-100 last:border-b-0 ${
                                            idx === selectedIndex ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-800 truncate">{prod.nombre}</div>
                                            <div className="text-xs text-slate-500">
                                                Código: {prod.codigo_barras || '—'} | Stock: {prod.cantidad_unidad || 'N/D'}
                                            </div>
                                        </div>
                                        <div className="ml-3 text-right flex-shrink-0">
                                            <div className="text-lg font-bold text-green-700">
                                                {formatearGuarani(prod.precio_venta || prod.precio_compra)}
                                            </div>
                                            <div className="text-xs text-slate-400">Gs.</div>
                                        </div>
                                    </button>
                                ))}
                                {searchResults.length > 15 && (
                                    <div className="text-center text-sm text-slate-500 py-2 bg-slate-50">
                                        +{searchResults.length - 15} resultados más — ajusta tu búsqueda
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 ml-2">
                        <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600 font-mono text-xs">Enter</kbd> agregar &nbsp;
                        <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600 font-mono text-xs">↑↓</kbd> navegar &nbsp;
                        <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600 font-mono text-xs">Esc</kbd> limpiar
                    </p>
                </div>

                {/* ── Tabla del carrito ── */}
                <div className="flex-1 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
                        <h2 className="font-bold text-slate-700 flex items-center gap-2">
                            <IconCart />
                            Productos ({cart.length})
                        </h2>
                        {cart.length > 0 && (
                            <span className="text-sm text-slate-500">{cart.reduce((acc, i) => acc + i.cantidad, 0)} unidades</span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-12">
                                <svg className="w-20 h-20 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                                </svg>
                                <p className="text-lg font-medium">No hay productos en el carrito</p>
                                <p className="text-sm">Escanea un código o busca un producto para comenzar</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm">
                                    <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <th className="text-left px-4 py-2.5">Producto</th>
                                        <th className="text-center px-2 py-2.5 w-20">Cant.</th>
                                        <th className="text-right px-2 py-2.5 w-28">P. Unit.</th>
                                        <th className="text-right px-4 py-2.5 w-28">Subtotal</th>
                                        <th className="text-center px-2 py-2.5 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {cart.map((item) => (
                                        <tr key={item.cartId} className="hover:bg-blue-50/40 transition-colors group">
                                            <td className="px-4 py-2.5">
                                                <div className="font-semibold text-slate-800">{item.nombre}</div>
                                                <div className="text-xs text-slate-400">{item.codigo_barras || 'S/Código'} — {item.unidad_medida}</div>
                                            </td>
                                            <td className="px-2 py-2.5">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.cantidad}
                                                    onChange={(e) => updateCantidad(item.cartId, e.target.value)}
                                                    className="w-16 text-center px-2 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none text-sm font-semibold"
                                                    onClick={(e) => e.target.select()}
                                                />
                                            </td>
                                            <td className="px-2 py-2.5 text-right text-sm font-medium text-slate-600">
                                                {formatearGuarani(item.precio_venta)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-bold text-slate-800">
                                                {formatearGuarani(item.subtotal)}
                                            </td>
                                            <td className="px-2 py-2.5 text-center">
                                                <button
                                                    onClick={() => removeFromCart(item.cartId)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                                                    title="Quitar producto"
                                                >
                                                    <IconTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════ PANEL DERECHO: RESUMEN + PAGO ═══════════════ */}
            <div data-panel="derecho" className="w-full lg:w-96 flex-shrink-0 flex flex-col gap-3">
                {/* ── Cliente ── */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4" ref={clienteContainerRef}>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1.5"><IconUser /> Cliente</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={clienteSearch}
                            onChange={(e) => {
                                setClienteSearch(e.target.value);
                                setShowClienteDropdown(true);
                                buscarClientes(e.target.value);
                            }}
                            onFocus={() => { buscarClientes(); setShowClienteDropdown(true); }}
                            placeholder="Buscar cliente..."
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none bg-slate-50"
                        />
                        {selectedCliente.id && (
                            <button
                                onClick={() => {
                                    setSelectedCliente({ id: '', nombre: 'Consumidor Final' });
                                    setClienteSearch('');
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                                title="Quitar cliente"
                            >
                                ×
                            </button>
                        )}
                        {showClienteDropdown && clientes.length > 0 && (
                            <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 max-h-44 overflow-y-auto">
                                {clientes.slice(0, 10).map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => selectCliente(c)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                                    >
                                        <div className="font-medium text-slate-700">{c.nombre}</div>
                                        {c.ruc && <div className="text-xs text-slate-400">RUC: {c.ruc}</div>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {selectedCliente.id ? (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                            Cliente: {selectedCliente.nombre}
                        </p>
                    ) : (
                        <p className="text-xs text-slate-400 mt-1">Consumidor Final</p>
                    )}
                </div>

                {/* ── Método de pago ── */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        <span className="flex items-center gap-1.5"><IconCash /> Método de pago</span>
                    </label>
                    <div className="space-y-2">
                        <select
                            value={selectedTipoPago}
                            onChange={(e) => setSelectedTipoPago(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none bg-slate-50"
                        >
                            {tipoPago.map(tp => (
                                <option key={tp.id} value={tp.id}>{tp.nombre || tp.descripcion}</option>
                            ))}
                        </select>
                        <select
                            value={selectedFormaPago}
                            onChange={(e) => setSelectedFormaPago(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none bg-slate-50"
                        >
                            {formaPago.map(fp => (
                                <option key={fp.id} value={fp.id}>{fp.nombre || fp.descripcion}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Totales ── */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl p-5 text-white">
                    <div className="flex justify-between items-center mb-2 text-slate-300 text-sm">
                        <span>Subtotal</span>
                        <span>{formatearGuarani(subtotal)} Gs.</span>
                    </div>
                    <div className="flex justify-between items-center mb-1 text-slate-300 text-sm">
                        <span>IVA (10%)</span>
                        <span>0 Gs.</span>
                    </div>
                    <div className="border-t border-slate-600 my-3" />
                    <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">TOTAL</span>
                        <span className="text-2xl font-extrabold tracking-tight">{formatearGuarani(total)} Gs.</span>
                    </div>

                    {/* ── Pago recibido / vuelto ── */}
                    {cart.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-600 space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-300 whitespace-nowrap">Recibido:</span>
                                <input
                                    type="number"
                                    min="0"
                                    value={pagoRecibido}
                                    onChange={(e) => setPagoRecibido(e.target.value)}
                                    placeholder="0"
                                    className="w-full px-3 py-2 text-right text-lg font-bold text-slate-900 bg-white rounded-xl outline-none focus:ring-2 focus:ring-green-400"
                                />
                            </div>
                            <div className={`flex justify-between items-center text-lg font-bold transition-colors ${vuelto > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                                <span>Vuelto:</span>
                                <span>{formatearGuarani(vuelto)} Gs.</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Botones de acción ── */}
                <div className="flex gap-3">
                    <button
                        onClick={cancelarPedido}
                        disabled={cart.length === 0 || isProcessing}
                        className="flex-1 py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider border-2 border-red-300 text-red-600 hover:bg-red-50 active:bg-red-100 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={procesarPago}
                        disabled={cart.length === 0 || isProcessing}
                        className="flex-[2] py-3.5 rounded-2xl font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg hover:shadow-xl hover:from-green-500 hover:to-emerald-400 active:scale-[0.98] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                Procesando...
                            </>
                        ) : ventaCompletada ? (
                            '¡VENTA COMPLETADA! ✓'
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                COBRAR ({formatearGuarani(total)} Gs.)
                            </>
                        )}
                    </button>
                </div>

                {/* ── Mensaje de venta completada ── */}
                {ventaCompletada && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center animate-pulse">
                        <div className="text-3xl mb-1">✅</div>
                        <p className="text-green-700 font-bold">¡Venta exitosa!</p>
                        <p className="text-green-600 text-sm">Venta #{ultimaVentaId}</p>
                    </div>
                )}
            </div>

            {/* ═══════════════ ALERTA MODAL ═══════════════ */}
            {mostrarAlerta && (
                <AlertaModal
                    tipo={alertaConfig.tipo}
                    mensaje={alertaConfig.mensaje}
                    onClose={() => setMostrarAlerta(false)}
                    onConfirm={() => {
                        setMostrarAlerta(false);
                        if (alertaConfig.onConfirm === 'cancelar') confirmarCancelacion();
                    }}
                />
            )}
        </div>
    );
}
