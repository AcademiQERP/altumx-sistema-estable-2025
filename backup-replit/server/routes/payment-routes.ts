import express from 'express';
import { stripeService } from '../services/stripe-service';
import { storage } from '../storage';
import { receiptGenerator } from '../services/receipt-generator';
import { sendGrid } from '../services/sendgrid-service';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { paymentSummaryRoutes } from './payment-summary-routes';

// Definir el tipo de usuario autenticado
declare global {
  namespace Express {
    interface User {
      id: string;
      nombreCompleto: string;
      correo: string;
      rol: 'admin' | 'coordinador' | 'docente' | 'padre' | 'alumno';
    }
  }
}

const router = express.Router();

// Endpoint temporal para regenerar recibo (sin autenticación)
router.post('/regenerate-receipt/:paymentId', async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    
    if (!paymentId) {
      return res.status(400).json({ 
        success: false,
        message: 'Se requiere el ID del pago' 
      });
    }
    
    console.log(`🔄 Regenerando recibo para pago ID: ${paymentId}`);
    
    // Obtener el pago
    const payment = await storage.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({ 
        success: false,
        message: 'No se encontró el pago especificado' 
      });
    }
    
    console.log(`✅ Pago encontrado:`, {
      id: payment.id,
      alumnoId: payment.alumnoId,
      monto: payment.monto,
      fecha: payment.fechaPago
    });
    
    // Regenerar el recibo con el nuevo diseño
    const pdfPath = await receiptGenerator.generateReceipt(payment);
    
    console.log(`✅ Recibo regenerado exitosamente: ${pdfPath}`);
    
    // Actualizar el registro de pago con la nueva URL del PDF
    await storage.updatePayment(payment.id, {
      pdfUrl: pdfPath
    });
    
    res.status(200).json({
      success: true,
      message: 'Recibo regenerado con el nuevo diseño modernizado',
      receiptUrl: pdfPath,
      paymentId: payment.id
    });
    
  } catch (error) {
    console.error('❌ Error al regenerar recibo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al regenerar el recibo',
      error: (error as Error).message
    });
  }
});

// Middleware para verificar que el usuario está autenticado
const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  console.log('[PAYMENT AUTH] Headers:', JSON.stringify(req.headers));
  // Usar mismo formato que en auth.ts para consistencia
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  console.log('[PAYMENT AUTH] Auth header:', authHeader);
  const token = authHeader && typeof authHeader === 'string' ? authHeader.split(" ")[1] : null; // Bearer TOKEN

  if (!token) {
    console.log("[PAYMENT AUTH] No se proporcionó token de autenticación");
    return res.status(401).json({
      success: false,
      message: 'No se proporcionó un token de autenticación'
    });
  }

  try {
    // Usar la misma clave secreta que en auth.ts
    const secret = process.env.JWT_SECRET || "edumex_secret_key";
    console.log(`[PAYMENT AUTH] Verificando token: ${token.substring(0, 15)}...`);
    
    const decoded = jwt.verify(token, secret);
    console.log("[PAYMENT AUTH] Token verificado correctamente:", JSON.stringify(decoded));
    req.user = decoded as Express.User;
    console.log("[PAYMENT AUTH] Usuario autenticado:", req.user?.id, req.user?.rol);
    next();
  } catch (error) {
    console.error("[PAYMENT AUTH] Error al verificar token:", error);
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

// Middleware para verificar acceso a datos de estudiante
const verifyStudentAccess = async (req: Request, res: Response, next: NextFunction) => {
  // Obtener studentId de params o body
  const studentIdFromParams = req.params.studentId ? parseInt(req.params.studentId) : null;
  const studentIdFromBody = req.body.studentId ? parseInt(req.body.studentId) : null;
  
  const studentId = studentIdFromParams || studentIdFromBody;
  
  if (!studentId) {
    console.error('verifyStudentAccess: No se encontró studentId en req.params o req.body');
    return res.status(400).json({
      success: false,
      message: 'Se requiere un ID de estudiante'
    });
  }
  
  try {
    // Si es administrador o coordinador, tiene acceso a todos los estudiantes
    if (req.user && (req.user.rol === 'admin' || req.user.rol === 'coordinador')) {
      return next();
    }
    
    // Si es padre, verificar que el estudiante sea su hijo
    if (req.user && req.user.rol === 'padre') {
      const relations = await storage.getRelationsByParent(req.user.id);
      const hasAccess = relations.some(relation => relation.alumnoId === studentId);
      
      if (hasAccess) {
        return next();
      }
    }
    
    // El usuario no tiene acceso a este estudiante
    console.error(`verifyStudentAccess: Usuario ${req.user?.id} (${req.user?.rol}) no tiene acceso al estudiante ${studentId}`);
    return res.status(403).json({
      success: false,
      message: 'No tienes acceso a los datos de este estudiante'
    });
  } catch (error) {
    console.error('Error al verificar acceso a estudiante:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar acceso',
      error: (error as Error).message
    });
  }
};

router.use(verifyToken);

// Las rutas de resumen de pagos deben importarse y registrarse directamente
// No necesitamos usar router.use(paymentSummaryRoutes)

// Crear intención de pago para un adeudo específico
router.post('/crear-intento-pago', verifyStudentAccess, async (req, res) => {
  try {
    console.log('[PAYMENT] Iniciando creación de intento de pago. User:', req.user?.id, req.user?.rol);
    const { debtId, amount, studentId } = req.body;
    console.log('[PAYMENT] Datos recibidos:', { debtId, amount, studentId });
    
    if (!debtId || !amount || !studentId) {
      console.log('[PAYMENT] Error: Faltan datos requeridos');
      return res.status(400).json({ 
        success: false,
        message: 'Faltan datos requeridos para crear el intento de pago' 
      });
    }
    
    // Verificar si el adeudo existe y pertenece al estudiante
    const debt = await storage.getDebt(debtId);
    if (!debt) {
      return res.status(404).json({ 
        success: false,
        message: 'El adeudo no existe' 
      });
    }
    
    if (debt.alumnoId !== studentId) {
      return res.status(403).json({ 
        success: false,
        message: 'No tienes acceso a este adeudo' 
      });
    }
    
    if (debt.estatus === 'pagado') {
      return res.status(400).json({ 
        success: false,
        message: 'Este adeudo ya ha sido pagado' 
      });
    }
    
    // Obtener el concepto de pago para usar su nombre en la descripción
    const paymentConcept = await storage.getPaymentConcept(debt.conceptoId);
    if (!paymentConcept) {
      return res.status(404).json({ 
        success: false,
        message: 'No se encontró el concepto de pago asociado' 
      });
    }
    
    // Obtener información del estudiante para los metadatos
    const student = await storage.getStudent(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'No se encontró el estudiante' 
      });
    }
    
    // Crear la intención de pago
    const paymentIntent = await stripeService.createPaymentIntent({
      debtId,
      amount: Number(amount),
      description: `Pago de ${paymentConcept.nombre} - ${student.nombreCompleto}`,
      metadata: {
        studentId: studentId.toString(),
        studentName: student.nombreCompleto,
        conceptName: paymentConcept.nombre,
        userId: req.user.id
      }
    });
    
    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.clientSecret,
      paymentIntentId: paymentIntent.paymentIntentId
    });
    
  } catch (error) {
    console.error('Error al crear intento de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud de pago',
      error: (error as Error).message
    });
  }
});

// Confirmar un pago procesado (webhook o confirmación manual)
router.post('/confirmar-pago', async (req, res) => {
  try {
    const { 
      paymentIntentId, 
      studentId, 
      debtId, 
      paymentMethod = 'tarjeta' 
    } = req.body;
    
    if (!paymentIntentId || !studentId || !debtId) {
      return res.status(400).json({ 
        success: false,
        message: 'Faltan datos requeridos para confirmar el pago' 
      });
    }
    
    // Procesar el pago
    const result = await stripeService.processSuccessfulPayment(
      paymentIntentId,
      studentId,
      debtId,
      paymentMethod
    );
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }
    
    // Generar recibo y enviarlo por correo
    try {
      if (result.paymentId) {
        // Obtener el pago recién creado
        const payment = await storage.getPayment(result.paymentId);
        
        if (payment) {
          // Generar el recibo PDF
          const pdfPath = await receiptGenerator.generateReceipt(payment);
          
          // Obtener información del estudiante
          const student = await storage.getStudent(studentId);
          
          // Obtener información del padre/tutor
          const parentRelations = await storage.getRelationsByStudent(studentId);
          if (parentRelations.length > 0) {
            const parentUser = await storage.getUser(parentRelations[0].padreId);
            
            if (parentUser && student) {
              // Enviar el recibo por correo
              const emailSent = await sendGrid.sendReceiptEmail({
                to: parentUser.correo,
                studentName: student.nombreCompleto,
                paymentAmount: Number(payment.monto),
                paymentDate: payment.fechaPago,
                paymentId: payment.id,
                pdfPath
              });
              
              // Guardar el registro de correo enviado
              if (emailSent) {
                // Obtener el concepto del pago
                const concept = await storage.getPaymentConcept(payment.conceptoId);
                
                await storage.createEmailLog({
                  studentId: studentId,
                  paymentId: payment.id,
                  status: 'enviado',
                  debtId: debtId,
                  conceptName: concept ? concept.nombre : null,
                  dueDate: null,
                  recipientEmails: parentUser.correo,
                  guardianEmail: parentUser.correo,
                  subject: `Recibo de pago - ${student.nombreCompleto}`,
                  sentAt: new Date(),
                  errorMessage: null
                });
              }
            }
          }
        }
      }
    } catch (emailError) {
      console.error('Error al enviar el recibo por correo:', emailError);
      // No fallamos la respuesta si hay errores en el envío del recibo
    }
    
    // Devolver la ruta del PDF si se creó, para permitir descarga directa desde el frontend
    let receiptUrl = null;
    if (result.paymentId) {
      const payment = await storage.getPayment(result.paymentId);
      if (payment && payment.pdfUrl) {
        receiptUrl = payment.pdfUrl;
      }
    }

    res.status(200).json({
      success: true,
      paymentId: result.paymentId,
      receiptUrl: receiptUrl,
      message: 'Pago procesado correctamente'
    });
    
  } catch (error) {
    console.error('Error al confirmar el pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al confirmar el pago',
      error: (error as Error).message
    });
  }
});

// Verificar el estado de un pago
router.get('/estado/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    
    if (!paymentIntentId) {
      return res.status(400).json({ 
        success: false,
        message: 'Se requiere el ID de la intención de pago' 
      });
    }
    
    const paymentStatus = await stripeService.checkPaymentStatus(paymentIntentId);
    
    res.status(200).json({
      success: true,
      status: paymentStatus
    });
    
  } catch (error) {
    console.error('Error al verificar el estado del pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar el estado del pago',
      error: (error as Error).message
    });
  }
});

// Obtener recibo por ID de adeudo
router.get('/:debtId/receipt', verifyStudentAccess, async (req, res) => {
  try {
    const debtId = parseInt(req.params.debtId);
    
    if (!debtId) {
      return res.status(400).json({ 
        success: false,
        message: 'Se requiere el ID del adeudo' 
      });
    }
    
    // Obtener el adeudo
    const debt = await storage.getDebt(debtId);
    if (!debt) {
      return res.status(404).json({ 
        success: false,
        message: 'No se encontró el adeudo especificado' 
      });
    }
    
    // Verificar el estado del adeudo
    if (debt.estatus !== 'pagado') {
      return res.status(400).json({ 
        success: false,
        message: 'No hay recibo disponible para un adeudo no pagado' 
      });
    }
    
    // Buscar el pago relacionado con este adeudo
    const payments = await storage.getPaymentsByStudent(debt.alumnoId);
    const payment = payments.find(p => p.conceptoId === debt.conceptoId);
    
    if (!payment) {
      return res.status(404).json({ 
        success: false,
        message: 'No se encontró el pago relacionado con este adeudo' 
      });
    }
    
    // Si ya existe un PDF, devolverlo
    if (payment.pdfUrl) {
      return res.status(200).json({
        success: true,
        receiptUrl: payment.pdfUrl
      });
    }
    
    // Generar el recibo
    const pdfPath = await receiptGenerator.generateReceipt(payment);
    
    // Actualizar el registro de pago con la URL del PDF
    await storage.updatePayment(payment.id, {
      pdfUrl: pdfPath
    });
    
    // Devolver la URL del recibo
    res.status(200).json({
      success: true,
      receiptUrl: pdfPath
    });
    
  } catch (error) {
    console.error('Error al obtener recibo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el recibo',
      error: (error as Error).message
    });
  }
});

// Obtener historial de pagos para un padre específico
router.get('/padres/:parentId/historial-pagos', verifyToken, async (req, res) => {
  try {
    const { parentId } = req.params;
    
    // Verificar que el usuario tiene acceso a este padre
    if (req.user.id !== parentId && req.user.rol !== 'admin' && req.user.rol !== 'coordinador') {
      return res.status(403).json({ 
        success: false,
        message: 'No tienes acceso a este historial de pagos' 
      });
    }
    
    // Obtener todas las relaciones padre-estudiante
    const relations = await storage.getRelationsByParent(parentId);
    if (!relations || relations.length === 0) {
      return res.status(200).json({
        success: true,
        payments: []
      });
    }
    
    // Obtener pagos para cada estudiante relacionado con este padre
    const allPayments = [];
    for (const relation of relations) {
      const studentPayments = await storage.getPaymentsByStudent(relation.alumnoId);
      
      // Para cada pago, obtener información adicional
      for (const payment of studentPayments) {
        // Obtener información del estudiante
        const student = await storage.getStudent(payment.alumnoId);
        
        // Obtener información del concepto de pago
        const concept = await storage.getPaymentConcept(payment.conceptoId);
        
        // Agregar al arreglo de pagos
        allPayments.push({
          ...payment,
          studentName: student ? student.nombreCompleto : 'Estudiante no encontrado',
          conceptName: concept ? concept.nombre : 'Concepto desconocido',
        });
      }
    }
    
    // Ordenar por fecha de pago (más reciente primero)
    allPayments.sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime());
    
    res.status(200).json({
      success: true,
      payments: allPayments
    });
    
  } catch (error) {
    console.error('Error al obtener historial de pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el historial de pagos',
      error: (error as Error).message
    });
  }
});

// Obtener resumen de pagos para un padre específico
router.get('/padres/:parentId/resumen', verifyToken, async (req, res) => {
  try {
    const { parentId } = req.params;
    
    // Verificar que el usuario tiene acceso a este padre
    if (req.user.id !== parentId && req.user.rol !== 'admin' && req.user.rol !== 'coordinador') {
      return res.status(403).json({ 
        success: false,
        message: 'No tienes acceso a esta información' 
      });
    }
    
    // Obtener todas las relaciones padre-estudiante
    const relations = await storage.getRelationsByParent(parentId);
    if (!relations || relations.length === 0) {
      return res.status(200).json({
        success: true,
        resumen: {
          totalPagado: 0,
          totalPendiente: 0,
          totalRechazado: 0,
          mes: new Date().toLocaleString('es-MX', { month: 'long', year: 'numeric' })
        }
      });
    }
    
    // Obtener el mes actual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalPagado = 0;
    let totalPendiente = 0;
    let totalRechazado = 0;
    
    // Obtener pagos para cada estudiante relacionado con este padre
    for (const relation of relations) {
      const studentPayments = await storage.getPaymentsByStudent(relation.alumnoId);
      
      // Filtrar por pagos del mes actual y sumar según estado
      for (const payment of studentPayments) {
        try {
          const paymentDate = new Date(payment.fechaPago);
          if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
            // Convertir el monto a número si es necesario
            const monto = typeof payment.monto === 'string' ? parseFloat(payment.monto) : payment.monto;
            
            if (payment.estatus === 'pagado') {
              totalPagado += monto;
            } else if (payment.estatus === 'pendiente') {
              totalPendiente += monto;
            } else if (payment.estatus === 'rechazado') {
              totalRechazado += monto;
            }
          }
        } catch (error) {
          console.error('Error al procesar el pago:', error);
          // Continuar con el siguiente pago
        }
      }
      
      // Intentar obtener adeudos pendientes del estudiante si existe el método
      try {
        const studentDebts = await storage.getDebtsByStudent(relation.alumnoId);
        
        // Sumar adeudos pendientes del mes actual
        for (const debt of studentDebts) {
          try {
            if (debt.estatus === 'pendiente') {
              // Usar fechaLimite o fechaVencimiento según disponibilidad
              const fechaVenc = debt.fechaVencimiento || debt.fechaLimite;
              const debtDate = new Date(fechaVenc);
              
              if (debtDate.getMonth() === currentMonth && debtDate.getFullYear() === currentYear) {
                // Usar montoTotal o monto según disponibilidad, y convertir a número si es string
                const montoAdeudo = debt.monto || debt.montoTotal;
                const monto = typeof montoAdeudo === 'string' ? parseFloat(montoAdeudo) : montoAdeudo;
                totalPendiente += monto;
              }
            }
          } catch (err) {
            console.error('Error al procesar adeudo:', err);
            // Continuar con el siguiente adeudo
          }
        }
      } catch (error) {
        console.error('Error al obtener los adeudos del estudiante:', error);
        // Continuar con el siguiente estudiante si hay error
      }
    }
    
    // Formatear el nombre del mes en español
    const mesActual = now.toLocaleString('es-MX', { month: 'long', year: 'numeric' });
    
    res.status(200).json({
      success: true,
      resumen: {
        totalPagado,
        totalPendiente,
        totalRechazado,
        mes: mesActual
      }
    });
    
  } catch (error) {
    console.error('Error al obtener resumen de pagos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el resumen de pagos',
      error: (error as Error).message
    });
  }
});

// Obtener recibo por ID de pago (para pagos SPEI)
router.get('/padres/recibo/:paymentId', verifyToken, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    
    if (!paymentId) {
      return res.status(400).json({ 
        success: false,
        message: 'Se requiere el ID del pago' 
      });
    }
    
    // Obtener el pago
    const payment = await storage.getPayment(paymentId);
    if (!payment) {
      return res.status(404).json({ 
        success: false,
        message: 'No se encontró el pago especificado' 
      });
    }
    
    // Si es un padre, verificar que tenga acceso a este estudiante
    if (req.user.rol === 'padre') {
      const relations = await storage.getRelationsByParent(req.user.id);
      const hasAccess = relations.some(relation => relation.alumnoId === payment.alumnoId);
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false,
          message: 'No autorizado: Usuario no autorizado para acceder a este recibo' 
        });
      }
    }
    
    // Si ya existe un PDF, devolverlo
    if (payment.pdfUrl) {
      // Obtener la ruta absoluta del archivo
      const filePath = path.join(process.cwd(), 'public', payment.pdfUrl.replace(/^\//, ''));
      
      // Verificar que el archivo existe
      if (!fs.existsSync(filePath)) {
        // Si el archivo no existe pero tenemos la URL, regenerar el PDF
        const newPdfPath = await receiptGenerator.generateReceipt(payment);
        
        // Actualizar el registro
        await storage.updatePayment(payment.id, {
          pdfUrl: newPdfPath
        });
        
        return res.status(200).json({
          success: true,
          receiptUrl: newPdfPath
        });
      }
      
      return res.status(200).json({
        success: true,
        receiptUrl: payment.pdfUrl
      });
    }
    
    // Generar el recibo si no existe
    const pdfPath = await receiptGenerator.generateReceipt(payment);
    
    // Actualizar el registro de pago con la URL del PDF
    await storage.updatePayment(payment.id, {
      pdfUrl: pdfPath
    });
    
    // Devolver la URL del recibo
    res.status(200).json({
      success: true,
      receiptUrl: pdfPath
    });
    
  } catch (error) {
    console.error('Error al obtener recibo por ID de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el recibo',
      error: (error as Error).message
    });
  }
});

export default router;