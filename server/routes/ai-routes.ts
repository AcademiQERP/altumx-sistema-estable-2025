import express from 'express';
import { aiService } from '../services/ai-service';
import { storage } from '../storage';
import { sql } from 'drizzle-orm';
import { generateRecommendationsAI } from '../services/anthropic-service';
import { sendParentReportEmail } from '../services/email-service';

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

/**
 * Ruta para generar un resumen financiero detallado usando IA
 * POST /api/ai/resumen-financiero
 */
router.post('/resumen-financiero', async (req, res) => {
  try {
    // Verificar que hay datos en el body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren datos financieros para generar el resumen'
      });
    }

    console.log('[DEBUG RUTA] ===============================================');
    console.log('[DEBUG RUTA] Recibida solicitud para generar resumen financiero');
    console.log('[DEBUG RUTA] req.user:', JSON.stringify(req.user, null, 2));
    
    // Verificar autenticación
    if (!req.user || !req.user.id) {
      console.log('[DEBUG RUTA] No hay usuario autenticado o falta ID de usuario');
      return res.status(401).json({
        success: false,
        error: 'Debe estar autenticado para generar resúmenes'
      });
    }
    
    // Obtener ID del usuario autenticado
    const userId = req.user.id;
    console.log('[DEBUG RUTA] userId obtenido:', userId);
    console.log('[DEBUG RUTA] Tipo de dato de userId:', typeof userId);

    // Verificar estructura del body
    console.log('[DEBUG RUTA] Body recibido:', {
      mes: req.body.mes,
      anio: req.body.anio,
      grupoId: req.body.grupoId,
      conceptoId: req.body.conceptoId,
      bodyKeysCount: Object.keys(req.body).length
    });

    // Enviar los datos a Claude para generar el resumen
    console.log('[DEBUG RUTA] Llamando a aiService.generarResumenFinanciero...');
    const result = await aiService.generarResumenFinanciero(req.body, userId);
    console.log('[DEBUG RUTA] Resultado de generarResumenFinanciero:', {
      success: result.success,
      resumenLength: result.resumen ? result.resumen.length : 0,
      errorMsg: result.error || 'No hay error'
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Error al generar el resumen financiero'
      });
    }
    
    // Intento adicional de guardar el resumen manualmente
    try {
      console.log('[DEBUG RUTA] Intentando guardar manualmente con createAIFinancialSummary');
      const today = new Date();
      const month = req.body.mes || today.getMonth() + 1;
      const year = req.body.anio || today.getFullYear();
      
      const manualSaveResult = await storage.createAIFinancialSummary({
        usuarioId: userId,
        anio: year,
        mes: month,
        resumenTexto: result.resumen,
        metadatos: JSON.stringify({
          mes: month,
          anio: year,
          grupoId: req.body.grupoId || null
        })
      });
      
      console.log('[DEBUG RUTA] Resultado de guardar manualmente:', Boolean(manualSaveResult));
    } catch (saveError) {
      console.error('[DEBUG RUTA] Error al guardar manualmente:', saveError);
    }

    // Devolver el resumen generado
    console.log('[DEBUG RUTA] Enviando respuesta exitosa');
    console.log('[DEBUG RUTA] ===============================================');
    return res.status(200).json({
      success: true,
      resumen: result.resumen
    });
  } catch (error) {
    console.error('[DEBUG RUTA] Error en la ruta de resumen financiero:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * Ruta para obtener todos los resúmenes financieros generados por IA
 * GET /api/ai/resumen-financiero-logs
 */
router.get('/resumen-financiero-logs', async (req, res) => {
  try {
    console.log('[DEBUG GET] ===============================================');
    console.log('[DEBUG GET] Recibida solicitud para obtener historial de resúmenes financieros');
    console.log('[DEBUG GET] req.user:', JSON.stringify(req.user, null, 2));
    
    // Verificar que el usuario tiene permisos (admin o coordinador)
    if (!req.user || (req.user.rol !== 'admin' && req.user.rol !== 'coordinador')) {
      console.log('[DEBUG GET] Usuario sin permisos:', req.user?.rol);
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para acceder a esta funcionalidad'
      });
    }

    console.log('[DEBUG GET] Consultando en la BD con storage.getAIFinancialSummaries()');
    
    // Consultar directamente en la base de datos para diagnóstico
    let rawCount = 0;
    try {
      const result = await storage.db.execute(sql`SELECT COUNT(*) as count FROM resumen_financiero_ia`);
      rawCount = result.rows?.[0]?.count || 0;
      console.log('[DEBUG GET] Resultado de consulta SQL directa - count:', rawCount);
    } catch (sqlError) {
      console.error('[DEBUG GET] Error en consulta SQL directa:', sqlError);
    }
    
    const summaries = await storage.getAIFinancialSummaries();
    console.log('[DEBUG GET] Resultado: obtenidos', summaries.length, 'resúmenes');
    
    // Si hay discrepancia entre la consulta directa y los resultados, loguear
    if (summaries.length !== rawCount) {
      console.log('[DEBUG GET] ¡ALERTA! Discrepancia entre consulta directa y resultados de getAIFinancialSummaries');
    }
    
    // Si no hay resúmenes, intentar obtener más información de diagnóstico
    if (summaries.length === 0) {
      console.log('[DEBUG GET] No se encontraron resúmenes en la base de datos');
      console.log('[DEBUG GET] Verificando permisos y estructura de tabla...');
      
      try {
        const tablesResult = await storage.db.execute(sql`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        const tables = tablesResult.rows.map(r => r.table_name);
        console.log('[DEBUG GET] Tablas en la base de datos:', tables);
        
        if (tables.includes('resumen_financiero_ia')) {
          const columnsResult = await storage.db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'resumen_financiero_ia'
          `);
          console.log('[DEBUG GET] Columnas en la tabla resumen_financiero_ia:', 
                    columnsResult.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
        }
      } catch (infoError) {
        console.error('[DEBUG GET] Error al obtener información de diagnóstico:', infoError);
      }
    }
    
    console.log('[DEBUG GET] Enviando respuesta con', summaries.length, 'resúmenes');
    console.log('[DEBUG GET] ===============================================');
    
    return res.status(200).json({
      success: true,
      summaries
    });
  } catch (error) {
    console.error('[DEBUG GET] Error al obtener bitácora de resúmenes financieros:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * Ruta para obtener resúmenes financieros filtrados por usuario
 * GET /api/ai/resumen-financiero-logs/user/:userId
 */
router.get('/resumen-financiero-logs/user/:userId', async (req, res) => {
  try {
    // Verificar que el usuario tiene permisos (admin o coordinador)
    if (!req.user || (req.user.rol !== 'admin' && req.user.rol !== 'coordinador')) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para acceder a esta funcionalidad'
      });
    }

    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del usuario'
      });
    }

    const summaries = await storage.getAIFinancialSummariesByUser(userId);
    
    return res.status(200).json({
      success: true,
      summaries
    });
  } catch (error) {
    console.error('Error al obtener resúmenes financieros del usuario:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * Ruta para obtener resúmenes financieros filtrados por mes y año
 * GET /api/ai/resumen-financiero-logs/month/:year/:month
 */
router.get('/resumen-financiero-logs/month/:year/:month', async (req, res) => {
  try {
    // Verificar que el usuario tiene permisos (admin o coordinador)
    if (!req.user || (req.user.rol !== 'admin' && req.user.rol !== 'coordinador')) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para acceder a esta funcionalidad'
      });
    }

    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        error: 'Año o mes inválido'
      });
    }

    const summaries = await storage.getAIFinancialSummariesByMonth(month, year);
    
    return res.status(200).json({
      success: true,
      summaries
    });
  } catch (error) {
    console.error('Error al obtener resúmenes financieros por mes:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * Ruta para guardar un nuevo resumen financiero generado por IA
 * POST /api/ai/resumen-financiero-log
 */
router.post('/resumen-financiero-log', async (req, res) => {
  try {
    // Verificar que el usuario tiene permisos (admin o coordinador)
    if (!req.user || (req.user.rol !== 'admin' && req.user.rol !== 'coordinador')) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para acceder a esta funcionalidad'
      });
    }

    // Datos necesarios para guardar un resumen
    const { anio, mes, resumenTexto, filtros } = req.body;
    
    if (!anio || !mes || !resumenTexto) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren todos los campos: anio, mes, resumenTexto'
      });
    }
    
    // Guardar el resumen en la base de datos
    const newSummary = await storage.createAIFinancialSummary({
      anio: parseInt(anio),
      mes: parseInt(mes),
      usuarioId: req.user.id,
      resumenTexto,
      metadatos: filtros ? JSON.stringify(filtros) : null
    });
    
    return res.status(201).json({
      success: true,
      summary: newSummary
    });
  } catch (error) {
    console.error('Error al guardar resumen financiero:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * Ruta para eliminar un resumen financiero por ID
 * DELETE /api/ai/resumen-financiero-log/:id
 */
router.delete('/resumen-financiero-log/:id', async (req, res) => {
  try {
    // Verificar que el usuario tiene permisos (admin o coordinador)
    if (!req.user || (req.user.rol !== 'admin' && req.user.rol !== 'coordinador')) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para acceder a esta funcionalidad'
      });
    }

    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido'
      });
    }
    
    // Verificar que existe el resumen
    const summary = await storage.getAIFinancialSummary(id);
    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Resumen no encontrado'
      });
    }
    
    // Eliminar el resumen
    const result = await storage.deleteAIFinancialSummary(id);
    
    return res.status(200).json({
      success: true,
      message: 'Resumen eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar resumen financiero:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * Ruta para generar recomendaciones personalizadas con IA
 * POST /api/ai/recomendaciones
 */
router.post('/recomendaciones', async (req, res) => {
  try {
    const { alumno } = req.body;

    if (!alumno || !alumno.nombre || !alumno.materias || !Array.isArray(alumno.materias)) {
      return res.status(400).json({
        success: false,
        error: 'Datos del alumno incompletos o inválidos'
      });
    }

    console.log(`Generando recomendaciones IA para: ${alumno.nombre}`);
    
    // Invocamos el servicio de Claude para generar recomendaciones
    const resultado = await generateRecommendationsAI({
      id: alumno.id || 0,
      nombre: alumno.nombre,
      grado: alumno.grado || 'No especificado',
      promedio: alumno.promedio || 0,
      materias: alumno.materias.map(m => ({
        id: m.id,
        nombre: m.nombre,
        promedio: m.promedio
      })),
      observaciones: alumno.observaciones
    });

    if (resultado.error) {
      console.warn(`Advertencia generando recomendaciones IA: ${resultado.error}`);
    }

    res.json({
      success: true,
      recomendaciones: resultado.recomendaciones,
      error: resultado.error
    });
  } catch (error) {
    console.error('Error al generar recomendaciones con IA:', error);
    res.status(500).json({
      success: false,
      error: 'Error al generar recomendaciones personalizadas'
    });
  }
});

/**
 * Ruta para enviar un informe para padres por correo electrónico
 * POST /api/ai/send-parent-report
 * 
 * Envía un informe académico personalizado con recomendaciones de IA al correo del tutor
 */
router.post('/send-parent-report', async (req, res) => {
  try {
    const { studentName, tutorEmail, pdfBase64, teacherName } = req.body;

    if (!studentName || !tutorEmail || !pdfBase64 || !teacherName) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren todos los campos: studentName, tutorEmail, pdfBase64 y teacherName'
      });
    }

    // Enviar el correo con el informe adjunto
    const result = await sendParentReportEmail(
      studentName,
      tutorEmail,
      pdfBase64,
      teacherName
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.message
      });
    }

    return res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error("Error al enviar informe por correo:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al enviar el informe'
    });
  }
});

export default router;