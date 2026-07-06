# FinMail Perú — Backend

Lee notificaciones bancarias desde Gmail (Interbank, BCP, Yape, Plin) y las guarda en Postgres.
Solo lectura de correos. Nunca accede a tu banca ni mueve dinero.

## Qué hace

1. Conecta tu Gmail con OAuth2 (`/auth/google`).
2. Lista los correos de bancos desde tu última sincronización.
3. Detecta el banco por remitente/asunto y aplica el parser correcto.
4. Extrae monto, tipo (ingreso/gasto), concepto y fecha.
5. Guarda todo en la tabla `movimientos` (sin duplicar).

## Requisitos

- Node.js 18+
- Una base de datos Postgres
- Un proyecto en Google Cloud con la Gmail API y credenciales OAuth2

## Instalación local

```bash
npm install
cp .env.example .env      # y llena tus valores
npm run init-db           # crea las tablas
npm start                 # levanta el servidor en http://localhost:3000
```

Luego abre `http://localhost:3000` en el navegador: verás la app (frontend en `public/index.html`).
El botón **Continuar con Google** te lleva a `/auth/google`, autorizas tu cuenta y vuelves a la app.
Para traer tus movimientos usa el botón **Sincronizar** dentro de la app, o por consola:

```bash
# sincroniza tu usuario (usuarioId lo ves en la tabla usuarios, normalmente 1)
curl -X POST http://localhost:3000/api/sync -H "Content-Type: application/json" -d '{"usuarioId":1}'

# lista lo que detectó
curl "http://localhost:3000/api/movimientos?usuarioId=1"
```

## Probar los parsers sin Gmail

```bash
npm run test-parsers
```

Edita `scripts/test-parsers.js` y pega el HTML real de tus correos para ver qué extrae.
Así ajustamos los regex de cada banco.

## Desplegar en Railway

1. Sube este repo a GitHub y créalo como proyecto en Railway.
2. Agrega el plugin **Postgres** (Railway inyecta `DATABASE_URL` solo).
3. En Variables del servicio, agrega: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `SYNC_SECRET`, y `BASE_URL` con tu dominio público (ej. `https://finmail.up.railway.app`).
4. En Google Cloud, agrega a los "URIs de redirección autorizados":
   `https://TU-DOMINIO.up.railway.app/auth/google/callback`
5. Corre las tablas una vez: en Railway, en el shell del servicio, `npm run init-db`.
6. Para sincronizar automáticamente, crea un **Cron** en Railway que llame cada 15 min:
   `curl "https://TU-DOMINIO.up.railway.app/api/sync-all?secret=TU_SYNC_SECRET"`

## Frontend

El frontend es un solo archivo en `public/index.html` y lo sirve el mismo backend en la raíz `/`.
No necesitas otro servicio: al desplegar en Railway, `https://TU-DOMINIO.up.railway.app` muestra la app.

Nota sobre el `usuarioId`: en este demo, al volver del callback se asume `usuarioId=1` y se guarda
en `localStorage`. Si vas a tener varios usuarios, haz que el callback (`auth/google.js`) devuelva
el `usuarioId` real (por query o sesión) y guárdalo en el front.

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET  | `/auth/google` | Inicia la conexión con Gmail |
| GET  | `/auth/google/callback` | Callback de OAuth2 (lo llama Google) |
| POST | `/api/sync` | Sincroniza un usuario `{ usuarioId }` |
| GET  | `/api/sync-all?secret=...` | Sincroniza todos (para cron) |
| GET  | `/api/movimientos?usuarioId=1` | Lista movimientos |
| POST | `/api/movimientos/:id/categoria` | Cambia categoría |

## Ajustar los parsers a tus correos

Los parsers de `parsers/interbank.js`, `bcp.js`, `yape.js`, `plin.js` traen una primera
versión de los regex. El monto, tipo y fecha suelen salir bien; el **concepto** (nombre del
comercio o persona) depende del texto exacto de cada notificación.

Cuando conectes tu Gmail y sincronices, los correos que el parser no entienda quedan en la
tabla `correos_no_parseados`. Revisa ahí el HTML real y ajusta el regex correspondiente.
