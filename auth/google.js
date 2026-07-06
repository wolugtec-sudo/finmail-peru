import express from 'express';
import { google } from 'googleapis';
import { crearOAuthClient, getAuthUrl } from '../gmail/client.js';
import { upsertUsuario, guardarToken } from '../db/movimientos.js';

export const authRouter = express.Router();

// Paso 1: el usuario hace clic en "Conectar con Gmail" -> lo mandamos a Google
authRouter.get('/google', (req, res) => {
  res.redirect(getAuthUrl());
});

// Paso 2: Google redirige aquí con ?code=...
authRouter.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send('Autorización cancelada: ' + error);
  if (!code) return res.status(400).send('Falta el código de autorización');

  try {
    const oauth2 = crearOAuthClient();
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    // Averiguar el email del usuario que autorizó
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
    const { data: perfil } = await oauth2Api.userinfo.get().catch(() => ({ data: {} }));
    // userinfo requiere scope de perfil; si no está, usamos gmail profile como fallback
    let email = perfil.email;
    if (!email) {
      const gmail = google.gmail({ version: 'v1', auth: oauth2 });
      const prof = await gmail.users.getProfile({ userId: 'me' });
      email = prof.data.emailAddress;
    }

    const usuarioId = await upsertUsuario(email, perfil.name);
    await guardarToken(usuarioId, tokens);

    // Redirige de vuelta a tu app (ajusta la URL del front)
    res.redirect(`${process.env.BASE_URL}/?conectado=1&email=${encodeURIComponent(email)}`);
  } catch (e) {
    console.error('[auth] error en callback:', e.message);
    res.status(500).send('Error al conectar con Gmail: ' + e.message);
  }
});
