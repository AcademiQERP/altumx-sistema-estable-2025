/**
 * Script para verificar la validez del token JWT
 */
const jwt = require('jsonwebtoken');

// Obtener el token de la línea de comandos
const token = process.argv[2];

if (!token) {
  console.error('Por favor, proporciona un token JWT como argumento');
  console.log('Uso: node test-auth-token.js <TOKEN>');
  process.exit(1);
}

try {
  // Intentar descodificar el token sin verificar la firma
  const decoded = jwt.decode(token, { complete: true });
  
  if (!decoded) {
    console.error('❌ Token inválido: No se pudo decodificar');
    process.exit(1);
  }
  
  console.log('✅ Información del token (sin verificar firma):');
  console.log('Header:', JSON.stringify(decoded.header, null, 2));
  console.log('Payload:', JSON.stringify(decoded.payload, null, 2));
  
  // Verificar fechas de expiración
  const now = Math.floor(Date.now() / 1000);
  const expiry = decoded.payload.exp;
  
  if (!expiry) {
    console.log('⚠️ El token no tiene fecha de expiración (exp)');
  } else if (expiry < now) {
    console.log(`❌ Token expirado el ${new Date(expiry * 1000).toLocaleString()}`);
    console.log(`   Tiempo actual: ${new Date(now * 1000).toLocaleString()}`);
    console.log(`   Expirado hace: ${Math.floor((now - expiry) / 60)} minutos`);
  } else {
    console.log(`✅ Token válido hasta: ${new Date(expiry * 1000).toLocaleString()}`);
    console.log(`   Tiempo restante: ${Math.floor((expiry - now) / 60)} minutos`);
  }
  
  // Intentar verificar el token con la clave secreta por defecto
  const secret = process.env.JWT_SECRET || "edumex_secret_key";
  
  try {
    const verified = jwt.verify(token, secret);
    console.log('✅ Firma verificada correctamente con clave secreta predeterminada');
  } catch (verifyError) {
    console.log('⚠️ La firma no pudo ser verificada con la clave secreta predeterminada');
    console.log('   Esto puede ser normal si se está usando una clave secreta diferente');
    console.log('   Error:', verifyError.message);
  }
  
} catch (error) {
  console.error('❌ Error al procesar el token:', error.message);
  process.exit(1);
}