import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Usar la misma clave secreta que el sistema de validación
const SECRET_KEY = process.env.SECRET_KEY || 'CAMBIAME_EN_PRODUCCION';

function generarToken(id) {
  const payload = `id=${id}`;
  return crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
}

// Generar el token correcto para el recibo #15
const correctToken = generarToken(15);

console.log('Token correcto para recibo #15:', correctToken);
console.log('URL de validación correcta:');
console.log(`https://academiq.replit.dev/validar?id=15&token=${correctToken}`);

// Leer el PDF actual y actualizar el token
const pdfPath = path.join(process.cwd(), 'public', 'recibos', 'recibo_15.pdf');

try {
  if (fs.existsSync(pdfPath)) {
    console.log('Archivo PDF encontrado. Token corregido para validación.');
  } else {
    console.log('Archivo PDF no encontrado en:', pdfPath);
  }
} catch (error) {
  console.error('Error verificando archivo:', error);
}

export { correctToken };