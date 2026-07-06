// Prueba los parsers sin necesidad de Gmail ni Postgres.
// Uso: node scripts/test-parsers.js
// Pega aquí HTML real de tus correos (o texto) para ver qué extrae cada parser.

import { parseEmail, detectarBanco } from '../parsers/index.js';

// === Casos de ejemplo (reemplaza el html por tus correos reales) ===
const ejemplos = [
  {
    id: 'ej-yape-1',
    from: 'notificaciones@yape.com.pe',
    subject: 'Yape - Confirmación',
    html: `<html><body>Yapeaste S/ 50.00 a Juan Pérez el 05/07/2026 a las 14:30. Gracias por usar Yape.</body></html>`,
  },
  {
    id: 'ej-yape-2',
    from: 'no-reply@yape.com.pe',
    subject: 'Te yapearon',
    html: `<html><body>¡Te yapearon! Recibiste S/ 120.00 de María Torres el 05/07/2026.</body></html>`,
  },
  {
    id: 'ej-plin-1',
    from: 'notificaciones@plin.pe',
    subject: 'Plin recibido',
    html: `<html><body>Recibiste un Plin de S/ 210.00 de Carlos Ruiz el 04/07/2026 a las 19:40.</body></html>`,
  },
  {
    id: 'ej-interbank-1',
    from: 'notificaciones@interbank.pe',
    subject: 'Interbank: consumo con tarjeta',
    html: `<html><body>Realizaste un consumo por S/ 65.00 en GRIFO PRIMAX el 04/07/2026 12:10 con tu tarjeta Interbank.</body></html>`,
  },
  {
    id: 'ej-bcp-1',
    from: 'notificaciones@bcp.com.pe',
    subject: 'BCP: Operación realizada',
    html: `<html><body>Estimado cliente, realizaste una compra por S/ 890.50 en DISTRIBUIDORA LIMA SAC el 05/07/2026 08:02.</body></html>`,
  },
  {
    id: 'ej-bcp-abono',
    from: 'notificaciones@bcp.com.pe',
    subject: 'BCP: Abono recibido',
    html: `<html><body>Recibiste un abono por S/ 1,200.00 en tu cuenta el 05/07/2026.</body></html>`,
  },
];

console.log('='.repeat(70));
for (const email of ejemplos) {
  const banco = detectarBanco(email.from, email.subject);
  const mov = parseEmail(email);
  console.log(`\n[${email.id}]  banco detectado: ${banco || 'NINGUNO'}`);
  if (mov) {
    console.log(`  tipo:     ${mov.tipo}`);
    console.log(`  monto:    ${mov.moneda} ${mov.monto}`);
    console.log(`  concepto: ${mov.concepto}`);
    console.log(`  fecha:    ${mov.fecha.toLocaleString('es-PE')}`);
  } else {
    console.log('  ⚠ NO se pudo parsear');
  }
}
console.log('\n' + '='.repeat(70));
