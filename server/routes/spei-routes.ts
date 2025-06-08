import express from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { createSPEIPayment, confirmSPEIPayment, reconcileSPEIPayment } from '../services/spei-service';
import { simulatePaymentConfirmation } from '../services/spei-webhook-service';
// JWT auth ya está configurado en las rutas
import { generateReceipt } from '../services/receipt-generator';
import { sendGrid } from '../services/sendgrid-service';

const router = express.Router();

// Schema para validar la solicitud de generar referencia SPEI
const generateSPEIReferenceSchema = z.object({
  debtId: z.number().optional(),
  studentId: z.number(),
  conceptId: z.number(),
  amount: z.number()
});

// Schema para validar la confirmación de pago
const confirmSPEIPaymentSchema = z.object({
  pendingPaymentId: z.number()
});

// Schema para validar la conciliación de pagos
const reconcileSPEIPaymentSchema = z.object({
  reference: z.string(),
  amount: z.number(),
  paymentDate: z.string().datetime().optional()
});

// La autenticación JWT ya viene de las rutas principales

// Generar referencia SPEI
router.post('/generar-referencia', async (req, res) => {
  try {
    // Validar solicitud
    const validationResult = generateSPEIReferenceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: validationResult.error.format()
      });
    }

    const { debtId, studentId, conceptId, amount } = validationResult.data;
    
    // Si se proporciona un ID de adeudo, verificamos que exista
    let debt;
    if (debtId) {
      debt = await storage.getDebt(debtId);
      if (!debt) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró el adeudo especificado'
        });
      }
    }
    
    // Verificar que el estudiante exista
    const student = await storage.getStudent(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró el estudiante especificado'
      });
    }
    
    // Verificar que el concepto exista
    const concept = await storage.getPaymentConcept(conceptId);
    if (!concept) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró el concepto de pago especificado'
      });
    }
    
    // Generar la referencia SPEI
    const result = await createSPEIPayment(studentId, conceptId, amount, debt);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error al generar referencia SPEI:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Confirmar manualmente un pago SPEI
router.post('/confirmar-pago', async (req, res) => {
  try {
    // Verificar permisos del usuario
    if (req.user.rol !== 'admin' && req.user.rol !== 'coordinador') {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para confirmar pagos'
      });
    }
    
    // Validar solicitud
    const validationResult = confirmSPEIPaymentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: validationResult.error.format()
      });
    }
    
    const { pendingPaymentId } = validationResult.data;
    
    // Confirmar el pago
    const result = await confirmSPEIPayment(pendingPaymentId, req.user.id);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Generar recibo PDF
    const payment = await storage.getPayment(result.paymentId);
    const student = await storage.getStudent(result.studentId);
    const concept = await storage.getPaymentConcept(result.conceptId);
    
    if (payment && student && concept) {
      try {
        // Generar el recibo PDF
        const receiptUrl = await generateReceipt(payment, student, concept);
        
        // Actualizar la URL del recibo en el pago
        await storage.updatePayment(payment.id, {
          pdfUrl: receiptUrl
        });
        
        // Intentar enviar correo con el recibo
        try {
          // Si existe una relación padre-estudiante, enviar correo
          const parentRelations = await storage.getParentStudentRelations({ alumnoId: student.id });
          if (parentRelations.length > 0) {
            for (const relation of parentRelations) {
              const parent = await storage.getUser(relation.padreId);
              if (parent && parent.correo) {
                await sendGrid.sendReceiptEmail({
                  to: parent.correo,
                  studentName: student.nombreCompleto,
                  paymentAmount: parseFloat(payment.monto),
                  paymentDate: payment.fechaPago,
                  paymentId: payment.id,
                  pdfPath: receiptUrl
                });
              }
            }
          }
        } catch (emailError) {
          console.error('Error al enviar correo de confirmación:', emailError);
          // No fallar la solicitud si el correo no se envía
        }
        
        // Incluir la URL del recibo en la respuesta
        result.receiptUrl = receiptUrl;
      } catch (receiptError) {
        console.error('Error al generar recibo:', receiptError);
        // No fallar la solicitud si el recibo no se genera
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error al confirmar pago SPEI:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Conciliar un pago SPEI (procesar archivo de movimientos bancarios)
router.post('/conciliar', async (req, res) => {
  try {
    // Verificar permisos del usuario
    if (req.user.rol !== 'admin' && req.user.rol !== 'coordinador') {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para conciliar pagos'
      });
    }
    
    // Validar solicitud
    const validationResult = reconcileSPEIPaymentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: validationResult.error.format()
      });
    }
    
    const { reference, amount } = validationResult.data;
    const paymentDate = validationResult.data.paymentDate 
      ? new Date(validationResult.data.paymentDate) 
      : new Date();
    
    // Conciliar el pago
    const result = await reconcileSPEIPayment(
      reference,
      amount,
      paymentDate,
      req.user.id
    );
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Si no requiere revisión manual, generar recibo
    if (!result.requiresManualReview) {
      const payment = await storage.getPayment(result.paymentId);
      const student = await storage.getStudent(result.studentId);
      const concept = await storage.getPaymentConcept(result.conceptId);
      
      if (payment && student && concept) {
        try {
          // Generar el recibo PDF
          const receiptUrl = await generateReceipt(payment, student, concept);
          
          // Actualizar la URL del recibo en el pago
          await storage.updatePayment(payment.id, {
            pdfUrl: receiptUrl
          });
          
          // Intentar enviar correo con el recibo
          try {
            // Si existe una relación padre-estudiante, enviar correo
            const parentRelations = await storage.getParentStudentRelations({ alumnoId: student.id });
            if (parentRelations.length > 0) {
              for (const relation of parentRelations) {
                const parent = await storage.getUser(relation.padreId);
                if (parent && parent.correo) {
                  await sendGrid.sendReceiptEmail({
                    to: parent.correo,
                    studentName: student.nombreCompleto,
                    paymentAmount: parseFloat(payment.monto),
                    paymentDate: payment.fechaPago,
                    paymentId: payment.id,
                    pdfPath: receiptUrl
                  });
                }
              }
            }
          } catch (emailError) {
            console.error('Error al enviar correo de confirmación:', emailError);
            // No fallar la solicitud si el correo no se envía
          }
          
          // Incluir la URL del recibo en la respuesta
          result.receiptUrl = receiptUrl;
        } catch (receiptError) {
          console.error('Error al generar recibo:', receiptError);
          // No fallar la solicitud si el recibo no se genera
        }
      }
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error al conciliar pago SPEI:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener pagos pendientes por estudiante
router.get('/estudiante/:studentId', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);
    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de estudiante inválido'
      });
    }
    
    // Obtener pagos pendientes
    const pendingPayments = await storage.getPendingPaymentsByStudent(studentId);
    
    // Para cada pago pendiente, obtener información adicional
    const result = await Promise.all(pendingPayments.map(async (payment) => {
      const concept = await storage.getPaymentConcept(payment.conceptoId);
      return {
        ...payment,
        conceptoNombre: concept ? concept.nombre : 'Concepto desconocido'
      };
    }));
    
    res.json({
      success: true,
      pendingPayments: result
    });
  } catch (error) {
    console.error('Error al obtener pagos pendientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener estado de un pago pendiente
router.get('/estado/:id', async (req, res) => {
  try {
    const pendingPaymentId = parseInt(req.params.id);
    if (isNaN(pendingPaymentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de pago pendiente inválido'
      });
    }
    
    // Obtener pago pendiente
    const pendingPayment = await storage.getPendingPayment(pendingPaymentId);
    if (!pendingPayment) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró el pago pendiente'
      });
    }
    
    // Verificar si existe un pago asociado (pago confirmado)
    let payment = null;
    if (pendingPayment.status === 'pagado' && pendingPayment.paymentId) {
      payment = await storage.getPayment(pendingPayment.paymentId);
    }
    
    res.json({
      success: true,
      data: {
        pendingPaymentId: pendingPayment.id,
        reference: pendingPayment.reference,
        status: pendingPayment.status,
        studentId: pendingPayment.alumnoId,
        conceptId: pendingPayment.conceptoId,
        amount: pendingPayment.amount,
        expirationDate: pendingPayment.expirationDate,
        paymentId: pendingPayment.paymentId || null,
        receiptUrl: payment?.pdfUrl || null
      }
    });
  } catch (error) {
    console.error('Error al verificar estado de pago:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener detalles de un pago pendiente
router.get('/:id', async (req, res) => {
  try {
    const pendingPaymentId = parseInt(req.params.id);
    if (isNaN(pendingPaymentId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de pago pendiente inválido'
      });
    }
    
    // Obtener pago pendiente
    const pendingPayment = await storage.getPendingPayment(pendingPaymentId);
    if (!pendingPayment) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró el pago pendiente'
      });
    }
    
    // Obtener información adicional
    const student = await storage.getStudent(pendingPayment.alumnoId);
    const concept = await storage.getPaymentConcept(pendingPayment.conceptoId);
    
    res.json({
      success: true,
      pendingPayment: {
        ...pendingPayment,
        studentName: student ? student.nombreCompleto : 'Estudiante desconocido',
        conceptName: concept ? concept.nombre : 'Concepto desconocido'
      }
    });
  } catch (error) {
    console.error('Error al obtener detalles de pago pendiente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Simular un pago SPEI (para pruebas)
router.post('/simulate-payment', async (req, res) => {
  try {
    // Validar que exista una referencia
    if (!req.body.reference) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere una referencia SPEI para simular el pago'
      });
    }
    
    const reference = req.body.reference;
    
    // Simular la confirmación de pago
    const result = await simulatePaymentConfirmation(reference);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error al simular pago SPEI:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;