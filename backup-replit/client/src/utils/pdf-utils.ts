import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from '@shared/schema';

interface GenerateReceiptPDFParams {
  payment: Payment;
  studentName: string;
  conceptName: string;
  receiptRef: React.RefObject<HTMLDivElement>;
}

/**
 * Generates a unique folio ID for receipts
 * @returns A UUID string for receipt identification
 */
export const generateFolio = (): string => {
  return uuidv4();
};

/**
 * Generates and downloads a PDF receipt for a payment
 * @param params Object containing payment, student name, concept name, and the receipt DOM element reference
 * @returns Promise that resolves when the PDF has been generated and downloaded
 */
export const generateReceiptPDF = async ({
  payment,
  studentName,
  conceptName,
  receiptRef
}: GenerateReceiptPDFParams): Promise<void> => {
  try {
    if (!receiptRef.current) {
      console.error('Receipt element not found');
      return;
    }

    // Wait for any pending renders to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Capture the HTML element as a canvas
    const canvas = await html2canvas(receiptRef.current, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Create a new PDF document
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Calculate the proper dimensions
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add the captured canvas to the PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
    // Generate a clean filename (remove special characters from student name)
    const cleanStudentName = studentName
      .normalize('NFD') // Normalize diacritical marks
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
      .replace(/[^\w\s]/gi, '') // Remove non-alphanumeric characters
      .replace(/\s+/g, '_'); // Replace spaces with underscores
    
    // Create a folio-like ID from the payment ID and current timestamp
    const folio = payment.id.toString().padStart(6, '0');
    
    // Save the PDF with a descriptive filename
    const filename = `recibo_pago_${cleanStudentName}_${folio}.pdf`;
    pdf.save(filename);
    
    console.log(`PDF receipt generated successfully: ${filename}`);
  } catch (error) {
    console.error('Error generating PDF receipt:', error);
  }
};