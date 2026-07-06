import { parseInterbank } from './interbank.js';
import { parseBCP } from './bcp.js';
import { parseYape } from './yape.js';
import { parsePlin } from './plin.js';

// El orden importa: Yape/Plin primero porque pueden llegar desde dominios de bancos.
const REGLAS = [
  {
    banco: 'YAPE',
    match: (from, subject) => /yape/i.test(from) || /yape|yapeaste|te yapearon/i.test(subject),
    parser: parseYape,
  },
  {
    banco: 'PLIN',
    match: (from, subject) => /plin/i.test(from) || /plin/i.test(subject),
    parser: parsePlin,
  },
  {
    banco: 'INTERBANK',
    match: (from, subject) => /interbank|ibk\.pe/i.test(from) || /interbank/i.test(subject),
    parser: parseInterbank,
  },
  {
    banco: 'BCP',
    match: (from, subject) => /bcp\.com\.pe|viabcp|notificacionesbcp/i.test(from) || /\bbcp\b/i.test(subject),
    parser: parseBCP,
  },
];

// Remitentes que nos interesan (para el query de Gmail).
// Ajusta si ves que tus correos llegan desde otro dominio.
export const REMITENTES = [
  'yape.com.pe', 'yape',
  'plin', 'plin.pe',
  'interbank.pe', 'ibk.pe', 'interbank.com.pe',
  'bcp.com.pe', 'viabcp.com', 'notificacionesbcp.com.pe',
];

/**
 * Detecta el banco por remitente/asunto y aplica el parser correspondiente.
 * @param {{id:string, from:string, subject:string, html:string}} email
 * @returns {import('./util.js').MovimientoNormalizado & {gmail_message_id:string} | null}
 */
export function parseEmail(email) {
  const from = email.from || '';
  const subject = email.subject || '';

  for (const regla of REGLAS) {
    if (regla.match(from, subject)) {
      try {
        const r = regla.parser(email);
        if (r) return { ...r, banco: regla.banco, gmail_message_id: email.id };
      } catch (err) {
        console.error(`[parser:${regla.banco}] error en ${email.id}:`, err.message);
        return null;
      }
      // Si el parser devolvió null, seguimos probando otras reglas por si acaso
    }
  }
  return null;
}

// Para diagnosticar: dice qué banco detecta sin parsear
export function detectarBanco(from = '', subject = '') {
  for (const r of REGLAS) if (r.match(from, subject)) return r.banco;
  return null;
}
