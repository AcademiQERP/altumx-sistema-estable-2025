import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { Payment } from '@shared/schema';
import { generateReceiptPDF, generateFolio } from '@/utils/pdf-utils';
import ReceiptPreview from './ReceiptPreview';

interface DownloadReceiptButtonProps {
  payment: Payment;
  studentName: string;
  conceptName: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

const DownloadReceiptButton: React.FC<DownloadReceiptButtonProps> = ({
  payment,
  studentName,
  conceptName,
  variant = 'outline',
  size = 'sm',
  className = '',
  showLabel = true
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generateReceiptPDF({
        payment,
        studentName,
        conceptName,
        receiptRef
      });
    } catch (error) {
      console.error('Error al generar el recibo PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleDownload}
        disabled={isGenerating}
        title="Descargar recibo en PDF"
      >
        <FileDown className="h-4 w-4 mr-1" />
        {showLabel && 'PDF'}
      </Button>

      {/* Hidden receipt preview for PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <ReceiptPreview
          ref={receiptRef}
          payment={payment}
          studentName={studentName}
          conceptName={conceptName}
          folio={payment.id.toString().padStart(6, '0')}
        />
      </div>
    </>
  );
};

export default DownloadReceiptButton;