import { google } from 'googleapis';
import dotenv from 'dotenv';
import { getToken, guardarToken } from '../db/movimientos.js';
dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export function crearOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BASE_URL}/auth/google/callback`
  );
}

// URL a la que mandamos al usuario para que autorice
export function getAuthUrl() {
  const oauth2 = crearOAuthClient();
  return oauth2.generateAuthUrl({
    access_type: 'offline',      // necesario para recibir refresh_token
    prompt: 'consent',           // fuerza refresh_token la primera vez
    scope: SCOPES,
  });
}

// Devuelve un cliente Gmail autenticado para un usuario, refrescando el token si expiró.
export async function getGmailClient(usuarioId) {
  const tokenRow = await getToken(usuarioId);
  if (!tokenRow) throw new Error(`Usuario ${usuarioId} no tiene token de Gmail`);

  const oauth2 = crearOAuthClient();
  oauth2.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expiry_date ? Number(tokenRow.expiry_date) : undefined,
  });

  // Si google refresca el token, lo persistimos
  oauth2.on('tokens', async (tokens) => {
    try {
      await guardarToken(usuarioId, {
        access_token: tokens.access_token || tokenRow.access_token,
        refresh_token: tokens.refresh_token, // puede venir undefined; guardarToken conserva el anterior
        expiry_date: tokens.expiry_date,
      });
    } catch (e) {
      console.error('[gmail] no se pudo persistir token refrescado:', e.message);
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2 });
}
