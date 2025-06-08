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
router.get("/observaciones/profesor/:profesorId", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const profesorId = req.params.profesorId;
    
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
        
        // Usamos todas las observaciones simuladas, asumiendo que todas son del profesor actual
        // En un caso real se filtrarían por profesorId
        res.json(mockData.observacionesPorProfesor);
      } else {
        // En producción, devolvemos un error adecuado
        throw new Error("Servicio de observaciones no disponible temporalmente");
      }
    }
  } catch (error) {
    console.error(`Error al obtener observaciones del profesor ${req.params.profesorId}:`, error);
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

// Ruta para manejar la solicitud directa a /observaciones con el ID como parámetro de consulta
router.get("/observaciones", aoAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const observacionId = req.query.id;
    
    if (!observacionId) {
      return res.status(400).json({ error: "Se requiere un ID de observación" });
    }
    
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
  } catch (error) {
    console.error(`Error al obtener observación ${req.query.id}:`, error);
    res.status(500).json({ 
      error: "Error al obtener la observación académica",
      detalle: error instanceof Error ? error.message : "Error desconocido" 
    });
  }
});

export default router;