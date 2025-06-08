import Stripe from "stripe";
import { InsertPayment, payments, Debt, debts } from "@shared/schema";
import { storage } from "../storage";
import { db } from "../db";
import { eq } from "drizzle-orm";

let stripe: Stripe | null = null;

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    "STRIPE_SECRET_KEY no está configurada. Se omitirán funciones relacionadas con Stripe.",
  );
} else {
  // Inicializar Stripe con la clave secreta
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-03-31.basil",
  });
}

export interface CreatePaymentIntentParams {
  debtId: number;
  amount: number;
  description: string;
  metadata: Record<string, string>;
}

export interface PaymentConfirmationResult {
  success: boolean;
  paymentId?: number;
  receiptUrl?: string | null;
  error?: string;
}

export class StripeService {
  /**
   * Verifica que Stripe esté correctamente inicializado
   */
  private ensureStripeInitialized(): void {
    if (!stripe) {
      throw new Error('Stripe no está inicializado. Verifique que STRIPE_SECRET_KEY esté configurada correctamente.');
    }
  }

  /**
   * Crea una intención de pago en Stripe
   */
  async createPaymentIntent(params: CreatePaymentIntentParams) {
    try {
      this.ensureStripeInitialized();
      
      const { debtId, amount, description, metadata } = params;

      // Crear la intención de pago en Stripe
      const paymentIntent = await stripe!.paymentIntents.create({
        amount: Math.round(amount * 100), // Convertir a centavos
        currency: "mxn",
        description,
        metadata: {
          ...metadata,
          debtId: debtId.toString(),
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error("Error al crear la intención de pago en Stripe:", error);
      throw new Error(
        `Error al crear la intención de pago: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Procesa un pago exitoso y registra en la base de datos
   */
  async processSuccessfulPayment(
    paymentIntentId: string,
    studentId: number,
    debtId: number,
    paymentMethod: string,
  ): Promise<PaymentConfirmationResult> {
    try {
      this.ensureStripeInitialized();
      
      // Obtener la información del PaymentIntent desde Stripe
      const paymentIntent =
        await stripe!.paymentIntents.retrieve(paymentIntentId);

      // Verificar que el pago fue exitoso
      if (paymentIntent.status !== "succeeded") {
        return {
          success: false,
          error: `El pago no fue completado. Estado: ${paymentIntent.status}`,
        };
      }

      // Obtener la información de la deuda
      const debt = await storage.getDebt(debtId);
      if (!debt) {
        return {
          success: false,
          error: "La deuda no existe",
        };
      }

      // Registrar el pago en la base de datos (sin URL de PDF aún)
      const newPayment: InsertPayment = {
        conceptoId: debt.conceptoId,
        monto: (Number(paymentIntent.amount) / 100).toString(), // Convertir de centavos a pesos
        fechaPago: new Date().toISOString().split('T')[0], // Solo la fecha
        metodoPago: paymentMethod,
        referencia: paymentIntentId,
        observaciones:
          "Pago realizado a través del portal de padres con Stripe",
        pdfUrl: null, // Se actualizará después de generar el PDF
      };

      const payment = await storage.createPayment(newPayment);

      // Actualizar el estado de la deuda a "pagado"
      await db
        .update(debts)
        .set({ estatus: "pagado" })
        .where(eq(debts.id, debtId));

      // Generar el recibo PDF
      try {
        const receiptService = await import("../services/receipt-generator");
        const pdfPath =
          await receiptService.receiptGenerator.generateReceipt(payment);

        // Actualizar el pago con la URL del PDF
        if (pdfPath) {
          await db
            .update(payments)
            .set({ pdfUrl: pdfPath })
            .where(eq(payments.id, payment.id));

          // Actualizar el objeto de pago para devolverlo correctamente
          payment.pdfUrl = pdfPath;
        }
      } catch (pdfError) {
        console.error("Error al generar el recibo PDF:", pdfError);
        // No detenemos el proceso si falla la generación del PDF
      }

      return {
        success: true,
        paymentId: payment.id,
        receiptUrl: payment.pdfUrl,
      };
    } catch (error) {
      console.error("Error al procesar el pago exitoso:", error);
      return {
        success: false,
        error: `Error al procesar el pago: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Verifica el estado de un PaymentIntent en Stripe
   */
  async checkPaymentStatus(paymentIntentId: string) {
    try {
      this.ensureStripeInitialized();
      
      const paymentIntent =
        await stripe!.paymentIntents.retrieve(paymentIntentId);
      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convertir de centavos a pesos
        paymentMethodTypes: paymentIntent.payment_method_types,
        metadata: paymentIntent.metadata,
      };
    } catch (error) {
      console.error("Error al verificar el estado del pago:", error);
      throw new Error(
        `Error al verificar el estado del pago: ${(error as Error).message}`,
      );
    }
  }
}

export const stripeService = new StripeService();
