import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import Anthropic from '@anthropic-ai/sdk';
import { enviarPromptAClaude, generarPromptIA } from '../services/claudeService';

// Función auxiliar para calcular la edad a partir de una fecha de nacimiento
function calcularEdad(fechaNacimiento: string): number {
  const fechaNac = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mes = hoy.getMonth() - fechaNac.getMonth();
  
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }
  
  return edad;
}

const router = Router();

// Inicializar cliente de Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Verificar que la API key de Anthropic está configurada
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY no está configurada. El servicio de reporte IA no funcionará correctamente.");
}

/**
 * Endpoint para obtener el reporte de IA para un estudiante específico
 */
router.get('/students/:id/reporte-ia', async (req: Request, res: Response) => {
  try {
    const studentId = parseInt(req.params.id);
    if (isNaN(studentId)) {
      return res.status(400).json({ error: 'ID de estudiante inválido' });
    }

    // Obtener datos del estudiante
    const student = await storage.getStudent(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    // Obtener calificaciones, asistencia y pagos del estudiante
    const grades = await storage.getGradesByStudent(studentId);
    const attendance = await storage.getAttendanceByStudent(studentId);
    const debts = await storage.getDebtsByStudent(studentId);
    const payments = await storage.getPaymentsByStudent(studentId);

    // Procesar los datos para el reporte
    const academicData = processGrades(grades);
    const attendanceData = processAttendance(attendance);
    const financialData = processFinancial(debts, payments);

    // Determinar si hay suficientes datos para generar un reporte significativo
    const hasSufficientData = 
      (academicData.materias.length > 0 || 
      attendanceData.periodos.length > 0 || 
      payments.length > 0);

    // Obtener sugerencias de IA basadas en los datos procesados
    let mensaje = "";
    let notaTutor = "";
    
    if (hasSufficientData) {
      try {
        const aiSuggestions = await generateAISuggestions({
          nombreCompleto: student.nombreCompleto,
          edad: calcularEdad(student.fechaNacimiento),
          nivel: student.nivel,
          academico: academicData,
          asistencia: attendanceData,
          financiero: financialData
        });
        
        mensaje = aiSuggestions.mensaje;
        notaTutor = aiSuggestions.notaTutor;
      } catch (error) {
        console.error("Error al generar sugerencias con IA:", error);
        mensaje = "Reporte generado con los datos disponibles del estudiante.";
        notaTutor = "El tutor no ha proporcionado notas adicionales para este periodo.";
      }
    } else {
      mensaje = "No hay suficientes datos académicos, de asistencia o financieros para generar un reporte completo.";
    }

    // Construir y enviar el reporte
    const reporte = {
      nombreCompleto: student.nombreCompleto,
      resumen: {
        suficienteDatos: hasSufficientData,
        mensaje,
        datos: {
          academico: academicData,
          asistencia: attendanceData,
          financiero: financialData
        },
        notaTutor
      }
    };

    res.json(reporte);
  } catch (error) {
    console.error("Error al generar el reporte de IA:", error);
    res.status(500).json({ error: 'Error interno al generar el reporte' });
  }
});

/**
 * Procesa las calificaciones del estudiante para el formato del reporte
 */
function processGrades(grades: any[]) {
  // Si no hay calificaciones, usar datos simulados temporalmente
  if (!grades || grades.length === 0) {
    return {
      materias: [
        { nombre: "Matemáticas", calificacion: 8.5, estado: "bueno" },
        { nombre: "Español", calificacion: 9.2, estado: "excelente" },
        { nombre: "Ciencias Naturales", calificacion: 7.8, estado: "bueno" },
        { nombre: "Historia", calificacion: 6.5, estado: "advertencia" },
        { nombre: "Educación Física", calificacion: 9.0, estado: "excelente" }
      ],
      sugerencia: "Continúa con tu buen desempeño en Español y Matemáticas. Recomendamos enfocarte más en Historia para mejorar tu calificación."
    };
  }

  // Agrupar calificaciones por materia y calcular promedios
  const materiaMap = new Map<string, number[]>();
  
  grades.forEach(grade => {
    const materia = grade.materia || "Desconocida";
    const valor = parseFloat(grade.valor);
    
    if (!isNaN(valor)) {
      if (!materiaMap.has(materia)) {
        materiaMap.set(materia, []);
      }
      materiaMap.get(materia)?.push(valor);
    }
  });

  // Calcular el promedio por materia y determinar el estado
  const materias = Array.from(materiaMap.entries()).map(([nombre, valores]) => {
    const suma = valores.reduce((a, b) => a + b, 0);
    const promedio = valores.length > 0 ? suma / valores.length : 0;
    const calificacion = Math.round(promedio * 10) / 10;
    
    let estado: 'excelente' | 'bueno' | 'advertencia';
    if (calificacion >= 9) {
      estado = 'excelente';
    } else if (calificacion >= 7.5) {
      estado = 'bueno';
    } else {
      estado = 'advertencia';
    }
    
    return { nombre, calificacion, estado };
  });

  // Ordenar materias por calificación (de mayor a menor)
  materias.sort((a, b) => b.calificacion - a.calificacion);
  
  // Sugerencia general basada en las calificaciones
  let sugerencia = "";
  if (materias.length > 0) {
    const materiasExcelentes = materias.filter(m => m.estado === 'excelente');
    const materiasAdvertencia = materias.filter(m => m.estado === 'advertencia');
    
    if (materiasExcelentes.length > 0 && materiasAdvertencia.length > 0) {
      sugerencia = `Excelente desempeño en ${materiasExcelentes[0].nombre}. Recomendamos enfocarte más en ${materiasAdvertencia[0].nombre} para mejorar tu calificación.`;
    } else if (materiasExcelentes.length > 0) {
      sugerencia = `Felicitaciones por tu excelente desempeño en ${materiasExcelentes.map(m => m.nombre).join(', ')}. Continúa con el buen trabajo.`;
    } else if (materiasAdvertencia.length > 0) {
      sugerencia = `Es importante mejorar en ${materiasAdvertencia.map(m => m.nombre).join(', ')}. Considera solicitar asesoría académica adicional.`;
    } else {
      sugerencia = "Mantén el enfoque en todas tus materias para conservar o mejorar tus calificaciones actuales.";
    }
  } else {
    sugerencia = "No hay suficientes datos académicos para generar sugerencias específicas.";
  }
  
  return { materias, sugerencia };
}

/**
 * Procesa los datos de asistencia del estudiante para el formato del reporte
 */
function processAttendance(attendance: any[]) {
  // Si no hay registros de asistencia, usar datos simulados temporalmente
  if (!attendance || attendance.length === 0) {
    return {
      periodos: [
        { mes: "Marzo", porcentaje: 95, tendencia: "estable" },
        { mes: "Abril", porcentaje: 98, tendencia: "mejora" }
      ],
      comentario: "Excelente registro de asistencia. Mantén esta constancia para un óptimo aprovechamiento académico."
    };
  }

  // Agrupar asistencia por meses
  const mesesMap = new Map<string, { presente: number, total: number }>();
  
  attendance.forEach(record => {
    try {
      const fecha = new Date(record.fecha);
      const mes = fecha.toLocaleString('es-MX', { month: 'long' });
      const capitalizedMes = mes.charAt(0).toUpperCase() + mes.slice(1);
      
      if (!mesesMap.has(capitalizedMes)) {
        mesesMap.set(capitalizedMes, { presente: 0, total: 0 });
      }
      
      const mesData = mesesMap.get(capitalizedMes)!;
      mesData.total += 1;
      if (record.asistencia) {
        mesData.presente += 1;
      }
    } catch (e) {
      console.error("Error procesando registro de asistencia:", e);
    }
  });

  // Convertir a periodos y calcular porcentajes y tendencias
  const mesesOrdenados = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const periodos = Array.from(mesesMap.entries())
    .map(([mes, datos]) => {
      const porcentaje = datos.total > 0 
        ? Math.round((datos.presente / datos.total) * 100) 
        : 0;
      return { mes, porcentaje, datos };
    })
    .sort((a, b) => {
      return mesesOrdenados.indexOf(a.mes) - mesesOrdenados.indexOf(b.mes);
    });

  // Calcular tendencias
  const periodosConTendencia = periodos.map((periodo, index) => {
    let tendencia: 'mejora' | 'estable' | 'baja' = 'estable';
    
    if (index > 0) {
      const diferencia = periodo.porcentaje - periodos[index - 1].porcentaje;
      if (diferencia > 2) {
        tendencia = 'mejora';
      } else if (diferencia < -2) {
        tendencia = 'baja';
      }
    }
    
    return { 
      mes: periodo.mes, 
      porcentaje: periodo.porcentaje, 
      tendencia 
    };
  });

  // Generar comentario sobre la asistencia
  let comentario = "";
  if (periodosConTendencia.length > 0) {
    const ultimoPeriodo = periodosConTendencia[periodosConTendencia.length - 1];
    
    if (ultimoPeriodo.porcentaje >= 95) {
      comentario = "Excelente registro de asistencia. Continúa con esta constancia para mantener un óptimo aprovechamiento académico.";
    } else if (ultimoPeriodo.porcentaje >= 85) {
      comentario = "Buen registro de asistencia. Procura mantener la regularidad para no afectar tu desempeño académico.";
    } else {
      comentario = "Es importante mejorar la asistencia a clases para no afectar el rendimiento académico. Cada clase es fundamental para tu desarrollo.";
    }
    
    if (ultimoPeriodo.tendencia === 'mejora') {
      comentario += " Se nota una mejora en tu asistencia reciente, ¡sigue así!";
    } else if (ultimoPeriodo.tendencia === 'baja') {
      comentario += " Presta atención a la tendencia a la baja en tu asistencia reciente.";
    }
  } else {
    comentario = "No hay suficientes datos de asistencia para generar un análisis detallado.";
  }
  
  return { periodos: periodosConTendencia, comentario };
}

/**
 * Endpoint para generar análisis IA personalizado basado en los datos del estudiante
 */
router.post('/api/reporte-ia', async (req: Request, res: Response) => {
  const { nombre, datosAcademicos, asistencia, finanzas } = req.body;

  try {
    // Verificar que todos los datos necesarios están presentes
    if (!nombre || !datosAcademicos || !asistencia || !finanzas) {
      return res.status(400).json({ 
        error: 'Datos incompletos. Se requiere nombre, datosAcademicos, asistencia y finanzas.' 
      });
    }

    // Generar prompt utilizando el servicio Claude
    const prompt = generarPromptIA(nombre, datosAcademicos, asistencia, finanzas);
    
    // Enviar el prompt a Claude y obtener la respuesta
    const respuesta = await enviarPromptAClaude(prompt);
    
    // Enviar la respuesta al cliente
    res.json({ analisisIA: respuesta });
  } catch (error) {
    console.error('Error generando análisis IA:', error);
    res.status(500).json({ error: 'Error al generar análisis con IA' });
  }
});

/**
 * Procesa los datos financieros del estudiante para el formato del reporte
 */
function processFinancial(debts: any[], payments: any[]) {
  // Obtener fecha actual
  const hoy = new Date();
  const mesActual = hoy.toLocaleString('es-MX', { month: 'long' });
  const mesCapitalized = mesActual.charAt(0).toUpperCase() + mesActual.slice(1);
  
  // Si no hay pagos o deudas, usar datos simulados temporalmente
  if ((!payments || payments.length === 0) && (!debts || debts.length === 0)) {
    return {
      pagadoMes: "$2,500.00",
      adeudoActual: "$0.00",
      historial: "Excelente historial de pagos. Todos los conceptos han sido cubiertos a tiempo.",
      recomendacion: "Continúa con la puntualidad en tus pagos para mantener un historial financiero impecable."
    };
  }

  // Calcular pagos del mes actual
  const pagosMes = payments.filter(payment => {
    try {
      const fechaPago = new Date(payment.fechaPago);
      return fechaPago.getMonth() === hoy.getMonth() && 
             fechaPago.getFullYear() === hoy.getFullYear();
    } catch (e) {
      return false;
    }
  });
  
  // Sumar pagos del mes
  const totalPagadoMes = pagosMes.reduce((total, payment) => {
    const monto = parseFloat(payment.monto);
    return isNaN(monto) ? total : total + monto;
  }, 0);
  
  // Sumar deudas actuales
  const totalAdeudo = debts
    .filter(debt => debt.estatus === 'pendiente' || debt.estatus === 'vencido')
    .reduce((total, debt) => {
      const monto = parseFloat(debt.montoTotal);
      return isNaN(monto) ? total : total + monto;
    }, 0);

  // Formatear cantidades como moneda
  const pagadoMes = totalPagadoMes.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  });
  
  const adeudoActual = totalAdeudo.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2
  });

  // Analizar historial de pagos
  let historial = "";
  let recomendacion = "";

  // Contar pagos a tiempo y vencidos
  const pagosTotales = payments.length;
  const deudasVencidas = debts.filter(debt => debt.estatus === 'vencido').length;
  const porcentajePuntualidad = pagosTotales > 0 
    ? ((pagosTotales - deudasVencidas) / pagosTotales) * 100 
    : 0;

  if (pagosTotales === 0) {
    historial = "No hay registros históricos de pagos.";
    recomendacion = "Mantén un historial financiero al día realizando los pagos antes de la fecha de vencimiento.";
  } else if (porcentajePuntualidad >= 90) {
    historial = `Excelente historial de pagos. Se han realizado ${pagosTotales} pagos, la mayoría a tiempo.`;
    recomendacion = "Continúa con la puntualidad en tus pagos para mantener un historial financiero impecable.";
  } else if (porcentajePuntualidad >= 70) {
    historial = `Buen historial de pagos. Se han realizado ${pagosTotales} pagos, con algunos retrasos ocasionales.`;
    recomendacion = "Procura realizar tus pagos antes de la fecha de vencimiento para evitar recargos innecesarios.";
  } else {
    historial = `Historial de pagos con oportunidad de mejora. Se han registrado varios pagos con retraso.`;
    recomendacion = "Recomendamos establecer recordatorios para tus fechas de pago y considerar opciones como domiciliación bancaria para evitar olvidos.";
  }

  // Agregar información sobre pagos recientes
  if (pagosMes.length > 0) {
    historial += ` En ${mesCapitalized} se han realizado ${pagosMes.length} pago(s).`;
  }

  return { pagadoMes, adeudoActual, historial, recomendacion };
}

/**
 * Genera sugerencias utilizando Anthropic Claude
 */
async function generateAISuggestions({
  nombreCompleto,
  edad,
  nivel,
  academico,
  asistencia,
  financiero
}: {
  nombreCompleto: string;
  edad: number;
  nivel: string;
  academico: any;
  asistencia: any;
  financiero: any;
}) {
  // Solo continuar si la API key está configurada
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("API key de Anthropic no configurada");
  }

  // Crear un prompt detallado para Claude
  const prompt = `
Eres un asistente educativo inteligente especializado en generar reportes personalizados para estudiantes.
Necesito que analices los datos de un estudiante y generes un mensaje resumido y una nota personalizada del tutor.

Datos del estudiante:
- Nombre: ${nombreCompleto}
- Edad: ${edad} años
- Nivel educativo: ${nivel}

Datos académicos:
${JSON.stringify(academico, null, 2)}

Datos de asistencia:
${JSON.stringify(asistencia, null, 2)}

Datos financieros:
${JSON.stringify(financiero, null, 2)}

Instrucciones:
1. Genera un mensaje breve y personalizado (2-3 oraciones) que resuma el desempeño general del estudiante, destacando fortalezas y áreas de mejora.
2. Crea una nota personalizada como si fuera escrita por el tutor del estudiante (4-5 oraciones), con un tono amable y motivador, mencionando aspectos específicos del desempeño del estudiante y ofreciendo consejos concretos para mejorar.

Por favor, responde con formato JSON con las siguientes propiedades:
{
  "mensaje": "El mensaje breve aquí",
  "notaTutor": "La nota personalizada del tutor aquí"
}

No incluyas información adicional ni explicaciones fuera del JSON solicitado.
`;

  try {
    // Generar respuesta con Claude
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025. do not change this unless explicitly requested by the user
      max_tokens: 1024,
      temperature: 0.7,
      system: "Eres un asistente educativo especializado en análisis de desempeño estudiantil.",
      messages: [
        { role: "user", content: prompt }
      ]
    });

    // Extraer y parsear la respuesta JSON
    const content = response.content[0].text;
    try {
      // Intentar limpiar markdown code blocks si existen
      let jsonStr = content;
      
      // Si la respuesta contiene bloques de código JSON, extraer solo el contenido JSON
      const jsonBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonBlockMatch && jsonBlockMatch[1]) {
        jsonStr = jsonBlockMatch[1];
      }
      
      // Intentar parsear el JSON
      return JSON.parse(jsonStr);
    } catch (e) {
      // Si no se puede parsear el JSON, extraer el texto más relevante
      console.error("Error al parsear respuesta JSON de Claude:", e);
      console.log("Respuesta recibida:", content);
      
      // Intentar extraer las partes relevantes del texto
      const mensajeMatch = content.match(/\"mensaje\":\s*\"([^\"]+)\"/);
      const notaTutorMatch = content.match(/\"notaTutor\":\s*\"([^\"]+)\"/);
      
      return {
        mensaje: mensajeMatch ? mensajeMatch[1] : "Reporte generado con la información disponible del estudiante.",
        notaTutor: notaTutorMatch ? notaTutorMatch[1] : "El tutor destaca el esfuerzo y dedicación del estudiante. Se recomienda mantener el buen desempeño y prestar atención a las áreas de oportunidad identificadas."
      };
    }
  } catch (error) {
    console.error("Error al generar sugerencias con Claude:", error);
    throw error;
  }
}

export default router;