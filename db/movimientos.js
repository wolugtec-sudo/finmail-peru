import { query } from './pool.js';

// ---- Usuarios ----
export async function upsertUsuario(email, nombre) {
  const { rows } = await query(
    `INSERT INTO usuarios (email, nombre)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre
     RETURNING id`,
    [email, nombre || null]
  );
  return rows[0].id;
}

// ---- Tokens ----
export async function guardarToken(usuarioId, tokens) {
  await query(
    `INSERT INTO gmail_tokens (usuario_id, access_token, refresh_token, expiry_date)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (usuario_id) DO UPDATE SET
       access_token  = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, gmail_tokens.refresh_token),
       expiry_date   = EXCLUDED.expiry_date`,
    [usuarioId, tokens.access_token, tokens.refresh_token || null, tokens.expiry_date || null]
  );
}

export async function getToken(usuarioId) {
  const { rows } = await query(`SELECT * FROM gmail_tokens WHERE usuario_id = $1`, [usuarioId]);
  return rows[0] || null;
}

export async function getLastSync(usuarioId) {
  const { rows } = await query(`SELECT last_sync_at FROM gmail_tokens WHERE usuario_id = $1`, [usuarioId]);
  return rows[0]?.last_sync_at || null;
}

export async function setLastSync(usuarioId, fecha) {
  await query(`UPDATE gmail_tokens SET last_sync_at = $2 WHERE usuario_id = $1`, [usuarioId, fecha]);
}

export async function getUsuariosConToken() {
  const { rows } = await query(`SELECT usuario_id FROM gmail_tokens`);
  return rows.map(r => r.usuario_id);
}

// ---- Movimientos ----
// Devuelve true si insertó (false si ya existía y se ignoró por dedupe).
export async function guardarMovimiento(usuarioId, m) {
  const { rowCount } = await query(
    `INSERT INTO movimientos
       (usuario_id, gmail_message_id, banco, tipo, monto, moneda, concepto, fecha, raw_snippet)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (usuario_id, gmail_message_id) DO NOTHING`,
    [usuarioId, m.gmail_message_id, m.banco, m.tipo, m.monto, m.moneda || 'PEN',
     m.concepto || null, m.fecha, m.raw_snippet || null]
  );
  return rowCount > 0;
}

export async function guardarNoParseado(usuarioId, email) {
  await query(
    `INSERT INTO correos_no_parseados (usuario_id, gmail_message_id, remitente, asunto, html)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (usuario_id, gmail_message_id) DO NOTHING`,
    [usuarioId, email.id, email.from, email.subject, email.html]
  );
}

export async function listarMovimientos(usuarioId, { limit = 200 } = {}) {
  const { rows } = await query(
    `SELECT * FROM movimientos WHERE usuario_id = $1 ORDER BY fecha DESC LIMIT $2`,
    [usuarioId, limit]
  );
  return rows;
}

export async function actualizarCategoria(usuarioId, movId, categoria) {
  await query(
    `UPDATE movimientos SET categoria = $3 WHERE id = $2 AND usuario_id = $1`,
    [usuarioId, movId, categoria]
  );
}
