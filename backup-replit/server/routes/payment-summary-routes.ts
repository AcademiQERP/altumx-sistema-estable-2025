import { Request, Response, Router } from "express";
import { db } from "../db";
import { payments, debts } from "../../shared/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { storage } from "../storage";

export const paymentSummaryRoutes = Router();

// GET /api/pagos/padres/:id/resumen
paymentSummaryRoutes.get("/padres/:id/resumen", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today);
    const currentMonthName = format(today, 'MMMM', { locale: require('date-fns/locale/es') });
    
    // Obtener las relaciones padre-estudiante
    const relations = await storage.getRelationsByParent(userId);
    
    if (!relations || relations.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No se encontraron estudiantes asociados a este padre"
      });
    }

    // Obtener IDs de los estudiantes
    const studentIds = relations.map(relation => relation.alumnoId);

    // Calcular totales
    let totalPagado = 0;
    let totalPendiente = 0;
    let totalRechazado = 0;
    
    // Obtener pagos para cada estudiante relacionado con este padre
    for (const studentId of studentIds) {
      const studentPayments = await storage.getPaymentsByStudent(studentId);
      
      // Filtrar por mes actual
      const currentMonthPayments = studentPayments.filter(payment => {
        const paymentDate = new Date(payment.fechaPago);
        return paymentDate >= startOfCurrentMonth && paymentDate <= endOfCurrentMonth;
      });
      
      // Sumar según el estado
      for (const payment of currentMonthPayments) {
        const montoNum = parseFloat(payment.monto.toString());
        
        // El campo "estatus" no está en el tipo Payment, usamos una verificación alternativa
        if (payment.metodoPago.includes('rechazado')) {
          totalRechazado += montoNum;
        } else if (payment.metodoPago.includes('pendiente')) {
          totalPendiente += montoNum;
        } else {
          // Si no es rechazado ni pendiente, asumimos que está pagado
          totalPagado += montoNum;
        }
      }
    }
    
    // Obtener adeudos pendientes del mes actual
    for (const studentId of studentIds) {
      const studentDebts = await storage.getDebtsByStudent(studentId);
      
      // Filtrar por mes actual y no pagados
      const currentMonthDebts = studentDebts.filter(debt => {
        if (debt.estatus === 'pagado') return false;
        
        const dueDate = new Date(debt.fechaLimite);
        return dueDate >= startOfCurrentMonth && dueDate <= endOfCurrentMonth;
      });
      
      // Sumar a pendientes (si no están contabilizados ya en un pago)
      for (const debt of currentMonthDebts) {
        const montoNum = parseFloat(debt.montoTotal.toString());
        totalPendiente += montoNum;
      }
    }

    return res.json({
      success: true,
      resumen: {
        totalPagado,
        totalPendiente,
        totalRechazado,
        mes: currentMonthName
      }
    });
  } catch (error) {
    console.error("Error al obtener resumen de pagos:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener resumen de pagos",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});