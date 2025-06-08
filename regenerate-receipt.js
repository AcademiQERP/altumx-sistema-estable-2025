/**
 * Script para regenerar el recibo PDF del pago ID 11 con el nuevo diseño
 */

import { storage } from './server/storage.js';
import { receiptGenerator } from './server/services/receipt-generator.js';

async function regenerateReceipt() {
  try {
    console.log('🔄 Regenerando recibo del pago ID 11...');
    
    // Obtener datos del pago
    const pago = await storage.getPayment(11);
    if (!pago) {
      console.error('❌ No se encontró el pago con ID 11');
      return;
    }
    
    console.log('✅ Pago encontrado:', {
      id: pago.id,
      alumnoId: pago.alumnoId,
      monto: pago.monto,
      fecha: pago.fechaPago
    });
    
    // Regenerar el PDF con el nuevo diseño
    const pdfUrl = await receiptGenerator.generateReceipt(pago);
    
    console.log('✅ Recibo regenerado exitosamente:', pdfUrl);
    console.log('📄 El archivo PDF ha sido actualizado con el nuevo diseño modernizado');
    
  } catch (error) {
    console.error('❌ Error al regenerar recibo:', error);
  }
}

// Ejecutar la regeneración
regenerateReceipt().then(() => {
  console.log('🏁 Proceso de regeneración completado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});