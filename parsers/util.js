import * as cheerio from 'cheerio';

/**
 * @typedef {Object} MovimientoNormalizado
 * @property {string} banco
 * @property {'INGRESO'|'GASTO'} tipo
 * @property {number} monto            - siempre positivo
 * @property {string} moneda           - 'PEN' | 'USD'
 * @property {string} concepto         - comercio / persona / destino
 * @property {Date}   fecha
 * @property {string} [raw_snippet]
 */

// Convierte el HTML del correo a texto plano normalizado (espacios colapsados)
export function htmlToText(html) {
  if (!html) return '';
  const $ = cheerio.load(html);
  $('style, script').remove();
  return $('body').text().replace(/\s+/g, ' ').trim() || $.root().text().replace(/\s+/g, ' ').trim();
}

// Detecta moneda y extrae el número. Soporta "S/ 1,234.56", "PEN 1234.56", "US$ 20.00"
export function parseMonto(texto) {
  // moneda
  let moneda = 'PEN';
  if (/US\$|USD|d[oó]lares/i.test(texto)) moneda = 'USD';

  // busca un patrón de dinero: símbolo opcional + número con miles/decimales
  const m = texto.match(/(?:S\/|PEN|US\$|USD|\$)\s*([\d]{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)/i);
  if (!m) return null;

  let num = m[1];
  // normaliza: si tiene coma como separador de miles y punto decimal -> quita comas
  // caso "1,234.56"
  if (/,\d{3}/.test(num) || /\.\d{3}/.test(num)) {
    // determinar cuál es el decimal (el último separador con 2 dígitos)
    const lastDot = num.lastIndexOf('.');
    const lastComma = num.lastIndexOf(',');
    const decSep = lastDot > lastComma ? '.' : ',';
    const thouSep = decSep === '.' ? ',' : '.';
    num = num.split(thouSep).join('');
    if (decSep === ',') num = num.replace(',', '.');
  } else {
    // sin miles: solo puede tener un decimal con coma o punto
    num = num.replace(',', '.');
  }
  const monto = parseFloat(num);
  return isNaN(monto) ? null : { monto, moneda };
}

// Fechas comunes en correos peruanos: dd/mm/yyyy, dd-mm-yyyy, "12 de julio de 2026"
const MESES = { enero:0, febrero:1, marzo:2, abril:3, mayo:4, junio:5, julio:6, agosto:7, setiembre:8, septiembre:8, octubre:9, noviembre:10, diciembre:11 };

export function parseFecha(texto, horaFallback = '00:00') {
  // dd/mm/yyyy o dd-mm-yyyy
  let m = texto.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    const hora = (texto.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/) || [null, horaFallback.split(':')[0], horaFallback.split(':')[1]]);
    return new Date(+y, +mo - 1, +d, +hora[1] || 0, +hora[2] || 0, +hora[3] || 0);
  }
  // "12 de julio de 2026"
  m = texto.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i);
  if (m) {
    const d = +m[1], mo = MESES[m[2].toLowerCase()], y = +m[3];
    if (mo !== undefined) {
      const hora = (texto.match(/(\d{1,2}):(\d{2})/) || [null, 0, 0]);
      return new Date(y, mo, d, +hora[1] || 0, +hora[2] || 0);
    }
  }
  // si no encuentra, usa ahora (mejor que romper)
  return new Date();
}

// Limpia el nombre del comercio/persona
export function limpiarConcepto(str) {
  if (!str) return 'Desconocido';
  return str.replace(/\s+/g, ' ').replace(/[.\-–]+$/, '').trim().slice(0, 120) || 'Desconocido';
}
