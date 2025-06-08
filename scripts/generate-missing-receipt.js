import { receiptGenerator } from '../server/services/receipt-generator.js';
import { storage } from '../server/storage.js';

async function generateMissingReceipt() {
  try {
    // Obtener el pago ID 11 (pago de Stripe)
    const payment = await storage.getPayment(11);
    
    if (!payment) {
      console.error('No se encontró el pago con ID 11');
      return;
    }
    
    console.log('Generando recibo para pago:', payment);
    
    // Generar el recibo PDF
    const pdfUrl = await receiptGenerator.generateReceipt(payment);
    
    console.log('Recibo generado exitosamente:', pdfUrl);
    
    // Actualizar la URL del PDF en la base de datos
    await storage.updatePayment(11, {
      pdfUrl: pdfUrl
    });
    
    console.log('Base de datos actualizada con la nueva URL del PDF');
    
  } catch (error) {
    console.error('Error al generar el recibo:', error);
  }
}

generateMissingReceipt();