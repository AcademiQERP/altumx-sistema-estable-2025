// Archivo temporal para la ruta de adeudos próximos - Versión ultra simplificada
export default function setupTempRoutes(app) {
  app.get("/api/debts/upcoming", (req, res) => {
    console.log("ENDPOINT REACHED: /api/debts/upcoming - RETURNING STATIC DATA");
    
    try {
      // Respuesta estática absolutamente simple para pruebas
      return res.status(200).send([
        {
          "id": 1,
          "alumnoId": 1,
          "conceptoId": 1,
          "montoTotal": "4000",
          "fechaLimite": "2025-04-15",
          "estatus": "pendiente",
          "studentName": "Ana García Pérez"
        },
        {
          "id": 2,
          "alumnoId": 2,
          "conceptoId": 1,
          "montoTotal": "2800",
          "fechaLimite": "2025-04-17",
          "estatus": "pendiente",
          "studentName": "Juan Pérez López"
        }
      ]);
    } catch (err) {
      console.error("ERROR EN TEMP-ROUTES:", err);
      return res.status(500).send({ error: "Error temporal", message: err.message });
    }
  });
  
  // Registramos una ruta de prueba para verificar que el archivo está siendo cargado
  app.get("/api/test-temp-routes", (req, res) => {
    console.log("ENDPOINT REACHED: /api/test-temp-routes");
    return res.status(200).send({ success: true, message: "Rutas temporales cargadas correctamente" });
  });
};