import sgMail from "@sendgrid/mail";
import fs from "fs";
import path from "path";
import {
  Payment,
  Student,
  ParentStudentRelation,
  Debt,
  PaymentConcept,
  User,
} from "@shared/schema";
import { storage } from "../storage";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  debts,
  students,
  parentStudentRelations,
  users,
  paymentConcepts,
} from "@shared/schema";
import { db } from "../db";

// Configurar SendGrid con la clave API
if (!process.env.SENDGRID_API_KEY) {
  console.error(
    "ADVERTENCIA: No se encontró la clave API de SendGrid en las variables de entorno",
  );
  console.warn(
    "SENDGRID_API_KEY no está configurada. Se omitirán funciones de envío de correos.",
  );
}

// Usar la clave API actualizada de SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
console.log("API Key de SendGrid configurada correctamente");

// Interfaz para los datos del correo
interface EmailData {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

/**
 * Envía un correo electrónico con el recibo de pago adjunto
 * @param payment El pago realizado
 * @param student El estudiante asociado al pago
 * @param pdfBase64 El PDF del recibo en formato base64
 * @returns Promise<boolean> Éxito o fracaso del envío
 */
export async function sendPaymentReceiptEmail(
  payment: Payment,
  student: Student,
  pdfBase64: string,
): Promise<{ success: boolean; message: string }> {
  try {
    // Buscar al padre/tutor del estudiante
    const relations = await storage.getRelationsByStudent(student.id);

    if (!relations || relations.length === 0) {
      return {
        success: false,
        message: `No se encontró ningún padre/tutor asociado al estudiante ${student.nombreCompleto}`,
      };
    }

    // Obtener los datos del padre/tutor
    const parentIds = relations.map(
      (rel: ParentStudentRelation) => rel.padreId,
    );

    // Si hay múltiples padres, enviar a todos ellos
    const parents = [];
    for (const parentId of parentIds) {
      const parent = await storage.getUser(parentId);
      if (parent && parent.correo) {
        parents.push(parent);
      }
    }

    if (parents.length === 0) {
      return {
        success: false,
        message: `No se encontró ninguna dirección de correo electrónico para los padres/tutores de ${student.nombreCompleto}`,
      };
    }

    // Buscar el concepto de pago
    const concept = await storage.getPaymentConcept(payment.conceptoId);

    if (!concept) {
      return {
        success: false,
        message: `No se encontró el concepto de pago con ID ${payment.conceptoId}`,
      };
    }

    // Nombre del colegio (se podría obtener de la configuración)
    const schoolName = "Instituto EduMex";

    // Correos de los padres/tutores
    const parentEmails = parents.map((p) => p.correo);

    // Datos para el correo
    const emailData: EmailData = {
      to: parentEmails.join(", "),
      from: "noreply@sendgrid.net", // Usando el dominio de remitente verificado
      subject: `Recibo de pago registrado – ${student.nombreCompleto}`,
      text: `
Estimado(a) padre/tutor:

Se ha registrado correctamente el pago de ${concept.nombre} correspondiente al alumno ${student.nombreCompleto}.

El pago fue realizado por un monto de $${parseFloat(payment.monto).toFixed(2)} MXN mediante ${payment.metodoPago}.

Adjunto encontrará el recibo oficial emitido por el sistema EduMex ERP.

Saludos cordiales,
${schoolName}
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
    .payment-details { background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
    .highlight { font-weight: bold; color: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${schoolName}</h2>
      <p>Confirmación de Pago</p>
    </div>
    
    <p>Estimado(a) padre/tutor:</p>
    
    <p>Se ha registrado correctamente el pago correspondiente al alumno <span class="highlight">${student.nombreCompleto}</span>.</p>
    
    <div class="payment-details">
      <p><strong>Concepto:</strong> ${concept.nombre}</p>
      <p><strong>Monto:</strong> $${parseFloat(payment.monto).toFixed(2)} MXN</p>
      <p><strong>Método de pago:</strong> ${payment.metodoPago}</p>
      <p><strong>Fecha de pago:</strong> ${new Date(payment.fechaPago).toLocaleDateString("es-MX")}</p>
      ${payment.referencia ? `<p><strong>Referencia:</strong> ${payment.referencia}</p>` : ""}
    </div>
    
    <p>Adjunto encontrará el recibo oficial emitido por el sistema EduMex ERP.</p>
    
    <p>Saludos cordiales,<br>${schoolName}</p>
    
    <div class="footer">
      <p>Este es un correo automático, por favor no responda a este mensaje.</p>
    </div>
  </div>
</body>
</html>
      `,
      attachments: [
        {
          content: pdfBase64,
          filename: `Recibo_${student.nombreCompleto.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    };

    // Enviar el correo
    await sgMail.send(emailData);

    // Guardar log del envío
    await storage.createEmailLog({
      paymentId: payment.id,
      studentId: student.id,
      recipientEmails: parentEmails.join(", "),
      status: "enviado",
      sentAt: new Date(),
      errorMessage: null,
    });

    return {
      success: true,
      message: `Recibo enviado exitosamente a ${parentEmails.join(", ")}`,
    };
  } catch (error) {
    console.error("Error al enviar correo de recibo:", error);

    // Intentar guardar log del error
    try {
      await storage.createEmailLog({
        paymentId: payment.id,
        studentId: student.id,
        recipientEmails: "",
        status: "error",
        sentAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    } catch (logError) {
      console.error("Error al guardar log de correo:", logError);
    }

    return {
      success: false,
      message: `Error al enviar el correo: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Interfaz que describe la estructura de un adeudo pendiente con datos relacionados
 */
interface PendingDebtWithDetails {
  id: number;
  montoTotal: string;
  fechaLimite: string;
  studentId: number;
  studentName: string;
  conceptName: string;
  parentEmails: string[];
}

/**
 * Envía recordatorios de pagos pendientes a los padres/tutores
 * Busca adeudos que vencen en los próximos 3 días
 * @returns Promise<{success: number, errors: number}> Resultados del proceso de envío
 */
export async function sendUpcomingPaymentReminders(): Promise<{
  success: number;
  errors: number;
  omitted: number;
  message: string;
  sentTo?: string[];
  errorDetails?: string[];
  omittedDetails?: string[];
}> {
  console.log(
    "Iniciando proceso de envío de recordatorios de pagos pendientes...",
  );

  const today = new Date();
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);

  today.setHours(0, 0, 0, 0);
  threeDaysLater.setHours(23, 59, 59, 999);

  const todayStr = today.toISOString().split("T")[0];
  const threeDaysLaterStr = threeDaysLater.toISOString().split("T")[0];

  console.log(
    `Buscando adeudos pendientes entre ${todayStr} y ${threeDaysLaterStr}`,
  );

  try {
    // 1. Obtener adeudos pendientes con fechas de vencimiento próximas
    const pendingDebts = await db
      .select({
        id: debts.id,
        alumnoId: debts.alumnoId,
        conceptoId: debts.conceptoId,
        montoTotal: debts.montoTotal,
        fechaLimite: debts.fechaLimite,
        estatus: debts.estatus,
      })
      .from(debts)
      .where(
        and(
          eq(debts.estatus, "pendiente"),
          gte(debts.fechaLimite, todayStr),
          lte(debts.fechaLimite, threeDaysLaterStr),
        ),
      );

    console.log(
      `Se encontraron ${pendingDebts.length} adeudos pendientes próximos a vencer`,
    );

    if (pendingDebts.length === 0) {
      return {
        success: 0,
        errors: 0,
        omitted: 0,
        message: "No se encontraron adeudos próximos a vencer",
      };
    }

    // 2. Recopilar detalles adicionales para cada adeudo
    const debtsWithDetails: PendingDebtWithDetails[] = [];
    const omittedDebts: { id: number; studentName: string; reason: string }[] =
      [];
    let omittedCount = 0;

    for (const debt of pendingDebts) {
      try {
        // Obtener datos del estudiante
        const student = await storage.getStudent(debt.alumnoId);
        if (!student) {
          const reason = "No se encontró información del estudiante";
          console.error(`No se encontró el estudiante con ID ${debt.alumnoId}`);
          omittedCount++;
          omittedDebts.push({
            id: debt.id,
            studentName: `ID: ${debt.alumnoId}`,
            reason: reason,
          });

          // Registrar el adeudo omitido en los logs
          try {
            await storage.createEmailLog({
              studentId: debt.alumnoId,
              paymentId: 0,
              debtId: debt.id,
              conceptName: "",
              dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null,
              recipientEmails: "",
              status: "omitido",
              sentAt: new Date(),
              errorMessage: reason,
            });
          } catch (logError) {
            console.error(
              "Error al registrar adeudo omitido en logs:",
              logError,
            );
          }
          continue;
        }

        // Obtener datos del concepto de pago
        const concept = await storage.getPaymentConcept(debt.conceptoId);
        if (!concept) {
          const reason = "No se encontró el concepto de pago";
          console.error(
            `No se encontró el concepto de pago con ID ${debt.conceptoId}`,
          );
          omittedCount++;
          omittedDebts.push({
            id: debt.id,
            studentName: student.nombreCompleto,
            reason: reason,
          });

          // Registrar en los logs
          try {
            await storage.createEmailLog({
              studentId: student.id,
              paymentId: 0,
              debtId: debt.id,
              conceptName: `Concepto ID: ${debt.conceptoId}`,
              dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null,
              recipientEmails: "",
              status: "omitido",
              sentAt: new Date(),
              errorMessage: reason,
            });
          } catch (logError) {
            console.error(
              "Error al registrar adeudo omitido en logs:",
              logError,
            );
          }
          continue;
        }

        // Obtener relaciones padre-estudiante
        const relations = await storage.getRelationsByStudent(debt.alumnoId);
        if (!relations || relations.length === 0) {
          const reason = "No tiene tutores registrados";
          console.error(
            `No se encontraron padres/tutores para el estudiante ${student.nombreCompleto}`,
          );
          omittedCount++;
          omittedDebts.push({
            id: debt.id,
            studentName: student.nombreCompleto,
            reason: reason,
          });

          // Registrar en los logs
          try {
            await storage.createEmailLog({
              studentId: student.id,
              paymentId: 0,
              debtId: debt.id,
              conceptName: concept.nombre,
              dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null,
              recipientEmails: "",
              status: "omitido",
              sentAt: new Date(),
              errorMessage: reason,
            });
          } catch (logError) {
            console.error(
              "Error al registrar adeudo omitido en logs:",
              logError,
            );
          }
          continue;
        }

        // Obtener emails de padres/tutores
        const parentEmails: string[] = [];
        for (const relation of relations) {
          const parent = await storage.getUser(relation.padreId);
          if (parent && parent.correo) {
            parentEmails.push(parent.correo);
          }
        }

        if (parentEmails.length === 0) {
          const reason = "Sus tutores no tienen correo registrado";
          console.error(
            `No se encontraron emails de padres/tutores para el estudiante ${student.nombreCompleto}`,
          );
          omittedCount++;
          omittedDebts.push({
            id: debt.id,
            studentName: student.nombreCompleto,
            reason: reason,
          });

          // Registrar en los logs
          try {
            await storage.createEmailLog({
              studentId: student.id,
              paymentId: 0,
              debtId: debt.id,
              conceptName: concept.nombre,
              dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null,
              recipientEmails: "",
              status: "omitido",
              sentAt: new Date(),
              errorMessage: reason,
            });
          } catch (logError) {
            console.error(
              "Error al registrar adeudo omitido en logs:",
              logError,
            );
          }
          continue;
        }

        // Agregar a la lista de adeudos con detalles
        debtsWithDetails.push({
          id: debt.id,
          montoTotal: debt.montoTotal,
          fechaLimite: debt.fechaLimite,
          studentId: student.id,
          studentName: student.nombreCompleto,
          conceptName: concept.nombre,
          parentEmails: parentEmails,
        });
      } catch (error) {
        const reason = `Error inesperado: ${error instanceof Error ? error.message : String(error)}`;
        console.error(
          `Error al procesar detalles del adeudo ${debt.id}:`,
          error,
        );
        omittedCount++;
        omittedDebts.push({
          id: debt.id,
          studentName: `Adeudo ID: ${debt.id}`,
          reason: reason,
        });

        // Intentar registrar en los logs
        try {
          await storage.createEmailLog({
            studentId: debt.alumnoId,
            paymentId: 0,
            debtId: debt.id,
            conceptName: "",
            dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null,
            recipientEmails: "",
            status: "omitido",
            sentAt: new Date(),
            errorMessage: reason,
          });
        } catch (logError) {
          console.error("Error al registrar adeudo omitido en logs:", logError);
        }
      }
    }

    console.log(
      `Se procesaron ${debtsWithDetails.length} adeudos con todos los detalles necesarios`,
    );
    console.log(
      `Se omitieron ${omittedCount} adeudos por falta de información completa`,
    );

    // 3. Enviar recordatorios para cada adeudo
    let successCount = 0;
    let errorCount = 0;
    const sentTo: string[] = [];
    const errorDetails: string[] = [];

    const schoolName = "Instituto EduMex";

    for (const debt of debtsWithDetails) {
      try {
        const formattedAmount = parseFloat(debt.montoTotal).toLocaleString(
          "es-MX",
          {
            style: "currency",
            currency: "MXN",
          },
        );

        const formattedDate = new Date(debt.fechaLimite).toLocaleDateString(
          "es-MX",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          },
        );

        const emailData: EmailData = {
          to: debt.parentEmails.join(", "),
          from: "noreply@sendgrid.net", // Usando el dominio de remitente verificado
          subject: `Recordatorio de pago próximo a vencer - ${debt.studentName}`,
          text: `
Estimado(a) padre/tutor:

Este es un recordatorio de que el adeudo por ${debt.conceptName} correspondiente a ${debt.studentName} vence el ${formattedDate}.

Monto a pagar: ${formattedAmount}

Puede realizar su pago en el sistema EduMex ERP o acudir al área administrativa.

Gracias por su atención.
${schoolName}
          `,
          html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
    .debt-details { background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
    .highlight { font-weight: bold; color: #e11d48; }
    .amount { font-size: 1.2em; font-weight: bold; color: #2563eb; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${schoolName}</h2>
      <p>Recordatorio de Pago</p>
    </div>
    
    <p>Estimado(a) padre/tutor:</p>
    
    <p>Este es un recordatorio de que el siguiente adeudo está próximo a vencer:</p>
    
    <div class="debt-details">
      <p><strong>Estudiante:</strong> ${debt.studentName}</p>
      <p><strong>Concepto:</strong> ${debt.conceptName}</p>
      <p><strong>Fecha de vencimiento:</strong> <span class="highlight">${formattedDate}</span></p>
      <p><strong>Monto a pagar:</strong> <span class="amount">${formattedAmount}</span></p>
    </div>
    
    <p>Puede realizar su pago a través del portal para padres en el sistema EduMex ERP o acudir personalmente al área administrativa de la institución.</p>
    
    <p>Si ya realizó este pago, por favor ignore este mensaje.</p>
    
    <p>Gracias por su atención y puntualidad.</p>
    
    <p>Saludos cordiales,<br>${schoolName}</p>
    
    <div class="footer">
      <p>Este es un correo automático, por favor no responda a este mensaje.</p>
    </div>
  </div>
</body>
</html>
          `,
        };

        // Enviar el correo
        await sgMail.send(emailData);

        // Guardar log del envío
        await storage.createEmailLog({
          studentId: debt.studentId,
          paymentId: 0, // No hay pago asociado aún
          recipientEmails: debt.parentEmails.join(", "),
          status: "enviado",
          sentAt: new Date(),
          errorMessage: null,
        });

        successCount++;
        sentTo.push(debt.parentEmails.join(", "));
        console.log(
          `Recordatorio enviado exitosamente para ${debt.studentName}`,
        );

        // Guardamos también un registro de los envíos exitosos
        try {
          await storage.createEmailLog({
            studentId: debt.studentId,
            paymentId: 0, // No hay pago asociado aún
            debtId: debt.id,
            conceptName: debt.conceptName,
            dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null,
            recipientEmails: debt.parentEmails.join(", "),
            guardianEmail: debt.parentEmails[0] || "",
            subject: `Recordatorio de pago - ${debt.conceptName}`,
            status: "enviado",
            sentAt: new Date(),
            errorMessage: null,
          });
          console.log(
            `✓ Log de envío exitoso guardado para adeudo ${debt.id} del estudiante ${debt.studentName}`,
          );
        } catch (logError) {
          console.error("Error al guardar log de correo exitoso:", logError);
        }
      } catch (error) {
        errorCount++;
        // Obtener información detallada del error
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorCode = error.code || "desconocido";

        // Extraer detalles específicos del error de SendGrid si están disponibles
        let errorDetails = [];
        let sendGridErrorMessage = errorMessage;
        let errorResponseBody = null;

        if (error.response && error.response.body) {
          console.log(
            "Detalles completos del error de SendGrid:",
            JSON.stringify(error.response.body, null, 2),
          );

          if (error.response.body.errors) {
            errorResponseBody = JSON.stringify(error.response.body.errors);
            errorDetails = error.response.body.errors;
            console.log(
              "Errores específicos de SendGrid:",
              JSON.stringify(errorDetails, null, 2),
            );

            // Si hay errores específicos de SendGrid, los añadimos al mensaje
            if (errorDetails.length > 0) {
              sendGridErrorMessage = errorDetails
                .map(
                  (err) =>
                    `${err.message || "Error desconocido"} (${err.field || "sin campo"})`,
                )
                .join("; ");
            }
          }
        }

        // Registrar para la respuesta de la API
        errorDetails.push(`Error para ${debt.studentName}: ${errorMessage}`);
        console.error(
          `Error al enviar recordatorio para adeudo ${debt.id}:`,
          error,
        );

        // Recopilar los datos que queremos guardar en el registro
        const emailContent = {
          subject: `Recordatorio de pago próximo a vencer - ${debt.studentName}`,
          emailBody: `Concepto: ${debt.conceptName}, Monto: ${debt.montoTotal}, Fecha límite: ${debt.fechaLimite}`,
          recipientEmails: debt.parentEmails.join(", "),
        };

        // Guardar log detallado del error
        try {
          await storage.createEmailLog({
            studentId: debt.studentId,
            paymentId: 0, // No hay pago asociado aún
            debtId: debt.id, // Importante: Guardar el ID del adeudo
            conceptName: debt.conceptName, // Concepto de pago
            dueDate: debt.fechaLimite ? new Date(debt.fechaLimite) : null, // Fecha límite
            recipientEmails: debt.parentEmails.join(", "),
            guardianEmail: debt.parentEmails[0] || "", // Email principal del tutor
            subject: `Recordatorio de pago - ${debt.conceptName}`,
            status: "error",
            sentAt: new Date(),
            errorMessage: `Código: ${errorCode}. Mensaje: ${sendGridErrorMessage}. Detalles: ${errorResponseBody || "No disponibles"}`,
          });
          console.log(
            `✓ Log de error guardado para adeudo ${debt.id} del estudiante ${debt.studentName}`,
          );
        } catch (logError) {
          console.error("Error al guardar log de correo:", logError);
        }
      }
    }

    // Crear mensaje de resumen
    const omittedDetailsArr = omittedDebts.map(
      (d) => `${d.studentName}: ${d.reason}`,
    );
    const message = `Proceso completado. Recordatorios enviados: ${successCount}. Errores: ${errorCount}. Omitidos: ${omittedCount}.`;
    console.log(message);

    return {
      success: successCount,
      errors: errorCount,
      omitted: omittedCount,
      message,
      sentTo: sentTo.length > 0 ? sentTo : undefined,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      omittedDetails:
        omittedDetailsArr.length > 0 ? omittedDetailsArr : undefined,
    };
  } catch (error) {
    console.error("Error en el proceso de envío de recordatorios:", error);
    return {
      success: 0,
      errors: 0,
      omitted: 0,
      message: `Error general en el proceso: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Envía un informe para padres con recomendaciones de IA
 * @param studentName Nombre del estudiante
 * @param tutorEmail Correo electrónico del tutor
 * @param pdfBase64 PDF del informe en formato base64
 * @param teacherName Nombre del profesor que envía el informe
 * @returns Promise con resultado del envío
 */
/**
 * Envía un informe de padres por correo electrónico desde un documento jsPDF
 * @param pdfDoc Documento PDF generado con jsPDF
 * @param studentName Nombre del estudiante
 * @param tutorEmail Correo electrónico del tutor
 * @param teacherName Nombre del profesor
 * @returns Resultado de la operación
 */
export async function sendParentReportByEmail(
  pdfDoc: any, // jsPDF no tiene un tipo exportado directamente
  studentName: string,
  tutorEmail: string,
  teacherName: string
): Promise<boolean> {
  try {
    // Convertir el PDF a base64
    const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];
    
    // Enviar correo con el PDF adjunto
    const result = await sendParentReportEmail(
      studentName,
      tutorEmail,
      pdfBase64,
      teacherName
    );
    
    return result.success;
  } catch (error) {
    console.error('Error al enviar informe por correo:', error);
    return false;
  }
}

/**
 * Envía un informe de padres por correo electrónico
 * @param studentName Nombre del estudiante
 * @param tutorEmail Correo electrónico del tutor
 * @param pdfBase64 Contenido del PDF en base64
 * @param teacherName Nombre del profesor
 * @returns Resultado de la operación
 */
export async function sendParentReportEmail(
  studentName: string,
  tutorEmail: string,
  pdfBase64: string,
  teacherName: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      return {
        success: false,
        message: "SENDGRID_API_KEY no está configurada. No se puede enviar el correo.",
      };
    }

    if (!tutorEmail) {
      return {
        success: false,
        message: `No se encontró dirección de correo electrónico para el tutor de ${studentName}`,
      };
    }

    // Nombre del colegio
    const schoolName = "Instituto EduMex";
    
    // Datos para el correo
    const emailData: EmailData = {
      to: tutorEmail,
      from: process.env.EMAIL_SENDER || "noreply@sendgrid.net", // Usando el dominio de remitente verificado
      subject: `Informe Académico de ${studentName}`,
      text: `
Estimado(a) padre/tutor:

El/La profesor(a) ${teacherName} ha generado un informe académico personalizado para ${studentName}.

Este informe incluye:
- Datos generales del estudiante
- Fortalezas identificadas
- Áreas para fortalecer
- Evaluación de desarrollo
- Observaciones individuales
- Próximos pasos recomendados
- Conclusiones finales

Por favor, revise el archivo PDF adjunto para obtener información detallada.

Saludos cordiales,
${schoolName}
      `,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
    .report-details { background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
    .highlight { font-weight: bold; color: #2563eb; }
    .sections { margin-top: 15px; }
    .section-item { padding: 5px 0; }
    .section-icon { display: inline-block; width: 20px; text-align: center; margin-right: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${schoolName}</h2>
      <p>Informe Académico Personalizado</p>
    </div>
    
    <p>Estimado(a) padre/tutor:</p>
    
    <p>El/La profesor(a) <span class="highlight">${teacherName}</span> ha generado un informe académico personalizado para <span class="highlight">${studentName}</span>.</p>
    
    <div class="report-details">
      <p><strong>Informe académico generado con asistencia de inteligencia artificial (Claude).</strong></p>
      <p>Este informe incluye:</p>
      
      <div class="sections">
        <div class="section-item"><span class="section-icon">📝</span> Datos generales del estudiante</div>
        <div class="section-item"><span class="section-icon">🌟</span> Fortalezas identificadas</div>
        <div class="section-item"><span class="section-icon">⚡</span> Áreas para fortalecer</div>
        <div class="section-item"><span class="section-icon">📊</span> Evaluación de desarrollo</div>
        <div class="section-item"><span class="section-icon">📝</span> Observaciones individuales</div>
        <div class="section-item"><span class="section-icon">🚀</span> Próximos pasos recomendados</div>
        <div class="section-item"><span class="section-icon">📋</span> Conclusiones finales</div>
      </div>
    </div>
    
    <p>Por favor, revise el archivo PDF adjunto para obtener información detallada.</p>
    
    <p>Saludos cordiales,<br>${schoolName}</p>
    
    <div class="footer">
      <p>Este es un correo automático, por favor no responda a este mensaje.</p>
      <p>Si tiene alguna pregunta, póngase en contacto con el/la profesor(a) ${teacherName} directamente.</p>
    </div>
  </div>
</body>
</html>
      `,
      attachments: [
        {
          content: pdfBase64,
          filename: `Informe_${studentName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
          type: "application/pdf",
          disposition: "attachment",
        },
      ],
    };

    // Enviar el correo
    await sgMail.send(emailData);

    return {
      success: true,
      message: `Informe enviado exitosamente a ${tutorEmail}`,
    };
  } catch (error) {
    console.error("Error al enviar informe para padres:", error);

    return {
      success: false,
      message: `Error al enviar el informe: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
