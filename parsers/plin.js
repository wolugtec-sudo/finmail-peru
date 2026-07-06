import { htmlToText, parseMonto, parseFecha, limpiarConcepto } from './util.js';

// Plin: servicio interbancario (BBVA, Interbank, Scotiabank, BanBif).
// Confirmaciones de envío/recepción de dinero entre personas.
export function parsePlin(email) {
  const texto = htmlToText(email.html) || email.subject || '';

  const money = parseMonto(texto);
  if (!money) return null;

  const esIngreso = /(recibiste|te enviaron|recibiste un plin|pago recibido|abono)/i.test(texto);
  const esGasto = /(enviaste|pagaste|realizaste|transferiste)/i.test(texto);
  const tipo = esIngreso ? 'INGRESO' : (esGasto ? 'GASTO' : 'GASTO');

  let concepto = 'Plin';
  let m =
    texto.match(/(?:a|de|para)\s+([A-ZÑÁÉÍÓÚ][A-Za-zÑñÁÉÍÓÚáéíóú\.\s]{2,50}?)(?:\s+por|\s+el|\.|,|$)/) ||
    texto.match(/([A-ZÑÁÉÍÓÚ][a-zñáéíóú]+\s+[A-ZÑÁÉÍÓÚ][a-zñáéíóú]+)/);
  if (m) concepto = limpiarConcepto(m[1]);

  return {
    banco: 'PLIN',
    tipo,
    monto: money.monto,
    moneda: money.moneda,
    concepto,
    fecha: parseFecha(texto),
    raw_snippet: texto.slice(0, 280),
  };
}
