import { Router } from "express";
import { predictRiskWithAI, simulatePrediction, RiskPredictionInput } from "../services/ai-risk-prediction";
import { logger } from "../logger";
import { storage } from "../storage";

const router = Router();

import { Request, Response, NextFunction } from "express";

// No necesitamos estos middlewares ya que estamos usando JWT auth en routes.ts
// El middleware verifyToken ya se aplica a todas las rutas bajo /api/ai

// Ruta para predecir riesgo con IA
router.post("/predict-risk", async (req: Request, res: Response) => {
  try {
    const {
      student_name,
      student_id,
      total_debt,
      percentage_on_time,
      average_delay_days,
      active_debts,
      payment_history,
      group_risk_level,
      group_name,
      school_level
    } = req.body;

    // Validamos los datos mínimos necesarios
    if (!student_id || !student_name) {
      return res.status(400).json({
        error: "Datos insuficientes para realizar la predicción",
      });
    }

    // Preparamos los datos para la predicción
    const predictionData: RiskPredictionInput = {
      student_name,
      student_id,
      total_debt: total_debt || "0",
      percentage_on_time: percentage_on_time || 0,
      average_delay_days: average_delay_days || 0,
      active_debts: active_debts || 0,
      payment_history: payment_history || "No disponible",
      group_risk_level: group_risk_level || "medio",
      group_name: group_name || "No especificado",
      school_level: school_level || "No especificado"
    };

    // Verificamos si tenemos la API key configurada
    const useRealAI = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10;
    
    // Realizamos la predicción
    let result;
    if (useRealAI) {
      logger.info("Usando Claude AI para predicción de riesgo");
      result = await predictRiskWithAI(predictionData);
    } else {
      logger.info("Usando simulación para predicción de riesgo (ANTHROPIC_API_KEY no configurada)");
      result = simulatePrediction(predictionData);
    }

    // Almacenamos la predicción en la base de datos si está disponible la tabla
    try {
      // Versión simplificada para evitar problemas. En producción, se implementaría correctamente.
      logger.info("Simulando guardado de predicción para estudiante:", student_id);
      // La función createRiskPrediction se agregaría luego a storage
    } catch (dbError: any) {
      logger.error("Error al guardar la predicción en la base de datos:", dbError);
      // Continuamos aunque falle el almacenamiento
    }

    // Devolvemos el resultado
    return res.status(200).json(result);
  } catch (error) {
    logger.error("Error en la predicción de riesgo:", error);
    return res.status(500).json({
      error: "Error al procesar la predicción",
      message: error.message,
    });
  }
});

// Ruta para obtener el historial de predicciones para un estudiante específico
router.get("/predictions/:studentId", async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    
    // Simulamos obtener las predicciones para evitar errores
    logger.info("Simulando obtención de predicciones para el estudiante:", studentId);
    
    // En una implementación real, esto vendría de la base de datos
    const predictions = [];
    
    return res.status(200).json(predictions || []);
  } catch (error) {
    logger.error("Error al obtener predicciones:", error);
    return res.status(500).json({
      error: "Error al obtener las predicciones",
      message: error.message,
    });
  }
});

export default router;