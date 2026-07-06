import { htmlToText, parseMonto, parseFecha, limpiarConcepto } from './util.js';

// BCP notifica operaciones: consumos, transferencias, pagos.
// Frases típicas: "realizaste una operación", "compra", "transferencia", "pago", "abono".
export function parseBCP(email) {
  const texto = htmlToText(email.html) || email.subject || '';

  const money = parseMonto(texto);
  if (!money) return null;

  const esIngreso = /(abono|recibiste|te depositaron|dep[oó]sito|ingreso|acreditaci[oó]n)/i.test(texto);
  const tipo = esIngreso ? 'INGRESO' : 'GASTO';

  let concepto = 'BCP';
  let m =
    texto.match(/(?:en|comercio|establecimiento|a)\s+([A-ZÑÁÉÍÓÚ0-9&.,\s]{2,60}?)(?:\s+por|\s+el|\s+con|\s+monto|\.|$)/i) ||
    texto.match(/(?:de|para)\s+([A-ZÑÁÉÍÓÚ][A-Za-zÑñÁÉÍÓÚáéíóú\s]{2,50})/);
  if (m) concepto = limpiarConcepto(m[1]);

  return {
    banco: 'BCP',
    tipo,
    monto: money.monto,
    moneda: money.moneda,
    concepto,
    fecha: parseFecha(texto),
    raw_snippet: texto.slice(0, 280),
  };
}
