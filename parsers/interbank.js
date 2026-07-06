import { htmlToText, parseMonto, parseFecha, limpiarConcepto } from './util.js';

// Interbank suele notificar: consumos con tarjeta, transferencias, abonos.
// Frases típicas: "realizaste un consumo", "se realizó una compra", "recibiste una transferencia",
// "abono", "cargo por", montos en formato "S/ 123.45".
export function parseInterbank(email) {
  const texto = htmlToText(email.html) || email.subject || '';

  const money = parseMonto(texto);
  if (!money) return null;

  const esIngreso = /(abono|recibiste|te transfiri|dep[oó]sito|ingreso|acreditaci[oó]n)/i.test(texto);
  const tipo = esIngreso ? 'INGRESO' : 'GASTO';

  // comercio: después de "en", "a favor de", "de"
  let concepto = 'Interbank';
  let m =
    texto.match(/(?:en|a favor de|comercio|establecimiento)\s+([A-ZÑÁÉÍÓÚ0-9&.,\s]{2,60}?)(?:\s+por|\s+el|\s+con|\s+monto|\.|$)/i) ||
    texto.match(/(?:de|para)\s+([A-ZÑÁÉÍÓÚ][A-Za-zÑñÁÉÍÓÚáéíóú\s]{2,50})/);
  if (m) concepto = limpiarConcepto(m[1]);

  return {
    banco: 'INTERBANK',
    tipo,
    monto: money.monto,
    moneda: money.moneda,
    concepto,
    fecha: parseFecha(texto),
    raw_snippet: texto.slice(0, 280),
  };
}
