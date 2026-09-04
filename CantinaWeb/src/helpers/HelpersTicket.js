// Helpers para el comprobante de venta (ticket).
// Una única fuente de verdad: `construirTicketHtml(datos)` devuelve el HTML del
// ticket (con su propio <style> embebido). Ese mismo string se usa para:
//   1) la vista previa en pantalla (ModalComprobante)
//   2) la impresión (se inyecta en un iframe oculto y se llama window.print())
// De esta forma lo que se ve y lo que se imprime es SIEMPRE idéntico.

import { formatearGuarani, formatearMiles } from './HelpersNumeros';

// Escapa caracteres HTML para evitar romper el layout o inyectar contenido.
const esc = (valor) => String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Cantidad: entero con puntos de miles o decimal con coma.
const fmtCant = (valor) => {
    const n = Number(valor);
    if (Number.isNaN(n)) return '';
    if (Number.isInteger(n)) return n.toLocaleString('es-PY');
    return n.toLocaleString('es-PY', { maximumFractionDigits: 3 });
};

// Documento/RUC (formatearMiles maneja el guión del RUC paraguayo).
const fmtDoc = (valor) => (valor ? formatearMiles(String(valor)) : '');

const CSS_TICKET = `
    .ct-ticket{width:72mm;margin:0 auto;padding:2mm 2mm 5mm;background:#fff;color:#000;
        font-family:'Lucida Console',Monaco,'Courier New',monospace;font-size:11px;line-height:1.42;}
    .ct-center{text-align:center;}
    .ct-right{text-align:right;}
    .ct-bold{font-weight:700;}
    .ct-empresa{font-weight:700;font-size:13px;letter-spacing:.3px;}
    .ct-muted{color:#222;opacity:.75;}
    .ct-titulo{font-weight:700;text-align:center;font-size:12px;letter-spacing:.5px;}
    .ct-sep{border:0;border-top:1px dashed #000;margin:1.6mm 0;}
    .ct-fila{display:flex;justify-content:space-between;align-items:baseline;gap:4mm;}
    .ct-fila .ct-monto{white-space:nowrap;}
    .ct-prod{white-space:normal;word-break:break-word;}
    .ct-dim{color:#000;opacity:.85;}
    .ct-total{font-weight:700;font-size:13px;border-top:1px solid #000;padding-top:1mm;margin-top:1mm;}
    .ct-anulado{text-align:center;font-weight:700;font-size:14px;letter-spacing:2px;border:2px solid #000;padding:1mm;margin:2mm 0;}
    .ct-msg{font-weight:700;}
    .ct-mt4{margin-top:4mm;}
`;

/**
 * Construye el HTML del ticket a partir del snapshot `datos` generado por el
 * backend al momento de la venta (garantiza reimpresión fiel).
 */
export function construirTicketHtml(datos, { anulada = false } = {}) {
    const d = datos || {};

    const empresa = d.empresa || {};
    const cliente = d.cliente || null;
    const items = Array.isArray(d.items) ? d.items : [];

    const total = Number(d.total) || 0;
    const subtotalRaw = Number(d.subtotal);
    const subtotal = Number.isFinite(subtotalRaw) ? subtotalRaw : (total - (Number(d.iva) || 0));
    const iva = Number(d.iva) || 0;
    const montoRecibido = Number(d.monto_recibido) || 0;
    const vuelto = Number(d.vuelto) || 0;

    const lineas = [];

    // ── Encabezado (empresa) ──
    if (empresa.RazonSocial) lineas.push(`<div class="ct-empresa ct-center">${esc(empresa.RazonSocial)}</div>`);
    if (empresa.RUC) lineas.push(`<div class="ct-center ct-muted">RUC: ${esc(fmtDoc(empresa.RUC))}</div>`);
    if (empresa.Direccion) lineas.push(`<div class="ct-center ct-muted">${esc(empresa.Direccion)}</div>`);
    const telEmail = [empresa.Telefono && `Tel: ${esc(empresa.Telefono)}`, empresa.Email && esc(empresa.Email)]
        .filter(Boolean)
        .join('  ');
    if (telEmail) lineas.push(`<div class="ct-center ct-muted">${telEmail}</div>`);
    lineas.push('<hr class="ct-sep" />');

    // ── Título / número / fecha ──
    lineas.push(`<div class="ct-titulo">${esc(d.titulo || 'COMPROBANTE DE VENTA')}</div>`);
    if (d.numero) lineas.push(`<div class="ct-center ct-bold">Nº VENTA ${esc(String(d.numero))}</div>`);
    if (d.fecha) lineas.push(`<div class="ct-center ct-muted">${esc(d.fecha)}</div>`);

    if (anulada) {
        lineas.push('<div class="ct-anulado">ANULADA</div>');
    }

    lineas.push('<hr class="ct-sep" />');

    // ── Cliente ──
    const nombreCliente = cliente?.nombre || 'Consumidor Final';
    lineas.push(`<div class="ct-fila"><span>Cliente:</span><span class="ct-bold ct-right">${esc(nombreCliente)}</span></div>`);
    if (cliente?.documento) {
        lineas.push(`<div class="ct-fila"><span>Doc.:</span><span class="ct-right">${esc(fmtDoc(cliente.documento))}</span></div>`);
    }
    if (d.tipo_pago) lineas.push(`<div class="ct-fila"><span>Pago:</span><span class="ct-right">${esc(d.tipo_pago)}</span></div>`);
    if (d.forma_pago) lineas.push(`<div class="ct-fila"><span>Forma:</span><span class="ct-right">${esc(d.forma_pago)}</span></div>`);

    lineas.push('<hr class="ct-sep" />');

    // ── Ítems ──
    items.forEach((item) => {
        const nombre = item.producto || 'Producto';
        const cant = Number(item.cantidad) || 0;
        const pu = Number(item.precio_unitario) || 0;
        const st = Number(item.subtotal) || (cant * pu);

        lineas.push(`<div class="ct-prod">${esc(nombre)}</div>`);
        lineas.push(`<div class="ct-fila"><span class="ct-dim">${fmtCant(cant)} x ${formatearGuarani(pu)}</span><span class="ct-monto">${formatearGuarani(st)}</span></div>`);
        if (item.codigo) {
            lineas.push(`<div class="ct-muted">${esc(String(item.codigo))}</div>`);
        }
    });

    if (items.length === 0) {
        lineas.push('<div class="ct-muted ct-center">Sin ítems.</div>');
    }

    lineas.push('<hr class="ct-sep" />');

    // ── Totales ──
    lineas.push(`<div class="ct-fila"><span>SUB-TOTAL</span><span class="ct-monto">${formatearGuarani(subtotal)}</span></div>`);
    lineas.push(`<div class="ct-fila"><span>IVA 10%</span><span class="ct-monto">${formatearGuarani(iva)}</span></div>`);
    lineas.push(`<div class="ct-fila ct-total"><span>TOTAL</span><span class="ct-monto">${formatearGuarani(total)}</span></div>`);

    if (montoRecibido > 0 || vuelto > 0) {
        lineas.push(`<div class="ct-fila"><span>RECIBIDO</span><span class="ct-monto">${formatearGuarani(montoRecibido)}</span></div>`);
        lineas.push(`<div class="ct-fila"><span>VUELTO</span><span class="ct-monto">${formatearGuarani(vuelto)}</span></div>`);
    }

    // ── Pie ──
    lineas.push('<hr class="ct-sep" />');
    lineas.push('<div class="ct-msg ct-center">¡Gracias por su compra!</div>');
    if (d.cajero) lineas.push(`<div class="ct-center ct-muted ct-mt4">Atendido por: ${esc(d.cajero)}</div>`);
    lineas.push('<div class="ct-center ct-muted">Comprobante de venta no fiscal</div>');

    return `<style>${CSS_TICKET}</style><div class="ct-ticket">${lineas.join('')}</div>`;
}

/**
 * Abre el diálogo de impresión del navegador imprimiendo SOLO el contenido del
 * ticket (a través de un iframe oculto). Usa la impresora predeterminada
 * (ideal: la impresora de tickets configurada en el sistema).
 */
export function imprimirTicketHtml(html) {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const cerrar = () => {
        setTimeout(() => {
            if (iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
        }, 300);
    };

    iframe.onload = () => {
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (error) {
                console.error('Error al imprimir el comprobante:', error);
                cerrar();
            }
        }, 300);
    };
    iframe.contentWindow.onafterprint = cerrar;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Comprobante de venta</title>
<style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
</style>
</head>
<body>
${html}
</body>
</html>`);
    doc.close();
}
