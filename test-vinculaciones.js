import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Leer el token del archivo que se usa en el frontend
try {
  const tokenFile = fs.readFileSync('token.json', 'utf8');
  const tokenData = JSON.parse(tokenFile);
  
  if (!tokenData.token) {
    console.error('No se encontró el token en token.json');
    process.exit(1);
  }
  
  console.log('Token encontrado:', tokenData.token.substring(0, 15) + '...');
  
  // Mostrar ejemplos de uso
  console.log('\nEjemplos de uso de curl para probar los endpoints:\n');
  
  console.log(`# Obtener vinculaciones para un usuario:`);
  console.log(`curl -X GET -H "Authorization: Bearer ${tokenData.token}" http://localhost:5000/api/vinculaciones/2807b7a6-2cfb-4488-a1d4-dae303ce50cb\n`);
  
  console.log(`# Crear una nueva vinculación:`);
  console.log(`curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${tokenData.token}" -d '{"id_alumno": 1, "id_usuario": "2807b7a6-2cfb-4488-a1d4-dae303ce50cb", "tipo_relacion": "padre"}' http://localhost:5000/api/vinculaciones\n`);
  
  console.log(`# Eliminar una vinculación:`);
  console.log(`curl -X DELETE -H "Authorization: Bearer ${tokenData.token}" http://localhost:5000/api/vinculaciones/1/2807b7a6-2cfb-4488-a1d4-dae303ce50cb\n`);
  
} catch (error) {
  console.error('Error al leer el token:', error);
  process.exit(1);
}