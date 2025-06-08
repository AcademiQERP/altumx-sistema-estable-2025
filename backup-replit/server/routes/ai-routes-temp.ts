import express from 'express';
import { aiService } from '../services/ai-service';
import { storage } from '../storage';

const router = express.Router();

/**
 * Ruta para realizar una predicción de riesgo basada en los datos de un estudiante
 * POST /api/ai/risk-prediction
 */
router.post('/risk-prediction', async (req, res) => {
  try {
    const { studentId, prompt } = req.body;

    if (!studentId || !prompt) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del estudiante y el prompt'
      });
    }

    // Enviar el prompt a Claude para obtener predicción
    const predictionResult = await aiService.predictRisk(prompt);

    // Si hay un error en la predicción, devolver el error
    if (!predictionResult.success || !predictionResult.prediction) {
      return res.status(500).json({
        success: false,
        error: predictionResult.error || 'Error al generar la predicción'
      });
    }

    // Guardar la predicción en la base de datos
    const saveResult = await aiService.saveRiskPrediction(
      studentId,
      predictionResult.prediction
    );

    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        error: saveResult.error || 'Error al guardar la predicción'
      });
    }

    // Devolver resultados
    return res.status(200).json({
      success: true,
      prediction: predictionResult.prediction,
      savedPrediction: saveResult.savedPrediction
    });
  } catch (error) {
    console.error('Error en la ruta de predicción de riesgo:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * Ruta para obtener predicciones guardadas para un estudiante específico
 * GET /api/ai/risk-predictions/:studentId
 */
router.get('/risk-predictions/:studentId', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }

    // Fetch predictions for the student
    const predictions = await aiService.getStudentRiskPredictions(studentId);

    return res.status(200).json({
      success: true,
      predictions
    });
  } catch (error) {
    console.error('Error al obtener predicciones de riesgo:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * Ruta todo-en-uno para generar un prompt, realizar predicción y guardarla en un solo paso
 * GET /api/ai/generate-prediction/:studentId
 */
router.get('/generate-prediction/:studentId', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }
    
    // Paso 1: Obtener datos del estudiante y generar prompt
    const student = await storage.getStudent(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado'
      });
    }
    
    // Obtener adeudos y pagos del estudiante
    const debts = await storage.getDebtsByStudent(studentId);
    const payments = await storage.getPaymentsByStudent(studentId);
    
    // Calcular valores importantes
    const totalAdeudos = debts.reduce((sum, debt) => sum + parseFloat(debt.montoTotal), 0);
    const totalPagado = payments.reduce((sum, payment) => sum + parseFloat(payment.monto), 0);
    const adeudosVencidos = debts.filter(d => d.estatus === 'vencido').length;
    const pagosATiempo = payments.length - adeudosVencidos;
    
    // Calcular días de atraso promedio en pagos vencidos
    const hoy = new Date();
    const diasAtraso = debts
      .filter(d => d.estatus === 'vencido')
      .map(d => {
        const fechaLimite = new Date(d.fechaLimite);
        const diferenciaDias = Math.floor((hoy.getTime() - fechaLimite.getTime()) / (1000 * 3600 * 24));
        return diferenciaDias > 0 ? diferenciaDias : 0;
      });
    
    const promedioDiasAtraso = diasAtraso.length > 0 
      ? diasAtraso.reduce((sum, days) => sum + days, 0) / diasAtraso.length 
      : 0;
    
    // Generar historial de pagos de los últimos 6 meses
    const ultimos6Meses = [];
    for (let i = 0; i < 6; i++) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      const mes = fecha.toLocaleString('es-ES', { month: 'long' });
      const año = fecha.getFullYear();
      
      const pagosMes = payments.filter(p => {
        const fechaPago = new Date(p.fechaPago);
        return fechaPago.getMonth() === fecha.getMonth() && 
               fechaPago.getFullYear() === fecha.getFullYear();
      });
      
      const adeudosMes = debts.filter(d => {
        const fechaLimite = new Date(d.fechaLimite);
        return fechaLimite.getMonth() === fecha.getMonth() && 
               fechaLimite.getFullYear() === fecha.getFullYear();
      });
      
      ultimos6Meses.push({
        mes,
        año,
        pagosPuntuales: pagosMes.length,
        pagosAtrasados: adeudosMes.filter(d => d.estatus === 'vencido').length
      });
    }
    
    // Construir el prompt para Claude
    const prompt = `
# Información financiera del estudiante

Nombre: ${student.nombreCompleto}
Grado escolar: ${student.nivel}

## Resumen financiero actual
- Total adeudado: $${totalAdeudos.toFixed(2)} MXN
- Total pagado: $${totalPagado.toFixed(2)} MXN
- Número de adeudos vencidos: ${adeudosVencidos}
- Número de pagos a tiempo: ${pagosATiempo}
- Promedio días de atraso en pagos vencidos: ${Math.round(promedioDiasAtraso)} días

## Historial de pagos de los últimos 6 meses
${ultimos6Meses.map(m => `- ${m.mes} ${m.año}: ${m.pagosPuntuales} pagos puntuales, ${m.pagosAtrasados} pagos atrasados`).join('\n')}

## Detalle de adeudos actuales
${debts.map(d => `- Concepto ID ${d.conceptoId}: $${parseFloat(d.montoTotal).toFixed(2)} MXN, Fecha límite: ${d.fechaLimite}, Estatus: ${d.estatus}`).join('\n')}

## Detalle de pagos recientes
${payments.slice(0, 5).map(p => `- Fecha: ${p.fechaPago}, Monto: $${parseFloat(p.monto).toFixed(2)} MXN, Método: ${p.metodoPago}`).join('\n')}
`;
    
    // Paso 2: Enviar el prompt a Claude para obtener predicción
    const predictionResult = await aiService.predictRisk(prompt);
    
    // Si hay un error en la predicción, devolver el error
    if (!predictionResult.success || !predictionResult.prediction) {
      return res.status(500).json({
        success: false,
        error: predictionResult.error || 'Error al generar la predicción'
      });
    }
    
    // Paso 3: Guardar la predicción en la base de datos
    const saveResult = await aiService.saveRiskPrediction(
      studentId,
      predictionResult.prediction
    );
    
    if (!saveResult.success) {
      return res.status(500).json({
        success: false,
        error: saveResult.error || 'Error al guardar la predicción'
      });
    }
    
    // Devolver resultados completos
    return res.status(200).json({
      success: true,
      studentId,
      studentName: student.nombreCompleto,
      prompt,
      prediction: predictionResult.prediction,
      savedPrediction: saveResult.savedPrediction
    });
  } catch (error) {
    console.error('Error en la ruta de generación automática de predicción:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * Ruta de prueba para generar un prompt de predicción automáticamente a partir
 * de datos del estudiante
 * GET /api/ai/generate-risk-prompt/:studentId
 */
router.get('/generate-risk-prompt/:studentId', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }
    
    // Obtener datos del estudiante
    const student = await storage.getStudent(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Estudiante no encontrado'
      });
    }
    
    // Obtener adeudos y pagos del estudiante
    const debts = await storage.getDebtsByStudent(studentId);
    const payments = await storage.getPaymentsByStudent(studentId);
    
    // Calcular valores importantes
    const totalAdeudos = debts.reduce((sum, debt) => sum + parseFloat(debt.montoTotal), 0);
    const totalPagado = payments.reduce((sum, payment) => sum + parseFloat(payment.monto), 0);
    const adeudosVencidos = debts.filter(d => d.estatus === 'vencido').length;
    const pagosATiempo = payments.length - adeudosVencidos;
    
    // Calcular días de atraso promedio en pagos vencidos
    const hoy = new Date();
    const diasAtraso = debts
      .filter(d => d.estatus === 'vencido')
      .map(d => {
        const fechaLimite = new Date(d.fechaLimite);
        const diferenciaDias = Math.floor((hoy.getTime() - fechaLimite.getTime()) / (1000 * 3600 * 24));
        return diferenciaDias > 0 ? diferenciaDias : 0;
      });
    
    const promedioDiasAtraso = diasAtraso.length > 0 
      ? diasAtraso.reduce((sum, days) => sum + days, 0) / diasAtraso.length 
      : 0;
    
    // Generar historial de pagos de los últimos 6 meses
    const ultimos6Meses = [];
    for (let i = 0; i < 6; i++) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      const mes = fecha.toLocaleString('es-ES', { month: 'long' });
      const año = fecha.getFullYear();
      
      const pagosMes = payments.filter(p => {
        const fechaPago = new Date(p.fechaPago);
        return fechaPago.getMonth() === fecha.getMonth() && 
               fechaPago.getFullYear() === fecha.getFullYear();
      });
      
      const adeudosMes = debts.filter(d => {
        const fechaLimite = new Date(d.fechaLimite);
        return fechaLimite.getMonth() === fecha.getMonth() && 
               fechaLimite.getFullYear() === fecha.getFullYear();
      });
      
      ultimos6Meses.push({
        mes,
        año,
        pagosPuntuales: pagosMes.length,
        pagosAtrasados: adeudosMes.filter(d => d.estatus === 'vencido').length
      });
    }
    
    // Construir el prompt para Claude
    const prompt = `
# Información financiera del estudiante

Nombre: ${student.nombreCompleto}
Grado escolar: ${student.nivel}

## Resumen financiero actual
- Total adeudado: $${totalAdeudos.toFixed(2)} MXN
- Total pagado: $${totalPagado.toFixed(2)} MXN
- Número de adeudos vencidos: ${adeudosVencidos}
- Número de pagos a tiempo: ${pagosATiempo}
- Promedio días de atraso en pagos vencidos: ${Math.round(promedioDiasAtraso)} días

## Historial de pagos de los últimos 6 meses
${ultimos6Meses.map(m => `- ${m.mes} ${m.año}: ${m.pagosPuntuales} pagos puntuales, ${m.pagosAtrasados} pagos atrasados`).join('\n')}

## Detalle de adeudos actuales
${debts.map(d => `- Concepto ID ${d.conceptoId}: $${parseFloat(d.montoTotal).toFixed(2)} MXN, Fecha límite: ${d.fechaLimite}, Estatus: ${d.estatus}`).join('\n')}

## Detalle de pagos recientes
${payments.slice(0, 5).map(p => `- Fecha: ${p.fechaPago}, Monto: $${parseFloat(p.monto).toFixed(2)} MXN, Método: ${p.metodoPago}`).join('\n')}
`;
    
    // Devolver el prompt generado
    return res.status(200).json({
      success: true,
      studentId,
      prompt
    });
  } catch (error) {
    console.error('Error al generar prompt de predicción:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

export default router;