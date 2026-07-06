import { htmlToText, parseMonto, parseFecha, limpiarConcepto } from './util.js';

// Yape: confirmaciones de "Yapeaste" (gasto) o "Te yapearon / recibiste" (ingreso).
// El monto suele venir como "S/ 50". El nombre de la persona aparece cerca.
export function parseYape(email) {
  const texto = htmlToText(email.html) || email.subject || '';

  const money = parseMonto(texto);
  if (!money) return null;

  // Ingreso: te yapearon / recibiste. Gasto: yapeaste / pagaste
  const esIngreso = /(te yapearon|recibiste|te enviaron|pago recibido|recibiste un yape)/i.test(texto);
  const esGasto = /(yapeaste|enviaste|pagaste|realizaste un yape)/i.test(texto);
  const tipo = esIngreso ? 'INGRESO' : (esGasto ? 'GASTO' : 'GASTO');

  // persona: "a Juan Pérez", "de Juan Pérez"
  let concepto = 'Yape';
  let m =
    texto.match(/(?:a|de|para)\s+([A-ZÑÁÉÍÓÚ][A-Za-zÑñÁÉÍÓÚáéíóú\.\s]{2,50}?)(?:\s+por|\s+el|\.|,|$)/) ||
    texto.match(/([A-ZÑÁÉÍÓÚ][a-zñáéíóú]+\s+[A-ZÑÁÉÍÓÚ][a-zñáéíóú]+)/);
  if (m) concepto = limpiarConcepto(m[1]);

  return {
    banco: 'YAPE',
    tipo,
    monto: money.monto,
    moneda: money.moneda,
    concepto,
    fecha: parseFecha(texto),
    raw_snippet: texto.slice(0, 280),
  };
}
