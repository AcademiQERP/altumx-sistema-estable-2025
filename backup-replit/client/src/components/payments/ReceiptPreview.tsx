import React, { useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Payment } from '@shared/schema';

interface ReceiptPreviewProps {
  payment: Payment;
  studentName: string;
  conceptName: string;
  folio: string;
}

const ReceiptPreview = React.forwardRef<HTMLDivElement, ReceiptPreviewProps>(
  ({ payment, studentName, conceptName, folio }, ref) => {
    // Format payment reference for different payment methods
    const formatReference = (method: string, reference: string | null) => {
      if (!reference) return 'N/A';
      
      if (method === 'tarjeta' && reference.length >= 4) {
        return `****${reference.slice(-4)}`;
      }
      
      return reference;
    };

    const formattedReference = formatReference(payment.metodoPago, payment.referencia);

    // Get formatted date
    const formattedDate = format(new Date(payment.fechaPago), 'PPP', { locale: es });
    
    // Get payment method in Spanish
    const getPaymentMethodText = (method: string) => {
      const methods: {[key: string]: string} = {
        "efectivo": "Efectivo",
        "tarjeta": "Tarjeta",
        "transferencia": "Transferencia",
        "cheque": "Cheque",
        "otro": "Otro"
      };
      return methods[method] || method;
    };

    return (
      <div 
        ref={ref} 
        className="bg-white p-8 w-[595px] h-[842px] mx-auto font-sans" 
        id="receipt-container"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold uppercase">INSTITUTO ALTUM</h1>
          <div className="flex justify-center my-4">
            <div className="w-16 h-16 bg-gray-200 flex items-center justify-center rounded-full">
              <span className="text-xs text-gray-500">LOGO</span>
            </div>
          </div>
          <h2 className="text-lg font-semibold mt-4">RECIBO DE PAGO</h2>
          <p className="text-sm text-gray-600">Folio: {folio}</p>
        </div>

        {/* Receipt Content */}
        <div className="border border-gray-300 p-6 rounded-md mb-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between">
              <span className="font-semibold">Estudiante:</span>
              <span>{studentName}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-semibold">Fecha de Pago:</span>
              <span>{formattedDate}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-semibold">Concepto:</span>
              <span>{conceptName}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-semibold">Monto:</span>
              <span>${parseFloat(payment.monto).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-semibold">Método:</span>
              <span>{getPaymentMethodText(payment.metodoPago)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-semibold">Referencia:</span>
              <span>{formattedReference}</span>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="text-center mt-12 mb-12 pt-4 border-t border-gray-300">
          <p className="text-sm mb-1">Firma electrónica del Instituto</p>
          <p className="text-xs text-gray-500 italic">"Este documento no requiere firma física"</p>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-0 right-0 text-center text-xs text-gray-500">
          <p>Este recibo ha sido generado automáticamente por EduMex ERP</p>
          <p className="mt-1">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
      </div>
    );
  }
);

ReceiptPreview.displayName = 'ReceiptPreview';

export default ReceiptPreview;