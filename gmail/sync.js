import { getGmailClient } from './client.js';
import { parseEmail, REMITENTES } from '../parsers/index.js';
import {
  guardarMovimiento, guardarNoParseado,
  getLastSync, setLastSync
} from '../db/movimientos.js';

// Construye el query de Gmail: solo correos de bancos, desde la última sync.
function construirQuery(ultimaFecha) {
  const from = REMITENTES.map(d => `from:${d}`).join(' OR ');
  // Gmail acepta after:epoch_segundos. Si nunca sincronizó, trae últimos 30 días.
  const desde = ultimaFecha
    ? Math.floor(new Date(ultimaFecha).getTime() / 1000)
    : Math.floor((Date.now() - 30 * 24 * 3600 * 1000) / 1000);
  return `(${from}) after:${desde}`;
}

// Extrae from, subject, html de un mensaje de Gmail
function extraerEmail(msg) {
  const headers = msg.payload?.headers || [];
  const from = headers.find(h => h.name === 'From')?.value || '';
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  const html = extraerHtml(msg.payload) || extraerTextoPlano(msg.payload) || '';
  return { id: msg.id, from, subject, html };
}

function extraerHtml(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  if (payload.parts) {
    for (const p of payload.parts) {
      const h = extraerHtml(p);
      if (h) return h;
    }
  }
  return '';
}
function extraerTextoPlano(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  if (payload.parts) {
    for (const p of payload.parts) {
      const t = extraerTextoPlano(p);
      if (t) return t;
    }
  }
  return '';
}

/**
 * Sincroniza los correos bancarios de un usuario.
 * @returns {Promise<{procesados:number, guardados:number, noParseados:number}>}
 */
export async function sincronizarUsuario(usuarioId) {
  const gmail = await getGmailClient(usuarioId);
  const ultima = await getLastSync(usuarioId);
  const q = construirQuery(ultima);

  let procesados = 0, guardados = 0, noParseados = 0;
  let pageToken;

  do {
    const { data } = await gmail.users.messages.list({
      userId: 'me', q, maxResults: 100, pageToken,
    });
    const mensajes = data.messages || [];

    for (const { id } of mensajes) {
      const { data: full } = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
      const email = extraerEmail(full);
      procesados++;

      const mov = parseEmail(email);
      if (mov) {
        const inserted = await guardarMovimiento(usuarioId, mov);
        if (inserted) guardados++;
      } else {
        // llegó de un banco pero no supimos leerlo -> cuarentena para revisar el formato
        await guardarNoParseado(usuarioId, email);
        noParseados++;
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  await setLastSync(usuarioId, new Date());
  return { procesados, guardados, noParseados };
}
