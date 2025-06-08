import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Alert,
  AlertTitle,
  AlertDescription
} from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FileText, 
  Lightbulb, 
  Brain, 
  RefreshCw, 
  ClipboardList, 
  AlertTriangle,
  GraduationCap,
  Calendar,
  Target,
  Clock,
  CheckCircle2
} from "lucide-react";
import { jsPDF } from "jspdf";
import { generateRecoveryPlanFromText } from "@/services/recovery-plan-pdf";
import { GroupStatsSummary } from "@/components/teacher/GroupStatsSummary";

// Tipo para la respuesta del plan de recuperación
type RecoveryPlanResponse = {
  success: boolean;
  result?: string;
  error?: string;
};

// Componente principal de la página
const PlanRecuperacionPage = () => {
  const { user } = useAuth() as { user: ExtendedUser | null };
  const { toast } = useToast();
  const location = useLocation();
  
  // Extendemos el tipo de usuario para incluir profesorId
  interface ExtendedUser {
    id: string;
    nombreCompleto: string;
    correo: string;
    password: string;
    rol: "admin" | "coordinador" | "docente" | "padre" | "alumno";
    activo: boolean;
    createdAt: Date;
    profesorId?: number;
  }
  
  // Definimos la interfaz para grupos
  interface Group {
    id: number;
    nombre: string;
    nivel?: string;
    grado?: number;
  }
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedGroupObj, setSelectedGroupObj] = useState<Group | null>(null);
  const [recoveryPlanResult, setRecoveryPlanResult] = useState<string | undefined>(undefined);
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("completo");
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Referencia para mantener el grupo seleccionado entre recargas
  const lastSelectedGroupRef = useRef<string | null>(null);
  
  // Constante para claves de localStorage
  const STORAGE_KEYS = {
    SELECTED_GROUP: 'recovery_plan_selected_group'
  };
  
  // Función para alternar la expansión de una sección
  const toggleExpand = (sectionId: string) => {
    setIsExpanded(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Consulta para obtener los grupos asignados al profesor
  const { 
    data: groups = [] as Group[], 
    isLoading: isLoadingGroups 
  } = useQuery<Group[]>({
    queryKey: ['/api/profesor/grupos-asignados'],
    enabled: !!user?.id && user?.rol === "docente",
  });

  // Mutación para generar el plan de recuperación
  const generateRecoveryPlanMutation = useMutation({
    mutationFn: async (groupId: number) => {
      const response = await apiRequest('POST', '/api/teacher-assistant/recovery-plan', {
        teacherId: user?.profesorId,
        groupId
      });
      return response.json() as Promise<RecoveryPlanResponse>;
    },
    onSuccess: (data) => {
      if (data.success && data.result) {
        setRecoveryPlanResult(data.result);
        
        // Almacenar el texto generado por IA para mostrarlo en la interfaz con el nuevo componente
        if (data.result && typeof data.result === 'string') {
          setAiGeneratedContent(data.result);
        }
        
        toast({
          title: "Plan de recuperación generado",
          description: "El plan de recuperación académica se ha generado exitosamente.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "No se pudo generar el plan de recuperación.",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error("Error al generar plan de recuperación:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al generar el plan de recuperación. Intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  // Consulta para obtener plan de recuperación existente (si lo hay)
  const { 
    data: existingRecoveryPlan,
    isLoading: isLoadingRecoveryPlan,
    refetch: refetchRecoveryPlan
  } = useQuery({
    queryKey: ['/api/teacher-assistant/recovery-plan', selectedGroup],
    queryFn: async () => {
      if (!selectedGroup) return null;
      try {
        const response = await apiRequest('GET', '/api/teacher-assistant/recovery-plan');
        const data = await response.json() as RecoveryPlanResponse;
        if (data.success && data.result) {
          setRecoveryPlanResult(data.result);
          return data.result;
        }
        return null;
      } catch (error) {
        console.error("Error al obtener plan de recuperación existente:", error);
        return null;
      }
    },
    enabled: !!selectedGroup,
  });
  
  // Consulta para obtener estadísticas del grupo
  const {
    data: groupStats,
    isLoading: isLoadingGroupStats
  } = useQuery({
    queryKey: ['/api/profesor/group-stats', selectedGroup],
    queryFn: async () => {
      if (!selectedGroup) return null;
      try {
        const response = await apiRequest('GET', `/api/profesor/group-stats/${selectedGroup}`);
        return response.json();
      } catch (error) {
        console.error("Error al obtener estadísticas del grupo:", error);
        return {
          promedioGeneral: "0.0",
          porcentajeAsistencia: "0",
          totalAlumnos: 0,
          porcentajeAprobados: "0"
        };
      }
    },
    enabled: !!selectedGroup,
  });

  // Función para persistir la selección del grupo en localStorage y referencia
  const persistSelectedGroup = (groupId: string) => {
    console.log("Persistiendo selección de grupo:", groupId);
    
    // Actualizar el estado actual
    setSelectedGroup(groupId);
    
    // Guardar en localStorage para persistencia entre sesiones
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_GROUP, groupId);
    } catch (e) {
      console.error("Error al guardar en localStorage:", e);
    }
    
    // Guardar en referencia para persistencia entre renders
    lastSelectedGroupRef.current = groupId;
  };

  // Efecto para asegurar que se carga correctamente el grupo desde localStorage al inicio
  useEffect(() => {
    // Este efecto se ejecuta una vez al montar el componente
    try {
      const savedGroup = localStorage.getItem(STORAGE_KEYS.SELECTED_GROUP);
      if (savedGroup && !selectedGroup) {
        console.log("Restaurando grupo desde localStorage al iniciar:", savedGroup);
        persistSelectedGroup(savedGroup);
      }
    } catch (e) {
      console.error("Error al cargar grupo desde localStorage:", e);
    }
  }, []);

  // Efecto para actualizar plan de recuperación cuando cambia el grupo seleccionado
  useEffect(() => {
    console.log("Efecto de actualización ejecutado, existingRecoveryPlan:", existingRecoveryPlan);
    if (existingRecoveryPlan) {
      // Limpiar el estado para forzar el re-renderizado
      setRecoveryPlanResult(undefined);
      
      // Pequeño timeout para asegurar que el estado se resetea antes de asignar el nuevo valor
      setTimeout(() => {
        console.log("Actualizando recoveryPlanResult con:", existingRecoveryPlan);
        setRecoveryPlanResult(existingRecoveryPlan);
        
        // Actualizar también aiGeneratedContent si es necesario
        if (typeof existingRecoveryPlan === 'string') {
          setAiGeneratedContent(existingRecoveryPlan);
        } else if (typeof existingRecoveryPlan === 'object' && existingRecoveryPlan !== null) {
          try {
            // Si es un objeto JSON, convertirlo a string para el estado
            const jsonString = JSON.stringify(existingRecoveryPlan);
            setAiGeneratedContent(jsonString);
          } catch (error) {
            console.error("Error procesando plan de recuperación como JSON:", error);
          }
        }
      }, 50);
    }
  }, [existingRecoveryPlan]);
  
  // Efecto para actualizar selectedGroupObj cuando cambia selectedGroup
  useEffect(() => {
    if (selectedGroup && groups.length > 0) {
      const groupObj = groups.find(g => g.id === parseInt(selectedGroup));
      setSelectedGroupObj(groupObj || null);
      
      // Asegurar que la selección esté siempre persistida
      if (selectedGroup !== localStorage.getItem(STORAGE_KEYS.SELECTED_GROUP)) {
        localStorage.setItem(STORAGE_KEYS.SELECTED_GROUP, selectedGroup);
      }
      if (selectedGroup !== lastSelectedGroupRef.current) {
        lastSelectedGroupRef.current = selectedGroup;
      }
    } else {
      setSelectedGroupObj(null);
    }
  }, [selectedGroup, groups]);

  // Función para generar el plan de recuperación
  const handleGenerateRecoveryPlan = () => {
    if (!selectedGroup) {
      toast({
        title: "Seleccione un grupo",
        description: "Por favor seleccione un grupo para generar el plan de recuperación.",
        variant: "default"
      });
      return;
    }
    
    // Guardar el grupo actual seleccionado en la referencia
    console.log("Guardando selección de grupo actual:", selectedGroup);
    lastSelectedGroupRef.current = selectedGroup;
    
    // Asegurar que la selección esté guardada en localStorage antes de comenzar
    localStorage.setItem(STORAGE_KEYS.SELECTED_GROUP, selectedGroup);

    // Limpiar estado previo para forzar re-renderizado
    setAiGeneratedContent(null);
    
    // Indicar al usuario que estamos generando el plan
    toast({
      title: "Generando plan de recuperación",
      description: "Esto puede tomar unos segundos. La página se actualizará automáticamente cuando esté listo.",
    });
    
    // Llamar a la mutación para generar el plan, enviando el ID del grupo seleccionado
    generateRecoveryPlanMutation.mutate(parseInt(selectedGroup), {
      onSuccess: (data) => {
        // Restaurar el grupo seleccionado siempre para asegurar consistencia
        console.log("Asegurando persistencia de grupo después de éxito:", selectedGroup);
        persistSelectedGroup(selectedGroup);
        
        // Forzar una invalidación de la consulta para obtener los datos más recientes
        queryClient.invalidateQueries({
          queryKey: ['/api/teacher-assistant/recovery-plan']
        });
        
        // Refetch inmediato para obtener los datos más recientes
        refetchRecoveryPlan();
      },
      onSettled: () => {
        // Siempre verificar y restaurar el grupo seleccionado usando localStorage y ref
        const savedGroupId = localStorage.getItem(STORAGE_KEYS.SELECTED_GROUP) || lastSelectedGroupRef.current;
        if (savedGroupId) {
          console.log("Restaurando selección de grupo después de completar:", savedGroupId);
          persistSelectedGroup(savedGroupId);
        }
      }
    });
  };

  // Función para descargar el plan de recuperación como PDF
  const handleDownloadPDF = async () => {
    if (!recoveryPlanResult) return;
    
    try {
      // Obtener datos para personalizar el PDF
      const teacherName = user?.nombreCompleto || 'Docente';
      const selectedGroupObj = groups.find((g: Group) => g.id === parseInt(selectedGroup));
      const groupName = selectedGroupObj ? selectedGroupObj.nombre : 'Grupo';
      
      // Generar el PDF con formato profesional
      const pdf = generateRecoveryPlanFromText(
        recoveryPlanResult,
        teacherName,
        groupName
      );
      
      // Guardar el PDF con nombre personalizado
      pdf.save(`plan-recuperacion-${groupName.toLowerCase()}-${teacherName.split(' ')[0].toLowerCase()}.pdf`);
      
      toast({
        title: "PDF generado con éxito",
        description: "El Plan de Recuperación Académica se ha guardado como PDF con formato profesional.",
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast({
        title: "Error al generar PDF",
        description: "No se pudo generar el archivo PDF. Intente nuevamente.",
        variant: "destructive"
      });
    }
  };

  // Función para parsear el contenido AI para mostrar en tarjetas
  const parseAIContent = (content: string) => {
    // Si parece ser un objeto JSON, intentar procesarlo como tal
    if (content.startsWith('{') && content.endsWith('}')) {
      try {
        const jsonData = JSON.parse(content);
        console.log("Detectado contenido JSON, procesando con processJSONContent");
        return processJSONContent(jsonData);
      } catch (e) {
        console.error("Error al parsear JSON:", e);
      }
    }
    
    // Expresiones regulares para diferentes secciones
    const sections: {[key: string]: {title: string, regex: RegExp, icon: React.ReactNode}} = {
      diagnostico: {
        title: "Diagnóstico y Situación Actual",
        regex: /(?:Diagnóstico|Diagnóstico Individual|Situación Actual)[:\s]*([\s\S]*?)(?=Objetivos|Metas|Plan de Acción|$)/i,
        icon: <AlertTriangle className="h-5 w-5 text-amber-500" />
      },
      objetivos: {
        title: "Objetivos y Metas",
        regex: /(?:Objetivos|Metas|Objetivos Específicos)[:\s]*([\s\S]*?)(?=Plan de Acción|Estrategias|Acciones|$)/i,
        icon: <Target className="h-5 w-5 text-primary" />
      },
      estrategias: {
        title: "Estrategias y Acciones",
        regex: /(?:Plan de Acción|Estrategias|Acciones Recomendadas)[:\s]*([\s\S]*?)(?=Cronograma|Tiempos|Evaluación|$)/i,
        icon: <Lightbulb className="h-5 w-5 text-primary" />
      },
      cronograma: {
        title: "Cronograma y Tiempos",
        regex: /(?:Cronograma|Tiempos|Calendario de Actividades)[:\s]*([\s\S]*?)(?=Evaluación|Seguimiento|$)/i,
        icon: <Calendar className="h-5 w-5 text-primary" />
      },
      evaluacion: {
        title: "Evaluación y Seguimiento",
        regex: /(?:Evaluación|Seguimiento|Métodos de Evaluación)[:\s]*([\s\S]*?)(?=Conclusión|Resumen|$)/i,
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />
      },
      conclusion: {
        title: "Conclusiones",
        regex: /(?:Conclusión|Resumen|Consideraciones Finales)[:\s]*([\s\S]*?)$/i,
        icon: <FileText className="h-5 w-5 text-primary" />
      }
    };

    const result: {[key: string]: {title: string, content: string[], icon: React.ReactNode}} = {};
    
    // Extraer cada sección del texto
    Object.entries(sections).forEach(([key, section]) => {
      const match = content.match(section.regex);
      if (match && match[1]) {
        const contentText = match[1].trim();
        
        // Dividir el contenido en viñetas si es posible
        let items: string[] = [];
        
        // Intentar encontrar viñetas numeradas (1., 2., etc.)
        if (contentText.match(/^\d+\.\s/m)) {
          items = contentText
            .split(/\n+/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^\d+\.\s*/, '')); // Quitar números
        } 
        // Intentar encontrar viñetas con asteriscos o guiones
        else if (contentText.match(/^[•\-*]\s/m)) {
          items = contentText
            .split(/\n+/)
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^[•\-*]\s*/, '')); // Quitar viñetas existentes
        }
        // Si no hay viñetas, intentar separar por párrafos
        else {
          items = contentText
            .split(/\n{2,}/) // Separar por líneas en blanco
            .map(paragraph => paragraph.replace(/\n/g, ' ').trim()) // Unir líneas en párrafos
            .filter(paragraph => paragraph.length > 0);
            
          // Si solo hay un párrafo largo, intentar dividirlo en oraciones
          if (items.length === 1 && items[0].length > 150) {
            items = items[0]
              .split(/(?<=[.!?])\s+/)
              .filter(sentence => sentence.length > 0);
          }
        }
        
        result[key] = {
          title: section.title,
          content: items,
          icon: section.icon
        };
      }
    });
    
    // Si no se encontró ninguna sección, crear una genérica
    if (Object.keys(result).length === 0 && content.trim()) {
      const genericContent = content
        .split(/\n+/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^[•\-*]\d+\.\s*/, ''));
      
      result['general'] = {
        title: "Plan de Recuperación",
        icon: <FileText className="h-5 w-5 text-primary" />,
        content: genericContent
      };
    }
    
    return result;
  };
  
  // Función para procesar y estructurar respuestas JSON
  const processJSONContent = (data: any) => {
    console.log("Procesando contenido en formato JSON para mostrar en tarjetas:", data);
    
    // Validar que tenemos datos y son un objeto
    if (!data || typeof data !== 'object') {
      console.error("No hay datos válidos para procesar como JSON", data);
      return {
        diagnostico: {
          title: "Diagnóstico y Situación Actual",
          content: ["No hay diagnóstico disponible"],
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />
        }
      };
    }
    
    // Resultados estructurados para mostrar en tarjetas
    const result: {[key: string]: {title: string, content: string[] | any[], icon: React.ReactNode}} = {};
    
    try {
      // Analizar la estructura principal del objeto
      console.log("Estructura principal:", Object.keys(data));
      
      // Manejar estructura de estudiantes (plan de recuperación por estudiante)
      if (data.estudiantes && Array.isArray(data.estudiantes) && data.estudiantes.length > 0) {
        console.log("Encontrada estructura con estudiantes, procesando planes individuales");
        
        // Diagnostico - Situación actual
        result.diagnostico = {
          title: "Diagnóstico y Situación Actual",
          content: [],
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />
        };
        
        // Objetivos y metas
        result.objetivos = {
          title: "Objetivos y Metas",
          content: [],
          icon: <Target className="h-5 w-5 text-primary" />
        };
        
        // Estrategias y acciones
        result.estrategias = {
          title: "Estrategias y Acciones",
          content: [],
          icon: <Lightbulb className="h-5 w-5 text-primary" />
        };
        
        // Evaluación y seguimiento
        result.evaluacion = {
          title: "Evaluación y Seguimiento",
          content: [],
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />
        };
        
        // Cronograma
        result.cronograma = {
          title: "Cronograma y Tiempos",
          content: [],
          icon: <Calendar className="h-5 w-5 text-primary" />
        };
        
        // Procesar cada estudiante
        data.estudiantes.forEach((estudiante: any, index: number) => {
          if (estudiante.plan) {
            // Extraer información de materias con dificultades
            if (estudiante.plan.materiasDificultad && Array.isArray(estudiante.plan.materiasDificultad)) {
              estudiante.plan.materiasDificultad.forEach((materia: any) => {
                result.diagnostico.content.push(
                  `Estudiante ${index + 1}: ${materia.nombre} - ${materia.descripcion || "Requiere atención"}`
                );
              });
            }
            
            // Extraer información de objetivos de aprendizaje
            if (estudiante.plan.objetivosAprendizaje && Array.isArray(estudiante.plan.objetivosAprendizaje)) {
              estudiante.plan.objetivosAprendizaje.forEach((objetivo: any) => {
                result.objetivos.content.push(objetivo);
              });
            }
            
            // Extraer información de acciones de mejora
            if (estudiante.plan.accionesMejora && Array.isArray(estudiante.plan.accionesMejora)) {
              estudiante.plan.accionesMejora.forEach((accion: any) => {
                result.estrategias.content.push(
                  `${accion.titulo}: ${accion.descripcion || ""}`
                );
                
                // Si tiene fecha límite, añadir al cronograma
                if (accion.fechaLimite) {
                  result.cronograma.content.push(
                    `${accion.titulo}: Fecha límite ${accion.fechaLimite} (Responsable: ${accion.responsable || "No especificado"})`
                  );
                }
              });
            }
            
            // Extraer información de actividades de refuerzo
            if (estudiante.plan.actividadesRefuerzo && Array.isArray(estudiante.plan.actividadesRefuerzo)) {
              estudiante.plan.actividadesRefuerzo.forEach((actividad: any) => {
                result.estrategias.content.push(
                  typeof actividad === 'string' ? actividad : (actividad.descripcion || actividad.titulo || "Actividad de refuerzo")
                );
              });
            }
            
            // Extraer información de métodos de evaluación
            if (estudiante.plan.metodosEvaluacion && Array.isArray(estudiante.plan.metodosEvaluacion)) {
              estudiante.plan.metodosEvaluacion.forEach((metodo: any) => {
                result.evaluacion.content.push(
                  typeof metodo === 'string' ? metodo : (metodo.descripcion || metodo.titulo || "Método de evaluación")
                );
              });
            } else if (estudiante.plan.seguimiento) {
              result.evaluacion.content.push(
                typeof estudiante.plan.seguimiento === 'string' 
                  ? estudiante.plan.seguimiento 
                  : "Plan de seguimiento personalizado"
              );
            }
          }
        });
        
        // Si el resumen estadístico está disponible, añadirlo al diagnóstico
        if (data.resumenEstadistico) {
          const stats = data.resumenEstadistico;
          result.diagnostico.content.unshift(
            `Resumen del grupo: ${stats.promedioGeneral || 0} promedio general, ${stats.porcentajeAprobacion || 0}% aprobación, ${stats.porcentajeAsistencia || 0}% asistencia`
          );
          
          if (stats.estudiantesEnRiesgo) {
            result.diagnostico.content.unshift(
              `${stats.estudiantesEnRiesgo} estudiante(s) en situación de riesgo académico de un total de ${stats.totalEstudiantes || 0}`
            );
          }
        }
        
        // Eliminar cualquier sección que esté vacía
        Object.keys(result).forEach(key => {
          if (result[key].content.length === 0) {
            delete result[key];
          } else {
            // Eliminar duplicados
            result[key].content = Array.from(new Set(result[key].content));
          }
        });
        
        // Si después de todo no hay contenido, crear un mensaje genérico
        if (Object.keys(result).length === 0) {
          result.general = {
            title: "Plan de Recuperación",
            content: [`Plan de recuperación académica para ${data.grupoNombre || "el grupo"}`],
            icon: <FileText className="h-5 w-5 text-primary" />
          };
        }
        
        return result;
      }
      
      // Si hay un objeto 'planRecuperacion', analizar su estructura
      if (data.planRecuperacion) {
        console.log("Objeto planRecuperacion:", Object.keys(data.planRecuperacion));
      }
      
      // Procesar estructura estándar de secciones específicas
      
      // Procesar el diagnóstico
      console.log("Procesando contenido en formato JSON para sección:", "diagnostico", typeof data);
      
      if (data.diagnostico || data.planRecuperacion?.diagnostico) {
        const diagnostico = data.diagnostico || data.planRecuperacion?.diagnostico;
        console.log("Diagnóstico encontrado en JSON:", diagnostico);
        
        result.diagnostico = {
          title: "Diagnóstico y Situación Actual",
          content: Array.isArray(diagnostico.contenido) ? diagnostico.contenido : 
                  Array.isArray(diagnostico) ? diagnostico : 
                  [typeof diagnostico === 'string' ? diagnostico : "No hay diagnóstico disponible"],
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />
        };
      }
      
      // Procesar objetivos y metas
      console.log("Procesando contenido en formato JSON para sección:", "objetivos", typeof data);
      
      if (data.objetivos || data.planRecuperacion?.objetivos || data.metas || data.planRecuperacion?.metas) {
        const objetivos = data.objetivos || data.planRecuperacion?.objetivos || data.metas || data.planRecuperacion?.metas;
        console.log("Objetivos encontrados en JSON:", objetivos);
        
        result.objetivos = {
          title: "Objetivos y Metas",
          content: Array.isArray(objetivos.contenido) ? objetivos.contenido : 
                  Array.isArray(objetivos) ? objetivos : 
                  [typeof objetivos === 'string' ? objetivos : "No hay objetivos disponibles"],
          icon: <Target className="h-5 w-5 text-primary" />
        };
      }
      
      // Procesar estrategias y acciones
      console.log("Procesando contenido en formato JSON para sección:", "estrategias", typeof data);
      
      if (data.estrategias || data.planRecuperacion?.estrategias || data.acciones || data.planRecuperacion?.acciones) {
        const estrategias = data.estrategias || data.planRecuperacion?.estrategias || data.acciones || data.planRecuperacion?.acciones;
        console.log("Estrategias encontradas en JSON:", estrategias);
        
        result.estrategias = {
          title: "Estrategias y Acciones",
          content: Array.isArray(estrategias.contenido) ? estrategias.contenido : 
                  Array.isArray(estrategias) ? estrategias : 
                  [typeof estrategias === 'string' ? estrategias : "No hay estrategias disponibles"],
          icon: <Lightbulb className="h-5 w-5 text-primary" />
        };
      }
      
      // Procesar cronograma y tiempos
      console.log("Procesando contenido en formato JSON para sección:", "cronograma", typeof data);
      
      if (data.cronograma || data.planRecuperacion?.cronograma || data.tiempos || data.planRecuperacion?.tiempos) {
        const cronograma = data.cronograma || data.planRecuperacion?.cronograma || data.tiempos || data.planRecuperacion?.tiempos;
        console.log("Cronograma encontrado en JSON:", cronograma);
        
        result.cronograma = {
          title: "Cronograma y Tiempos",
          content: Array.isArray(cronograma.contenido) ? cronograma.contenido : 
                  Array.isArray(cronograma) ? cronograma : 
                  [typeof cronograma === 'string' ? cronograma : "No hay cronograma disponible"],
          icon: <Calendar className="h-5 w-5 text-primary" />
        };
      }
      
      // Procesar evaluación y seguimiento
      console.log("Procesando contenido en formato JSON para sección:", "evaluacion", typeof data);
      
      if (data.evaluacion || data.planRecuperacion?.evaluacion || data.seguimiento || data.planRecuperacion?.seguimiento) {
        const evaluacion = data.evaluacion || data.planRecuperacion?.evaluacion || data.seguimiento || data.planRecuperacion?.seguimiento;
        console.log("Evaluación encontrada en JSON:", evaluacion);
        
        result.evaluacion = {
          title: "Evaluación y Seguimiento",
          content: Array.isArray(evaluacion.contenido) ? evaluacion.contenido : 
                  Array.isArray(evaluacion) ? evaluacion : 
                  [typeof evaluacion === 'string' ? evaluacion : "No hay evaluación disponible"],
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />
        };
      }
      
      // Procesar conclusión
      console.log("Procesando contenido en formato JSON para sección:", "conclusion", typeof data);
      
      if (data.conclusion || data.planRecuperacion?.conclusion) {
        const conclusion = data.conclusion || data.planRecuperacion?.conclusion;
        console.log("Conclusión encontrada en JSON:", conclusion);
        
        result.conclusion = {
          title: "Conclusiones",
          content: Array.isArray(conclusion.contenido) ? conclusion.contenido : 
                  Array.isArray(conclusion) ? conclusion : 
                  [typeof conclusion === 'string' ? conclusion : "No hay conclusión disponible"],
          icon: <FileText className="h-5 w-5 text-primary" />
        };
      }
    } catch (error) {
      console.error("Error procesando contenido JSON:", error);
    }
    
    // Si no encontramos nada, crear un resultado predeterminado
    if (Object.keys(result).length === 0) {
      result.general = {
        title: "Plan de Recuperación",
        content: [
          `Plan de recuperación para el grupo ${data.grupoNombre || ''} generado el ${data.fechaGeneracion || new Date().toLocaleDateString()}`,
          "No se pudieron extraer secciones específicas del formato JSON proporcionado.",
          "Por favor intente regenerar el plan con un formato más estructurado."
        ],
        icon: <FileText className="h-5 w-5 text-primary" />
      };
    }
    
    return result;
  };

  // Función para extraer secciones específicas del plan de recuperación
  const extractSection = (content: any, section: string): string => {
    // Si content no es un string, devolver vacío y loguear el warning
    if (!content) return "";
    if (typeof content !== 'string') {
      console.warn('El contenido no es texto, se recibió:', typeof content);
      return ''; // No podemos aplicar regex en contenido no textual
    }
    
    let sectionPattern;
    
    switch (section) {
      case "diagnostico":
        sectionPattern = /(?:Diagnóstico|Diagnóstico Individual|Situación Actual)[:\s]*([\s\S]*?)(?=Objetivos|Metas|Plan de Acción|$)/i;
        break;
      case "objetivos":
        sectionPattern = /(?:Objetivos|Metas|Objetivos Específicos)[:\s]*([\s\S]*?)(?=Plan de Acción|Estrategias|Acciones|$)/i;
        break;
      case "estrategias":
        sectionPattern = /(?:Plan de Acción|Estrategias|Acciones Recomendadas)[:\s]*([\s\S]*?)(?=Cronograma|Tiempos|Evaluación|$)/i;
        break;
      case "evaluacion":
        sectionPattern = /(?:Evaluación|Seguimiento|Métodos de Evaluación)[:\s]*([\s\S]*?)(?=Conclusión|Resumen|$)/i;
        break;
      case "conclusion":
        sectionPattern = /(?:Conclusión|Resumen|Consideraciones Finales)[:\s]*([\s\S]*?)$/i;
        break;
      default:
        return typeof content === 'string' ? content : '';
    }
    
    try {
      const match = content.match(sectionPattern);
      return match && match[1] ? match[1].trim() : "";
    } catch (error) {
      console.error("Error al procesar extractSection:", error);
      return "";
    }
  };

  // Formatear texto para mostrar en HTML con viñetas
  const formatText = (text: string) => {
    if (!text) return [];
    
    const bulletPoints = text.split(/\n/).filter(line => line.trim() !== '');
    
    return bulletPoints.map((point, index) => {
      // Si el punto ya tiene viñeta, usarlo como está
      if (point.trim().startsWith("-") || point.trim().startsWith("•")) {
        return (
          <div key={index} className="flex items-start space-x-2 mb-2">
            <div className="flex-shrink-0 mt-1 text-primary">•</div>
            <p className="flex-1">{point.replace(/^[-•]\s*/, '')}</p>
          </div>
        );
      }
      
      // Si no tiene viñeta, agregar una
      return (
        <div key={index} className="flex items-start space-x-2 mb-2">
          <div className="flex-shrink-0 mt-1 text-primary">•</div>
          <p className="flex-1">{point}</p>
        </div>
      );
    });
  };

  // Determinar si hay contenido en cada sección
  const hasDiagnostico = recoveryPlanResult && extractSection(recoveryPlanResult, "diagnostico").trim() !== "";
  const hasObjetivos = recoveryPlanResult && extractSection(recoveryPlanResult, "objetivos").trim() !== "";
  const hasEstrategias = recoveryPlanResult && extractSection(recoveryPlanResult, "estrategias").trim() !== "";
  const hasEvaluacion = recoveryPlanResult && extractSection(recoveryPlanResult, "evaluacion").trim() !== "";
  const hasConclusion = recoveryPlanResult && extractSection(recoveryPlanResult, "conclusion").trim() !== "";

  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Plan de Recuperación Académica</h1>
          <p className="text-muted-foreground">
            Visualice y genere planes de recuperación personalizados para alumnos con bajo rendimiento.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Select
            value={selectedGroup}
            onValueChange={persistSelectedGroup}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar grupo" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group: Group) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleGenerateRecoveryPlan}
            disabled={!selectedGroup || generateRecoveryPlanMutation.isPending}
            className="flex items-center gap-2"
          >
            {generateRecoveryPlanMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Generar Plan
              </>
            )}
          </Button>
        </div>
      </div>

      {!selectedGroup && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Seleccione un grupo</AlertTitle>
          <AlertDescription>
            Para ver o generar un plan de recuperación académica, primero debe seleccionar un grupo.
          </AlertDescription>
        </Alert>
      )}

      {selectedGroup && selectedGroupObj && (
        <div className="mb-6">
          <GroupStatsSummary 
            stats={groupStats}
            isLoading={isLoadingGroupStats}
            groupName={selectedGroupObj.nombre}
          />
        </div>
      )}

      {selectedGroup && generateRecoveryPlanMutation.isPending && (
        <div className="space-y-4">
          <Skeleton className="h-[400px] w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[180px]" />
          </div>
        </div>
      )}

      {selectedGroup && aiGeneratedContent ? (
        /* Visualización del contenido generado por IA en tiempo real */
        <div className="mt-6 space-y-6">
          <div className="bg-blue-50 px-4 py-3 rounded-lg border border-blue-200 mb-6">
            <p className="text-sm text-blue-800 font-medium flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              Plan de recuperación académica generado por el asistente de IA
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(parseAIContent(aiGeneratedContent)).map(([key, section]) => {
              const isExpandedState = isExpanded[key] || false;
              const maxVisibleItems = 5;
              const hasMoreContent = section.content.length > maxVisibleItems;
              const displayedContent = isExpandedState 
                ? section.content 
                : section.content.slice(0, maxVisibleItems);
              
              return (
                <Card key={key} className="bg-slate-50 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      {section.icon}
                      <span className="ml-2">{section.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-2">
                      {displayedContent.map((item: string, index: number) => (
                        <li key={index} className="text-sm border-l-2 border-primary pl-3 py-1 bg-white rounded shadow-sm">
                          {item}
                        </li>
                      ))}
                    </ul>
                    
                    {hasMoreContent && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-3 w-full text-sm"
                        onClick={() => toggleExpand(key)}
                      >
                        {isExpandedState ? "Ver menos" : `Ver ${section.content.length - maxVisibleItems} más`}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button onClick={handleGenerateRecoveryPlan} variant="outline" className="mr-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerar Plan
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleDownloadPDF}
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
          
          {/* Fecha de generación */}
          <div className="text-xs text-muted-foreground text-right mt-2">
            Generado el: {new Date().toLocaleDateString()}
          </div>
        </div>
      ) : selectedGroup && recoveryPlanResult && (
        <div className="space-y-4" ref={contentRef}>
          <Tabs defaultValue="completo" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid grid-cols-5 w-auto">
                <TabsTrigger value="completo">Completo</TabsTrigger>
                <TabsTrigger value="diagnostico" 
                  disabled={!hasDiagnostico}
                  className="flex items-center gap-1"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Diagnóstico
                </TabsTrigger>
                <TabsTrigger value="objetivos" 
                  disabled={!hasObjetivos}
                  className="flex items-center gap-1"
                >
                  <Target className="h-3.5 w-3.5" />
                  Objetivos
                </TabsTrigger>
                <TabsTrigger value="estrategias" 
                  disabled={!hasEstrategias}
                  className="flex items-center gap-1"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Estrategias
                </TabsTrigger>
                <TabsTrigger value="evaluacion" 
                  disabled={!hasEvaluacion}
                  className="flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Evaluación
                </TabsTrigger>
              </TabsList>
              
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Plan de Recuperación Académica
                </CardTitle>
                <CardDescription>
                  Estrategia personalizada para mejorar el rendimiento de estudiantes con dificultades académicas
                </CardDescription>
                <Separator />
              </CardHeader>

              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <TabsContent value="completo" className="space-y-6 mt-0">
                    {hasDiagnostico && (
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          Diagnóstico
                        </h3>
                        <Card className="bg-amber-50 border-amber-200">
                          <CardContent className="p-4">
                            {formatText(extractSection(recoveryPlanResult, "diagnostico"))}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {hasObjetivos && (
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                          <Target className="h-5 w-5 text-primary" />
                          Objetivos
                        </h3>
                        <Card>
                          <CardContent className="p-4">
                            {formatText(extractSection(recoveryPlanResult, "objetivos"))}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {hasEstrategias && (
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                          <ClipboardList className="h-5 w-5 text-primary" />
                          Estrategias y Plan de Acción
                        </h3>
                        <Card className="bg-blue-50 border-blue-200">
                          <CardContent className="p-4">
                            {formatText(extractSection(recoveryPlanResult, "estrategias"))}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {hasEvaluacion && (
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          Evaluación y Seguimiento
                        </h3>
                        <Card className="bg-green-50 border-green-200">
                          <CardContent className="p-4">
                            {formatText(extractSection(recoveryPlanResult, "evaluacion"))}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {hasConclusion && (
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                          <Lightbulb className="h-5 w-5" />
                          Conclusión
                        </h3>
                        <Card>
                          <CardContent className="p-4">
                            <p className="italic text-muted-foreground">
                              {extractSection(recoveryPlanResult, "conclusion")}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="diagnostico" className="mt-0">
                    <div>
                      <Badge variant="outline" className="mb-3 bg-amber-100 text-amber-800 hover:bg-amber-100">Diagnóstico Académico</Badge>
                      <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4">
                          {formatText(extractSection(recoveryPlanResult, "diagnostico"))}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="objetivos" className="mt-0">
                    <div>
                      <Badge variant="outline" className="mb-3">Objetivos de Mejora</Badge>
                      <Card>
                        <CardContent className="p-4">
                          {formatText(extractSection(recoveryPlanResult, "objetivos"))}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="estrategias" className="mt-0">
                    <div>
                      <Badge variant="outline" className="mb-3 bg-blue-100 text-blue-800 hover:bg-blue-100">Plan de Acción</Badge>
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          {formatText(extractSection(recoveryPlanResult, "estrategias"))}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="evaluacion" className="mt-0">
                    <div>
                      <Badge variant="outline" className="mb-3 bg-green-100 text-green-800 hover:bg-green-100">Seguimiento y Evaluación</Badge>
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          {formatText(extractSection(recoveryPlanResult, "evaluacion"))}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </ScrollArea>
              </CardContent>

              <CardFooter className="flex justify-between pt-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Generado por el Asistente Educativo IA
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1"
                  onClick={() => location[1]('/profesor/recomendaciones')}
                >
                  <FileText className="h-4 w-4" />
                  Ver Recomendaciones
                </Button>
              </CardFooter>
            </Card>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default PlanRecuperacionPage;