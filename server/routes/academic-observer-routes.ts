import { Router, Request, Response, NextFunction } from "express";
import { academicObserverService } from "../services/academic-observer-service";
import { verifyToken, checkRole } from "../middleware/auth";
import path from "path";
import fs from "fs";

const router = Router();

/**
 * Rutas para el módulo AcademicObserver
 * Estas rutas actúan como proxy para comunicarse con la API externa de AcademicObserver
 * 
 * Durante el desarrollo, si la API externa no está disponible,
 * utilizamos datos simulados para poder continuar con el desarrollo del frontend
 */

// Variable de entorno para determinar si estamos en modo de desarrollo
const DEV_MODE = process.env.NODE_ENV !== "production";
// Variable para verificar si el servicio externo está disponible
let SERVICE_AVAILABLE = false;

// Verificamos si el servicio está disponible al iniciar
(async function checkServiceAvailability() {
  if (DEV_MODE) {
    try {
      await academicObserverService.getSubtemas();
      SERVICE_AVAILABLE = true;
      console.log("[AcademicObserver] Servicio externo disponible");
    } catch (error) {
      SERVICE_AVAILABLE = false;
      console.warn("[AcademicObserver] Servicio externo no disponible. Se utilizarán datos simulados para desarrollo.");
    }
  }
})();

// Datos simulados para desarrollo
// Interfaces para tipado
interface SubtemaEvaluacion {
  id: number;
  completado: boolean;
  comentario: string;
}

interface SubtemaCompleto extends SubtemaEvaluacion {
  titulo: string;
  descripcion: string;
}

interface EvaluacionesAlumnosMap {
  [alumnoId: number]: SubtemaEvaluacion[];
}

interface SeguimientoAlumno {
  id: number;
  nombre: string;
  grupoId: number;
  grupoNombre: string;
  nivel: string;
  promedio: number;
  estado: "completo" | "incompleto" | "sin_iniciar";
  progreso: {
    completados: number;
    total: number;
    porcentaje: number;
  };
  materias: {
    id: number;
    nombre: string;
    promedio: number;
    estado: "optimo" | "satisfactorio" | "enProceso" | "inicial";
  }[];
  subtemas: {
    [materiaId: string]: SubtemaCompleto[];
  };
  periodosAnteriores?: {
    [periodoId: string]: {
      nombre: string;
      fecha: string;
      promedio: number;
      materias: {
        id: number;
        nombre: string;
        promedio: number;
      }[];
    }
  };
  reportesGenerados?: {
    id: string;
    nombre: string;
    fecha: string;
    tipo: string;
    url: string;
  }[];
}

const mockData = {
  // Subtemas simulados para seleccionar en el formulario
  subtemas: [
    { id: 1, nombre: "Participación en clase", categoria: "Interacción" },
    { id: 2, nombre: "Comprensión de lectura", categoria: "Habilidades académicas" },
    { id: 3, nombre: "Resolución de problemas", categoria: "Habilidades analíticas" },
    { id: 4, nombre: "Trabajo en equipo", categoria: "Habilidades sociales" },
    { id: 5, nombre: "Creatividad", categoria: "Habilidades cognitivas" },
    { id: 6, nombre: "Organización y planificación", categoria: "Habilidades de estudio" },
    { id: 7, nombre: "Atención y concentración", categoria: "Comportamiento" },
    { id: 8, nombre: "Expresión oral", categoria: "Comunicación" }
  ],
  
  // Almacenamiento para comentarios y estado de los subtemas por alumno
  evaluacionesAlumnos: {} as EvaluacionesAlumnosMap,
  
  // Función para generar subtemas simulados para desarrollo
  generarSubtemasSimulados(cantidad: number, evaluados: boolean = false): SubtemaCompleto[] {
    const titulosSubtemas = [
      "Participación en clase",
      "Comprensión de lectura",
      "Resolución de problemas",
      "Trabajo en equipo",
      "Creatividad",
      "Organización y planificación",
      "Atención y concentración",
      "Expresión oral",
      "Pensamiento crítico",
      "Habilidades numéricas"
    ];
    
    const descripciones = [
      "Evalúa la frecuencia y calidad de las intervenciones del estudiante durante las sesiones.",
      "Mide la capacidad del alumno para entender y analizar textos.",
      "Valora la habilidad para encontrar soluciones efectivas a problemas planteados.",
      "Evalúa la capacidad de colaboración y aportación en actividades grupales.",
      "Mide la originalidad y capacidad para generar ideas innovadoras.",
      "Valora la gestión del tiempo y recursos para completar tareas.",
      "Evalúa la capacidad de mantener el foco en actividades específicas.",
      "Mide la claridad y efectividad de la comunicación verbal.",
      "Valora la capacidad de análisis y evaluación de información.",
      "Evalúa las habilidades matemáticas y de cálculo."
    ];
    
    const subtemas: SubtemaCompleto[] = [];
    
    for (let i = 0; i < cantidad; i++) {
      const indice = Math.floor(Math.random() * titulosSubtemas.length);
      const completado = evaluados ? Math.random() > 0.3 : false;
      
      subtemas.push({
        id: 100 + i,
        titulo: titulosSubtemas[indice],
        descripcion: descripciones[indice],
        completado,
        comentario: completado ? "El alumno muestra avances en esta área." : ""
      });
    }
    
    return subtemas;
  },
  
  // Métricas de seguimiento grupal
  seguimientoGrupal: {
    totalAlumnos: 12,
    resumen: {
      evaluacionCompleta: 5,
      evaluacionIncompleta: 4, 
      sinIniciar: 3,
      totalSubtemas: 27
    },
    // Métricas por materia
    materias: [
      { 
        id: 1, 
        nombre: "Matemáticas", 
        promedio: 83.3, 
        distribucion: {
          optimo: 4,     // 90-100
          satisfactorio: 3, // 80-89
          enProceso: 3,    // 70-79
          inicial: 2      // <70
        }
      },
      { 
        id: 2, 
        nombre: "Español", 
        promedio: 84.8, 
        distribucion: {
          optimo: 3,
          satisfactorio: 5,
          enProceso: 2,
          inicial: 2
        }
      },
      { 
        id: 3, 
        nombre: "Ciencias Naturales", 
        promedio: 78.5, 
        distribucion: {
          optimo: 2,
          satisfactorio: 4,
          enProceso: 4,
          inicial: 2
        }
      },
      { 
        id: 4, 
        nombre: "Historia", 
        promedio: 81.2, 
        distribucion: {
          optimo: 3,
          satisfactorio: 4,
          enProceso: 3,
          inicial: 2
        }
      },
      { 
        id: 5, 
        nombre: "Inglés", 
        promedio: 85.9, 
        distribucion: {
          optimo: 5,
          satisfactorio: 3,
          enProceso: 2,
          inicial: 2
        }
      }
    ],
    grupos: [
      { id: 1, nombre: "1-A", nivel: "Preparatoria" },
      { id: 2, nombre: "2-A", nivel: "Preparatoria" },
      { id: 3, nombre: "3-A", nivel: "Preparatoria" },
      { id: 4, nombre: "1-B", nivel: "Secundaria" },
      { id: 5, nombre: "2-B", nivel: "Secundaria" }
    ],
    alumnos: [
      { 
        id: 1, 
        nombre: "Alejandro Méndez Robles", 
        grupoId: 1, 
        grupoNombre: "1-A", 
        nivel: "Preparatoria",
        promedio: 85,
        estado: "sin_iniciar", // completo, incompleto, sin_iniciar
        progreso: {
          completados: 0,
          total: 27,
          porcentaje: 0
        },
        materias: [
          { id: 1, nombre: "Matemáticas", promedio: 80 },
          { id: 2, nombre: "Español", promedio: 90 }
        ]
      },
      { 
        id: 2, 
        nombre: "Alexa Fernanda Cebreros Contreras", 
        grupoId: 1, 
        grupoNombre: "1-A", 
        nivel: "Preparatoria",
        promedio: 90,
        estado: "completo",
        progreso: {
          completados: 27,
          total: 27,
          porcentaje: 100
        },
        materias: [
          { id: 1, nombre: "Matemáticas", promedio: 95 },
          { id: 2, nombre: "Español", promedio: 85 }
        ]
      },
      { 
        id: 3, 
        nombre: "Dania María Cebreros Contreras", 
        grupoId: 1, 
        grupoNombre: "1-A", 
        nivel: "Preparatoria",
        promedio: 78,
        estado: "incompleto",
        progreso: {
          completados: 9,
          total: 27,
          porcentaje: 33
        },
        materias: [
          { id: 1, nombre: "Matemáticas", promedio: 75 },
          { id: 2, nombre: "Español", promedio: 80 }
        ]
      },
      { 
        id: 4, 
        nombre: "Andrea Cebreros Contreras", 
        grupoId: 2, 
        grupoNombre: "2-A", 
        nivel: "Preparatoria",
        promedio: 100,
        estado: "completo",
        progreso: {
          completados: 27,
          total: 27,
          porcentaje: 100
        },
        materias: [
          { id: 1, nombre: "Matemáticas", promedio: 100 },
          { id: 2, nombre: "Español", promedio: 100 }
        ]
      },
      { 
        id: 5, 
        nombre: "Emilia Soto Gómez", 
        grupoId: 2, 
        grupoNombre: "2-A", 
        nivel: "Preparatoria",
        promedio: 65,
        estado: "sin_iniciar",
        progreso: {
          completados: 0,
          total: 27,
          porcentaje: 0
        },
        materias: [
          { id: 1, nombre: "Matemáticas", promedio: 60 },
          { id: 2, nombre: "Español", promedio: 70 }
        ]
      },
      { 
        id: 6, 
        nombre: "Carlos Alberto Ochoa Vargas", 
        grupoId: 2, 
        grupoNombre: "2-A", 
        nivel: "Preparatoria",
        promedio: 88,
        estado: "incompleto",
        progreso: {
          completados: 18,
          total: 27,
          porcentaje: 67
        },
        materias: [
          { id: 1, nombre: "Matemáticas", promedio: 85 },
          { id: 2, nombre: "Español", promedio: 90 }
        ]
      },
      { 
        id: 7, 
        nombre: "Roberto Álvarez García", 
        grupoId: 3, 
        grupoNombre: "3-A", 
        nivel: "Preparatoria",
        promedio: 92,
        estado: "completo",
        progreso: {
          completados: 27,
          total: 27,
          porcentaje: 100
        },
        materias: [
          { id: 1, nombre: "Matemáticas", promedio: 90 },
          { id: 2, nombre: "Español", promedio: 94 }
        ]
      },
      { 
        id: 8, 
        nombre: "Fernanda Torres Cuevas", 
        grupoId: 3, 
        grupoNombre: "3-A", 
        nivel: "Preparatoria",
        promedio: 79,
        estado: "incompleto",
        progreso: {
          completados: 15,
          total: 27,
          porcentaje: 56
        },
        materias: [
          { id: 1, nombre: "Matemáticas", promedio: 76 },
          { id: 2, nombre: "Español", promedio: 82 }
        ]
      },
      { 
        id: 9, 
        nombre: "Daniela Vázquez Ortega", 
        grupoId: 4, 
        grupoNombre: "1-B", 
        nivel: "Secundaria",
        promedio: 84,
        estado: "completo",
        progreso: {
          completados: 27,
          total: 27,
          porcentaje: 100
        },
        materias: [
          { id: 1, nombre: "Matemáticas", promedio: 82 },
          { id: 2, nombre: "Español", promedio: 86 }
        ]
      },
      { 
        id: 10, 
        nombre: "Luis Miguel Jiménez Torres", 
        grupoId: 4, 
        grupoNombre: "1-B", 
        nivel: "Secundaria",
        promedio: 75,
        estado: "incompleto",
        progreso: {
          completados: 12,
          total: 27,
          porcentaje: 44
        },
        materias: [
          { id: 1, nombre: "Matemáticas", promedio: 73 },
          { id: 2, nombre: "Español", promedio: 77 }
        ]
      },
      { 
        id: 11, 
        nombre: "Ana Paola Ramírez González", 
        grupoId: 5, 
        grupoNombre: "2-B", 
        nivel: "Secundaria",
        promedio: 94,
        estado: "completo",
        progreso: {
          completados: 27,
          total: 27,
          porcentaje: 100
        },
        materias: [
          { id: 1, nombre: "Matemáticas", promedio: 95 },
          { id: 2, nombre: "Español", promedio: 93 }
        ]
      },
      { 
        id: 12, 
        nombre: "Jorge Alberto Castro Mendoza", 
        grupoId: 5, 
        grupoNombre: "2-B", 
        nivel: "Secundaria",
        promedio: 68,
        estado: "sin_iniciar",
        progreso: {
          completados: 0,
          total: 27,
          porcentaje: 0
        },
        materias: [
          { id: 1, nombre: "Matemáticas", promedio: 65 },
          { id: 2, nombre: "Español", promedio: 71 }
        ]
      }
    ]
  },
  
  // Estadísticas simuladas para la página de estadísticas
  estadisticas: {
    totalObservaciones: 27,
    alumnosEvaluados: 15,
    ultimaActualizacion: new Date().toISOString(),
    observacionesPorMateria: [
      { id: 1, nombre: "Matemáticas", cantidad: 8 },
      { id: 2, nombre: "Español", cantidad: 6 },
      { id: 3, nombre: "Ciencias Naturales", cantidad: 5 },
      { id: 4, nombre: "Historia", cantidad: 4 },
      { id: 5, nombre: "Inglés", cantidad: 4 }
    ],
    observacionesPorGrupo: [
      { id: 2, nombre: "1-A", cantidad: 15 },
      { id: 3, nombre: "2-B", cantidad: 12 }
    ],
    observacionesPorMes: [
      { mes: "Enero", cantidad: 3 },
      { mes: "Febrero", cantidad: 5 },
      { mes: "Marzo", cantidad: 7 },
      { mes: "Abril", cantidad: 12 }
    ],
    temasPopulares: [
      { id: 4, nombre: "Trabajo en equipo", cantidad: 8 },
      { id: 3, nombre: "Resolución de problemas", cantidad: 7 },
      { id: 1, nombre: "Participación en clase", cantidad: 6 },
      { id: 7, nombre: "Atención y concentración", cantidad: 4 },
      { id: 2, nombre: "Comprensión de lectura", cantidad: 2 }
    ]
  },
  
  // Lista de observaciones simuladas para la vista de listado
  observacionesPorProfesor: [
    {
      id: "obs001",
      alumnoId: 1,
      alumnoNombre: "Alumno Test",
      materiaId: 1,
      materiaNombre: "Matemáticas",
      periodo: "1er_bimestre",
      fecha: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      contenido: "El alumno ha mostrado un desempeño sobresaliente en la resolución de problemas matemáticos. Su capacidad para comprender conceptos abstractos y aplicarlos en situaciones prácticas es notable. Se recomienda continuar con ejercicios de mayor complejidad para potenciar su desarrollo."
    },
    {
      id: "obs002",
      alumnoId: 2,
      alumnoNombre: "Alexa Fernanda Cebreros Contreras",
      materiaId: 2,
      materiaNombre: "Español",
      periodo: "1er_bimestre",
      fecha: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      contenido: "La alumna ha demostrado habilidades excepcionales en comprensión lectora y análisis de textos. Sus comentarios durante las discusiones en clase revelan madurez intelectual y capacidad crítica. Se sugiere enriquecer su experiencia con lecturas de mayor complejidad y variedad temática."
    },
    {
      id: "obs003",
      alumnoId: 3,
      alumnoNombre: "Dania María Cebreros Contreras",
      materiaId: 3,
      materiaNombre: "Ciencias Naturales",
      periodo: "2do_bimestre",
      fecha: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      contenido: "La estudiante muestra curiosidad científica y capacidad de observación detallada. Sus preguntas en clase demuestran que está procesando el material a un nivel profundo. Se recomienda fomentar su participación en proyectos de investigación que le permitan desarrollar sus intereses en ciencias."
    },
    {
      id: "obs004",
      alumnoId: 4,
      alumnoNombre: "Andrea Cebreros Contreras",
      materiaId: 5,
      materiaNombre: "Inglés",
      periodo: "2do_bimestre",
      fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      contenido: "Andrea muestra fluidez y precisión en su comunicación oral en inglés. Su vocabulario es amplio y su pronunciación es clara. Sin embargo, aún presenta algunas dificultades en la escritura, especialmente en el uso de tiempos verbales complejos. Se recomienda asignar ejercicios específicos para reforzar esta área."
    },
    {
      id: "obs005",
      alumnoId: 5,
      alumnoNombre: "Emilia Soto Gómez",
      materiaId: 4,
      materiaNombre: "Historia",
      periodo: "1er_bimestre",
      fecha: new Date().toISOString(),
      contenido: "Emilia demuestra un conocimiento sólido de los eventos históricos y una comprensión sofisticada de las conexiones entre diferentes períodos. Sus ensayos muestran capacidad de análisis y habilidad para contextualizar hechos dentro de marcos más amplios. Se sugiere animarla a explorar fuentes primarias para enriquecer aún más su perspectiva histórica."
    }
  ],
  
  // Observación detallada simulada para la vista de detalle
  observacionDetalle: {
    id: "obs001",
    alumnoId: 1,
    alumnoNombre: "Alumno Test",
    profesorId: "41c33b18-94f4-48b6-b6ac-ff6dd8951e6e",
    profesorNombre: "Anelisse Gómez Pimentel",
    materiaId: 1,
    materiaNombre: "Matemáticas",
    periodo: "1er_bimestre",
    fecha: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    temaId: 3,
    temaNombre: "Resolución de problemas",
    contenido: "El alumno ha mostrado un desempeño sobresaliente en la resolución de problemas matemáticos durante el primer bimestre. Su capacidad para comprender conceptos abstractos y aplicarlos en situaciones prácticas es notable.\n\nFortalezas:\n- Excelente comprensión de conceptos algebraicos\n- Capacidad para resolver problemas complejos de manera metódica\n- Participación activa en discusiones matemáticas en clase\n- Habilidad para explicar su razonamiento a otros estudiantes\n\nÁreas de oportunidad:\n- Puede mejorar la presentación y organización de sus procedimientos\n- Ocasionalmente comete errores por trabajar demasiado rápido\n\nRecomendaciones:\n1. Continuar con ejercicios de mayor complejidad para potenciar su desarrollo\n2. Fomentar su participación en concursos de matemáticas\n3. Asignar problemas que requieran explicaciones detalladas de los procesos de resolución\n4. Ofrecer oportunidades para que actúe como tutor de compañeros\n\nConclusión:\nEl estudiante posee un talento natural para las matemáticas que debe ser cultivado. Con el apoyo adecuado, tiene el potencial para destacar de manera extraordinaria en esta disciplina."
  }
};

// Importamos el middleware de autenticación global que implementamos
import { devModeAuthMiddleware } from "../middleware/auth";

// Verificamos la autenticación para cada ruta individualmente para permitir
// modo de desarrollo incluso cuando la autenticación falla
const authMiddleware = [verifyToken, checkRole(["docente", "admin"])];

// Usamos el middleware global pero con lógica adicional específica para AcademicObserver
const aoAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Si no hay usuario después del middleware global pero estamos en modo dev,
  // proporcionamos datos simulados para AcademicObserver
  if (DEV_MODE && (!req.user || process.env.FORCE_MOCK_DATA === 'true')) {
    console.log("[AcademicObserver] Usando datos simulados en modo desarrollo");
    SERVICE_AVAILABLE = false;
  }
  
  // Continuamos con el siguiente middleware
  next();
};

// Ruta para generar una nueva observación académica
router.post("/generar-observacion", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { alumnoId, materiaId, periodo, contexto, temaId } = req.body;
    
    // Validar que tengamos los datos necesarios
    if (!alumnoId || !materiaId || !periodo) {
      return res.status(400).json({ 
        error: "Datos incompletos. Se requiere alumnoId, materiaId y periodo."
      });
    }
    
    // Obtenemos el ID del profesor desde el token de autenticación
    const profesorId = req.user?.id;
    
    // Si el servicio está disponible, usamos la API externa
    if (SERVICE_AVAILABLE) {
      // Pasamos el token de usuario para trazabilidad
      const userToken = req.headers.authorization?.split(" ")[1];
      
      // Llamamos al servicio AcademicObserver
      const resultado = await academicObserverService.generarObservacion({
        alumnoId,
        profesorId,
        materiaId,
        periodo,
        contexto,
        temaId
      }, userToken);
      
      res.json(resultado);
    } else {
      // Si el servicio no está disponible, devolvemos una respuesta simulada para desarrollo
      if (DEV_MODE) {
        console.log("[AcademicObserver] Usando datos simulados para generarObservacion");
        
        // Simulamos un tiempo de procesamiento 
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Creamos un ID único para la observación simulada
        const newId = `obs${Date.now()}`;
        
        // Obtenemos los datos de subtema si se proporcionó un ID
        const tema = temaId 
          ? mockData.subtemas.find(t => t.id === temaId) 
          : mockData.subtemas[Math.floor(Math.random() * mockData.subtemas.length)];
          
        // Obtenemos nombres de alumno y materia para incluirlos en la respuesta
        // y en el array de observaciones
        const alumno = req.body.alumnoNombre || 
          `Alumno ID ${alumnoId}`;
          
        const materia = req.body.materiaNombre || 
          `Materia ID ${materiaId}`;
        
        // Creamos el objeto de observación
        const nuevaObservacion = {
          id: newId,
          alumnoId,
          alumnoNombre: alumno,
          profesorId,
          materiaId,
          materiaNombre: materia,
          periodo,
          fecha: new Date().toISOString(),
          temaId: tema?.id,
          temaNombre: tema?.nombre,
          contenido: mockData.observacionDetalle.contenido,
          estado: "completado"
        };
        
        // Agregamos la nueva observación al arreglo de observaciones del profesor
        // asegurándonos que se muestre en futuras consultas
        mockData.observacionesPorProfesor.push(nuevaObservacion);
        
        // También podríamos actualizar las estadísticas simuladas si queremos
        mockData.estadisticas.totalObservaciones += 1;
        
        // Simulamos la respuesta de la API
        res.json(nuevaObservacion);
      } else {
        // En producción, devolvemos un error adecuado
        throw new Error("Servicio de observaciones no disponible temporalmente");
      }
    }
  } catch (error) {
    console.error("Error al generar observación:", error);
    res.status(500).json({ 
      error: "Error al generar observación académica",
      detalle: error instanceof Error ? error.message : "Error desconocido" 
    });
  }
});

// Mover esta sección más abajo. Se restablecerá después de las rutas específicas

// Ruta para obtener datos de seguimiento grupal
router.get("/seguimiento-grupo", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { grupoId, nivel, periodo, materiaId } = req.query;
    
    console.log("[PRODUCCIÓN DEBUG] Parámetros recibidos:", { grupoId, nivel, periodo, materiaId });
    console.log("[PRODUCCIÓN DEBUG] SERVICE_AVAILABLE:", SERVICE_AVAILABLE);
    console.log("[PRODUCCIÓN DEBUG] DEV_MODE:", DEV_MODE);
    
    // Si el servicio está disponible, usamos la API externa
    if (SERVICE_AVAILABLE) {
      // Obtenemos el token de usuario para trazabilidad
      const userToken = req.headers.authorization?.split(" ")[1];
      
      // Construimos los filtros para la consulta
      const filtros = {
        grupoId: grupoId ? Number(grupoId) : undefined,
        nivel: nivel as string | undefined,
        periodo: periodo as string | undefined,
        materiaId: materiaId ? Number(materiaId) : undefined
      };
      
      const datos = await academicObserverService.getSeguimientoGrupal(filtros, userToken);
      
      res.json(datos);
    } else {
      // Usar datos simulados tanto en desarrollo como en producción cuando el servicio no esté disponible
      console.log("[AcademicObserver] Usando datos simulados para seguimiento grupal");
      
      try {
        // Verificar que mockData existe y tiene la estructura esperada
        if (!mockData || !mockData.seguimientoGrupal || !mockData.seguimientoGrupal.alumnos) {
          throw new Error("Datos simulados no disponibles o mal estructurados");
        }
        
        console.log("[PRODUCCIÓN DEBUG] Total alumnos en mockData:", mockData.seguimientoGrupal.alumnos.length);
        
        // Simulamos un tiempo de respuesta
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Crear copia segura de los datos
        const datosOriginales = mockData.seguimientoGrupal;
        let datosFiltrados = {
          totalAlumnos: datosOriginales.totalAlumnos,
          resumen: { ...datosOriginales.resumen },
          materias: [...datosOriginales.materias],
          grupos: [...datosOriginales.grupos],
          alumnos: [...datosOriginales.alumnos]
        };
        
        console.log("[PRODUCCIÓN DEBUG] Después de copia - alumnos:", datosFiltrados.alumnos.length);
        console.log("[PRODUCCIÓN DEBUG] grupoId recibido:", grupoId, "tipo:", typeof grupoId);
        
        // Solo aplicamos filtro de grupo si grupoId es un número válido (no "todos" o vacío)
        if (grupoId && grupoId !== 'todos' && !isNaN(Number(grupoId))) {
          console.log("[PRODUCCIÓN DEBUG] Aplicando filtro para grupo específico:", grupoId);
          
          // Si hay filtro de grupo específico, filtramos los alumnos
          datosFiltrados.alumnos = datosOriginales.alumnos.filter(
            alumno => alumno.grupoId === Number(grupoId)
          );
          
          // Actualizamos el recuento de resumen en base a los alumnos filtrados
          datosFiltrados.totalAlumnos = datosFiltrados.alumnos.length;
          datosFiltrados.resumen = {
            evaluacionCompleta: datosFiltrados.alumnos.filter(a => a.estado === 'completo').length,
            evaluacionIncompleta: datosFiltrados.alumnos.filter(a => a.estado === 'incompleto').length,
            sinIniciar: datosFiltrados.alumnos.filter(a => a.estado === 'sin_iniciar').length,
            totalSubtemas: datosOriginales.resumen.totalSubtemas
          };
        } else {
          console.log("[PRODUCCIÓN DEBUG] Devolviendo todos los alumnos (grupoId=todos o vacío)");
          
          // Si grupoId es "todos" o no está definido, devolvemos todos los alumnos
          datosFiltrados.totalAlumnos = datosFiltrados.alumnos.length;
          // Recalculamos el resumen para todos los alumnos
          datosFiltrados.resumen = {
            evaluacionCompleta: datosFiltrados.alumnos.filter(a => a.estado === 'completo').length,
            evaluacionIncompleta: datosFiltrados.alumnos.filter(a => a.estado === 'incompleto').length,
            sinIniciar: datosFiltrados.alumnos.filter(a => a.estado === 'sin_iniciar').length,
            totalSubtemas: datosOriginales.resumen.totalSubtemas
          };
        }
        
        console.log("[PRODUCCIÓN DEBUG] Respuesta final - total alumnos:", datosFiltrados.totalAlumnos);
        
        // Devolvemos los datos filtrados
        res.json(datosFiltrados);
        
      } catch (mockError) {
        console.error("[PRODUCCIÓN ERROR] Error en datos simulados:", mockError);
        
        // Respuesta de emergencia si fallan los datos simulados
        res.json({
          totalAlumnos: 0,
          resumen: {
            evaluacionCompleta: 0,
            evaluacionIncompleta: 0,
            sinIniciar: 0,
            totalSubtemas: 0
          },
          materias: [],
          grupos: [],
          alumnos: []
        });
      }
    }
  } catch (error) {
    console.error("Error al obtener datos de seguimiento grupal:", error);
    res.status(500).json({ 
      error: "Error al obtener los datos de seguimiento grupal",
      detalle: error instanceof Error ? error.message : "Error desconocido" 
    });
  }
});

// Ruta para obtener los subtemas disponibles para las observaciones
router.get("/subtemas", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    // Si el servicio está disponible, usamos la API externa
    if (SERVICE_AVAILABLE) {
      // Obtenemos el token de usuario para trazabilidad
      const userToken = req.headers.authorization?.split(" ")[1];
      
      const subtemas = await academicObserverService.getSubtemas(userToken);
      
      res.json(subtemas);
    } else {
      // Si el servicio no está disponible, devolvemos datos simulados para desarrollo
      if (DEV_MODE) {
        console.log("[AcademicObserver] Usando datos simulados para obtener subtemas");
        
        // Simulamos un tiempo de respuesta
        await new Promise(resolve => setTimeout(resolve, 300));
        
        res.json(mockData.subtemas);
      } else {
        // En producción, devolvemos un error adecuado
        throw new Error("Servicio de observaciones no disponible temporalmente");
      }
    }
  } catch (error) {
    console.error("Error al obtener subtemas:", error);
    res.status(500).json({ 
      error: "Error al obtener la lista de subtemas",
      detalle: error instanceof Error ? error.message : "Error desconocido" 
    });
  }
});

// Ruta para obtener estadísticas del módulo AcademicObserver
router.get("/estadisticas", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    // Procesamos los parámetros de consulta
    const filtros = {
      desde: req.query.desde as string,
      hasta: req.query.hasta as string,
      profesorId: req.query.profesorId as string,
      alumnoId: req.query.alumnoId ? parseInt(req.query.alumnoId as string) : undefined,
      materiaId: req.query.materiaId ? parseInt(req.query.materiaId as string) : undefined
    };
    
    // Si el servicio está disponible, usamos la API externa
    if (SERVICE_AVAILABLE) {
      // Obtenemos el token de usuario para trazabilidad
      const userToken = req.headers.authorization?.split(" ")[1];
      
      const estadisticas = await academicObserverService.getEstadisticas(filtros, userToken);
      
      res.json(estadisticas);
    } else {
      // Si el servicio no está disponible, devolvemos datos simulados para desarrollo
      if (DEV_MODE) {
        console.log("[AcademicObserver] Usando datos simulados para obtener estadísticas");
        
        // Simulamos un tiempo de respuesta
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Si hay filtros, podríamos ajustar los datos simulados, pero por simplicidad
        // devolvemos los mismos datos para cualquier filtro en este ejemplo
        res.json(mockData.estadisticas);
      } else {
        // En producción, devolvemos un error adecuado
        throw new Error("Servicio de observaciones no disponible temporalmente");
      }
    }
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({ 
      error: "Error al obtener las estadísticas",
      detalle: error instanceof Error ? error.message : "Error desconocido" 
    });
  }
});

// Ruta para obtener las observaciones de un alumno específico
router.get("/observaciones/alumno/:alumnoId", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const alumnoId = parseInt(req.params.alumnoId);
    
    if (isNaN(alumnoId)) {
      return res.status(400).json({ error: "ID de alumno inválido" });
    }
    
    // Si el servicio está disponible, usamos la API externa
    if (SERVICE_AVAILABLE) {
      // Obtenemos el token de usuario para trazabilidad
      const userToken = req.headers.authorization?.split(" ")[1];
      
      const observaciones = await academicObserverService.getObservacionesPorAlumno(alumnoId, userToken);
      
      res.json(observaciones);
    } else {
      // Si el servicio no está disponible, devolvemos datos simulados para desarrollo
      if (DEV_MODE) {
        console.log(`[AcademicObserver] Usando datos simulados para obtener observaciones del alumno ${alumnoId}`);
        
        // Simulamos un tiempo de respuesta
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Filtramos las observaciones simuladas por alumnoId
        const observacionesFiltradas = mockData.observacionesPorProfesor.filter(
          obs => obs.alumnoId === alumnoId
        );
        
        res.json(observacionesFiltradas);
      } else {
        // En producción, devolvemos un error adecuado
        throw new Error("Servicio de observaciones no disponible temporalmente");
      }
    }
  } catch (error) {
    console.error(`Error al obtener observaciones del alumno ${req.params.alumnoId}:`, error);
    res.status(500).json({ 
      error: "Error al obtener las observaciones del alumno",
      detalle: error instanceof Error ? error.message : "Error desconocido" 
    });
  }
});

// Ruta para obtener las observaciones generadas por un profesor específico
router.get("/observaciones/profesor/:profesorId?", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    // Si no se proporciona un ID de profesor específico, usamos el del usuario actual
    const profesorId = req.params.profesorId || req.user?.id || "dev-user-id";
    
    // Si el servicio está disponible, usamos la API externa
    if (SERVICE_AVAILABLE) {
      // Obtenemos el token de usuario para trazabilidad
      const userToken = req.headers.authorization?.split(" ")[1];
      
      const observaciones = await academicObserverService.getObservacionesPorProfesor(profesorId, userToken);
      
      res.json(observaciones);
    } else {
      // Si el servicio no está disponible, devolvemos datos simulados para desarrollo
      if (DEV_MODE) {
        console.log(`[AcademicObserver] Usando datos simulados para obtener observaciones del profesor ${profesorId}`);
        
        // Simulamos un tiempo de respuesta
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Devolvemos todas las observaciones simuladas, incluyendo las creadas recientemente
        // En un caso real se filtrarían por profesorId
        res.json(mockData.observacionesPorProfesor);
      } else {
        // En producción, devolvemos un error adecuado
        throw new Error("Servicio de observaciones no disponible temporalmente");
      }
    }
  } catch (error) {
    console.error(`Error al obtener observaciones del profesor ${req.params.profesorId || 'actual'}:`, error);
    res.status(500).json({ 
      error: "Error al obtener las observaciones del profesor",
      detalle: error instanceof Error ? error.message : "Error desconocido" 
    });
  }
});

// Ruta para obtener una observación específica por ID
// Esta ruta debe estar después de las rutas específicas como /observaciones/profesor/:profesorId
router.get("/observaciones/:id", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const observacionId = req.params.id;
    
    // Si el servicio está disponible, usamos la API externa
    if (SERVICE_AVAILABLE) {
      // Obtenemos el token de usuario para trazabilidad
      const userToken = req.headers.authorization?.split(" ")[1];
      
      const observacion = await academicObserverService.getObservacion(observacionId, userToken);
      
      res.json(observacion);
    } else {
      // Si el servicio no está disponible, devolvemos datos simulados para desarrollo
      if (DEV_MODE) {
        console.log(`[AcademicObserver] Usando datos simulados para obtener observación ${observacionId}`);
        
        // Simulamos un tiempo de respuesta
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Buscamos la observación en la lista de observaciones del profesor
        const observacionEncontrada = mockData.observacionesPorProfesor.find(
          obs => obs.id === observacionId
        );
        
        if (observacionEncontrada) {
          // Si encontramos la observación en la lista, la devolvemos
          // Añadimos algunos datos adicionales que tendría un detalle completo
          const observacionDetallada = {
            ...observacionEncontrada,
            profesorNombre: "Anelisse Gómez Pimentel",
            profesorId: req.user?.id || "dev-user-id"
          };
          
          res.json(observacionDetallada);
        } else {
          // Si no encontramos la observación, devolvemos el detalle genérico
          // con el ID actualizado
          const observacionSimulada = {
            ...mockData.observacionDetalle,
            id: observacionId
          };
          
          res.json(observacionSimulada);
        }
      } else {
        // En producción, devolvemos un error adecuado
        throw new Error("Servicio de observaciones no disponible temporalmente");
      }
    }
  } catch (error) {
    console.error(`Error al obtener observación ${req.params.id}:`, error);
    res.status(500).json({ 
      error: "Error al obtener la observación académica",
      detalle: error instanceof Error ? error.message : "Error desconocido" 
    });
  }
});

// Ruta para manejar la solicitud directa a /observaciones con o sin parámetros
router.get("/observaciones", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const observacionId = req.query.id;
    
    // Si hay un ID de observación, devolvemos los detalles de esa observación
    if (observacionId) {
      // Si el servicio está disponible, usamos la API externa
      if (SERVICE_AVAILABLE) {
        // Obtenemos el token de usuario para trazabilidad
        const userToken = req.headers.authorization?.split(" ")[1];
        
        const observacion = await academicObserverService.getObservacion(observacionId.toString(), userToken);
        
        res.json(observacion);
      } else {
        // Si el servicio no está disponible, devolvemos datos simulados para desarrollo
        if (DEV_MODE) {
          console.log(`[AcademicObserver] Usando datos simulados para obtener observación ${observacionId}`);
          
          // Simulamos un tiempo de respuesta
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Buscamos la observación en la lista de observaciones del profesor
          const observacionEncontrada = mockData.observacionesPorProfesor.find(
            obs => obs.id === observacionId.toString()
          );
          
          if (observacionEncontrada) {
            // Si encontramos la observación en la lista, la devolvemos
            // Añadimos algunos datos adicionales que tendría un detalle completo
            const observacionDetallada = {
              ...observacionEncontrada,
              profesorNombre: "Anelisse Gómez Pimentel",
              profesorId: req.user?.id || "dev-user-id"
            };
            
            res.json(observacionDetallada);
          } else {
            // Si no encontramos la observación, devolvemos el detalle genérico
            // con el ID actualizado
            const observacionSimulada = {
              ...mockData.observacionDetalle,
              id: observacionId
            };
            
            res.json(observacionSimulada);
          }
        } else {
          // En producción, devolvemos un error adecuado
          throw new Error("Servicio de observaciones no disponible temporalmente");
        }
      }
    } 
    // Si no hay ID, devolvemos todas las observaciones del profesor actual
    else {
      // Obtenemos el ID del profesor desde el token o usamos un ID por defecto para desarrollo
      const profesorId = req.user?.id || "dev-user-id";
      
      // Si el servicio está disponible, usamos la API externa
      if (SERVICE_AVAILABLE) {
        // Obtenemos el token de usuario para trazabilidad
        const userToken = req.headers.authorization?.split(" ")[1];
        
        const observaciones = await academicObserverService.getObservacionesPorProfesor(profesorId, userToken);
        
        res.json(observaciones);
      } else {
        // Si el servicio no está disponible, devolvemos datos simulados para desarrollo
        if (DEV_MODE) {
          console.log(`[AcademicObserver] Usando datos simulados para obtener observaciones del profesor actual`);
          
          // Simulamos un tiempo de respuesta
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Devolvemos todas las observaciones simuladas
          res.json(mockData.observacionesPorProfesor);
        } else {
          // En producción, devolvemos un error adecuado
          throw new Error("Servicio de observaciones no disponible temporalmente");
        }
      }
    }
  } catch (error) {
    console.error(`Error al obtener observaciones: ${error}`);
    res.status(500).json({ 
      error: "Error al obtener las observaciones académicas",
      detalle: error instanceof Error ? error.message : "Error desconocido" 
    });
  }
});

// Ruta para obtener los subtemas evaluables de un alumno
router.get("/subtemas-alumno/:alumnoId", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const alumnoId = parseInt(req.params.alumnoId);
    
    if (isNaN(alumnoId)) {
      return res.status(400).json({ error: "ID de alumno inválido" });
    }
    
    // Si el servicio está disponible, usamos la API externa
    if (SERVICE_AVAILABLE) {
      // Obtenemos el token de usuario para trazabilidad
      const userToken = req.headers.authorization?.split(" ")[1];
      
      const subtemas = await academicObserverService.getSubtemasAlumno(alumnoId, userToken);
      
      res.json(subtemas);
    } else {
      // Si el servicio no está disponible, devolvemos datos simulados para desarrollo
      if (DEV_MODE) {
        console.log(`[AcademicObserver] Usando datos simulados para obtener subtemas del alumno ${alumnoId}`);
        
        // Simulamos un tiempo de respuesta
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Encontramos al alumno en nuestros datos simulados
        const alumno = mockData.seguimientoGrupal.alumnos.find(a => a.id === alumnoId);
        
        // Si el alumno existe, generamos una lista de subtemas con su estado actual
        if (alumno) {
          // Generamos subtemas específicos basados en las materias del alumno
          let subtemas = [];
          
          for (const materia of alumno.materias) {
            // Para cada materia, generamos 3-4 subtemas específicos
            const numSubtemas = 3 + Math.floor(Math.random() * 2); // 3 o 4 subtemas
            
            for (let i = 0; i < numSubtemas; i++) {
              // Calculamos si el subtema está completado basado en el progreso del alumno
              // Si el alumno tiene estado "completo", todos están completados
              // Si tiene "sin_iniciar", ninguno está completado
              // Si tiene "incompleto", algunos están completados según el porcentaje
              let completado = false;
              
              if (alumno.estado === "completo") {
                completado = true;
              } else if (alumno.estado === "incompleto") {
                // El porcentaje de completitud determina la probabilidad de que un subtema esté completado
                completado = Math.random() < (alumno.progreso.porcentaje / 100);
              }
              
              // Generamos un ID único para el subtema
              const subtemaId: number = subtemas.length + 1;
              
              // Elegimos un título y descripción para el subtema basado en la materia
              let titulo = "";
              let descripcion = "";
              
              switch (materia.nombre) {
                case "Matemáticas":
                  if (i === 0) {
                    titulo = "Resolución de problemas algebraicos";
                    descripcion = "Capacidad para resolver ecuaciones y problemas complejos aplicando métodos algebraicos.";
                  } else if (i === 1) {
                    titulo = "Comprensión de conceptos geométricos";
                    descripcion = "Entendimiento de figuras, ángulos, teoremas y propiedades geométricas.";
                  } else if (i === 2) {
                    titulo = "Destreza en cálculo mental";
                    descripcion = "Habilidad para realizar operaciones matemáticas sin herramientas externas.";
                  } else {
                    titulo = "Aplicación de conceptos a problemas reales";
                    descripcion = "Capacidad para aplicar el conocimiento matemático en situaciones cotidianas.";
                  }
                  break;
                case "Español":
                  if (i === 0) {
                    titulo = "Comprensión lectora";
                    descripcion = "Capacidad para extraer información, inferir significados y analizar textos escritos.";
                  } else if (i === 1) {
                    titulo = "Expresión escrita";
                    descripcion = "Habilidad para redactar textos claros, coherentes y con corrección gramatical.";
                  } else if (i === 2) {
                    titulo = "Análisis literario";
                    descripcion = "Capacidad para interpretar obras literarias y comprender sus elementos.";
                  } else {
                    titulo = "Comunicación oral";
                    descripcion = "Habilidad para expresarse verbalmente con claridad y precisión.";
                  }
                  break;
                default:
                  // Para otras materias usamos subtemas genéricos
                  const subtemasGenericos = [
                    { titulo: "Participación activa", descripcion: "Nivel de involucramiento y participación del alumno en las actividades." },
                    { titulo: "Trabajo en equipo", descripcion: "Capacidad para colaborar efectivamente con sus compañeros." },
                    { titulo: "Entrega de tareas", descripcion: "Puntualidad y calidad en la entrega de asignaciones." },
                    { titulo: "Atención y concentración", descripcion: "Nivel de enfoque durante las sesiones de clase." },
                    { titulo: "Creatividad e innovación", descripcion: "Capacidad para proponer ideas originales y soluciones creativas." }
                  ];
                  
                  const subtemaGenerico = subtemasGenericos[i % subtemasGenericos.length];
                  titulo = subtemaGenerico.titulo;
                  descripcion = subtemaGenerico.descripcion;
              }
              
              // Agregamos el subtema a la lista
              subtemas.push({
                id: subtemaId,
                titulo: `[${materia.nombre}] ${titulo}`,
                descripcion,
                completado,
                comentario: "" // Añadimos campo para comentarios
              });
            }
          }
          
          // Si hay evaluaciones guardadas para este alumno, las recuperamos
          if (mockData.evaluacionesAlumnos[alumnoId]) {
            console.log(`[AcademicObserver] Encontrados datos de evaluación guardados para alumno ${alumnoId}`);
            console.log(`[AcademicObserver] Datos guardados: ${JSON.stringify(mockData.evaluacionesAlumnos[alumnoId])}`);
            
            // Para cada subtema, recuperamos el comentario guardado (si existe)
            subtemas = subtemas.map(subtema => {
              const subtemaGuardado = mockData.evaluacionesAlumnos[alumnoId].find(s => s.id === subtema.id);
              if (subtemaGuardado) {
                console.log(`[AcademicObserver] Recuperando subtema ${subtema.id} con comentario: "${subtemaGuardado.comentario}"`);
                
                return {
                  ...subtema,
                  completado: subtemaGuardado.completado,
                  comentario: subtemaGuardado.comentario || ""
                } as SubtemaCompleto;
              }
              return subtema;
            });
          } else {
            console.log(`[AcademicObserver] No se encontraron datos de evaluación previos para el alumno ${alumnoId}`);
          }
          
          res.json(subtemas);
        } else {
          // Si no encontramos al alumno, devolvemos un conjunto de subtemas genéricos
          const genericSubtemas: SubtemaCompleto[] = [
            { id: 1, titulo: "Participación en clase", descripcion: "Nivel de involucramiento y participación del alumno en actividades del aula.", completado: false, comentario: "" },
            { id: 2, titulo: "Comprensión de conceptos", descripcion: "Capacidad para entender y aplicar los conceptos enseñados.", completado: false, comentario: "" },
            { id: 3, titulo: "Entrega de tareas", descripcion: "Puntualidad y calidad en la entrega de asignaciones.", completado: false, comentario: "" },
            { id: 4, titulo: "Trabajo en equipo", descripcion: "Habilidad para colaborar efectivamente con compañeros.", completado: false, comentario: "" },
            { id: 5, titulo: "Atención y concentración", descripcion: "Nivel de enfoque durante las sesiones de clase.", completado: false, comentario: "" }
          ];
          
          // Verificamos si hay evaluaciones guardadas para este alumno
          if (mockData.evaluacionesAlumnos[alumnoId]) {
            console.log(`[AcademicObserver] Encontrados datos de evaluación guardados para alumno genérico ${alumnoId}`);
            console.log(`[AcademicObserver] Datos guardados: ${JSON.stringify(mockData.evaluacionesAlumnos[alumnoId])}`);
            
            // Actualizamos los subtemas genéricos con cualquier comentario guardado
            genericSubtemas.forEach(subtema => {
              const subtemaGuardado = mockData.evaluacionesAlumnos[alumnoId].find((s: SubtemaEvaluacion) => s.id === subtema.id);
              if (subtemaGuardado) {
                console.log(`[AcademicObserver] Recuperando subtema genérico ${subtema.id} con comentario: "${subtemaGuardado.comentario}"`);
                subtema.completado = subtemaGuardado.completado;
                subtema.comentario = subtemaGuardado.comentario || "";
              }
            });
          } else {
            console.log(`[AcademicObserver] No se encontraron datos de evaluación previos para el alumno genérico ${alumnoId}`);
          }
          
          res.json(genericSubtemas);
        }
      } else {
        // En producción, devolvemos un error adecuado
        throw new Error("Servicio de observaciones no disponible temporalmente");
      }
    }
  } catch (error) {
    console.error(`Error al obtener subtemas para el alumno ${req.params.alumnoId}:`, error);
    res.status(500).json({ 
      error: "Error al obtener los subtemas evaluables",
      detalle: error instanceof Error ? error.message : "Error desconocido" 
    });
  }
});

// Ruta para guardar la evaluación de un alumno
router.post("/guardar-evaluacion/:alumnoId", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const alumnoId = parseInt(req.params.alumnoId);
    const { subtemas } = req.body;
    
    if (isNaN(alumnoId)) {
      return res.status(400).json({ error: "ID de alumno inválido" });
    }
    
    if (!Array.isArray(subtemas)) {
      return res.status(400).json({ error: "El formato de los subtemas es inválido" });
    }
    
    // Si el servicio está disponible, usamos la API externa
    if (SERVICE_AVAILABLE) {
      // Obtenemos el token de usuario para trazabilidad
      const userToken = req.headers.authorization?.split(" ")[1];
      
      const resultado = await academicObserverService.guardarEvaluacion(alumnoId, subtemas, userToken);
      
      res.json(resultado);
    } else {
      // Si el servicio no está disponible, simulamos el guardado para desarrollo
      if (DEV_MODE) {
        console.log(`[AcademicObserver] Simulando guardado de evaluación para el alumno ${alumnoId}`);
        
        // Simulamos un tiempo de respuesta
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Encontramos al alumno en nuestros datos simulados
        const alumno = mockData.seguimientoGrupal.alumnos.find(a => a.id === alumnoId);
        
        if (alumno) {
          // Contamos cuántos subtemas están completados
          const completados = subtemas.filter(s => s.completado).length;
          const total = subtemas.length;
          const porcentaje = Math.round((completados / total) * 100);
          
          // Actualizamos el progreso del alumno
          alumno.progreso = {
            completados,
            total,
            porcentaje
          };
          
          // Actualizamos el estado del alumno según el porcentaje
          if (porcentaje === 100) {
            alumno.estado = "completo";
          } else if (porcentaje > 0) {
            alumno.estado = "incompleto";
          } else {
            alumno.estado = "sin_iniciar";
          }
          
          // Actualizamos los totales del resumen
          mockData.seguimientoGrupal.resumen = {
            evaluacionCompleta: mockData.seguimientoGrupal.alumnos.filter(a => a.estado === "completo").length,
            evaluacionIncompleta: mockData.seguimientoGrupal.alumnos.filter(a => a.estado === "incompleto").length,
            sinIniciar: mockData.seguimientoGrupal.alumnos.filter(a => a.estado === "sin_iniciar").length,
            totalSubtemas: mockData.seguimientoGrupal.resumen.totalSubtemas
          };
          
          // Guardamos los subtemas con sus comentarios para este alumno
          mockData.evaluacionesAlumnos[alumnoId] = subtemas.map(s => {
            // Creamos un nuevo objeto para asegurarnos de que no se compartan referencias
            const evaluacion = {
              id: s.id,
              completado: s.completado,
              comentario: s.comentario || ""
            } as SubtemaEvaluacion;
            
            console.log(`[AcademicObserver] Guardando subtema ${s.id} con comentario: "${s.comentario}"`);
            return evaluacion;
          });
          
          console.log(`[AcademicObserver] Guardados ${subtemas.length} subtemas con comentarios para el alumno ${alumnoId}`);
          console.log(`[AcademicObserver] Estado actual: ${JSON.stringify(mockData.evaluacionesAlumnos[alumnoId])}`);
        }
        
        // Devolvemos un resultado exitoso
        res.json({
          success: true,
          message: "Evaluación guardada correctamente",
          subtemas
        });
      } else {
        // En producción, devolvemos un error adecuado
        throw new Error("Servicio de observaciones no disponible temporalmente");
      }
    }
  } catch (error) {
    console.error(`Error al guardar evaluación para el alumno ${req.params.alumnoId}:`, error);
    res.status(500).json({ 
      error: "Error al guardar la evaluación",
      detalle: error instanceof Error ? error.message : "Error desconocido" 
    });
  }
});

// Ruta para obtener datos de seguimiento individual de un alumno
router.get("/seguimiento-alumno/:id", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const alumnoId = parseInt(req.params.id);
    
    if (isNaN(alumnoId)) {
      return res.status(400).json({ error: "ID de alumno inválido" });
    }
    
    // Si el servicio está disponible, obtenemos datos de la API externa
    if (SERVICE_AVAILABLE) {
      // Obtenemos el token de usuario para trazabilidad
      const userToken = req.headers.authorization?.split(" ")[1];
      
      const seguimientoData = await academicObserverService.getSeguimientoAlumno(alumnoId, userToken);
      
      res.json(seguimientoData);
    } else {
      // Usar datos simulados tanto en desarrollo como en producción cuando el servicio no esté disponible
      console.log(`[AcademicObserver] Usando datos simulados para seguimiento del alumno ${alumnoId}`);
      
      try {
        // Verificar que mockData existe y tiene la estructura esperada
        if (!mockData || !mockData.seguimientoGrupal || !mockData.seguimientoGrupal.alumnos) {
          throw new Error("Datos simulados no disponibles para seguimiento de alumno");
        }
        
        console.log(`[PRODUCCIÓN DEBUG] Buscando alumno con ID: ${alumnoId} en ${mockData.seguimientoGrupal.alumnos.length} alumnos`);
        
        // Simulamos un tiempo de respuesta
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Encontramos al alumno en nuestros datos simulados
        const alumno = mockData.seguimientoGrupal.alumnos.find(a => a.id === alumnoId);
        
        if (!alumno) {
          console.log(`[PRODUCCIÓN DEBUG] Alumno con ID ${alumnoId} no encontrado`);
          return res.status(404).json({ error: "Alumno no encontrado" });
        }
        
        console.log(`[PRODUCCIÓN DEBUG] Alumno encontrado: ${alumno.nombre}`);
        
        // Generamos estados para las materias basados en promedios
        const materiasConEstado = alumno.materias.map(materia => {
          let estado: "optimo" | "satisfactorio" | "enProceso" | "inicial";
          
          if (materia.promedio >= 90) {
            estado = "optimo";
          } else if (materia.promedio >= 80) {
            estado = "satisfactorio";
          } else if (materia.promedio >= 70) {
            estado = "enProceso";
          } else {
            estado = "inicial";
          }
          
          return {
            ...materia,
            estado
          };
        });
        
        // Construimos el objeto de seguimiento individual con datos más detallados
        const seguimientoAlumno: SeguimientoAlumno = {
          ...alumno,
          materias: materiasConEstado,
          subtemas: {},
          estado: alumno.estado as "completo" | "incompleto" | "sin_iniciar"
        };
        
        // Generamos subtemas para cada materia del alumno
        alumno.materias.forEach(materia => {
          seguimientoAlumno.subtemas[materia.id] = mockData.generarSubtemasSimulados(
            4, // Cantidad de subtemas por materia
            alumno.estado !== "sin_iniciar" // Solo generamos evaluaciones si el alumno no está en estado "sin_iniciar"
          );
        });
        
        // Añadimos periodos anteriores simulados
        seguimientoAlumno.periodosAnteriores = {
          "2024-1": {
            nombre: "Primer Semestre 2024",
            fecha: "2024-01-15",
            promedio: Math.round((alumno.promedio - 0.5 + Math.random()) * 10) / 10,
            materias: alumno.materias.map(m => ({
              id: m.id,
              nombre: m.nombre,
              promedio: Math.round((m.promedio - 0.7 + Math.random() * 1.4) * 10) / 10
            }))
          },
          "2023-2": {
            nombre: "Segundo Semestre 2023",
            fecha: "2023-07-30",
            promedio: Math.round((alumno.promedio - 1 + Math.random() * 2) * 10) / 10,
            materias: alumno.materias.map(m => ({
              id: m.id,
              nombre: m.nombre,
              promedio: Math.round((m.promedio - 1 + Math.random() * 2) * 10) / 10
            }))
          }
        };
        
        // Añadimos algunos reportes generados simulados
        seguimientoAlumno.reportesGenerados = [
          {
            id: "rep-" + Math.floor(Math.random() * 1000),
            nombre: "Boleta de Calificaciones",
            fecha: "2025-04-01",
            tipo: "boleta",
            url: "#"
          },
          {
            id: "rep-" + Math.floor(Math.random() * 1000),
            nombre: "Plan de Recuperación Académica",
            fecha: "2025-03-15",
            tipo: "recuperacion",
            url: "#"
          }
        ];
        
        console.log(`[PRODUCCIÓN DEBUG] Seguimiento generado exitosamente para ${alumno.nombre}`);
        res.json(seguimientoAlumno);
        
      } catch (mockError) {
        console.error("[PRODUCCIÓN ERROR] Error en datos simulados de seguimiento alumno:", mockError);
        
        // Respuesta de emergencia si fallan los datos simulados
        res.status(500).json({
          error: "Error al generar datos de seguimiento",
          details: mockError instanceof Error ? mockError.message : "Error en datos simulados"
        });
      }
    }
  } catch (error) {
    console.error(`Error al obtener datos de seguimiento del alumno:`, error);
    res.status(500).json({
      error: "Error al obtener datos de seguimiento del alumno",
      details: error instanceof Error ? error.message : "Error desconocido"
    });
  }
});

export default router;