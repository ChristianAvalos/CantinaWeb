/**
 * Utilidades de color para los íconos del panel lateral.
 *
 * El usuario puede elegir cualquier color base. Como el sidebar cambia de
 * degradado según el tema, el color se ajusta automáticamente para que el
 * ícono siempre se distinga: si el fondo es oscuro se aclara y si es claro se
 * oscurece, hasta alcanzar un contraste mínimo.
 */

export const PALETA_COLORES = [
  { nombre: 'Azul', valor: '#2563eb' },
  { nombre: 'Celeste', valor: '#0ea5e9' },
  { nombre: 'Turquesa', valor: '#0d9488' },
  { nombre: 'Verde', valor: '#16a34a' },
  { nombre: 'Ámbar', valor: '#d97706' },
  { nombre: 'Naranja', valor: '#ea580c' },
  { nombre: 'Rojo', valor: '#dc2626' },
  { nombre: 'Rosa', valor: '#db2777' },
  { nombre: 'Violeta', valor: '#7c3aed' },
  { nombre: 'Índigo', valor: '#4f46e5' },
  { nombre: 'Gris', valor: '#64748b' },
];

const NEGRO = [0, 0, 0];
const BLANCO = [255, 255, 255];

function limitarCanal(valor) {
  return Math.max(0, Math.min(255, Math.round(valor)));
}

export function hexARgb(hex) {
  const limpio = String(hex || '').trim().replace('#', '');
  const completo = limpio.length === 3
    ? limpio.split('').map((c) => c + c).join('')
    : limpio;
  if (!/^[0-9a-fA-F]{6}$/.test(completo)) return null;
  return [
    parseInt(completo.slice(0, 2), 16),
    parseInt(completo.slice(2, 4), 16),
    parseInt(completo.slice(4, 6), 16),
  ];
}

export function rgbAHex([r, g, b]) {
  return `#${[r, g, b].map((c) => limitarCanal(c).toString(16).padStart(2, '0')).join('')}`;
}

/** Convierte [r, g, b] al formato "R G B" que usan las variables del tema. */
export function rgbATripleta([r, g, b]) {
  return [r, g, b].map(limitarCanal).join(' ');
}

/** Convierte "R G B" del tema a "#rrggbb". */
export function tripletaAHex(tripleta) {
  const rgb = tripletaARgb(tripleta);
  return rgb ? rgbAHex(rgb) : null;
}

/** Convierte "R G B" (formato de las variables del tema) a [r, g, b]. */
export function tripletaARgb(tripleta) {
  const partes = String(tripleta || '').trim().split(/\s+/).map(Number);
  if (partes.length !== 3 || partes.some((n) => !Number.isFinite(n))) return null;
  return partes.map(limitarCanal);
}

function aLineal(canal) {
  const s = canal / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminancia([r, g, b]) {
  return 0.2126 * aLineal(r) + 0.7152 * aLineal(g) + 0.0722 * aLineal(b);
}

export function contraste(colorA, colorB) {
  const la = luminancia(colorA);
  const lb = luminancia(colorB);
  const alto = Math.max(la, lb);
  const bajo = Math.min(la, lb);
  return (alto + 0.05) / (bajo + 0.05);
}

/** Mezcla `color` hacia `destino`. cantidad 0 = color, 1 = destino. */
function mezclar(color, destino, cantidad) {
  return color.map((canal, i) => canal + (destino[i] - canal) * cantidad);
}

function peorContraste(color, fondos) {
  return fondos.reduce((minimo, fondo) => Math.min(minimo, contraste(color, fondo)), Infinity);
}

/**
 * Genera el degradado del panel a partir de un color base elegido por el
 * usuario: arranca en el color y termina un poco más oscuro, y calcula el
 * color del texto para que siempre se lea.
 */
export function degradadoDesdeColor(colorHex) {
  const base = hexARgb(colorHex);
  if (!base) return null;
  const fin = mezclar(base, NEGRO, 0.3);
  const luminanciaMedia = (luminancia(base) + luminancia(fin)) / 2;
  return {
    from: rgbATripleta(base),
    to: rgbATripleta(fin),
    on: luminanciaMedia > 0.55 ? '15 23 42' : '255 255 255',
  };
}

/**
 * Devuelve el color final del ícono para un color base y los extremos del
 * fondo del sidebar, aclarándolo u oscureciéndolo solo lo necesario para
 * alcanzar el contraste mínimo.
 */
export function colorIconoParaFondos(colorBase, fondos, minimo = 3) {
  const base = typeof colorBase === 'string' ? hexARgb(colorBase) : colorBase;
  const listaFondos = (fondos || [])
    .map((f) => (typeof f === 'string' ? tripletaARgb(f) : f))
    .filter(Boolean);

  if (!base || listaFondos.length === 0) return typeof colorBase === 'string' ? colorBase : null;
  if (peorContraste(base, listaFondos) >= minimo) return rgbAHex(base);

  for (const destino of [BLANCO, NEGRO]) {
    for (let paso = 1; paso <= 20; paso += 1) {
      const candidato = mezclar(base, destino, paso * 0.06);
      if (peorContraste(candidato, listaFondos) >= minimo) return rgbAHex(candidato);
    }
  }

  // Si ningún ajuste alcanza el mínimo, se toma el que más se acerca.
  const candidatos = [base];
  for (let paso = 1; paso <= 20; paso += 1) {
    candidatos.push(mezclar(base, BLANCO, paso * 0.06), mezclar(base, NEGRO, paso * 0.06));
  }
  return rgbAHex(candidatos.reduce((mejor, c) => (
    peorContraste(c, listaFondos) > peorContraste(mejor, listaFondos) ? c : mejor
  )));
}
