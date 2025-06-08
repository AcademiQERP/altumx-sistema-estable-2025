import { db } from "../db";
import { 
  students, 
  teachers, 
  groups, 
  subjects, 
  subjectAssignments,
  grades,
  attendance,
  debts,
  payments,
  paymentConcepts
} from "@shared/schema";
import { DatabaseStorage } from "../database-storage";

/**
 * Genera datos de prueba para garantizar que los reportes funcionen correctamente
 * Solo utilizar en entornos de prueba o cuando se necesita probar la funcionalidad
 */
export async function generateMockData() {
  const storage = new DatabaseStorage();
  console.log("Generando datos de prueba para reportes...");
  
  try {
    // 1. Verificar si ya existen datos
    const existingStudents = await storage.getStudents();
    const existingGroups = await storage.getGroups();
    const existingTeachers = await storage.getTeachers();
    const existingSubjects = await storage.getSubjects();
    const existingGrades = await storage.getGrades();
    const existingAttendance = await storage.getAttendance();
    const existingDebts = await storage.getDebts();
    const existingPayments = await storage.getPayments();
    
    // Si ya hay datos suficientes, no generamos más
    if (
      existingStudents.length > 0 && 
      existingGroups.length > 0 && 
      existingTeachers.length > 0 && 
      existingSubjects.length > 0 && 
      existingGrades.length > 0 && 
      existingAttendance.length > 0 && 
      existingDebts.length > 0 && 
      existingPayments.length > 0
    ) {
      console.log("Ya existen datos de prueba suficientes");
      return { success: true, message: "Ya existen datos suficientes" };
    }
    
    // 2. Crear grupos si no existen
    let gruposPrueba = existingGroups;
    if (existingGroups.length === 0) {
      console.log("Generando grupos de prueba...");
      const gruposData = [
        { nombre: "1°A Primaria", nivel: "Primaria", cicloEscolar: "2023-2024" },
        { nombre: "2°B Primaria", nivel: "Primaria", cicloEscolar: "2023-2024" },
        { nombre: "3°A Secundaria", nivel: "Secundaria", cicloEscolar: "2023-2024" }
      ];
      
      for (const grupo of gruposData) {
        await storage.createGroup(grupo);
      }
      
      gruposPrueba = await storage.getGroups();
      console.log(`Creados ${gruposPrueba.length} grupos`);
    }
    
    // 3. Crear profesores si no existen
    let profesoresPrueba = existingTeachers;
    if (existingTeachers.length === 0) {
      console.log("Generando profesores de prueba...");
      const profesoresData = [
        { nombreCompleto: "Carlos Fuentes", especialidad: "Matemáticas", correo: "carlos.fuentes@escuela.edu", telefono: "5551234567" },
        { nombreCompleto: "María González", especialidad: "Español", correo: "maria.gonzalez@escuela.edu", telefono: "5551234568" },
        { nombreCompleto: "Roberto Sánchez", especialidad: "Ciencias", correo: "roberto.sanchez@escuela.edu", telefono: "5551234569" }
      ];
      
      for (const profesor of profesoresData) {
        await storage.createTeacher(profesor);
      }
      
      profesoresPrueba = await storage.getTeachers();
      console.log(`Creados ${profesoresPrueba.length} profesores`);
    }
    
    // 4. Crear materias si no existen
    let materiasPrueba = existingSubjects;
    if (existingSubjects.length === 0) {
      console.log("Generando materias de prueba...");
      const materiasData = [
        { nombre: "Matemáticas", descripcion: "Operaciones y conceptos matemáticos", horasSemana: 5 },
        { nombre: "Español", descripcion: "Lenguaje y literatura", horasSemana: 5 },
        { nombre: "Ciencias", descripcion: "Ciencias naturales", horasSemana: 4 },
        { nombre: "Historia", descripcion: "Historia de México y del mundo", horasSemana: 3 },
        { nombre: "Geografía", descripcion: "Geografía mundial y local", horasSemana: 3 }
      ];
      
      for (const materia of materiasData) {
        await storage.createSubject(materia);
      }
      
      materiasPrueba = await storage.getSubjects();
      console.log(`Creadas ${materiasPrueba.length} materias`);
    }
    
    // 5. Crear estudiantes si no existen
    let estudiantesPrueba = existingStudents;
    if (existingStudents.length === 0) {
      console.log("Generando estudiantes de prueba...");
      // Garantizar al menos 5 estudiantes por grupo
      for (const grupo of gruposPrueba) {
        for (let i = 1; i <= 5; i++) {
          const estudiante = {
            nombreCompleto: `Estudiante ${i} del grupo ${grupo.nombre}`,
            fechaNacimiento: new Date(2010, 0, i).toISOString(),
            genero: i % 2 === 0 ? "Femenino" : "Masculino",
            grupoId: grupo.id,
            direccion: `Calle ${i}, Colonia Ejemplo`,
            tutorNombre: `Tutor ${i}`,
            tutorTelefono: `555${i}000${grupo.id}`,
            tutorCorreo: `tutor${i}.grupo${grupo.id}@ejemplo.com`
          };
          
          await storage.createStudent(estudiante);
        }
      }
      
      estudiantesPrueba = await storage.getStudents();
      console.log(`Creados ${estudiantesPrueba.length} estudiantes`);
    }
    
    // 6. Crear asignaciones de materias a grupos
    const existingAssignments = await storage.getSubjectAssignments();
    if (existingAssignments.length === 0) {
      console.log("Generando asignaciones de materias a grupos...");
      // Asignar cada materia a cada grupo con un profesor aleatorio
      for (const grupo of gruposPrueba) {
        for (const materia of materiasPrueba) {
          const profesorAleatorio = profesoresPrueba[Math.floor(Math.random() * profesoresPrueba.length)];
          
          const asignacion = {
            grupoId: grupo.id,
            materiaId: materia.id,
            profesorId: profesorAleatorio.id,
            diaSemana: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"][Math.floor(Math.random() * 5)],
            horaInicio: `${8 + Math.floor(Math.random() * 6)}:00`,
            horaFin: `${10 + Math.floor(Math.random() * 6)}:00`
          };
          
          await storage.createSubjectAssignment(asignacion);
        }
      }
      
      const createdAssignments = await storage.getSubjectAssignments();
      console.log(`Creadas ${createdAssignments.length} asignaciones de materias`);
    }
    
    // 7. Crear calificaciones si no existen
    if (existingGrades.length === 0) {
      console.log("Generando calificaciones de prueba...");
      const asignaciones = await storage.getSubjectAssignments();
      
      // Para cada asignación materia-grupo, generar calificaciones para los estudiantes
      for (const asignacion of asignaciones) {
        const estudiantesDelGrupo = estudiantesPrueba.filter(e => e.grupoId === asignacion.grupoId);
        
        // Generar calificaciones para tres periodos
        const periodos = ["1er Trimestre", "2do Trimestre", "3er Trimestre"];
        
        for (const estudiante of estudiantesDelGrupo) {
          for (const periodo of periodos) {
            // Generar calificación para cada rubro
            const rubros = ["Examen", "Tareas", "Participación", "Proyecto"];
            
            for (const rubro of rubros) {
              // Calificación aleatoria entre 6.0 y 10.0
              const calificacion = (6 + Math.random() * 4).toFixed(1);
              
              const calificacionData = {
                alumnoId: estudiante.id,
                materiaId: asignacion.materiaId,
                periodo: periodo,
                rubro: rubro,
                valor: calificacion  // Esto será convertido a calificacion en la db
              };
              
              await db.insert(grades).values(calificacionData);
            }
          }
        }
      }
      
      const createdGrades = await storage.getGrades();
      console.log(`Creadas ${createdGrades.length} calificaciones`);
    }
    
    // 8. Crear registros de asistencia si no existen
    if (existingAttendance.length === 0) {
      console.log("Generando registros de asistencia de prueba...");
      
      // Generar asistencias para los últimos 30 días (excluyendo fines de semana)
      const fechaFin = new Date();
      
      for (const estudiante of estudiantesPrueba) {
        for (let i = 0; i < 30; i++) {
          const fecha = new Date();
          fecha.setDate(fecha.getDate() - i);
          
          // Saltar sábados y domingos
          if (fecha.getDay() === 0 || fecha.getDay() === 6) {
            continue;
          }
          
          // 90% de probabilidad de asistencia (asistencia = true)
          const asistio = Math.random() < 0.9;
          
          const asistenciaData = {
            alumnoId: estudiante.id,
            fecha: fecha.toISOString().split('T')[0],
            asistencia: asistio,
            justificacion: asistio ? null : "Enfermedad"
          };
          
          await db.insert(attendance).values(asistenciaData);
        }
      }
      
      const createdAttendance = await storage.getAttendance();
      console.log(`Creados ${createdAttendance.length} registros de asistencia`);
    }
    
    // 9. Crear conceptos de pago si no existen
    let conceptosPrueba = await storage.getPaymentConcepts();
    if (conceptosPrueba.length === 0) {
      console.log("Generando conceptos de pago de prueba...");
      const conceptosData = [
        { nombre: "Colegiatura Mensual", descripcion: "Pago mensual de colegiatura", monto: "1500.00" },
        { nombre: "Inscripción", descripcion: "Pago único de inscripción", monto: "3000.00" },
        { nombre: "Material Escolar", descripcion: "Pago de materiales escolares", monto: "800.00" },
        { nombre: "Uniforme", descripcion: "Pago de uniforme escolar", monto: "1200.00" },
        { nombre: "Excursión", descripcion: "Pago para excursión escolar", monto: "500.00" }
      ];
      
      for (const concepto of conceptosData) {
        await storage.createPaymentConcept(concepto);
      }
      
      conceptosPrueba = await storage.getPaymentConcepts();
      console.log(`Creados ${conceptosPrueba.length} conceptos de pago`);
    }
    
    // 10. Crear adeudos si no existen
    if (existingDebts.length === 0) {
      console.log("Generando adeudos de prueba...");
      
      for (const estudiante of estudiantesPrueba) {
        // Asignar algunos conceptos de pago aleatoriamente
        const conceptosAleatorios = conceptosPrueba
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.floor(Math.random() * conceptosPrueba.length) + 1);
        
        for (const concepto of conceptosAleatorios) {
          // Fecha de vencimiento aleatoria entre hoy y hace 2 meses
          const fechaVencimiento = new Date();
          fechaVencimiento.setDate(fechaVencimiento.getDate() - Math.floor(Math.random() * 60));
          
          // Estado aleatorio: pendiente (60%), parcial (30%), pagado (10%)
          const estadoRandom = Math.random();
          const estado = estadoRandom < 0.6 ? "pendiente" : (estadoRandom < 0.9 ? "parcial" : "pagado");
          
          const adeudoData = {
            alumnoId: estudiante.id,
            conceptoId: concepto.id,
            montoTotal: concepto.monto,
            fechaLimite: fechaVencimiento.toISOString().split('T')[0],
            estatus: estado
          };
          
          await storage.createDebt(adeudoData);
        }
      }
      
      const createdDebts = await storage.getDebts();
      console.log(`Creados ${createdDebts.length} adeudos`);
    }
    
    // 11. Crear pagos para los adeudos si no existen
    if (existingPayments.length === 0) {
      console.log("Generando pagos de prueba...");
      
      const adeudos = await storage.getDebts();
      
      for (const adeudo of adeudos) {
        // Si el adeudo está marcado como parcial o pagado, crear un pago
        if (adeudo.estatus === "parcial" || adeudo.estatus === "pagado") {
          // Determinar el monto pagado
          const montoPagado = adeudo.estatus === "pagado" 
            ? parseFloat(adeudo.montoTotal)
            : parseFloat(adeudo.montoTotal) * (0.3 + Math.random() * 0.4); // Entre 30% y 70% del total
          
          // Fecha de pago aleatoria en el último mes
          const fechaPago = new Date();
          fechaPago.setDate(fechaPago.getDate() - Math.floor(Math.random() * 30));
          
          const pagoData = {
            alumnoId: adeudo.alumnoId,
            conceptoId: adeudo.conceptoId,
            monto: montoPagado.toFixed(2),
            fechaPago: fechaPago.toISOString().split('T')[0],
            metodoPago: ["Efectivo", "Transferencia", "Tarjeta"][Math.floor(Math.random() * 3)],
            referencia: `REF-${Math.floor(Math.random() * 10000)}`,
            observaciones: "Pago generado automáticamente para pruebas"
          };
          
          await storage.createPayment(pagoData);
        }
      }
      
      const createdPayments = await storage.getPayments();
      console.log(`Creados ${createdPayments.length} pagos`);
    }
    
    console.log("Datos de prueba generados exitosamente");
    return { success: true, message: "Datos de prueba generados exitosamente" };
    
  } catch (error) {
    console.error("Error al generar datos de prueba:", error);
    return { 
      success: false, 
      message: `Error al generar datos de prueba: ${error instanceof Error ? error.message : String(error)}`,
      error 
    };
  }
}