// Script para inspeccionar el contenido de un token JWT

import jwt from 'jsonwebtoken';

// Clave secreta para JWT - En producción debe estar en variables de entorno
const JWT_SECRET = process.env.JWT_SECRET || "edumex_secret_key";

// Token a inspeccionar - reemplazar con un token real
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjQxYzMzYjE4LTk0ZjQtNDhiNi1iNmFjLWZmNmRkODk1MWU2ZSIsImNvcnJlbyI6ImFnb21lekBhbHR1bS5lZHUubXgiLCJyb2wiOiJkb2NlbnRlIiwiaWF0IjoxNzQ1NDQ5ODE1LCJleHAiOjE3NDU1MzYyMTV9.dTRzYBS5W0i5hS408JwOr91fG-1GbnbTIVD4nZr7VK4";

try {
  // Verificar el token
  const decoded = jwt.verify(token, JWT_SECRET);
  
  console.log('Token válido. Contenido:');
  console.log(JSON.stringify(decoded, null, 2));
  
  // Verificar si tiene profesorId
  if (decoded.profesorId) {
    console.log(`\nEl token contiene profesorId: ${decoded.profesorId}`);
  } else {
    console.log('\nEl token NO contiene profesorId');
    
    console.log('\nCreando token de prueba con profesorId:');
    // Crear un nuevo token con profesorId
    const payload = {
      ...decoded,
      profesorId: 3
    };
    
    // Omitir la opción expiresIn ya que el payload ya tiene exp
    const newToken = jwt.sign(payload, JWT_SECRET);
    console.log(`\nNuevo token con profesorId: ${newToken}`);
  }
} catch (error) {
  console.error('Error al verificar el token:', error.message);
}