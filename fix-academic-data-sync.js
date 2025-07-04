/**
 * Fix Academic Data Synchronization
 * Regenerates academic report PDFs using real student grade data
 */

import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

// Academic report generator with real data
function generateRealAcademicReportPDF(reportData, realGrades) {
  const doc = new jsPDF();
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  let y = 20;
  
  // Header
  doc.setFillColor(0, 102, 204);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("INFORME ACADÉMICO", pageWidth / 2, 20, { align: "center" });
  
  y = 50;
  
  // Student Information Section
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INFORMACIÓN DEL ESTUDIANTE", 20, y);
  y += 10;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Nombre: ${reportData.studentName}`, 20, y);
  y += 8;
  doc.text(`Período: ${reportData.period}`, 20, y);
  y += 8;
  doc.text(`Promedio General: ${realGrades.overallAverage.toFixed(1)}`, 20, y);
  y += 20;
  
  // Academic Performance Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RENDIMIENTO ACADÉMICO", 20, y);
  y += 15;
  
  // Draw table headers
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Materia", 20, y);
  doc.text("Calificación", 80, y);
  doc.text("Observaciones", 120, y);
  y += 8;
  
  // Draw line under headers
  doc.line(20, y - 2, 190, y - 2);
  
  // Draw real academic data
  doc.setFont("helvetica", "normal");
  realGrades.subjectGrades.forEach(subject => {
    doc.text(subject.subjectName, 20, y);
    doc.text(subject.average.toString(), 80, y);
    
    // Generate realistic observations based on grade
    let observation = "";
    if (subject.average >= 9.5) {
      observation = "Excelente desempeño académico";
    } else if (subject.average >= 9.0) {
      observation = "Muy buen rendimiento";
    } else if (subject.average >= 8.5) {
      observation = "Buen desempeño general";
    } else {
      observation = "Requiere mayor atención";
    }
    
    const notes = doc.splitTextToSize(observation, 65);
    doc.text(notes, 120, y);
    y += Math.max(6, notes.length * 6);
  });
  
  y += 15;
  
  // Recommendations Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RECOMENDACIONES", 20, y);
  y += 10;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  
  // Generate recommendations based on actual performance
  const recommendations = [];
  if (realGrades.overallAverage >= 9.5) {
    recommendations.push("• Mantener el excelente nivel académico alcanzado");
    recommendations.push("• Considerar participación en actividades de liderazgo académico");
  } else if (realGrades.overallAverage >= 9.0) {
    recommendations.push("• Continuar con el buen ritmo de trabajo académico");
    recommendations.push("• Fortalecer las áreas con menor rendimiento");
  } else {
    recommendations.push("• Implementar estrategias de estudio más efectivas");
    recommendations.push("• Solicitar apoyo adicional en materias con menor desempeño");
  }
  
  recommendations.forEach(rec => {
    const lines = doc.splitTextToSize(rec, pageWidth - 40);
    doc.text(lines, 20, y);
    y += lines.length * 6;
  });
  
  y += 15;
  
  // Payment Information Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("INFORMACIÓN DE PAGO", 20, y);
  y += 10;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Recibo ID: ${reportData.paymentId}`, 20, y);
  y += 8;
  doc.text(`Monto: $${reportData.paymentAmount.toLocaleString('es-MX')}`, 20, y);
  y += 8;
  doc.text(`Referencia: ${reportData.paymentReference}`, 20, y);
  
  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Informe generado con datos académicos reales - Sistema AcademiQ", pageWidth / 2, pageHeight - 20, { align: "center" });
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX')}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  
  return doc;
}

async function main() {
  console.log('🚀 Starting real academic data synchronization...');
  
  // Database connection
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Get payments that need academic reports with real data
    const paymentsQuery = `
      SELECT p.id, p.alumno_id, p.monto, p.referencia, p.fecha_pago 
      FROM pagos p 
      WHERE p.id IN (9, 12, 13)
      ORDER BY p.id
    `;
    
    const paymentsResult = await client.query(paymentsQuery);
    const payments = paymentsResult.rows;
    
    console.log(`📊 Found ${payments.length} payments requiring real academic data`);
    
    // Get student information
    const studentIds = [...new Set(payments.map(p => p.alumno_id))];
    const studentsQuery = `
      SELECT id, nombre_completo 
      FROM alumnos 
      WHERE id = ANY($1)
    `;
    
    const studentsResult = await client.query(studentsQuery, [studentIds]);
    const students = studentsResult.rows;
    
    console.log(`👥 Found ${students.length} students`);
    
    // Ensure reports directory exists
    const reportsDir = path.join(process.cwd(), 'public', 'informes');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Process each payment with real academic data
    for (const payment of payments) {
      const reportId = payment.id;
      const filename = `informe_${reportId}.pdf`;
      const filePath = path.join(reportsDir, filename);
      
      const student = students.find(s => s.id === payment.alumno_id);
      if (student) {
        console.log(`🔧 Regenerating ${filename} with real academic data...`);
        
        // Get real grades for this student
        const gradesQuery = `
          SELECT c.materia_id, c.rubro, c.valor, c.comentario, m.nombre as materia_nombre
          FROM calificaciones c
          LEFT JOIN materias m ON c.materia_id = m.id
          WHERE c.alumno_id = $1
          ORDER BY c.materia_id, c.id
        `;
        
        const gradesResult = await client.query(gradesQuery, [student.id]);
        const studentGrades = gradesResult.rows;
        
        console.log(`📚 Found ${studentGrades.length} real grades for student ${student.nombre_completo}`);
        
        // Process grades by subject
        const gradesBySubject = {};
        let totalSum = 0;
        let totalCount = 0;
        
        studentGrades.forEach(grade => {
          const subjectName = grade.materia_nombre || `Materia ${grade.materia_id}`;
          const gradeValue = parseFloat(grade.valor);
          
          if (!gradesBySubject[subjectName]) {
            gradesBySubject[subjectName] = [];
          }
          
          gradesBySubject[subjectName].push({
            criteria: grade.rubro,
            value: gradeValue,
            comment: grade.comentario
          });
          
          totalSum += gradeValue;
          totalCount++;
        });
        
        // Calculate subject averages
        const subjectGrades = Object.entries(gradesBySubject).map(([subjectName, grades]) => {
          const subjectSum = grades.reduce((sum, g) => sum + g.value, 0);
          const average = grades.length > 0 ? subjectSum / grades.length : 0;
          
          return {
            subjectName,
            grades,
            average: Math.round(average * 10) / 10
          };
        });
        
        // Calculate overall average
        const overallAverage = totalCount > 0 ? Math.round((totalSum / totalCount) * 10) / 10 : 0;
        
        const realGrades = {
          overallAverage,
          subjectGrades,
          totalGrades: totalCount
        };
        
        const reportData = {
          id: reportId,
          studentId: student.id,
          studentName: student.nombre_completo,
          period: new Date(payment.fecha_pago).toLocaleDateString('es-MX', { 
            month: 'long', 
            year: 'numeric' 
          }),
          paymentId: payment.id,
          paymentAmount: parseFloat(payment.monto),
          paymentReference: payment.referencia || `REF-${payment.id}`
        };
        
        const pdf = generateRealAcademicReportPDF(reportData, realGrades);
        const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
        fs.writeFileSync(filePath, pdfBuffer);
        
        console.log(`✅ Regenerated: ${filename} with real average ${overallAverage}`);
      } else {
        console.log(`❌ Student not found for payment ${reportId}`);
      }
    }
    
    console.log('🎉 Real academic data synchronization completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

main().catch(console.error);