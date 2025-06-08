const fs = require('fs');

// Según el código encontrado, el token se almacena en "auth_token" en localStorage
// En nuestro caso, vamos a leerlo desde el archivo token.json existente

try {
  // Leer el archivo token.json que ya contiene el token
  const tokenData = fs.readFileSync('token.json', 'utf8');
  const parsedData = JSON.parse(tokenData);
  
  if (parsedData.token) {
    console.log("Token encontrado:", parsedData.token.substring(0, 20) + '...');
    
    // Guardar solo el token en un formato más conveniente para nuestras pruebas
    fs.writeFileSync('current_token.json', JSON.stringify({ token: parsedData.token }, null, 2));
    console.log("Token guardado en 'current_token.json'");
    
    // Mostrar comandos de ejemplo para probar los endpoints del asistente
    console.log("\nEjemplos de uso para probar los endpoints del asistente:\n");
    
    console.log(`# Obtener recomendaciones pedagógicas:`);
    console.log(`curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${parsedData.token}" -d '{"teacherId":1,"groupId":1,"students":[{"id":1,"name":"Luis González","averageGrade":6.4,"attendance":72,"subjects":[{"name":"Matemáticas","grade":5.8},{"name":"Español","grade":7.0}],"notes":"Frecuente falta de tareas"},{"id":2,"name":"Ana Martínez","averageGrade":8.5,"attendance":95,"subjects":[{"name":"Matemáticas","grade":8.2},{"name":"Español","grade":8.8}],"notes":"Participa activamente"},{"id":3,"name":"Diego Soto","averageGrade":5.0,"attendance":60,"subjects":[{"name":"Matemáticas","grade":4.5},{"name":"Español","grade":5.5}],"notes":"Muestra bajo ánimo"}]}' http://localhost:5000/api/teacher-assistant/recommendations\n`);
    
    console.log(`# Obtener plan de recuperación:`);
    console.log(`curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer ${parsedData.token}" -d '{"teacherId":1,"students":[{"id":1,"name":"Luis González","averageGrade":6.4,"attendance":72,"subjects":[{"name":"Matemáticas","grade":5.8},{"name":"Español","grade":7.0}],"notes":"Tareas incompletas"},{"id":2,"name":"Diego Soto","averageGrade":5.0,"attendance":60,"subjects":[{"name":"Matemáticas","grade":4.5},{"name":"Español","grade":5.5}],"notes":"Falta de motivación"}]}' http://localhost:5000/api/teacher-assistant/recovery-plan\n`);
  } else {
    console.log("No se encontró un token en token.json");
  }
} catch (error) {
  console.error("Error al leer o procesar el token:", error);
}