-- ============================================================
-- FinMail Perú — Esquema de base de datos
-- ============================================================

-- Cada usuario/persona que conecta su Gmail
CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  nombre        TEXT,
  creado_en     TIMESTAMP DEFAULT NOW()
);

-- Tokens OAuth2 de Gmail por usuario
CREATE TABLE IF NOT EXISTS gmail_tokens (
  id             SERIAL PRIMARY KEY,
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  access_token   TEXT NOT NULL,
  refresh_token  TEXT NOT NULL,
  expiry_date    BIGINT,               -- epoch ms que devuelve google
  last_sync_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id)
);

-- Movimientos detectados (tabla única para todos los bancos)
CREATE TABLE IF NOT EXISTS movimientos (
  id                SERIAL PRIMARY KEY,
  usuario_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  gmail_message_id  TEXT NOT NULL,
  banco             TEXT NOT NULL,      -- INTERBANK | BCP | YAPE | PLIN | BBVA...
  tipo              TEXT NOT NULL CHECK (tipo IN ('INGRESO','GASTO')),
  monto             NUMERIC(12,2) NOT NULL,
  moneda            TEXT NOT NULL DEFAULT 'PEN',
  concepto          TEXT,               -- comercio / persona / destino
  categoria         TEXT DEFAULT 'Sin categoría',
  nota              TEXT DEFAULT '',
  transfer          BOOLEAN DEFAULT FALSE,  -- transferencia propia (no cuenta)
  fecha             TIMESTAMP NOT NULL, -- fecha del movimiento, no del email
  raw_snippet       TEXT,               -- extracto para debug
  creado_en         TIMESTAMP DEFAULT NOW(),
  -- dedupe por usuario: el mismo correo no se inserta dos veces
  UNIQUE(usuario_id, gmail_message_id)
);

-- Correos que llegaron de un banco pero el parser no supo leer (cuarentena)
CREATE TABLE IF NOT EXISTS correos_no_parseados (
  id                SERIAL PRIMARY KEY,
  usuario_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  gmail_message_id  TEXT NOT NULL,
  remitente         TEXT,
  asunto            TEXT,
  html              TEXT,
  creado_en         TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, gmail_message_id)
);

CREATE INDEX IF NOT EXISTS idx_mov_usuario_fecha ON movimientos(usuario_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_mov_categoria ON movimientos(categoria);
