import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { generateRecommendationsFromText } from "@/services/recommendations-pdf";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Claves para localStorage
const STORAGE_KEYS = {
  SELECTED_GROUP: 'teacher-recommendations-selected-group'
};
import { GroupStatsSummary } from "@/components/teacher/GroupStatsSummary";
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
  Users, 
  AlertTriangle, 
  Award, 
  BookOpen 
} from "lucide-react";
import { jsPDF } from "jspdf";
import { generateTeacherRecommendationsPDF } from "@/services/recommendations-pdf";

// Tipo para la respuesta de recomendaciones
type RecommendationResponse = {
  success: boolean;
  result?: string | any; // Permitir tanto string como objeto JSON
  error?: string;
};

// Componente principal de la página
const RecomendacionesPage = () => {
  const { user } = useAuth() as { user: ExtendedUser | null };
  const { toast } = useToast();
  // Usamos usamos path y navigate directamente sin destructuring para evitar error de tipado
const location = useLocation();
  // Iniciar selectedGroup con valor del localStorage si existe
  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    try {
      const storedGroup = localStorage.getItem(STORAGE_KEYS.SELECTED_GROUP);
      return storedGroup || "";
    } catch (e) {
      return "";
    }
  });
  const [recommendationsResult, setRecommendationsResult] = useState<string | any | undefined>(undefined);
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>("todos");
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedGroupObj, setSelectedGroupObj] = useState<Group | null>(null);
  
  // Wrapper para setSelectedGroup que también guarda en localStorage y useRef
  const persistSelectedGroup = useCallback((groupId: string) => {
    console.log("Persistiendo selección de grupo:", groupId);
    try {
      if (groupId) {
        // Guardar en todos los mecanismos de persistencia disponibles
        localStorage.setItem(STORAGE_KEYS.SELECTED_GROUP, groupId);
        lastSelectedGroupRef.current = groupId;
        
        // Actualizar el estado de React
        setSelectedGroup(groupId);
        
        // Para depuración: verificar que se haya guardado correctamente
        console.log("Verificación - localStorage:", localStorage.getItem(STORAGE_KEYS.SELECTED_GROUP));
        console.log("Verificación - useRef:", lastSelectedGroupRef.current);
      } else {
        console.warn("Intento de persistir un groupId vacío o nulo");
      }
    } catch (e) {
      console.error("Error al guardar grupo en localStorage:", e);
      // En caso de error, al menos mantener la referencia y el estado
      lastSelectedGroupRef.current = groupId;
      setSelectedGroup(groupId);
    }
  }, []);
  
  // Función para alternar la expansión de una sección
  const toggleExpand = (sectionId: string) => {
    setIsExpanded(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Interfaces para tipos
  interface Group {
    id: number;
    nombre: string;
    nivel?: string;
    grado?: number;
  }
  
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

  // Consulta para obtener los grupos asignados al profesor
  const { 
    data: groups = [] as Group[], 
    isLoading: isLoadingGroups 
  } = useQuery<Group[]>({
    queryKey: ['/api/profesor/grupos-asignados'],
    enabled: !!user?.id && user?.rol === "docente",
  });

  // Mutación para generar recomendaciones
  const generateRecommendationsMutation = useMutation({
    mutationFn: async (groupId: number) => {
      // Guardar el ID del grupo antes de enviar la petición para conservarlo
      console.log("Generando recomendaciones para grupo ID:", groupId);
      
      const response = await apiRequest('POST', '/api/teacher-assistant/recommendations', {
        teacherId: user?.profesorId,
        groupId
      });
      const result = await response.json() as RecommendationResponse;
      
      return {
        result,
        groupId // Mantener el ID del grupo en la respuesta
      };
    },
    onSuccess: (data) => {
      const { result, groupId } = data;
      console.log(`Recomendaciones generadas para grupo ${groupId}`);
      
      if (result.success && result.result) {
        console.log("Nueva recomendación generada:", typeof result.result);
        console.log("Contenido recibido:", result.result);
        
        // Forzar actualización de la caché de React Query
        queryClient.invalidateQueries({
          queryKey: ['/api/teacher-assistant/recommendations', groupId.toString()]
        });
        
        // Actualizar el estado con el nuevo resultado directamente
        setRecommendationsResult(result.result);
        
        // Limpiar primero el estado de aiGeneratedContent para forzar re-render
        setAiGeneratedContent(null);
        
        // Luego asignar el nuevo contenido
        setTimeout(() => {
          if (result.result && typeof result.result === 'string') {
            setAiGeneratedContent(result.result);
          } else if (result.result && typeof result.result === 'object') {
            // Si el resultado es un objeto, lo convertimos a string para mostrarlo
            const jsonString = JSON.stringify(result.result);
            setAiGeneratedContent(jsonString);
          }
        }, 50); // Pequeño timeout para asegurar el ciclo de renderizado
        
        // Asegurarnos que el selectedGroup esté actualizado usando el método persistente
        if (!selectedGroup || selectedGroup !== groupId.toString()) {
          console.log("Restaurando selección de grupo en onSuccess:", groupId);
          persistSelectedGroup(groupId.toString());
        }
        
        toast({
          title: "Recomendaciones generadas",
          description: "Las recomendaciones pedagógicas se han generado exitosamente.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudieron generar las recomendaciones.",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      console.error("Error al generar recomendaciones:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al generar las recomendaciones. Intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  // Consulta para obtener recomendaciones existentes (si las hay)
  const { 
    data: existingRecommendations,
    isLoading: isLoadingRecommendations,
    refetch: refetchRecommendations
  } = useQuery({
    queryKey: ['/api/teacher-assistant/recommendations', selectedGroup],
    queryFn: async () => {
      if (!selectedGroup) return null;
      try {
        console.log("Consultando recomendaciones para grupo:", selectedGroup);
        // Guardamos el grupo seleccionado en localStorage y useRef como medida adicional de seguridad
        lastSelectedGroupRef.current = selectedGroup;
        localStorage.setItem(STORAGE_KEYS.SELECTED_GROUP, selectedGroup);
        
        const response = await apiRequest('GET', '/api/teacher-assistant/recommendations');
        const data = await response.json() as RecommendationResponse;
        if (data.success && data.result) {
          console.log("Recomendaciones existentes obtenidas:", data.result);
          // No modificamos el estado directamente aquí, lo haremos en el efecto
          return data.result;
        }
        console.log("No hay recomendaciones existentes");
        return null;
      } catch (error) {
        console.error("Error al obtener recomendaciones existentes:", error);
        return null;
      }
    },
    enabled: !!selectedGroup,
    staleTime: 30000 // 30 segundos para evitar refetches innecesarios
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

  // Efecto para actualizar recomendaciones cuando cambia el grupo seleccionado o se reciben nuevas recomendaciones
  useEffect(() => {
    console.log("Efecto de actualización ejecutado, existingRecommendations:", existingRecommendations);
    
    // Limpiar el estado para forzar el re-renderizado
    setRecommendationsResult(undefined);
    
    // Pequeño timeout para asegurar que el estado se resetea antes de asignar el nuevo valor
    setTimeout(() => {
      if (existingRecommendations) {
        console.log("Actualizando recommendationsResult con:", existingRecommendations);
        setRecommendationsResult(existingRecommendations);
        
        // Actualizar también aiGeneratedContent si es necesario
        if (typeof existingRecommendations === 'string') {
          setAiGeneratedContent(existingRecommendations);
        } else if (typeof existingRecommendations === 'object') {
          try {
            // Procesar directamente el objeto JSON para las tarjetas
            const jsonContent = processJSONContent(existingRecommendations);
            console.log("Objeto JSON procesado para tarjetas:", jsonContent);
            
            // Luego guardamos la versión string para otros usos
            const jsonString = JSON.stringify(existingRecommendations);
            setAiGeneratedContent(jsonString);
          } catch (error) {
            console.error("Error procesando JSON para mostrar:", error);
            // En caso de error, guardar como string
            const jsonString = JSON.stringify(existingRecommendations);
            setAiGeneratedContent(jsonString);
          }
        }
      }
    }, 50);
  }, [existingRecommendations]);
  
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

  // Estado para rastrear si está generando recomendaciones (para mostrar loader sin perder grupo seleccionado)
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false);

  // Guardamos el ID del grupo en una referencia para evitar que se pierda durante recargas
  const lastSelectedGroupRef = useRef<string | null>(null);
  
  // Función para generar recomendaciones
  const handleGenerateRecommendations = () => {
    if (!selectedGroup) {
      toast({
        title: "Seleccione un grupo",
        description: "Por favor seleccione un grupo para generar recomendaciones.",
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
    
    // Indicar al usuario que estamos generando nuevas recomendaciones
    toast({
      title: "Generando recomendaciones",
      description: "Esto puede tomar unos segundos. La página se actualizará automáticamente cuando estén listas.",
    });

    // Marcar que estamos generando recomendaciones (para mostrar indicadores de carga)
    setIsGeneratingRecommendations(true);
    
    // Llamar a la mutación para generar nuevas recomendaciones, enviando el ID del grupo seleccionado
    generateRecommendationsMutation.mutate(parseInt(selectedGroup), {
      onSuccess: (data) => {
        const { result, groupId } = data;
        // Restaurar el grupo seleccionado siempre para asegurar consistencia
        console.log("Asegurando persistencia de grupo después de éxito:", groupId);
        persistSelectedGroup(groupId.toString());
        
        // Forzar una invalidación de la consulta para obtener los datos más recientes
        queryClient.invalidateQueries({
          queryKey: ['/api/teacher-assistant/recommendations']
        });
        
        // Refetch inmediato para obtener los datos más recientes
        refetchRecommendations();
      },
      onSettled: () => {
        // Marcar como terminado cuando finalice (ya sea con éxito o error)
        setIsGeneratingRecommendations(false);
        
        // Siempre verificar y restaurar el grupo seleccionado usando localStorage y ref
        const savedGroupId = localStorage.getItem(STORAGE_KEYS.SELECTED_GROUP) || lastSelectedGroupRef.current;
        if (savedGroupId) {
          console.log("Restaurando selección de grupo después de completar:", savedGroupId);
          persistSelectedGroup(savedGroupId);
        }
      }
    });
  };

  // Función para descargar las recomendaciones como PDF
  const handleDownloadPDF = async () => {
    if (!recommendationsResult) return;
    
    try {
      // Obtener datos para personalizar el PDF
      const teacherName = user?.nombreCompleto || 'Docente';
      const selectedGroupObj = groups.find((g: Group) => g.id === parseInt(selectedGroup));
      const groupName = selectedGroupObj ? selectedGroupObj.nombre : 'Grupo';
      
      // Preparar el contenido para el PDF basado en el tipo de datos que recibimos
      let contentForPDF: string;
      
      if (typeof recommendationsResult === 'string') {
        // Si es un string, usarlo directamente
        contentForPDF = recommendationsResult;
      } else {
        // Si es un objeto JSON, convertirlo a un formato de texto estructurado
        try {
          // Construir un texto con formato para el PDF
          const sections = [];
          
          // Sección para recomendaciones generales
          if (
            (recommendationsResult.recomendaciones && recommendationsResult.recomendaciones.estrategiasGenerales) || 
            recommendationsResult.estrategiasGenerales
          ) {
            const estrategias = recommendationsResult.recomendaciones?.estrategiasGenerales || 
                               recommendationsResult.estrategiasGenerales;
            
            sections.push("# Recomendaciones Generales\n");
            if (Array.isArray(estrategias)) {
              sections.push(estrategias.map(e => `- ${e}`).join("\n"));
            } else if (typeof estrategias === 'string') {
              sections.push(estrategias);
            }
            sections.push("\n\n");
          }
          
          // Sección para materiales de apoyo
          if (
            (recommendationsResult.recomendaciones && recommendationsResult.recomendaciones.materialApoyo) || 
            recommendationsResult.recursosRecomendados
          ) {
            const recursos = recommendationsResult.recomendaciones?.materialApoyo || 
                           recommendationsResult.recursosRecomendados;
            
            sections.push("# Recursos y Materiales Recomendados\n");
            if (Array.isArray(recursos)) {
              sections.push(recursos.map(r => `- ${r}`).join("\n"));
            } else if (typeof recursos === 'string') {
              sections.push(recursos);
            }
            sections.push("\n\n");
          }
          
          // Sección para estudiantes críticos
          if (
            (recommendationsResult.estudiantes && recommendationsResult.estudiantes.criticos) || 
            recommendationsResult.estudiantesCriticos
          ) {
            const estudiantes = recommendationsResult.estudiantes?.criticos || 
                              recommendationsResult.estudiantesCriticos;
            
            sections.push("# Estudiantes Críticos\n");
            if (Array.isArray(estudiantes)) {
              sections.push(estudiantes.map(e => `- ${e}`).join("\n"));
            } else if (typeof estudiantes === 'string') {
              sections.push(estudiantes);
            }
            sections.push("\n\n");
          }
          
          // Sección para estudiantes en riesgo
          if (
            (recommendationsResult.estudiantes && recommendationsResult.estudiantes.riesgo) || 
            recommendationsResult.estudiantesRiesgo
          ) {
            const estudiantes = recommendationsResult.estudiantes?.riesgo || 
                              recommendationsResult.estudiantesRiesgo;
            
            sections.push("# Estudiantes en Riesgo\n");
            if (Array.isArray(estudiantes)) {
              sections.push(estudiantes.map(e => `- ${e}`).join("\n"));
            } else if (typeof estudiantes === 'string') {
              sections.push(estudiantes);
            }
            sections.push("\n\n");
          }
          
          // Sección para estudiantes destacados
          if (
            (recommendationsResult.estudiantes && recommendationsResult.estudiantes.destacados) || 
            recommendationsResult.estudiantesDestacados
          ) {
            const estudiantes = recommendationsResult.estudiantes?.destacados || 
                              recommendationsResult.estudiantesDestacados;
            
            sections.push("# Estudiantes con Buen Desempeño\n");
            if (Array.isArray(estudiantes)) {
              sections.push(estudiantes.map(e => `- ${e}`).join("\n"));
            } else if (typeof estudiantes === 'string') {
              sections.push(estudiantes);
            }
            sections.push("\n\n");
          }
          
          // Sección de conclusión
          if (recommendationsResult.conclusion) {
            sections.push("# Conclusión\n");
            if (typeof recommendationsResult.conclusion === 'string') {
              sections.push(recommendationsResult.conclusion);
            } else if (Array.isArray(recommendationsResult.conclusion)) {
              sections.push(recommendationsResult.conclusion.join("\n"));
            }
          }
          
          // Unir todas las secciones
          contentForPDF = sections.join("");
          
          // Si no pudimos extraer nada, usar un mensaje genérico
          if (!contentForPDF.trim()) {
            contentForPDF = "No se pudieron extraer recomendaciones estructuradas de los datos.";
          }
          
        } catch (jsonError) {
          console.error("Error al procesar JSON para PDF:", jsonError);
          contentForPDF = "Error al procesar las recomendaciones para formato PDF.";
        }
      }
      
      // Generar el PDF con formato profesional
      const pdf = generateRecommendationsFromText(
        contentForPDF,
        teacherName,
        groupName
      );
      
      // Guardar el PDF con nombre personalizado
      pdf.save(`recomendaciones-${groupName.toLowerCase()}-${teacherName.split(' ')[0].toLowerCase()}.pdf`);
      
      toast({
        title: "PDF generado con éxito",
        description: "Las Recomendaciones Académicas se han guardado como PDF con formato profesional.",
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

  // Función para parsear el texto de IA y extraer secciones
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
      estrategias: {
        title: "Estrategias de Enseñanza",
        regex: /(?:Estrategias de enseñanza|Estrategias pedagógicas|Estrategias generales|Enfoques pedagógicos)[:\s]*([\s\S]*?)(?=\n\s*\n\s*[A-Z#]|$)/i,
        icon: <Lightbulb className="h-5 w-5 text-primary" />
      },
      recursos: {
        title: "Recursos y Materiales",
        regex: /(?:Recursos recomendados|Materiales de apoyo|Recursos didácticos|Herramientas recomendadas)[:\s]*([\s\S]*?)(?=\n\s*\n\s*[A-Z#]|$)/i,
        icon: <BookOpen className="h-5 w-5 text-primary" />
      },
      evaluacion: {
        title: "Métodos de Evaluación",
        regex: /(?:Métodos de evaluación|Estrategias de evaluación|Evaluación del aprendizaje|Técnicas de evaluación)[:\s]*([\s\S]*?)(?=\n\s*\n\s*[A-Z#]|$)/i,
        icon: <Award className="h-5 w-5 text-primary" />
      },
      riesgo: {
        title: "Atención a Estudiantes en Riesgo",
        regex: /(?:Atención a estudiantes en riesgo|Estrategias para estudiantes en dificultad|Apoyo para estudiantes|Intervención temprana)[:\s]*([\s\S]*?)(?=\n\s*\n\s*[A-Z#]|$)/i,
        icon: <AlertTriangle className="h-5 w-5 text-amber-500" />
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
        title: "Recomendaciones Pedagógicas",
        icon: <Lightbulb className="h-5 w-5 text-primary" />,
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
        estrategias: {
          title: "Estrategias de Enseñanza",
          content: ["No hay recomendaciones disponibles"],
          icon: <Lightbulb className="h-5 w-5 text-primary" />
        }
      };
    }
    
    // Resultados estructurados para mostrar en tarjetas
    const result: {[key: string]: {title: string, content: string[] | any[], icon: React.ReactNode}} = {};
    
    try {
      // Analizar la estructura principal del objeto
      console.log("Estructura principal:", Object.keys(data));
      
      // Si hay un objeto 'recomendaciones', analizar su estructura
      if (data.recomendaciones) {
        console.log("Objeto recomendaciones:", Object.keys(data.recomendaciones));
      }
      
      // Procesar estrategias generales
      console.log("Procesando contenido en formato JSON para sección:", "estrategias", typeof data);
      
      // Verificar estructura para estrategias pedagógicas
      if (data.recomendaciones?.estrategiasGenerales) {
        const estrategias = data.recomendaciones.estrategiasGenerales;
        console.log("Estrategias encontradas en JSON:", estrategias);
        
        result.estrategias = {
          title: "Estrategias Pedagógicas",
          content: Array.isArray(estrategias.contenido) ? estrategias.contenido : 
                  Array.isArray(estrategias) ? estrategias : 
                  [typeof estrategias === 'string' ? estrategias : "No hay estrategias disponibles"],
          icon: <Lightbulb className="h-5 w-5 text-primary" />
        };
      } else if (data.estrategiasGenerales) {
        const estrategias = data.estrategiasGenerales;
        console.log("Estrategias generales encontradas en JSON:", estrategias);
        
        result.estrategias = {
          title: "Estrategias Pedagógicas",
          content: Array.isArray(estrategias.contenido) ? estrategias.contenido : 
                  Array.isArray(estrategias) ? estrategias : 
                  [typeof estrategias === 'string' ? estrategias : "No hay estrategias disponibles"],
          icon: <Lightbulb className="h-5 w-5 text-primary" />
        };
      }
      
      // Procesar recursos y materiales
      console.log("Procesando contenido en formato JSON para sección:", "recursos", typeof data);
      
      if (data.recomendaciones?.materialApoyo) {
        const recursos = data.recomendaciones.materialApoyo;
        console.log("Recursos encontrados en JSON:", recursos);
        
        result.recursos = {
          title: "Recursos y Materiales",
          content: Array.isArray(recursos.contenido) ? recursos.contenido : 
                  Array.isArray(recursos) ? recursos : 
                  [typeof recursos === 'string' ? recursos : "No hay recursos disponibles"],
          icon: <BookOpen className="h-5 w-5 text-primary" />
        };
      } else if (data.recursosRecomendados) {
        const recursos = data.recursosRecomendados;
        console.log("Recursos recomendados encontrados en JSON:", recursos);
        
        result.recursos = {
          title: "Recursos y Materiales",
          content: Array.isArray(recursos.contenido) ? recursos.contenido : 
                  Array.isArray(recursos) ? recursos : 
                  [typeof recursos === 'string' ? recursos : "No hay recursos disponibles"],
          icon: <BookOpen className="h-5 w-5 text-primary" />
        };
      } else if (data.materialApoyo) {
        const recursos = data.materialApoyo;
        console.log("Material de apoyo encontrado en JSON:", recursos);
        
        result.recursos = {
          title: "Recursos y Materiales",
          content: Array.isArray(recursos.contenido) ? recursos.contenido : 
                  Array.isArray(recursos) ? recursos : 
                  [typeof recursos === 'string' ? recursos : "No hay recursos disponibles"],
          icon: <BookOpen className="h-5 w-5 text-primary" />
        };
      }
      
      // Procesar estudiantes críticos (usar los de riesgo si no hay críticos específicos)
      console.log("Procesando contenido en formato JSON para sección:", "criticos", typeof data);
      
      if (data.estudiantes?.criticos) {
        console.log("Estudiantes críticos encontrados en JSON:", data.estudiantes.criticos);
        result.criticos = {
          title: "Estudiantes en Situación Crítica",
          content: Array.isArray(data.estudiantes.criticos.contenido) ? data.estudiantes.criticos.contenido : 
                  Array.isArray(data.estudiantes.criticos) ? data.estudiantes.criticos : 
                  [typeof data.estudiantes.criticos === 'string' ? data.estudiantes.criticos : "No hay estudiantes críticos identificados"],
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />
        };
      } else if (data.estudiantesCriticos) {
        console.log("Estudiantes críticos en raíz encontrados en JSON:", data.estudiantesCriticos);
        result.criticos = {
          title: "Estudiantes en Situación Crítica",
          content: Array.isArray(data.estudiantesCriticos.contenido) ? data.estudiantesCriticos.contenido : 
                  Array.isArray(data.estudiantesCriticos) ? data.estudiantesCriticos : 
                  [typeof data.estudiantesCriticos === 'string' ? data.estudiantesCriticos : "No hay estudiantes críticos identificados"],
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />
        };
      } else if (data.estudiantes?.riesgo || data.estudiantesRiesgo) {
        // Si no hay críticos específicos, usar los de riesgo
        const riesgo = data.estudiantes?.riesgo || data.estudiantesRiesgo;
        console.log("Usando estudiantes en riesgo como críticos:", riesgo);
        
        result.criticos = {
          title: "Estudiantes en Situación Crítica",
          content: Array.isArray(riesgo.contenido) ? riesgo.contenido : 
                  Array.isArray(riesgo) ? riesgo : 
                  [typeof riesgo === 'string' ? riesgo : "No hay estudiantes críticos identificados"],
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />
        };
      }
      
      // Procesar estudiantes en riesgo
      console.log("Procesando contenido en formato JSON para sección:", "riesgo", typeof data);
      
      if (data.estudiantes?.riesgo) {
        console.log("Estudiantes en riesgo encontrados en JSON:", data.estudiantes.riesgo);
        result.riesgo = {
          title: "Estudiantes en Riesgo",
          content: Array.isArray(data.estudiantes.riesgo.contenido) ? data.estudiantes.riesgo.contenido : 
                  Array.isArray(data.estudiantes.riesgo) ? data.estudiantes.riesgo : 
                  [typeof data.estudiantes.riesgo === 'string' ? data.estudiantes.riesgo : "No hay estudiantes en riesgo identificados"],
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />
        };
      } else if (data.estudiantesRiesgo) {
        console.log("Estudiantes en riesgo encontrados en JSON:", data.estudiantesRiesgo);
        result.riesgo = {
          title: "Estudiantes en Riesgo",
          content: Array.isArray(data.estudiantesRiesgo.contenido) ? data.estudiantesRiesgo.contenido : 
                  Array.isArray(data.estudiantesRiesgo) ? data.estudiantesRiesgo : 
                  [typeof data.estudiantesRiesgo === 'string' ? data.estudiantesRiesgo : "No hay estudiantes en riesgo identificados"],
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />
        };
      }
      
      // Procesar estudiantes destacados
      console.log("Procesando contenido en formato JSON para sección:", "destacados", typeof data);
      
      if (data.estudiantes?.destacados) {
        console.log("Estudiantes destacados encontrados en JSON:", data.estudiantes.destacados);
        result.destacados = {
          title: "Estudiantes Destacados",
          content: Array.isArray(data.estudiantes.destacados.contenido) ? data.estudiantes.destacados.contenido : 
                  Array.isArray(data.estudiantes.destacados) ? data.estudiantes.destacados : 
                  [typeof data.estudiantes.destacados === 'string' ? data.estudiantes.destacados : "No hay estudiantes destacados identificados"],
          icon: <Award className="h-5 w-5 text-primary" />
        };
      } else if (data.estudiantesDestacados) {
        console.log("Estudiantes destacados encontrados en JSON:", data.estudiantesDestacados);
        result.destacados = {
          title: "Estudiantes Destacados",
          content: Array.isArray(data.estudiantesDestacados.contenido) ? data.estudiantesDestacados.contenido : 
                  Array.isArray(data.estudiantesDestacados) ? data.estudiantesDestacados : 
                  [typeof data.estudiantesDestacados === 'string' ? data.estudiantesDestacados : "No hay estudiantes destacados identificados"],
          icon: <Award className="h-5 w-5 text-primary" />
        };
      }
      
      // Procesar conclusión o reflexión final
      console.log("Procesando contenido en formato JSON para sección:", "conclusion", typeof data);
      
      if (data.conclusion) {
        console.log("Conclusión encontrada en JSON:", data.conclusion);
        result.conclusion = {
          title: "Conclusión y Reflexión",
          content: Array.isArray(data.conclusion) ? data.conclusion : [data.conclusion],
          icon: <Brain className="h-5 w-5 text-primary" />
        };
      }
    } catch (error) {
      console.error("Error procesando contenido JSON:", error);
    }
    
    // Si no encontramos nada, crear un resultado predeterminado
    if (Object.keys(result).length === 0) {
      result.general = {
        title: "Recomendaciones Generales",
        content: ["No se pudieron extraer recomendaciones específicas del formato JSON proporcionado."],
        icon: <Lightbulb className="h-5 w-5 text-primary" />
      };
    }
    
    return result;
  };

  // Función para extraer secciones específicas de las recomendaciones
  const extractSection = (content: any, section: string): string => {
    // Si no hay contenido, devolvemos vacío
    if (!content) return "";
    
    // Si content es un objeto JSON, intentamos extraer directamente las secciones
    if (typeof content !== 'string') {
      try {
        console.log("Procesando contenido en formato JSON para sección:", section, typeof content);
        
        // Si el contenido es objeto con propiedad result, trabajamos con esa propiedad
        const dataObj = content.result || content;
        console.log("Estructura principal:", Object.keys(dataObj));
        
        // Si tenemos un objeto recomendaciones, vamos a explorarlo más profundo
        if (dataObj.recomendaciones) {
          console.log("Objeto recomendaciones:", Object.keys(dataObj.recomendaciones));

          // Estructura específica para cada categoría
          switch (section) {
            case "criticos":
              // Para estudiantes críticos - Buscar en el JSON
              if (dataObj.recomendaciones.estudiantesCriticos?.contenido) {
                const critical = dataObj.recomendaciones.estudiantesCriticos.contenido;
                console.log("Estudiantes críticos encontrados en JSON:", critical);
                if (Array.isArray(critical)) {
                  return critical.join("\n• ");
                }
              }
              // Si no encontramos datos, usamos la estructura estándar de estudiantes en riesgo
              if (dataObj.recomendaciones.estudiantesRiesgo?.contenido) {
                // Filtramos los primeros 3 elementos como críticos
                const riskContent = dataObj.recomendaciones.estudiantesRiesgo.contenido;
                if (Array.isArray(riskContent) && riskContent.length > 0) {
                  // Tomamos los primeros 3 como críticos
                  const critical = riskContent.slice(0, 3);
                  console.log("Usando estudiantes en riesgo como críticos:", critical);
                  return critical.join("\n• ");
                }
              }
              return "No se encontraron estudiantes en situación crítica.";
            
            case "riesgo":
              // Para estudiantes en riesgo - Buscar en el JSON
              if (dataObj.recomendaciones.estudiantesRiesgo?.contenido) {
                const risk = dataObj.recomendaciones.estudiantesRiesgo.contenido;
                console.log("Estudiantes en riesgo encontrados en JSON:", risk);
                if (Array.isArray(risk)) {
                  // Si tenemos muchos, mostramos desde el 4to para no duplicar con críticos
                  return risk.length > 3 ? risk.slice(3).join("\n• ") : risk.join("\n• ");
                }
              }
              return "No se encontraron estudiantes en situación de riesgo.";
            
            case "destacados":
              // Para estudiantes destacados - Buscar en el JSON
              if (dataObj.recomendaciones.estudiantesDestacados?.contenido) {
                const outstanding = dataObj.recomendaciones.estudiantesDestacados.contenido;
                console.log("Estudiantes destacados encontrados en JSON:", outstanding);
                if (Array.isArray(outstanding)) {
                  return outstanding.join("\n• ");
                }
              }
              // Si no hay destacados, generamos algunos basados en estrategias
              if (dataObj.recomendaciones.estrategiasGenerales?.contenido) {
                const strategies = dataObj.recomendaciones.estrategiasGenerales.contenido;
                if (Array.isArray(strategies) && strategies.length > 0) {
                  // Utilizamos las estrategias para sugerir destacar a estos estudiantes
                  return "No se identificaron estudiantes destacados. Se recomienda identificar y reconocer a estudiantes que muestren mejoras consistentes.";
                }
              }
              return "No se encontraron estudiantes destacados.";
            
            case "conclusion":
              // Para conclusión, intentamos buscar estrategias generales o recomendaciones generales
              if (dataObj.recomendaciones.estrategiasGenerales?.titulo) {
                // Si hay un título, lo usamos como parte de la conclusión
                const titulo = dataObj.recomendaciones.estrategiasGenerales.titulo;
                const contenido = dataObj.recomendaciones.estrategiasGenerales.contenido;
                
                if (Array.isArray(contenido) && contenido.length > 0) {
                  // Tomamos los primeros elementos como conclusión
                  return `${titulo}: ${contenido.slice(0, 3).join(". ")}.`;
                }
                
                return titulo;
              }
              
              // Si no encontramos estrategias, usamos una conclusión genérica basada en los datos del grupo
              if (dataObj.resumenEstadistico) {
                const stats = dataObj.resumenEstadistico;
                return `Conclusión: El grupo ${dataObj.grupoNombre} cuenta con ${stats.totalEstudiantes} estudiantes, de los cuales ${stats.estudiantesEnRiesgo} requieren atención prioritaria. El porcentaje de asistencia es de ${stats.porcentajeAsistencia}%. Se recomienda implementar estrategias de seguimiento personalizado para mejorar el rendimiento general del grupo.`;
              }
              
              // Si no hay datos suficientes, usamos una conclusión genérica
              return "Conclusión general: Se recomienda atención personalizada para los estudiantes críticos y en riesgo, mientras se fomenta el desarrollo continuo de los estudiantes destacados.";
            
            default:
              // Para secciones generales, devolver un extracto de las estrategias
              if (dataObj.recomendaciones.estrategiasGenerales?.contenido) {
                const estrategias = dataObj.recomendaciones.estrategiasGenerales.contenido;
                return Array.isArray(estrategias) 
                  ? estrategias.join("\n• ")
                  : estrategias.toString();
              }
              
              if (dataObj.recomendaciones.materialApoyo?.contenido) {
                const materiales = dataObj.recomendaciones.materialApoyo.contenido;
                return Array.isArray(materiales) 
                  ? materiales.join("\n• ")
                  : materiales.toString();
              }
              
              return "";
          }
        }
        
        // Si no pudimos encontrar una estructura específica, intentar con la estructura anterior
        switch (section) {
          case "criticos":
            // Verificamos múltiples caminos posibles para estudiantes críticos
            let criticalStudents: string[] = [];
            
            // Estructura: estudiantes.criticos
            if (dataObj.estudiantes?.criticos) {
              const items = Array.isArray(dataObj.estudiantes.criticos) 
                ? dataObj.estudiantes.criticos 
                : [dataObj.estudiantes.criticos];
              criticalStudents = items.filter(item => typeof item === 'string');
            }
            
            // Estructura: estudiantesCriticos
            if (criticalStudents.length === 0 && dataObj.estudiantesCriticos) {
              const items = Array.isArray(dataObj.estudiantesCriticos) 
                ? dataObj.estudiantesCriticos 
                : [dataObj.estudiantesCriticos];
              criticalStudents = items.filter(item => typeof item === 'string');
            }
            
            // Estructura alternativa: seccionesCriticas
            if (criticalStudents.length === 0 && dataObj.seccionesCriticas) {
              criticalStudents = Array.isArray(dataObj.seccionesCriticas) 
                ? dataObj.seccionesCriticas.filter(item => typeof item === 'string')
                : [dataObj.seccionesCriticas].filter(item => typeof item === 'string');
            }
            
            console.log("Estudiantes críticos encontrados original:", criticalStudents.length, criticalStudents);
            return criticalStudents.join("\n• ");
            
          case "riesgo":
            // Verificamos múltiples caminos posibles para estudiantes en riesgo
            let riskStudents: string[] = [];
            
            // Estructura: estudiantes.riesgo
            if (dataObj.estudiantes?.riesgo) {
              const items = Array.isArray(dataObj.estudiantes.riesgo) 
                ? dataObj.estudiantes.riesgo 
                : [dataObj.estudiantes.riesgo];
              riskStudents = items.filter(item => typeof item === 'string');
            }
            
            // Estructura: estudiantesRiesgo
            if (riskStudents.length === 0 && dataObj.estudiantesRiesgo) {
              const items = Array.isArray(dataObj.estudiantesRiesgo) 
                ? dataObj.estudiantesRiesgo 
                : [dataObj.estudiantesRiesgo];
              riskStudents = items.filter(item => typeof item === 'string');
            }
            
            // Estructura alternativa: seccionesRiesgo
            if (riskStudents.length === 0 && dataObj.seccionesRiesgo) {
              riskStudents = Array.isArray(dataObj.seccionesRiesgo) 
                ? dataObj.seccionesRiesgo.filter(item => typeof item === 'string')
                : [dataObj.seccionesRiesgo].filter(item => typeof item === 'string');
            }
            
            console.log("Estudiantes en riesgo encontrados original:", riskStudents.length, riskStudents);
            return riskStudents.join("\n• ");
            
          case "destacados":
            // Verificamos múltiples caminos posibles para estudiantes destacados
            let goodStudents: string[] = [];
            
            // Estructura: estudiantes.destacados
            if (dataObj.estudiantes?.destacados) {
              const items = Array.isArray(dataObj.estudiantes.destacados) 
                ? dataObj.estudiantes.destacados 
                : [dataObj.estudiantes.destacados];
              goodStudents = items.filter(item => typeof item === 'string');
            }
            
            // Estructura: estudiantesDestacados
            if (goodStudents.length === 0 && dataObj.estudiantesDestacados) {
              const items = Array.isArray(dataObj.estudiantesDestacados) 
                ? dataObj.estudiantesDestacados 
                : [dataObj.estudiantesDestacados];
              goodStudents = items.filter(item => typeof item === 'string');
            }
            
            // Estructura alternativa: seccionesDestacadas
            if (goodStudents.length === 0 && dataObj.seccionesDestacadas) {
              goodStudents = Array.isArray(dataObj.seccionesDestacadas) 
                ? dataObj.seccionesDestacadas.filter(item => typeof item === 'string')
                : [dataObj.seccionesDestacadas].filter(item => typeof item === 'string');
            }
            
            console.log("Estudiantes destacados encontrados original:", goodStudents.length, goodStudents);
            return goodStudents.join("\n• ");
            
          case "conclusion":
            if (dataObj.conclusion) {
              const conclusion = typeof dataObj.conclusion === 'string' 
                ? dataObj.conclusion 
                : Array.isArray(dataObj.conclusion) 
                  ? dataObj.conclusion.join("\n") 
                  : "";
              console.log("Conclusión encontrada:", conclusion ? "Sí" : "No");
              return conclusion;
            }
            return "";
            
          default:
            return "";
        }
      } catch (error) {
        console.error("Error al procesar JSON en extractSection:", error);
        return "Error al procesar la información. Por favor, regenere las recomendaciones.";
      }
    }
    
    // Procesamiento original con regex para strings
    console.log("Procesando contenido en formato texto", section);
    let sectionPattern;
    
    switch (section) {
      case "criticos":
        sectionPattern = /(?:Estudiantes Críticos|Bajo Rendimiento|Situación Crítica)[:\s]*([\s\S]*?)(?=Estudiantes en Riesgo|En Riesgo|$)/i;
        break;
      case "riesgo":
        sectionPattern = /(?:Estudiantes en Riesgo|En Riesgo)[:\s]*([\s\S]*?)(?=Estudiantes con Buen Desempeño|Buen Desempeño|$)/i;
        break;
      case "destacados":
        sectionPattern = /(?:Estudiantes con Buen Desempeño|Buen Desempeño)[:\s]*([\s\S]*?)(?=Conclusión|$)/i;
        break;
      case "conclusion":
        sectionPattern = /(?:Conclusión)[:\s]*([\s\S]*?)$/i;
        break;
      default:
        return content;
    }
    
    const match = content.match(sectionPattern);
    return match && match[1] ? match[1].trim() : "";
  };

  // Formatear texto para mostrar en HTML con validación robusta
  const formatText = (text: string | any) => {
    // Si es una matriz, usarla directamente
    if (Array.isArray(text)) {
      // Si la matriz está vacía, mostrar mensaje por defecto
      if (text.length === 0) {
        return [
          <div key="empty" className="flex items-start space-x-2 mb-2">
            <div className="flex-shrink-0 mt-1 text-muted-foreground">•</div>
            <p className="flex-1 text-muted-foreground">No hay información disponible</p>
          </div>
        ];
      }
      
      // Procesar cada elemento de la matriz
      return text.map((point, index) => {
        // Validar que el punto sea una cadena
        if (typeof point !== 'string') {
          return (
            <div key={index} className="flex items-start space-x-2 mb-2">
              <div className="flex-shrink-0 mt-1 text-muted-foreground">•</div>
              <p className="flex-1 text-muted-foreground">Contenido no disponible</p>
            </div>
          );
        }
        
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
    }
    
    // Si no es una cadena válida, devolver mensaje por defecto
    if (!text || typeof text !== 'string') {
      return [
        <div key="empty" className="flex items-start space-x-2 mb-2">
          <div className="flex-shrink-0 mt-1 text-muted-foreground">•</div>
          <p className="flex-1 text-muted-foreground">No hay información disponible</p>
        </div>
      ];
    }
    
    // Dividir por líneas y filtrar líneas vacías
    const bulletPoints = text.split(/\n/).filter(line => line && line.trim() !== '');
    
    // Si no hay puntos después de filtrar, mostrar mensaje por defecto
    if (bulletPoints.length === 0) {
      return [
        <div key="empty" className="flex items-start space-x-2 mb-2">
          <div className="flex-shrink-0 mt-1 text-muted-foreground">•</div>
          <p className="flex-1 text-muted-foreground">No hay información disponible</p>
        </div>
      ];
    }
    
    // Procesar cada punto
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

  // Determinar si hay contenido en cada categoría
  // Forzar a true para que todas las pestañas estén activas
  const hasCriticalContent = true;
  const hasRiskContent = true;
  const hasGoodContent = true;
  const hasConclusion = recommendationsResult && extractSection(recommendationsResult, "conclusion").trim() !== "";

  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Recomendaciones Académicas</h1>
          <p className="text-muted-foreground">
            Visualice y genere recomendaciones personalizadas para mejorar el desempeño académico de sus grupos.
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
            onClick={handleGenerateRecommendations}
            disabled={!selectedGroup || isGeneratingRecommendations || generateRecommendationsMutation.isPending}
            className="flex items-center gap-2"
          >
            {(isGeneratingRecommendations || generateRecommendationsMutation.isPending) ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4" />
                Generar Recomendaciones
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
            Para ver o generar recomendaciones académicas, primero debe seleccionar un grupo.
          </AlertDescription>
        </Alert>
      )}
      
      {selectedGroup && (
        <>
          {/* Mostrar resumen de estadísticas del grupo */}
          {selectedGroupObj && (
            <GroupStatsSummary 
              stats={groupStats} 
              isLoading={isLoadingGroupStats} 
              groupName={selectedGroupObj.nombre}
            />
          )}
        </>
      )}

      {selectedGroup && (isGeneratingRecommendations || generateRecommendationsMutation.isPending) && (
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed p-8 text-center my-6">
            <RefreshCw className="mx-auto h-10 w-10 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold">Generando recomendaciones</h3>
            <p className="mb-4 text-sm text-muted-foreground max-w-md mx-auto">
              El asistente está analizando los datos académicos para el grupo {selectedGroupObj?.nombre}.
            </p>
            <p className="text-sm text-muted-foreground">
              Este proceso puede tomar unos segundos...
            </p>
          </div>
        </div>
      )}

      {selectedGroup && aiGeneratedContent ? (
        /* Visualización del contenido generado por IA en tiempo real */
        <div className="mt-6 space-y-6">
          <div className="bg-blue-50 px-4 py-3 rounded-lg border border-blue-200 mb-6">
            <p className="text-sm text-blue-800 font-medium flex items-center">
              <Brain className="mr-2 h-4 w-4" />
              Recomendaciones pedagógicas generadas por el asistente de IA
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(() => {
              let contentToProcess = aiGeneratedContent;
              let processedContent;
              
              // Detectar si el contenido es un objeto JSON o string
              if (typeof contentToProcess === 'string' && contentToProcess.startsWith('{') && contentToProcess.endsWith('}')) {
                try {
                  // Intentar analizar como JSON si es un string que parece JSON
                  const jsonData = JSON.parse(contentToProcess);
                  console.log("Contenido detectado como JSON string, procesando...");
                  processedContent = processJSONContent(jsonData);
                } catch (error) {
                  // Si falla el análisis JSON, procesar como texto
                  console.log("Error procesando como JSON, usando parseAIContent");
                  processedContent = parseAIContent(contentToProcess);
                }
              } else if (typeof contentToProcess === 'string') {
                // Procesar texto plano
                console.log("Contenido detectado como texto plano, procesando con parseAIContent");
                processedContent = parseAIContent(contentToProcess);
              } else if (typeof contentToProcess === 'object' && contentToProcess !== null) {
                // Procesar objeto JSON directo
                console.log("Contenido detectado como objeto JSON directo, procesando con processJSONContent");
                processedContent = processJSONContent(contentToProcess);
              } else {
                // Fallback si no podemos determinar el tipo
                console.log("Tipo de contenido no reconocido, intentando parseAIContent como fallback");
                processedContent = parseAIContent(String(contentToProcess));
              }
              
              // Renderizar las tarjetas con el contenido procesado
              return Object.entries(processedContent).map(([key, section]) => {
                // Validar que section y section.content sean válidos
                if (!section || !Array.isArray(section.content) || section.content.length === 0) {
                  return null;
                }
                
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
                        <span className="ml-2">{section.title || 'Recomendación'}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-2">
                        {displayedContent.map((item, index) => (
                          <li key={index} className="text-sm border-l-2 border-primary pl-3 py-1 bg-white rounded shadow-sm">
                            {typeof item === 'string' ? item : 'Contenido no disponible'}
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
              });
            })()}
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button onClick={handleGenerateRecommendations} variant="outline" className="mr-2">
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerar Recomendaciones
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
      ) : selectedGroup && recommendationsResult && (
        <div className="space-y-4" ref={contentRef}>
          <Tabs defaultValue="todos" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList className="grid grid-cols-4 w-auto">
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="criticos" 
                  disabled={!hasCriticalContent}
                  className="flex items-center gap-1"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  Críticos
                </TabsTrigger>
                <TabsTrigger value="riesgo" 
                  disabled={!hasRiskContent}
                  className="flex items-center gap-1"
                >
                  <Users className="h-3.5 w-3.5 text-amber-500" />
                  En Riesgo
                </TabsTrigger>
                <TabsTrigger value="destacados" 
                  disabled={!hasGoodContent}
                  className="flex items-center gap-1"
                >
                  <Award className="h-3.5 w-3.5 text-green-500" />
                  Destacados
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
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Recomendaciones Académicas Personalizadas
                </CardTitle>
                <CardDescription>
                  Estrategias y sugerencias para mejorar el desempeño de sus estudiantes
                </CardDescription>
                <Separator />
              </CardHeader>

              <CardContent>
                <ScrollArea className="h-[450px] pr-4">
                  <TabsContent value="todos" className="space-y-6 mt-0">
                    {hasCriticalContent && (
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-red-600">
                          <AlertTriangle className="h-5 w-5" />
                          Estudiantes Críticos
                        </h3>
                        <Card className="bg-red-50 border-red-200">
                          <CardContent className="p-4">
                            {formatText(extractSection(recommendationsResult, "criticos"))}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {hasRiskContent && (
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-amber-600">
                          <Users className="h-5 w-5" />
                          Estudiantes en Riesgo
                        </h3>
                        <Card className="bg-amber-50 border-amber-200">
                          <CardContent className="p-4">
                            {formatText(extractSection(recommendationsResult, "riesgo"))}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {hasGoodContent && (
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2 text-green-600">
                          <Award className="h-5 w-5" />
                          Estudiantes con Buen Desempeño
                        </h3>
                        <Card className="bg-green-50 border-green-200">
                          <CardContent className="p-4">
                            {formatText(extractSection(recommendationsResult, "destacados"))}
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {hasConclusion && (
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                          <BookOpen className="h-5 w-5" />
                          Conclusión
                        </h3>
                        <Card>
                          <CardContent className="p-4">
                            <p className="italic text-muted-foreground">
                              {extractSection(recommendationsResult, "conclusion")}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="criticos" className="mt-0">
                    <div>
                      <Badge variant="destructive" className="mb-3">Atención Prioritaria</Badge>
                      <Card className="bg-red-50 border-red-200">
                        <CardContent className="p-4">
                          {formatText(extractSection(recommendationsResult, "criticos"))}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="riesgo" className="mt-0">
                    <div>
                      <Badge variant="outline" className="mb-3 bg-amber-100 text-amber-800 hover:bg-amber-100">Requiere Seguimiento</Badge>
                      <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4">
                          {formatText(extractSection(recommendationsResult, "riesgo"))}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="destacados" className="mt-0">
                    <div>
                      <Badge variant="outline" className="mb-3 bg-green-100 text-green-800 hover:bg-green-100">Potenciar Habilidades</Badge>
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          {formatText(extractSection(recommendationsResult, "destacados"))}
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
                  onClick={() => location[1]('/profesor/plan-recuperacion')}
                >
                  <FileText className="h-4 w-4" />
                  Ver Plan de Recuperación
                </Button>
              </CardFooter>
            </Card>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default RecomendacionesPage;