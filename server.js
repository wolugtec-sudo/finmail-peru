import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRouter } from './auth/google.js';
import { sincronizarUsuario } from './gmail/sync.js';
import {
  listarMovimientos, actualizarCategoria,
  getUsuariosConToken, upsertUsuario
} from './db/movimientos.js';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// Sirve el frontend (public/index.html) en la raíz
app.use(express.static(path.join(__dirname, 'public')));

// ---- Auth ----
app.use('/auth', authRouter);

// ---- API ----

// Sincronizar un usuario manualmente: POST /api/sync  body: { usuarioId }
app.post('/api/sync', async (req, res) => {
  try {
    const usuarioId = req.body.usuarioId;
    if (!usuarioId) return res.status(400).json({ error: 'falta usuarioId' });
    const resultado = await sincronizarUsuario(usuarioId);
    res.json({ ok: true, ...resultado });
  } catch (e) {
    console.error('[api/sync]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Sincronizar TODOS los usuarios (para cron). Protegido con SYNC_SECRET.
// GET /api/sync-all?secret=...
app.get('/api/sync-all', async (req, res) => {
  if (req.query.secret !== process.env.SYNC_SECRET) {
    return res.status(403).json({ error: 'no autorizado' });
  }
  try {
    const usuarios = await getUsuariosConToken();
    const resultados = [];
    for (const uid of usuarios) {
      try {
        resultados.push({ usuarioId: uid, ...(await sincronizarUsuario(uid)) });
      } catch (e) {
        resultados.push({ usuarioId: uid, error: e.message });
      }
    }
    res.json({ ok: true, usuarios: usuarios.length, resultados });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Listar movimientos: GET /api/movimientos?usuarioId=1
app.get('/api/movimientos', async (req, res) => {
  try {
    const usuarioId = Number(req.query.usuarioId);
    if (!usuarioId) return res.status(400).json({ error: 'falta usuarioId' });
    const movs = await listarMovimientos(usuarioId);
    res.json(movs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Actualizar categoría: POST /api/movimientos/:id/categoria  body: { usuarioId, categoria }
app.post('/api/movimientos/:id/categoria', async (req, res) => {
  try {
    const { usuarioId, categoria } = req.body;
    await actualizarCategoria(usuarioId, Number(req.params.id), categoria);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FinMail backend escuchando en ${process.env.BASE_URL || 'http://localhost:' + PORT}`);
});
