import { Router } from 'express';
import { storage } from '../storage';
import { Request, Response } from 'express';

// Extender la interfaz Request para incluir la propiedad pago y user
declare global {
  namespace Express {
    interface Request {
      pago?: any;
      user?: any;
    }
  }
}

const router = Router();

// Middleware para verificar que el padre tenga acceso al estudiante
const verifyStudentAccess = async (req: Request, res: Response, next: Function) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autorizado: Usuario no autenticado' });
    }

    // Verificar si el usuario tiene rol de padre
    if (req.user.rol !== 'padre') {
      return res.status(403).json({ message: 'Acceso denegado: Ruta solo para padres de familia' });
    }

    const padreId = req.user.id;
    const estudianteId = parseInt(req.params.estudianteId);

    if (isNaN(estudianteId)) {
      return res.status(400).json({ message: 'ID del estudiante inválido' });
    }

    // Verificar que el estudiante esté asociado al padre
    const relaciones = await storage.getRelationsByParent(padreId);
    const tieneAcceso = relaciones.some((relacion: { alumnoId: number }) => relacion.alumnoId === estudianteId);

    if (!tieneAcceso) {
      return res.status(403).json({ message: 'Acceso denegado: El estudiante no está relacionado con este padre' });
    }

    // Si todo está correcto, continuar
    next();
  } catch (error) {
    console.error('Error al verificar acceso al estudiante:', error);
    res.status(500).json({ message: 'Error del servidor al verificar acceso' });
  }
};

// Middleware para verificar que el padre tenga acceso a un pago específico
const verifyPaymentAccess = async (req: Request, res: Response, next: Function) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'No autorizado: Usuario no autenticado' });
    }

    // Verificar si el usuario tiene rol de padre
    if (req.user.rol !== 'padre') {
      return res.status(403).json({ message: 'Acceso denegado: Ruta solo para padres de familia' });
    }

    const padreId = req.user.id;
    const pagoId = parseInt(req.params.pagoId);

    if (isNaN(pagoId)) {
      return res.status(400).json({ message: 'ID del pago inválido' });
    }

    // Obtener el pago y verificar que exista
    const pago = await storage.getPayment(pagoId);
    if (!pago) {
      return res.status(404).json({ message: 'Pago no encontrado' });
    }

    // Obtener el alumno asociado al pago
    const alumnoId = pago.alumnoId;

    // Verificar que el estudiante esté asociado al padre
    const relaciones = await storage.getRelationsByParent(padreId);
    const tieneAcceso = relaciones.some((relacion: { alumnoId: number }) => relacion.alumnoId === alumnoId);

    if (!tieneAcceso) {
      return res.status(403).json({ message: 'Acceso denegado: No tiene acceso a este recurso' });
    }

    // Agregar el pago a la solicitud para uso posterior
    req.pago = pago;
    
    // Si todo está correcto, continuar
    next();
  } catch (error) {
    console.error('Error al verificar acceso al pago:', error);
    res.status(500).json({ message: 'Error del servidor al verificar acceso' });
  }
};

// Endpoint para obtener estado de cuenta del estudiante
router.get('/estado-cuenta/:estudianteId', verifyStudentAccess, async (req, res) => {
  try {
    const estudianteId = parseInt(req.params.estudianteId);
    const estadoCuenta = await storage.getAccountStatement(estudianteId);
    res.json(estadoCuenta);
  } catch (error) {
    console.error('Error al obtener estado de cuenta:', error);
    res.status(500).json({ message: 'Error al obtener estado de cuenta del estudiante' });
  }
});

// Endpoint para obtener recibos de pago del estudiante
router.get('/recibos/:estudianteId', verifyStudentAccess, async (req, res) => {
  try {
    const estudianteId = parseInt(req.params.estudianteId);
    
    // Obtenemos los pagos del estudiante
    const pagos = await storage.getPaymentsByStudent(estudianteId);
    
    // Enriquecemos la información de cada pago
    const recibos = await Promise.all(pagos.map(async (pago) => {
      // Buscamos el concepto de pago
      const concepto = await storage.getPaymentConcept(pago.conceptoId);
      
      // Verificamos si hay logs de correo asociados a este pago
      const emailLogs = await storage.getEmailLogsByPayment(pago.id);
      
      return {
        ...pago,
        nombreConcepto: concepto?.nombre || 'Concepto desconocido',
        descripcionConcepto: concepto?.descripcion || '',
        tieneRecibo: emailLogs.length > 0 || !!pago.pdfUrl,
        fechaEnvioRecibo: emailLogs.length > 0 ? emailLogs[0].sentAt : null,
        pdfUrl: pago.pdfUrl || null,
      };
    }));
    
    res.json(recibos);
  } catch (error) {
    console.error('Error al obtener recibos:', error);
    res.status(500).json({ message: 'Error al obtener recibos del estudiante' });
  }
});

// Endpoint para obtener recordatorios de pago del estudiante
router.get('/recordatorios/:estudianteId', verifyStudentAccess, async (req, res) => {
  try {
    const estudianteId = parseInt(req.params.estudianteId);
    
    // Obtenemos los logs de correo del estudiante
    const emailLogs = await storage.getEmailLogsByStudent(estudianteId);
    
    // Filtramos solo los relacionados con recordatorios de pago
    const recordatorios = emailLogs.filter((log: { status: string | null }) => 
      log.status && ['enviado', 'error', 'pendiente'].includes(log.status)
    );
    
    // Agregamos información adicional útil
    const recordatoriosEnriquecidos = await Promise.all(recordatorios.map(async (recordatorio: { 
      debtId: number | null;
      sentAt: Date | null;
      status: string | null;
    }) => {
      // Si tiene debtId, obtenemos información del adeudo
      let adeudo = null;
      if (recordatorio.debtId) {
        adeudo = await storage.getDebt(recordatorio.debtId);
      }
      
      return {
        ...recordatorio,
        adeudoInfo: adeudo,
        // Extraer la fecha de envío en formato local
        fechaEnvio: recordatorio.sentAt ? new Date(recordatorio.sentAt).toLocaleDateString('es-MX') : 'N/A',
        // Traducir el status a español
        estadoEnvio: recordatorio.status === 'enviado' ? 'Enviado' : 
                    recordatorio.status === 'error' ? 'Error al enviar' : 'Pendiente'
      };
    }));
    
    res.json(recordatoriosEnriquecidos);
  } catch (error) {
    console.error('Error al obtener recordatorios:', error);
    res.status(500).json({ message: 'Error al obtener recordatorios de pago del estudiante' });
  }
});

// Importamos el generador de recibos
import { generateReceipt } from '../services/receipt-generator';

// Endpoint para descargar un recibo específico
router.get('/recibo/:pagoId', verifyPaymentAccess, async (req, res) => {
  try {
    // El pago ya está verificado y disponible en req.pago gracias al middleware verifyPaymentAccess
    const pago = req.pago;
    
    // Obtenemos el concepto para enriquecer la respuesta
    const concepto = await storage.getPaymentConcept(pago.conceptoId);
    
    // Obtenemos información del estudiante
    const estudiante = await storage.getStudent(pago.alumnoId);
    if (!estudiante) {
      return res.status(404).json({ 
        message: 'No se encontró información del estudiante',
        success: false 
      });
    }
    
    // Verificar si existe una URL de PDF asociada al pago que no sea en el dominio inválido
    const invalidDomainPattern = /altum\.edu\.mx/;
    
    if (pago.pdfUrl && !invalidDomainPattern.test(pago.pdfUrl)) {
      // Si existe una URL de PDF válida, devolvemos la URL para ser usada en un enlace de descarga
      return res.json({
        pago: {
          ...pago,
          nombreConcepto: concepto?.nombre || 'Concepto desconocido',
          descripcionConcepto: concepto?.descripcion || ''
        },
        pdfUrl: pago.pdfUrl,
        success: true
      });
    }
    
    // Si no hay URL de PDF válida, generamos un nuevo PDF
    try {
      // Generamos el PDF del recibo y obtenemos la URL relativa
      const pdfUrl = await generateReceipt(pago, estudiante, concepto);
      
      // Actualizamos el registro en la base de datos con la nueva URL
      const updatedPago = await storage.updatePayment(pago.id, { pdfUrl });
      
      // Devolvemos la URL del PDF generado
      return res.json({
        pago: {
          ...updatedPago,
          nombreConcepto: concepto?.nombre || 'Concepto desconocido',
          descripcionConcepto: concepto?.descripcion || ''
        },
        pdfUrl,
        success: true,
        message: 'Recibo generado correctamente'
      });
    } catch (generationError) {
      console.error('Error al generar recibo:', generationError);
      
      // Si hay error al generar el PDF, verificamos si hay un log de correo como alternativa
      const emailLogs = await storage.getEmailLogsByPayment(pago.id);
      
      if (emailLogs.length > 0) {
        return res.json({
          pago: {
            ...pago,
            nombreConcepto: concepto?.nombre || 'Concepto desconocido',
            descripcionConcepto: concepto?.descripcion || ''
          },
          emailLog: emailLogs[0],
          message: 'Recibo disponible solo en formato de correo electrónico. No se pudo generar PDF.',
          success: true
        });
      }
      
      return res.status(500).json({ 
        message: 'Error al generar el recibo del pago',
        success: false 
      });
    }
  } catch (error) {
    console.error('Error al obtener recibo:', error);
    res.status(500).json({ 
      message: 'Error al obtener el recibo del pago',
      success: false 
    });
  }
});

export default router;