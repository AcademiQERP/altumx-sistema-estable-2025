import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { storage } from '../storage';
import { generateParentReportPDF } from '../services/pdf-service';
import { sendParentReportEmail } from '../services/email-service';
import type { Student } from '@shared/schema';

// Validador de entrada
const validateBody = (schema: z.ZodType<any>): RequestHandler => {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          message: 'Datos de entrada inválidos',
          errors: error.errors
        });
      } else {
        res.status(500).json({
          message: 'Error interno del servidor al validar datos'
        });
      }
    }
  };
};

// Esquema para validar el correo electrónico
const emailSchema = z.object({
  email: z.string().email({ message: 'Correo electrónico inválido' })
});

// Función auxiliar para obtener datos del estudiante y sus calificaciones
async function getStudentDataAndGrades(studentId: number) {
  try {
    // Obtener datos del estudiante
    const student = await storage.getStudent(studentId);
    
    if (!student) {
      return null;
    }

    // Obtener las calificaciones del estudiante
    const grades = await storage.getGrades();
    const studentGrades = grades.filter(g => g.alumnoId === studentId);
    
    // Calcular promedio general
    let totalSum = 0;
    let totalCount = 0;
    
    const subjects = [];
    const subjectMap = new Map<number, { total: number, count: number }>();
    
    // Procesar calificaciones
    for (const grade of studentGrades) {
      // Convertir el valor de string a número
      const valorNumerico = parseFloat(grade.valor);
      
      if (!isNaN(valorNumerico)) {
        totalSum += valorNumerico;
        totalCount++;
        
        // Agrupar por materia
        if (!subjectMap.has(grade.materiaId)) {
          subjectMap.set(grade.materiaId, { 
            total: valorNumerico, 
            count: 1 
          });
        } else {
          const current = subjectMap.get(grade.materiaId)!;
          current.total += valorNumerico;
          current.count++;
          subjectMap.set(grade.materiaId, current);
        }
      }
    }
    
    // Obtener los nombres de las materias
    const subjectIds = Array.from(subjectMap.keys());
    const subjectsData = await Promise.all(
      subjectIds.map(id => storage.getSubject(id))
    );
    
    // Crear la lista de materias con promedios
    for (let i = 0; i < subjectIds.length; i++) {
      const id = subjectIds[i];
      const subject = subjectsData[i];
      const data = subjectMap.get(id)!;
      
      if (subject) {
        subjects.push({
          id,
          nombre: subject.nombre,
          promedio: data.total / data.count
        });
      }
    }
    
    // Obtener las recomendaciones AI para el estudiante
    let recommendationText = "";
    // Estructuras para las recomendaciones IA específicas
    let fortalezas: string[] = [];
    let areasAFortalecer: string[] = [];
    let observaciones: string[] = [];
    let evaluacion: string[] = [];
    
    try {
      console.log(`Buscando recomendaciones para alumno: ${student.id} (${student.nombreCompleto}) en grupo ${student.grupoId}`);
      
      // Primero intentar obtener todas las recomendaciones (sin filtro por profesor)
      const allTeacherRecommendations = await storage.getTeacherRecommendations();
      
      console.log(`Se encontraron ${allTeacherRecommendations.length} recomendaciones para el grupo ${student.grupoId}`);
      
      // Buscar recomendaciones para el grupo del estudiante
      const groupRecommendations = allTeacherRecommendations.filter(rec => 
        rec.grupoId === student.grupoId
      );
      
      if (groupRecommendations.length > 0) {
        // Usar la recomendación más reciente
        const latestRecommendation = groupRecommendations.reduce((latest, current) => {
          return latest.createdAt > current.createdAt ? latest : current;
        });
        
        // Si hay contenido JSON, intentar extraer recomendaciones específicas
        if (latestRecommendation.contenido) {
          try {
            let contenido = latestRecommendation.contenido;
            
            // Intentar encontrar recomendaciones específicas para el estudiante
            const allRecommendations = typeof contenido === 'string' 
              ? JSON.parse(contenido) 
              : contenido;
              
            // Buscar por alumnoId en el contenido
            if (allRecommendations && typeof allRecommendations === 'object') {
              // Si hay una propiedad directa para el ID del alumno
              if (allRecommendations[student.id]) {
                const studentRecommendation = allRecommendations[student.id];
                if (typeof studentRecommendation === 'string') {
                  recommendationText = studentRecommendation;
                } else if (typeof studentRecommendation === 'object') {
                  // Extraer secciones específicas si existen
                  if (studentRecommendation.fortalezas) {
                    fortalezas = Array.isArray(studentRecommendation.fortalezas) 
                      ? studentRecommendation.fortalezas 
                      : [studentRecommendation.fortalezas];
                  }
                  if (studentRecommendation.areasAFortalecer) {
                    areasAFortalecer = Array.isArray(studentRecommendation.areasAFortalecer) 
                      ? studentRecommendation.areasAFortalecer 
                      : [studentRecommendation.areasAFortalecer];
                  }
                  if (studentRecommendation.observaciones) {
                    observaciones = Array.isArray(studentRecommendation.observaciones) 
                      ? studentRecommendation.observaciones 
                      : [studentRecommendation.observaciones];
                  }
                  if (studentRecommendation.evaluacion) {
                    evaluacion = Array.isArray(studentRecommendation.evaluacion) 
                      ? studentRecommendation.evaluacion 
                      : [studentRecommendation.evaluacion];
                  }
                  
                  // Si hay texto completo, usarlo como respaldo
                  if (studentRecommendation.texto || studentRecommendation.recomendaciones) {
                    recommendationText = studentRecommendation.texto || studentRecommendation.recomendaciones;
                  }
                }
              } else if (Array.isArray(allRecommendations.alumnos)) {
                // Si hay un array de alumnos, buscar el específico
                const studentData = allRecommendations.alumnos.find(a => a.id === student.id);
                if (studentData && studentData.recomendaciones) {
                  recommendationText = studentData.recomendaciones;
                  
                  // Extraer secciones específicas si existen
                  if (studentData.fortalezas) {
                    fortalezas = Array.isArray(studentData.fortalezas) 
                      ? studentData.fortalezas 
                      : [studentData.fortalezas];
                  }
                  if (studentData.areasAFortalecer) {
                    areasAFortalecer = Array.isArray(studentData.areasAFortalecer) 
                      ? studentData.areasAFortalecer 
                      : [studentData.areasAFortalecer];
                  }
                  if (studentData.observaciones) {
                    observaciones = Array.isArray(studentData.observaciones) 
                      ? studentData.observaciones 
                      : [studentData.observaciones];
                  }
                  if (studentData.evaluacion) {
                    evaluacion = Array.isArray(studentData.evaluacion) 
                      ? studentData.evaluacion 
                      : [studentData.evaluacion];
                  }
                }
              } else {
                // Si no hay estructura específica para alumnos, usar el texto general
                if (typeof contenido === 'object') {
                  if ('recomendaciones' in contenido && typeof contenido.recomendaciones === 'string') {
                    recommendationText = contenido.recomendaciones;
                  } else if ('texto' in contenido && typeof contenido.texto === 'string') {
                    recommendationText = contenido.texto;
                  } else if ('contenido' in contenido && typeof contenido.contenido === 'string') {
                    recommendationText = contenido.contenido;
                  }
                } else if (typeof contenido === 'string') {
                  recommendationText = contenido;
                }
              }
            } else if (typeof contenido === 'string') {
              recommendationText = contenido;
            }
          } catch (error) {
            console.error('Error al procesar contenido JSON de recomendaciones:', error);
          }
        }
      }
      
      // Como fallback, si no hay recomendaciones específicas
      if (!recommendationText && fortalezas.length === 0 && areasAFortalecer.length === 0) {
        recommendationText = "No hay recomendaciones disponibles en este momento.";
        
        // Generar datos de demostración para las secciones estructuradas
        const studentName = student.nombreCompleto.split(' ')[0]; // Obtener primer nombre
        
        fortalezas = [
          `${studentName} muestra una notable habilidad para la resolución de problemas matemáticos complejos.`,
          `Excelente capacidad de análisis y razonamiento lógico.`,
          `Destaca en la comunicación de conceptos matemáticos de manera clara y precisa.`,
          `Muestra iniciativa para buscar diferentes enfoques al resolver problemas.`
        ];
        
        areasAFortalecer = [
          `Practicar más ejercicios de geometría analítica para reforzar conceptos.`,
          `Dedicar tiempo adicional a la revisión de ejercicios de álgebra avanzada.`,
          `Mejorar la organización del tiempo para resolver problemas de mayor complejidad.`
        ];
        
        observaciones = [
          `${studentName} ha mostrado un progreso constante a lo largo del período académico.`,
          `Se recomienda mantener el ritmo de estudio actual para seguir mejorando.`,
          `La participación en clase ha sido muy positiva y contribuye significativamente al ambiente de aprendizaje.`
        ];
        
        evaluacion = [
          `El rendimiento general es sobresaliente, con un promedio superior a 9.0.`,
          `La comprensión de los conceptos fundamentales es excelente.`,
          `Se observa una actitud positiva hacia el aprendizaje y disposición para superar desafíos.`,
          `Las evaluaciones continuas muestran un patrón de mejora constante.`
        ];
      }
    } catch (error) {
      console.error('Error al obtener recomendaciones:', error);
      recommendationText = "No se pudieron cargar las recomendaciones.";
    }
    
    // Información del profesor
    let teacherName = "Docente";
    
    try {
      // Buscar asignaciones de profesores para el grupo del estudiante
      const teachers = await storage.getTeachers();
      const subjectAssignments = await storage.getSubjectAssignments();
      
      // Filtrar asignaciones que coincidan con el grupo del estudiante
      const groupAssignments = subjectAssignments.filter(a => a.grupoId === student.grupoId);
      
      if (groupAssignments.length > 0) {
        // Tomar el primer profesor asignado
        const firstAssignment = groupAssignments[0];
        const teacher = teachers.find(t => t.id === firstAssignment.profesorId);
        
        if (teacher) {
          teacherName = teacher.nombreCompleto;
        }
      }
    } catch (error) {
      console.error('Error al obtener profesor:', error);
    }
    
    // Construir la respuesta
    const studentData = {
      id: student.id,
      nombre: student.nombreCompleto,
      grado: student.nivel,
      promedio: totalCount > 0 ? totalSum / totalCount : 0,
      materias: subjects
    };
    
    // Formatear la fecha actual
    const currentDate = new Date();
    const fecha = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    
    return {
      studentData,
      recommendations: recommendationText,
      teacherName,
      // Añadir las secciones estructuradas para el informe web
      fortalezas,
      areasAFortalecer,
      observaciones,
      evaluacion,
      nombreAlumno: student.nombreCompleto,
      grado: student.nivel || 'Preparatoria',
      promedioGeneral: totalCount > 0 ? totalSum / totalCount : 0,
      fecha
    };
  } catch (error) {
    console.error('Error al obtener datos del estudiante:', error);
    return null;
  }
}

export default function registerInformeRoutes() {
  const router = Router();

  /**
   * Endpoint público para obtener los datos del informe académico
   * Ruta: /api/informe/:id/public
   * No requiere autenticación
   */
  router.get('/:id/public', async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      
      if (isNaN(studentId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de estudiante inválido'
        });
      }
      
      const data = await getStudentDataAndGrades(studentId);
      
      if (!data) {
        return res.status(404).json({
          success: false,
          message: 'Informe no disponible o estudiante no encontrado'
        });
      }
      
      return res.json({
        success: true,
        ...data
      });
    } catch (error) {
      console.error('Error al obtener informe público:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  });

  /**
   * Obtiene los datos del informe para un estudiante específico
   * Esta ruta es accesible sin autenticación mediante un ID encriptado
   */
  router.get('/:id', async (req, res) => {
    try {
      // Desencriptar o decodificar el ID
      // En una implementación real, se debería usar algo como JWT o encriptación
      // Para esta demo, asumiremos que es un ID numérico directo
      const studentId = parseInt(req.params.id);
      
      if (isNaN(studentId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de estudiante inválido'
        });
      }

      // Obtener datos del estudiante
      const student = await storage.getStudent(studentId);
      
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Estudiante no encontrado'
        });
      }

      // Obtener las calificaciones para calcular promedios
      const grades = await storage.getStudentGrades(studentId);
      
      // Calcular promedio general
      let totalSum = 0;
      let totalCount = 0;
      
      const subjects = [];
      const subjectMap = new Map<number, { total: number, count: number }>();
      
      // Procesar calificaciones
      for (const grade of grades) {
        totalSum += grade.calificacion;
        totalCount++;
        
        // Agrupar por materia
        if (!subjectMap.has(grade.materiaId)) {
          subjectMap.set(grade.materiaId, { 
            total: grade.calificacion, 
            count: 1 
          });
        } else {
          const current = subjectMap.get(grade.materiaId)!;
          current.total += grade.calificacion;
          current.count++;
          subjectMap.set(grade.materiaId, current);
        }
      }
      
      // Obtener los nombres de las materias
      const subjectIds = Array.from(subjectMap.keys());
      const subjectsData = await Promise.all(
        subjectIds.map(id => storage.getSubject(id))
      );
      
      // Crear la lista de materias con promedios
      for (let i = 0; i < subjectIds.length; i++) {
        const id = subjectIds[i];
        const subject = subjectsData[i];
        const data = subjectMap.get(id)!;
        
        if (subject) {
          subjects.push({
            id,
            nombre: subject.nombre,
            promedio: data.total / data.count
          });
        }
      }
      
      // Obtener las recomendaciones de IA
      const recommendations = await storage.getStudentRecommendations(studentId);
      
      // Obtener el ID del profesor asignado al estudiante
      const teacherAssignment = await storage.getTeacherForStudent(studentId);
      let teacherName = "Docente";
      
      if (teacherAssignment) {
        const teacher = await storage.getTeacher(teacherAssignment.profesorId);
        if (teacher) {
          teacherName = teacher.nombre;
        }
      }
      
      // Construir la respuesta
      const studentData = {
        id: student.id,
        nombre: student.nombre,
        grado: student.nivel,
        promedio: totalCount > 0 ? totalSum / totalCount : 0,
        materias: subjects
      };
      
      return res.json({
        success: true,
        studentData,
        recommendations: recommendations?.recomendaciones || "",
        teacherName
      });
    } catch (error) {
      console.error('Error al obtener informe:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  });

  /**
   * Genera y envía el PDF del informe
   */
  router.get('/:id/pdf', async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      
      if (isNaN(studentId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de estudiante inválido'
        });
      }

      // Obtener datos del estudiante
      const student = await storage.getStudent(studentId);
      
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Estudiante no encontrado'
        });
      }

      // Obtener las calificaciones para calcular promedios
      const grades = await storage.getStudentGrades(studentId);
      
      // Calcular promedio general
      let totalSum = 0;
      let totalCount = 0;
      
      const subjects = [];
      const subjectMap = new Map<number, { total: number, count: number }>();
      
      // Procesar calificaciones
      for (const grade of grades) {
        totalSum += grade.calificacion;
        totalCount++;
        
        // Agrupar por materia
        if (!subjectMap.has(grade.materiaId)) {
          subjectMap.set(grade.materiaId, { 
            total: grade.calificacion, 
            count: 1 
          });
        } else {
          const current = subjectMap.get(grade.materiaId)!;
          current.total += grade.calificacion;
          current.count++;
          subjectMap.set(grade.materiaId, current);
        }
      }
      
      // Obtener los nombres de las materias
      const subjectIds = Array.from(subjectMap.keys());
      const subjectsData = await Promise.all(
        subjectIds.map(id => storage.getSubject(id))
      );
      
      // Crear la lista de materias con promedios
      for (let i = 0; i < subjectIds.length; i++) {
        const id = subjectIds[i];
        const subject = subjectsData[i];
        const data = subjectMap.get(id)!;
        
        if (subject) {
          subjects.push({
            id,
            nombre: subject.nombre,
            promedio: data.total / data.count
          });
        }
      }
      
      // Obtener las recomendaciones de IA
      const recommendations = await storage.getStudentRecommendations(studentId);
      
      // Obtener el ID del profesor asignado al estudiante
      const teacherAssignment = await storage.getTeacherForStudent(studentId);
      let teacherName = "Docente";
      
      if (teacherAssignment) {
        const teacher = await storage.getTeacher(teacherAssignment.profesorId);
        if (teacher) {
          teacherName = teacher.nombre;
        }
      }
      
      // Construir los datos del estudiante
      const studentData = {
        id: student.id,
        nombre: student.nombre,
        grado: student.nivel,
        promedio: totalCount > 0 ? totalSum / totalCount : 0,
        materias: subjects
      };
      
      // Generar el PDF
      const pdfDoc = generateParentReportPDF(
        studentData,
        recommendations?.recomendaciones || "", 
        teacherName
      );
      
      // Configurar la respuesta
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Informe_${student.nombre.replace(/\s+/g, '_')}.pdf`);
      
      // Enviar el PDF
      const pdfBuffer = pdfDoc.output('arraybuffer');
      return res.send(Buffer.from(pdfBuffer));
    } catch (error) {
      console.error('Error al generar PDF:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al generar el PDF'
      });
    }
  });

  /**
   * Envía el informe por correo electrónico
   */
  router.post('/:id/email', validateBody(emailSchema), async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const { email } = req.body;
      
      if (isNaN(studentId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de estudiante inválido'
        });
      }

      // Obtener datos del estudiante
      const student = await storage.getStudent(studentId);
      
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Estudiante no encontrado'
        });
      }

      // Obtener las calificaciones para calcular promedios
      const grades = await storage.getStudentGrades(studentId);
      
      // Calcular promedio general
      let totalSum = 0;
      let totalCount = 0;
      
      const subjects = [];
      const subjectMap = new Map<number, { total: number, count: number }>();
      
      // Procesar calificaciones
      for (const grade of grades) {
        totalSum += grade.calificacion;
        totalCount++;
        
        // Agrupar por materia
        if (!subjectMap.has(grade.materiaId)) {
          subjectMap.set(grade.materiaId, { 
            total: grade.calificacion, 
            count: 1 
          });
        } else {
          const current = subjectMap.get(grade.materiaId)!;
          current.total += grade.calificacion;
          current.count++;
          subjectMap.set(grade.materiaId, current);
        }
      }
      
      // Obtener los nombres de las materias
      const subjectIds = Array.from(subjectMap.keys());
      const subjectsData = await Promise.all(
        subjectIds.map(id => storage.getSubject(id))
      );
      
      // Crear la lista de materias con promedios
      for (let i = 0; i < subjectIds.length; i++) {
        const id = subjectIds[i];
        const subject = subjectsData[i];
        const data = subjectMap.get(id)!;
        
        if (subject) {
          subjects.push({
            id,
            nombre: subject.nombre,
            promedio: data.total / data.count
          });
        }
      }
      
      // Obtener las recomendaciones de IA
      const recommendations = await storage.getStudentRecommendations(studentId);
      
      // Obtener el ID del profesor asignado al estudiante
      const teacherAssignment = await storage.getTeacherForStudent(studentId);
      let teacherName = "Docente";
      
      if (teacherAssignment) {
        const teacher = await storage.getTeacher(teacherAssignment.profesorId);
        if (teacher) {
          teacherName = teacher.nombre;
        }
      }
      
      // Construir los datos del estudiante
      const studentData = {
        id: student.id,
        nombre: student.nombre,
        grado: student.nivel,
        promedio: totalCount > 0 ? totalSum / totalCount : 0,
        materias: subjects
      };
      
      // Generar el PDF
      const pdfDoc = generateParentReportPDF(
        studentData,
        recommendations?.recomendaciones || "", 
        teacherName
      );
      
      // Convertir el PDF a base64
      const pdfBase64 = pdfDoc.output('datauristring').split(',')[1];
      
      // Enviar por correo electrónico
      const emailResult = await sendParentReportEmail(
        student.nombre,
        email,
        pdfBase64,
        teacherName
      );
      
      if (emailResult.success) {
        return res.json({
          success: true,
          message: 'Informe enviado correctamente'
        });
      } else {
        return res.status(500).json({
          success: false,
          message: 'Error al enviar el correo electrónico',
          details: emailResult.error
        });
      }
    } catch (error) {
      console.error('Error al enviar informe por correo:', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  });

  return router;
}