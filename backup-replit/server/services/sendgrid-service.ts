import sgMail from "@sendgrid/mail";
import fs from "fs";
import path from "path";

// Configurar SendGrid con la clave API
if (!process.env.SENDGRID_API_KEY) {
  console.error(
    "ADVERTENCIA: No se encontró la clave API de SendGrid en las variables de entorno",
  );
  console.warn(
    "SENDGRID_API_KEY no está configurada. Se omitirán funciones relacionadas con el envío de correos.",
  );
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Configurar remitente de correo por defecto
const DEFAULT_SENDER = process.env.EMAIL_SENDER || "noreply@sendgrid.net";
console.log(`Configurando remitente de correo por defecto: ${DEFAULT_SENDER}`);

class SendGridService {
  /**
   * Envía un correo con el recibo de pago
   */
  async sendReceiptEmail(params: {
    to: string;
    studentName: string;
    paymentAmount: number;
    paymentDate: string;
    paymentId: number;
    pdfPath: string;
  }): Promise<boolean> {
    try {
      const {
        to,
        studentName,
        paymentAmount,
        paymentDate,
        paymentId,
        pdfPath,
      } = params;

      // Formatear el monto para mostrar en el correo
      const formattedAmount = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(paymentAmount);

      // Leer el archivo PDF
      const filePath = path.join(
        process.cwd(),
        "public",
        pdfPath.replace(/^\//, ""),
      );

      if (!fs.existsSync(filePath)) {
        console.error(`El archivo de recibo no existe en la ruta: ${filePath}`);
        return false;
      }

      const pdfContent = fs.readFileSync(filePath);
      const pdfBase64 = pdfContent.toString("base64");

      // Construir el correo
      const msg = {
        to,
        from: DEFAULT_SENDER,
        subject: `Recibo de pago - ${studentName}`,
        text: `
          Recibo de pago #${paymentId}
          
          Estimado padre/tutor,
          
          Adjunto encontrará el recibo de pago realizado para ${studentName} por un monto de ${formattedAmount}, 
          con fecha ${paymentDate}.
          
          Gracias por su pago.
          
          Atentamente,
          Sistema Educativo Altum
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2980b9;">Recibo de pago #${paymentId}</h2>
            <p>Estimado padre/tutor,</p>
            <p>Adjunto encontrará el recibo de pago realizado para <strong>${studentName}</strong> por un monto de 
            <strong>${formattedAmount}</strong>, con fecha <strong>${paymentDate}</strong>.</p>
            <p>Gracias por su pago.</p>
            <p>Atentamente,<br>Sistema Educativo Altum</p>
          </div>
        `,
        attachments: [
          {
            content: pdfBase64,
            filename: `recibo_${paymentId}.pdf`,
            type: "application/pdf",
            disposition: "attachment",
          },
        ],
      };

      // Enviar el correo
      await sgMail.send(msg);
      console.log(`Correo con recibo enviado exitosamente a: ${to}`);
      return true;
    } catch (error) {
      console.error("Error al enviar el correo con recibo:", error);
      return false;
    }
  }
}

export const sendGrid = new SendGridService();
