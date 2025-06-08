import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  BookMarked, 
  Sparkles, 
  BarChart3, 
  FileDown, 
  RefreshCw, 
  Lightbulb,
  Users,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { GroupStatsSummary } from "@/components/teacher/GroupStatsSummary";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { generateTeacherRecommendationsPDF } from "@/services/recommendations-pdf";

interface Group {
  id: number;
  nombre: string;
  nivel: string;
}

interface GroupStats {
  total: number;
  promedio: number;
  asistencia: number;
  pasRate: number;
  riesgo: number;
}

// Interfaz para la respuesta del endpoint de recomendaciones
interface RecommendationsResponse {
  success: boolean;
  format: 'json' | 'text';
  result: any;
  error?: string;
}

interface RecommendationSection {
  titulo: string;
  contenido: string[];
  prioridad?: "alta" | "media" | "baja";
}

interface TeacherRecommendation {
  fechaGeneracion: string;
  grupoId: number;
  grupoNombre: string;
  profesorNombre: string;
  nivel: string;
  resumenEstadistico: {
    promedioGeneral: number;
    porcentajeAsistencia: number;
    porcentajeAprobacion: number;
    estudiantesEnRiesgo: number;
    totalEstudiantes: number;
  };
  recomendaciones: {
    estrategiasGenerales: RecommendationSection;
    materialApoyo: RecommendationSection;
    estudiantesRiesgo: RecommendationSection;
  };
}

const TeacherRecommendationsPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  // Consultar grupos asignados al profesor
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery<Group[]>({
    queryKey: ['/api/profesor/grupos-asignados'],
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Seleccionar automáticamente el primer grupo si no hay uno seleccionado
  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // Consultar recomendaciones existentes para el grupo seleccionado
  // Este es un ejemplo de consulta inicial que puede fallar (problemas con el API endpoint)
  const { 
    data: recommendations, 
    isLoading: isLoadingRecommendations,
    refetch: refetchRecommendations,
    error: recommendationsError
  } = useQuery<RecommendationsResponse>({
    queryKey: ['/api/teacher-assistant/recommendations', selectedGroupId],
    enabled: !!selectedGroupId,
    staleTime: 60 * 1000, // 1 minuto
    retry: 1, // Limitar reintentos si hay errores de API
    retryDelay: 1000,
    // Añadir función de manejo de error
    onError: (error) => {
      console.error("Error al obtener recomendaciones:", error);
      // Podemos generar datos de prueba aquí también si queremos
    }
  });
  
  // Debug - mostrar error si hay alguno
  useEffect(() => {
    if (recommendationsError) {
      console.error('Error al cargar recomendaciones:', recommendationsError);
    }
  }, [recommendationsError]);

  // Estados para almacenar respuestas generadas por IA
  const [aiGeneratedContent, setAiGeneratedContent] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({});
  
  // Estado para almacenar contenido de IA parseado para mostrar en tarjetas
  const [parsedAIContent, setParsedAIContent] = useState<Record<string, {
    title: string, 
    content: string[], 
    icon: React.ReactNode
  }>>({}); 
  
  // Debug - mostrar datos en consola
  useEffect(() => {
    if (recommendations) {
      console.log('Recommendations data recibido:', recommendations);
    }
  }, [recommendations]);
  
  // Función para alternar la expansión de una sección

  // Función para alternar la expansión de una sección
  const toggleExpand = (sectionId: string) => {
    setIsExpanded(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // Procesar texto generado por IA cuando cambia
  useEffect(() => {
    if (aiGeneratedContent) {
      console.log('Procesando aiGeneratedContent:', aiGeneratedContent);
      const parsed = parseAIContent(aiGeneratedContent);
      console.log('Contenido parseado de aiGeneratedContent:', parsed);
      setParsedAIContent(parsed);
    } else if (recommendations?.format === 'json' && recommendations?.result) {
      console.log('Procesando resultado en JSON directamente:', recommendations.result);
      // Para formato JSON ya procesado en el backend
      const jsonData = recommendations.result;
      
      // Intentar generar un formato compatible con nuestras tarjetas
      try {
        const parsedContent: Record<string, {title: string, content: string[], icon: React.ReactNode}> = {};
        
        // Estrategias (pueden venir de varias fuentes en el objeto)
        if (jsonData.recomendaciones?.estrategiasGenerales?.contenido || 
            Array.isArray(jsonData.estrategiasDidacticas)) {
          parsedContent['estrategias'] = {
            title: "Estrategias Generales",
            content: Array.isArray(jsonData.recomendaciones?.estrategiasGenerales?.contenido)
              ? jsonData.recomendaciones.estrategiasGenerales.contenido
              : (Array.isArray(jsonData.estrategiasDidacticas) 
                  ? jsonData.estrategiasDidacticas 
                  : ["No hay estrategias disponibles"]),
            icon: <Lightbulb className="h-5 w-5 text-[#5893D4]" />
          };
        }
        
        // Materiales de apoyo
        if (jsonData.recomendaciones?.materialApoyo?.contenido || 
            Array.isArray(jsonData.recursosRecomendados)) {
          parsedContent['materiales'] = {
            title: "Recursos y Materiales",
            content: Array.isArray(jsonData.recomendaciones?.materialApoyo?.contenido)
              ? jsonData.recomendaciones.materialApoyo.contenido
              : (Array.isArray(jsonData.recursosRecomendados) 
                  ? jsonData.recursosRecomendados 
                  : ["No hay materiales disponibles"]),
            icon: <BookMarked className="h-5 w-5 text-green-500" />
          };
        }
        
        // Estudiantes en riesgo
        if (jsonData.recomendaciones?.estudiantesRiesgo?.contenido) {
          parsedContent['riesgo'] = {
            title: "Atención a Estudiantes en Riesgo",
            content: Array.isArray(jsonData.recomendaciones.estudiantesRiesgo.contenido)
              ? jsonData.recomendaciones.estudiantesRiesgo.contenido
              : ["No hay recomendaciones específicas para estudiantes en riesgo"],
            icon: <BarChart3 className="h-5 w-5 text-amber-500" />
          };
        }
        
        // Oportunidades de mejora (formato anterior)
        if (Array.isArray(jsonData.oportunidadesMejora) && jsonData.oportunidadesMejora.length > 0) {
          parsedContent['mejoras'] = {
            title: "Oportunidades de Mejora",
            content: jsonData.oportunidadesMejora,
            icon: <TrendingUp className="h-5 w-5 text-purple-500" />
          };
        }
        
        // Recomendaciones generales (formato anterior)
        if (Array.isArray(jsonData.recomendacionesGenerales) && jsonData.recomendacionesGenerales.length > 0) {
          parsedContent['generales'] = {
            title: "Recomendaciones Generales",
            content: jsonData.recomendacionesGenerales,
            icon: <Sparkles className="h-5 w-5 text-[#5893D4]" />
          };
        }
        
        // Si no se encontró ninguna sección válida
        if (Object.keys(parsedContent).length === 0) {
          parsedContent['fallback'] = {
            title: "Recomendaciones",
            content: ["No se pudieron extraer secciones válidas de las recomendaciones. Intente regenerarlas."],
            icon: <Sparkles className="h-5 w-5 text-[#5893D4]" />
          };
        }
        
        console.log('Contenido de JSON procesado para tarjetas:', parsedContent);
        setParsedAIContent(parsedContent);
      } catch (error) {
        console.error('Error al procesar JSON para tarjetas:', error);
        setParsedAIContent({
          error: {
            title: "Error de Procesamiento",
            content: ["Ocurrió un error al procesar las recomendaciones. Por favor, intente regenerarlas."],
            icon: <AlertCircle className="h-5 w-5 text-red-500" />
          }
        });
      }
    } else {
      setParsedAIContent({});
    }
  }, [aiGeneratedContent, recommendations]);

  // Función para parsear el texto de IA y extraer secciones
  const parseAIContent = (content: any) => {
    // Verificación básica del contenido
    if (!content) {
      console.error("Contenido no disponible para parsear (null o undefined)");
      
      // Devolver un objeto básico para evitar errores
      return {
        general: {
          title: "Recomendaciones Generales",
          content: ["No hay contenido disponible para mostrar. Intente generar nuevas recomendaciones."],
          icon: <Sparkles className="h-5 w-5 text-[#5893D4]" />
        }
      };
    }
    
    // Si recibimos un objeto JSON en lugar de texto, verificamos si tiene la estructura esperada
    if (typeof content !== 'string') {
      console.warn('parseAIContent: El contenido no es texto, se recibió:', typeof content);
      
      // Si es un objeto JSON estructurado, intentamos interpretarlo directamente
      if (typeof content === 'object') {
        try {
          // Verificar si es un objeto con la estructura correcta para renderizar
          const result: {[key: string]: {title: string, content: string[], icon: React.ReactNode}} = {};
          
          // Intentamos mapear el objeto JSON a nuestro formato esperado 
          if (content.estrategias) {
            result['estrategias'] = {
              title: "Estrategias de Enseñanza",
              content: Array.isArray(content.estrategias) ? content.estrategias : [String(content.estrategias)],
              icon: <Lightbulb className="h-5 w-5 text-[#5893D4]" />
            };
          }
          
          if (content.recursos) {
            result['recursos'] = {
              title: "Recursos y Materiales",
              content: Array.isArray(content.recursos) ? content.recursos : [String(content.recursos)],
              icon: <BookMarked className="h-5 w-5 text-[#5893D4]" />
            };
          }
          
          if (content.evaluacion) {
            result['evaluacion'] = {
              title: "Métodos de Evaluación",
              content: Array.isArray(content.evaluacion) ? content.evaluacion : [String(content.evaluacion)],
              icon: <BarChart3 className="h-5 w-5 text-[#5893D4]" />
            };
          }
          
          // Si encontramos alguna sección, lo devolvemos
          if (Object.keys(result).length > 0) {
            return result;
          }
          
          // Si no pudimos interpretar el objeto JSON, mostramos un error
          return {
            general: {
              title: "Contenido en formato no reconocido",
              content: ["El contenido está en un formato que no pudo ser procesado. Intente generar nuevas recomendaciones."],
              icon: <AlertCircle className="h-5 w-5 text-amber-500" />
            }
          };
        } catch (objError) {
          console.error("Error al procesar objeto JSON:", objError);
        }
      }
      
      // Si no es un objeto o no pudimos interpretarlo, mostramos mensaje de error
      return {
        general: {
          title: "Formato incorrecto",
          content: ["El tipo de contenido recibido no es el esperado. Intente generar nuevas recomendaciones."],
          icon: <AlertCircle className="h-5 w-5 text-amber-500" />
        }
      };
    }
    
    console.log("Parseando contenido IA de longitud:", content.length);
    
    // Expresiones regulares más flexibles para diferentes secciones
    const sections: {[key: string]: {title: string, regex: RegExp, icon: React.ReactNode}} = {
      estrategias: {
        title: "Estrategias de Enseñanza",
        regex: /(?:Estrategias de enseñanza|Estrategias pedagógicas|Estrategias generales|Enfoques pedagógicos|Estrategias recomendadas)[:\s]*([\s\S]*?)(?=(?:\n\s*\n\s*(?:#|[A-Z][a-z]+\s*(?:de|para|y|e|o|u|recomendad|sugerid)))|$)/i,
        icon: <Lightbulb className="h-5 w-5 text-[#5893D4]" />
      },
      recursos: {
        title: "Recursos y Materiales",
        regex: /(?:Recursos recomendados|Materiales de apoyo|Recursos didácticos|Herramientas recomendadas|Material didáctico)[:\s]*([\s\S]*?)(?=(?:\n\s*\n\s*(?:#|[A-Z][a-z]+\s*(?:de|para|y|e|o|u|recomendad|sugerid)))|$)/i,
        icon: <BookMarked className="h-5 w-5 text-[#5893D4]" />
      },
      evaluacion: {
        title: "Métodos de Evaluación",
        regex: /(?:Métodos de evaluación|Estrategias de evaluación|Evaluación del aprendizaje|Técnicas de evaluación|Evaluación)[:\s]*([\s\S]*?)(?=(?:\n\s*\n\s*(?:#|[A-Z][a-z]+\s*(?:de|para|y|e|o|u|recomendad|sugerid)))|$)/i,
        icon: <BarChart3 className="h-5 w-5 text-[#5893D4]" />
      },
      riesgo: {
        title: "Atención a Estudiantes en Riesgo",
        regex: /(?:Atención a estudiantes en riesgo|Estrategias para estudiantes en dificultad|Apoyo para estudiantes|Intervención temprana|Estudiantes en riesgo)[:\s]*([\s\S]*?)(?=(?:\n\s*\n\s*(?:#|[A-Z][a-z]+\s*(?:de|para|y|e|o|u|recomendad|sugerid)))|$)/i,
        icon: <Users className="h-5 w-5 text-amber-500" />
      }
    };

    const result: {[key: string]: {title: string, content: string[], icon: React.ReactNode}} = {};
    
    // Extraer cada sección del texto
    try {
      Object.entries(sections).forEach(([key, section]) => {
        try {
          const match = content.match(section.regex);
          if (match && match[1]) {
            const contentText = match[1].trim();
            
            // Dividir el contenido en viñetas si es posible
            let items: string[] = [];
            
            try {
              // Intentar encontrar viñetas numeradas (1., 2., etc.)
              if (contentText.match(/^\d+\.\s/m)) {
                items = contentText
                  .split(/\n+/)
                  .map(line => line.trim())
                  .filter(line => line.length > 0 && /^\d+\./.test(line))
                  .map(line => line.replace(/^\d+\.\s*/, '')); // Quitar números
              } 
              // Intentar encontrar viñetas con asteriscos o guiones
              else if (contentText.match(/^[•\-*]\s/m)) {
                items = contentText
                  .split(/\n+/)
                  .map(line => line.trim())
                  .filter(line => line.length > 0 && /^[•\-*]/.test(line))
                  .map(line => line.replace(/^[•\-*]\s*/, '')); // Quitar viñetas existentes
              }
              
              // Si no se encontraron items con formato de lista, dividir por líneas
              if (items.length === 0) {
                items = contentText
                  .split(/\n+/)
                  .map(line => line.trim())
                  .filter(line => line.length > 0);
              }
              
              // Si sigue sin haber items, usar el contenido completo
              if (items.length === 0) {
                items = [contentText];
              }
            } catch (itemsError) {
              console.error(`Error al procesar items de la sección ${key}:`, itemsError);
              items = ["Error al procesar esta sección"];
            }
            
            result[key] = {
              title: section.title,
              content: items,
              icon: section.icon
            };
          }
        } catch (sectionError) {
          console.error(`Error procesando sección ${key}:`, sectionError);
        }
      });
    } catch (sectionsError) {
      console.error("Error al recorrer las secciones:", sectionsError);
      
      // Si hay un error global, agregar una sección de error
      result['error'] = {
        title: "Error de procesamiento",
        content: ["Ocurrió un error al procesar las recomendaciones. Por favor, intente generar nuevas recomendaciones."],
        icon: <AlertCircle className="h-5 w-5 text-amber-500" />
      };
    }
    
    // Si no se encontró ninguna sección, crear una genérica con el contenido completo
    try {
      if (Object.keys(result).length === 0) {
        console.log("No se encontraron secciones, creando sección genérica");
        
        // Intentar dividir por líneas numeradas o con viñetas
        let genericContent: string[] = [];
        
        try {
          // Comprobar si hay listas numeradas
          if (content.match(/^\d+\.\s/m)) {
            try {
              genericContent = content
                .split(/\n+/)
                .map(line => line.trim())
                .filter(line => line.length > 0 && /^\d+\./.test(line))
                .map(line => line.replace(/^\d+\.\s*/, ''));
            } catch (listError) {
              console.error("Error al procesar listas numeradas:", listError);
            }
          } 
          // Comprobar si hay listas con viñetas
          else if (content.match(/^[•\-*]\s/m)) {
            try {
              genericContent = content
                .split(/\n+/)
                .map(line => line.trim())
                .filter(line => line.length > 0 && /^[•\-*]/.test(line))
                .map(line => line.replace(/^[•\-*]\s*/, ''));
            } catch (bulletError) {
              console.error("Error al procesar viñetas:", bulletError);
            }
          }
          
          // Si no se encontró ningún formato de lista, dividir por párrafos
          if (genericContent.length === 0) {
            try {
              genericContent = content
                .split(/\n{2,}/)
                .map(paragraph => paragraph.trim())
                .filter(paragraph => paragraph.length > 0);
            } catch (paragraphError) {
              console.error("Error al procesar párrafos:", paragraphError);
            }
          }
          
          // Si no hay párrafos claros, dividir simplemente por líneas
          if (genericContent.length === 0) {
            try {
              genericContent = content
                .split(/\n+/)
                .map(line => line.trim())
                .filter(line => line.length > 0);
            } catch (lineError) {
              console.error("Error al procesar líneas:", lineError);
            }
          }
          
          // En último caso, usar el texto completo si es seguro
          if (genericContent.length === 0) {
            try {
              genericContent = [content.trim()];
            } catch (trimError) {
              console.error("Error al hacer trim del contenido:", trimError);
              genericContent = ["No se pudo procesar el contenido"];
            }
          }
        } catch (contentError) {
          console.error("Error al procesar contenido genérico:", contentError);
          genericContent = ["Error al procesar el contenido. Por favor, intente generar nuevas recomendaciones."];
        }
        
        result['general'] = {
          title: "Recomendaciones Pedagógicas",
          content: genericContent,
          icon: <Sparkles className="h-5 w-5 text-[#5893D4]" />
        };
      }
    } catch (finalError) {
      console.error("Error final en procesamiento de contenido:", finalError);
      
      // En caso de error extremo, asegurar que siempre devolvemos algo válido
      result['error'] = {
        title: "Error de procesamiento",
        content: ["Ocurrió un error al procesar las recomendaciones. Por favor, intente generar nuevas recomendaciones."],
        icon: <AlertCircle className="h-5 w-5 text-amber-500" />
      };
    }
    
    return result;
  };

  // Mutación para generar nuevas recomendaciones
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGroupId) return null;
      
      console.log("🚀 Iniciando generación de recomendaciones para grupo:", selectedGroupId);
      
      try {
        const response = await apiRequest(
          "POST", 
          "/api/teacher-assistant/recommendations", 
          { 
            teacherId: (window as any).profesorId || 0,
            groupId: selectedGroupId 
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al generar recomendaciones");
        }
        
        const data = await response.json();
        console.log("✅ Respuesta de API recibida:", data);
        return data;
      } catch (error) {
        console.error("❌ Error en mutación:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data && data.success) {
        toast({
          title: "Recomendaciones generadas",
          description: "Las recomendaciones pedagógicas se han generado correctamente.",
        });
        
        console.log('🟢 Respuesta exitosa de generación de recomendaciones:', data);
        console.log('🟢 Formato de respuesta:', data.format);
        
        // Siempre intentar procesar el resultado, incluso si es formato desconocido
        if (data.result) {
          console.log('🔍 Procesando resultado tipo:', typeof data.result);
          
          // BLOQUE ESPECIAL DE FALLBACK: Si no hay parsedAIContent actual, crear uno genérico
          if (Object.keys(parsedAIContent).length === 0) {
            console.log('⚠️ No hay parsedAIContent actual, creando genérico de emergencia');
            
            // Intenta crear una representación básica del contenido para mostrar tarjetas
            const emergencyContent: Record<string, {title: string, content: string[], icon: React.ReactNode}> = {};
            
            if (typeof data.result === 'string') {
              // Si es texto, mostrar como contenido genérico
              emergencyContent['general'] = {
                title: "Recomendaciones Pedagógicas",
                content: data.result.split('\n\n').filter(p => p.trim().length > 0).map(p => p.trim()),
                icon: <Sparkles className="h-5 w-5 text-[#5893D4]" />
              };
            } else if (typeof data.result === 'object') {
              // Si es objeto, intentar extraer algunas propiedades clave
              try {
                if (Array.isArray(data.result)) {
                  // Si es array, mostrar cada elemento como un item
                  emergencyContent['items'] = {
                    title: "Recomendaciones",
                    content: data.result.map(item => typeof item === 'string' ? item : JSON.stringify(item)),
                    icon: <Sparkles className="h-5 w-5 text-[#5893D4]" />
                  };
                } else {
                  // Buscar propiedades típicas que puedan contener recomendaciones
                  const possibleTextProps = Object.entries(data.result)
                    .filter(([_, value]) => typeof value === 'string' || Array.isArray(value))
                    .map(([key, value]) => ({
                      key,
                      content: Array.isArray(value) ? value : [String(value)]
                    }));
                  
                  if (possibleTextProps.length > 0) {
                    possibleTextProps.forEach(prop => {
                      emergencyContent[prop.key] = {
                        title: prop.key.charAt(0).toUpperCase() + prop.key.slice(1).replace(/([A-Z])/g, ' $1'),
                        content: prop.content,
                        icon: <Sparkles className="h-5 w-5 text-[#5893D4]" />
                      };
                    });
                  }
                }
              } catch (e) {
                console.error('Error en procesamiento de emergencia:', e);
              }
            }
            
            // Si se pudo crear algún contenido de emergencia, usarlo
            if (Object.keys(emergencyContent).length > 0) {
              console.log('✅ Contenido de emergencia creado:', emergencyContent);
              setParsedAIContent(emergencyContent);
            }
          }
        }
        
        // Almacenar el texto generado por IA para mostrarlo en la interfaz si es formato texto
        if (data.format === 'text' && data.result && typeof data.result === 'string') {
          console.log('Almacenando contenido de formato texto');
          setAiGeneratedContent(data.result);
        } else if (data.format === 'json') {
          console.log('Detectado formato JSON estructurado en generación:', data.result);
          
          // Procesar directamente el resultado JSON y actualizar parsedAIContent
          try {
            // Si tenemos un JSON de formato conocido, lo procesamos para mostrar en tarjetas
            const processedContent: Record<string, {title: string, content: string[], icon: React.ReactNode}> = {};
            
            // Estrategias (pueden venir de varias fuentes en el objeto)
            if (data.result.recomendaciones?.estrategiasGenerales?.contenido || 
                Array.isArray(data.result.estrategiasDidacticas)) {
              processedContent['estrategias'] = {
                title: "Estrategias Generales",
                content: Array.isArray(data.result.recomendaciones?.estrategiasGenerales?.contenido)
                  ? data.result.recomendaciones.estrategiasGenerales.contenido
                  : (Array.isArray(data.result.estrategiasDidacticas) 
                      ? data.result.estrategiasDidacticas 
                      : ["No hay estrategias disponibles"]),
                icon: <Lightbulb className="h-5 w-5 text-[#5893D4]" />
              };
            }
            
            // Materiales de apoyo
            if (data.result.recomendaciones?.materialApoyo?.contenido || 
                Array.isArray(data.result.recursosRecomendados)) {
              processedContent['materiales'] = {
                title: "Recursos y Materiales",
                content: Array.isArray(data.result.recomendaciones?.materialApoyo?.contenido)
                  ? data.result.recomendaciones.materialApoyo.contenido
                  : (Array.isArray(data.result.recursosRecomendados) 
                      ? data.result.recursosRecomendados 
                      : ["No hay materiales disponibles"]),
                icon: <BookMarked className="h-5 w-5 text-green-500" />
              };
            }
            
            // Estudiantes en riesgo
            if (data.result.recomendaciones?.estudiantesRiesgo?.contenido) {
              processedContent['riesgo'] = {
                title: "Atención a Estudiantes en Riesgo",
                content: Array.isArray(data.result.recomendaciones.estudiantesRiesgo.contenido)
                  ? data.result.recomendaciones.estudiantesRiesgo.contenido
                  : ["No hay recomendaciones específicas para estudiantes en riesgo"],
                icon: <BarChart3 className="h-5 w-5 text-amber-500" />
              };
            }
            
            // Oportunidades de mejora (formato anterior)
            if (Array.isArray(data.result.oportunidadesMejora) && data.result.oportunidadesMejora.length > 0) {
              processedContent['mejoras'] = {
                title: "Oportunidades de Mejora",
                content: data.result.oportunidadesMejora,
                icon: <TrendingUp className="h-5 w-5 text-purple-500" />
              };
            }
            
            // Recomendaciones generales (formato anterior)
            if (Array.isArray(data.result.recomendacionesGenerales) && data.result.recomendacionesGenerales.length > 0) {
              processedContent['generales'] = {
                title: "Recomendaciones Generales",
                content: data.result.recomendacionesGenerales,
                icon: <Sparkles className="h-5 w-5 text-[#5893D4]" />
              };
            }
            
            // Si no se encontró ninguna sección válida
            if (Object.keys(processedContent).length === 0) {
              processedContent['fallback'] = {
                title: "Recomendaciones",
                content: ["No se pudieron extraer secciones válidas de las recomendaciones. Intente regenerarlas."],
                icon: <Sparkles className="h-5 w-5 text-[#5893D4]" />
              };
            }
            
            console.log('JSON procesado para tarjetas:', processedContent);
            setParsedAIContent(processedContent);
          } catch (error) {
            console.error('Error al procesar JSON para tarjetas:', error);
            setParsedAIContent({
              error: {
                title: "Error de Procesamiento",
                content: ["Ocurrió un error al procesar las recomendaciones. Por favor, intente regenerarlas."],
                icon: <AlertCircle className="h-5 w-5 text-red-500" />
              }
            });
          }
          
          // Guardamos el contenido JSON original como string para debug y procesamiento alternativo
          try {
            setAiGeneratedContent(JSON.stringify(data.result, null, 2));
          } catch (stringifyError) {
            console.error('Error al convertir JSON a string:', stringifyError);
            setAiGeneratedContent(null);
          }
        }
        
        // Invalidar consulta de recomendaciones para refrescar datos
        queryClient.invalidateQueries({
          queryKey: ['/api/teacher-assistant/recommendations', selectedGroupId]
        });

        // Forzar refetch para actualizar UI inmediatamente
        refetchRecommendations();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron generar las recomendaciones",
        variant: "destructive",
      });
    }
  });

  // Inicializar datos de demostración para verificar la interfaz (solo cuando no hay datos)
  useEffect(() => {
    // Si ya hay datos en parsedAIContent, no hacer nada
    if (Object.keys(parsedAIContent).length > 0) {
      return;
    }
    
    // Solo inicializar datos de prueba si tenemos un grupo seleccionado y no hay datos recibidos
    if (selectedGroupId && !generateMutation.isPending && 
        !isLoadingRecommendations && recommendationsError) {
      console.log('⚠️ Inicializando datos de prueba para verificar la interfaz');
      
      // Datos de ejemplo para verificar que la interfaz funciona correctamente
      const debugContent: Record<string, {title: string, content: string[], icon: React.ReactNode}> = {
        'debug': {
          title: "Panel de Depuración",
          content: [
            "Este contenido es solo para pruebas visuales.",
            "Si ves esta tarjeta, significa que la interfaz de visualización funciona correctamente.",
            `Grupo seleccionado: ${selectedGroupId}`,
            `Error API: ${recommendationsError ? '✓' : '✗'}`,
            `Estado de mutación: ${generateMutation.isPending ? 'En progreso' : 'Inactiva'}`
          ],
          icon: <AlertCircle className="h-5 w-5 text-amber-500" />
        },
        'instrucciones': {
          title: "Instrucciones",
          content: [
            "1. Selecciona un grupo en el menú desplegable",
            "2. Haz clic en 'Generar Recomendaciones'",
            "3. Espera a que el proceso termine (puede tardar hasta 30 segundos)",
            "4. Las tarjetas de recomendaciones aparecerán automáticamente"
          ],
          icon: <BookOpen className="h-5 w-5 text-blue-500" />
        }
      };
      
      setParsedAIContent(debugContent);
    }
  }, [
    parsedAIContent, 
    selectedGroupId, 
    generateMutation.isPending, 
    isLoadingRecommendations, 
    recommendationsError
  ]);

  // Si no hay grupos asignados, mostrar mensaje
  if (!isLoadingGroups && groups.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Recomendaciones Pedagógicas</CardTitle>
            <CardDescription>Asistente educativo IA</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No hay grupos asignados</h3>
              <p className="text-gray-500 mt-1">
                No se encontraron grupos asignados a tu perfil docente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Parsear datos de recomendaciones si existen, con validación robusta
  const recommendationData: TeacherRecommendation | null = useMemo(() => {
    if (!recommendations?.success) return null;
    
    // Intenta cargar el contenido directo en parsedAIContent para la sección de tarjetas
    if (recommendations.success && recommendations.format === 'json') {
      try {
        // Si tenemos un resultado JSON, intentar cargar datos en parsedAIContent
        const processedContent: Record<string, {title: string, content: string[], icon: React.ReactNode}> = {};
            
        // Estrategias (pueden venir de varias fuentes en el objeto)
        if (recommendations.result.recomendaciones?.estrategiasGenerales?.contenido || 
            Array.isArray(recommendations.result.estrategiasDidacticas)) {
          processedContent['estrategias'] = {
            title: "Estrategias Generales",
            content: Array.isArray(recommendations.result.recomendaciones?.estrategiasGenerales?.contenido)
              ? recommendations.result.recomendaciones.estrategiasGenerales.contenido
              : (Array.isArray(recommendations.result.estrategiasDidacticas) 
                  ? recommendations.result.estrategiasDidacticas 
                  : ["No hay estrategias disponibles"]),
            icon: <Lightbulb className="h-5 w-5 text-[#5893D4]" />
          };
        }
        
        // Materiales de apoyo
        if (recommendations.result.recomendaciones?.materialApoyo?.contenido || 
            Array.isArray(recommendations.result.recursosRecomendados)) {
          processedContent['materiales'] = {
            title: "Recursos y Materiales",
            content: Array.isArray(recommendations.result.recomendaciones?.materialApoyo?.contenido)
              ? recommendations.result.recomendaciones.materialApoyo.contenido
              : (Array.isArray(recommendations.result.recursosRecomendados) 
                  ? recommendations.result.recursosRecomendados 
                  : ["No hay materiales disponibles"]),
            icon: <BookMarked className="h-5 w-5 text-green-500" />
          };
        }
        
        // Si encontramos algo para mostrar, actualizar el estado
        if (Object.keys(processedContent).length > 0) {
          console.log('🔄 Actualizando parsedAIContent desde useMemo:', processedContent);
          setParsedAIContent(processedContent);
        }
      } catch (error) {
        console.error('Error al procesar JSON en useMemo:', error);
      }
    }
    
    // Verificar si la respuesta ya viene en formato JSON estructurado
    if (recommendations.format === 'json') {
      console.log('Detectado formato JSON estructurado:', recommendations.result);
      
      // Validación completa del objeto de resultado
      if (!recommendations.result || typeof recommendations.result !== 'object') {
        console.warn('La respuesta JSON no contiene un objeto válido');
        return null;
      }

      // Crear un objeto resultado con valores predeterminados seguros para todos los campos
      const defaultResult: TeacherRecommendation = {
        fechaGeneracion: recommendations.result.fechaGeneracion || new Date().toISOString(),
        grupoId: typeof recommendations.result.grupoId === 'number' ? recommendations.result.grupoId : 0,
        grupoNombre: recommendations.result.grupoNombre || 'Grupo sin nombre',
        profesorNombre: recommendations.result.profesorNombre || 'Profesor',
        nivel: recommendations.result.nivel || 'No especificado',
        resumenEstadistico: {
          promedioGeneral: typeof recommendations.result.resumenEstadistico?.promedioGeneral === 'number' 
            ? recommendations.result.resumenEstadistico.promedioGeneral : 0,
          porcentajeAsistencia: typeof recommendations.result.resumenEstadistico?.porcentajeAsistencia === 'number' 
            ? recommendations.result.resumenEstadistico.porcentajeAsistencia : 0,
          porcentajeAprobacion: typeof recommendations.result.resumenEstadistico?.porcentajeAprobacion === 'number' 
            ? recommendations.result.resumenEstadistico.porcentajeAprobacion : 0,
          estudiantesEnRiesgo: typeof recommendations.result.resumenEstadistico?.estudiantesEnRiesgo === 'number' 
            ? recommendations.result.resumenEstadistico.estudiantesEnRiesgo : 0,
          totalEstudiantes: typeof recommendations.result.resumenEstadistico?.totalEstudiantes === 'number' 
            ? recommendations.result.resumenEstadistico.totalEstudiantes : 0
        },
        recomendaciones: {
          estrategiasGenerales: validateRecommendationSection(
            recommendations.result.recomendaciones?.estrategiasGenerales, 
            'Estrategias Generales'
          ),
          materialApoyo: validateRecommendationSection(
            recommendations.result.recomendaciones?.materialApoyo, 
            'Material de Apoyo'
          ),
          estudiantesRiesgo: validateRecommendationSection(
            recommendations.result.recomendaciones?.estudiantesRiesgo, 
            'Estudiantes en Riesgo'
          )
        },
        // Mantener compatibilidad con formato anterior
        recomendacionesGenerales: Array.isArray(recommendations.result.recomendacionesGenerales) 
          ? recommendations.result.recomendacionesGenerales 
          : [],
        estrategiasDidacticas: Array.isArray(recommendations.result.estrategiasDidacticas) 
          ? recommendations.result.estrategiasDidacticas 
          : [],
        recursosRecomendados: Array.isArray(recommendations.result.recursosRecomendados) 
          ? recommendations.result.recursosRecomendados 
          : [],
        oportunidadesMejora: Array.isArray(recommendations.result.oportunidadesMejora) 
          ? recommendations.result.oportunidadesMejora 
          : []
      };

      console.log('Estructura JSON validada y completa:', defaultResult);
      return defaultResult;
    }

    // Si es formato texto, intentar usar el parser existente (mantenemos compatibilidad)
    if (typeof recommendations.result === 'string') {
      console.log('Detectado formato texto, intentando parsear...');
      // Aquí se mantiene la lógica de procesamiento anterior si es necesario
      return null;
    }
    
    return null;
  }, [recommendations]);

  // Función auxiliar para validar cada sección de recomendaciones
  function validateRecommendationSection(section: any, defaultTitle: string): RecommendationSection {
    if (!section || typeof section !== 'object') {
      return {
        titulo: defaultTitle,
        contenido: [],
        prioridad: "media"
      };
    }

    return {
      titulo: section.titulo || defaultTitle,
      contenido: Array.isArray(section.contenido) ? section.contenido : [],
      prioridad: (section.prioridad === 'alta' || section.prioridad === 'media' || section.prioridad === 'baja') 
        ? section.prioridad 
        : "media"
    };
  }

  // Obtener estadísticas del grupo seleccionado
  const groupStats: GroupStats | null = recommendationData ? {
    total: recommendationData.resumenEstadistico.totalEstudiantes,
    promedio: recommendationData.resumenEstadistico.promedioGeneral,
    asistencia: recommendationData.resumenEstadistico.porcentajeAsistencia,
    pasRate: recommendationData.resumenEstadistico.porcentajeAprobacion,
    riesgo: recommendationData.resumenEstadistico.estudiantesEnRiesgo
  } : null;

  // Manejar descarga de PDF
  const handleDownloadPDF = () => {
    if (!recommendationData) return;
    
    try {
      generateTeacherRecommendationsPDF(recommendationData);
      toast({
        title: "PDF generado",
        description: "El documento se ha descargado correctamente."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el PDF de recomendaciones",
        variant: "destructive",
      });
    }
  };

  // Ya no necesitamos este useMemo porque ahora estamos usando el estado parsedAIContent
  // que se actualiza en el useEffect

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Sparkles className="mr-2 h-6 w-6 text-[#5893D4]" />
            Recomendaciones Pedagógicas
          </h1>
          <p className="text-muted-foreground">
            Asistente educativo con IA para mejorar estrategias de enseñanza
          </p>
        </div>
        
        <div className="flex gap-3">
          <Select
            value={selectedGroupId?.toString()}
            onValueChange={(value) => setSelectedGroupId(parseInt(value))}
            disabled={isLoadingGroups}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar grupo" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group: Group) => (
                <SelectItem key={group.id} value={group.id.toString()}>
                  {group.nombre} ({group.nivel})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="default" 
            onClick={() => generateMutation.mutate()} 
            disabled={!selectedGroupId || generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Lightbulb className="mr-2 h-4 w-4" />
                Generar Nuevas
              </>
            )}
          </Button>
        </div>
      </div>

      {selectedGroupId && (
        <>
          {/* Resumen del grupo y métricas */}
          {groupStats && recommendationData && (
            <GroupStatsSummary
              groupName={recommendationData.grupoNombre}
              level={recommendationData.nivel}
              studentCount={groupStats.total}
              averageGrade={groupStats.promedio}
              attendance={groupStats.asistencia}
              riskStudents={groupStats.riesgo}
              passRate={groupStats.pasRate}
            />
          )}

          {/* Visualización de datos estructurados de la BD si existen */}
          {recommendationData ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Recomendaciones Generales */}
                {recommendationData.recomendacionesGenerales && Array.isArray(recommendationData.recomendacionesGenerales) && recommendationData.recomendacionesGenerales.length > 0 && (
                  <Card className="bg-[#F0F2F5] rounded-xl overflow-hidden hover:shadow-md transition-shadow border-0">
                    <CardHeader className="pb-3 bg-white border-b border-gray-100">
                      <CardTitle className="text-lg flex items-center">
                        <Lightbulb className="h-5 w-5 text-amber-500 mr-2" />
                        <span>Recomendaciones Generales</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 px-4">
                      <ul className="space-y-3">
                        {recommendationData.recomendacionesGenerales.map((item, index) => (
                          <li key={index} className="text-sm border-l-2 border-[#5893D4] pl-3 py-2 bg-white rounded-md shadow-sm hover:shadow transition-shadow">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {/* Estrategias Didácticas */}
                {recommendationData.estrategiasDidacticas && Array.isArray(recommendationData.estrategiasDidacticas) && recommendationData.estrategiasDidacticas.length > 0 && (
                  <Card className="bg-[#F0F2F5] rounded-xl overflow-hidden hover:shadow-md transition-shadow border-0">
                    <CardHeader className="pb-3 bg-white border-b border-gray-100">
                      <CardTitle className="text-lg flex items-center">
                        <BookOpen className="h-5 w-5 text-blue-500 mr-2" />
                        <span>Estrategias Didácticas</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 px-4">
                      <ul className="space-y-3">
                        {recommendationData.estrategiasDidacticas.map((item, index) => (
                          <li key={index} className="text-sm border-l-2 border-[#5893D4] pl-3 py-2 bg-white rounded-md shadow-sm hover:shadow transition-shadow">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {/* Recursos Recomendados */}
                {recommendationData.recursosRecomendados && Array.isArray(recommendationData.recursosRecomendados) && recommendationData.recursosRecomendados.length > 0 && (
                  <Card className="bg-[#F0F2F5] rounded-xl overflow-hidden hover:shadow-md transition-shadow border-0">
                    <CardHeader className="pb-3 bg-white border-b border-gray-100">
                      <CardTitle className="text-lg flex items-center">
                        <BookMarked className="h-5 w-5 text-green-500 mr-2" />
                        <span>Recursos Recomendados</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 px-4">
                      <ul className="space-y-3">
                        {recommendationData.recursosRecomendados.map((item, index) => (
                          <li key={index} className="text-sm border-l-2 border-[#5893D4] pl-3 py-2 bg-white rounded-md shadow-sm hover:shadow transition-shadow">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {/* Oportunidades de Mejora */}
                {recommendationData.oportunidadesMejora && Array.isArray(recommendationData.oportunidadesMejora) && recommendationData.oportunidadesMejora.length > 0 && (
                  <Card className="bg-[#F0F2F5] rounded-xl overflow-hidden hover:shadow-md transition-shadow border-0">
                    <CardHeader className="pb-3 bg-white border-b border-gray-100">
                      <CardTitle className="text-lg flex items-center">
                        <TrendingUp className="h-5 w-5 text-purple-500 mr-2" />
                        <span>Oportunidades de Mejora</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 px-4">
                      <ul className="space-y-3">
                        {recommendationData.oportunidadesMejora.map((item, index) => (
                          <li key={index} className="text-sm border-l-2 border-[#5893D4] pl-3 py-2 bg-white rounded-md shadow-sm hover:shadow transition-shadow">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Estudiantes en riesgo - Con validación robusta */}
                {recommendationData.recomendaciones && (
                  <Card className="bg-[#F0F2F5] rounded-xl overflow-hidden hover:shadow-md transition-shadow border-0">
                    <CardHeader className="pb-3 bg-white border-b border-gray-100">
                      <CardTitle className="text-lg flex items-center">
                        <BarChart3 className="mr-2 h-5 w-5 text-amber-500" />
                        Estudiantes en Riesgo
                      </CardTitle>
                      <CardDescription>
                        Atención especial para alumnos con bajo rendimiento
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 px-4 space-y-4">
                      <div className="bg-amber-50 p-3 rounded-md border border-amber-200 mb-3 text-sm text-amber-800">
                        <p>
                          {recommendationData.resumenEstadistico.estudiantesEnRiesgo} estudiante(s) 
                          necesitan atención prioritaria.
                        </p>
                      </div>
                      <ul className="space-y-3">
                        {recommendationData.recomendaciones.estudiantesRiesgo && 
                         Array.isArray(recommendationData.recomendaciones.estudiantesRiesgo.contenido) ? 
                          recommendationData.recomendaciones.estudiantesRiesgo.contenido.map((item, index) => (
                            <li key={index} className="text-sm border-l-2 border-amber-500 pl-3 py-2 bg-white rounded-md shadow-sm hover:shadow transition-shadow">
                              {typeof item === 'string' ? item : 'Recomendación no especificada'}
                            </li>
                          )) : (
                            <li className="text-center text-muted-foreground py-2">
                              No hay recomendaciones específicas disponibles
                            </li>
                          )
                        }
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Botón para descargar PDF */}
              <div className="mt-6 flex justify-end">
                <Button onClick={handleDownloadPDF} variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Descargar PDF
                </Button>
              </div>
              
              {/* Fecha de generación */}
              <div className="text-xs text-muted-foreground text-right mt-2">
                Generado el: {formatDate(recommendationData.fechaGeneracion)}
              </div>
            </>
          ) : Object.keys(parsedAIContent).length > 0 ? (
            /* Visualización del contenido generado por IA en tiempo real */
            <div className="mt-6 space-y-6">
              <div className="bg-[#E8F4FD] px-4 py-3 rounded-lg border border-[#5893D4] mb-6">
                <p className="text-sm text-[#1F3C88] font-medium flex items-center">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Recomendaciones pedagógicas generadas por el asistente de IA
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(parsedAIContent).map(([key, section]) => {
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
                    <Card key={key} className="bg-[#F0F2F5] rounded-xl overflow-hidden hover:shadow-md transition-shadow border-0">
                      <CardHeader className="pb-3 bg-white border-b border-gray-100">
                        <CardTitle className="text-lg flex items-center">
                          {section.icon}
                          <span className="ml-2">{section.title || 'Recomendación'}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 px-4">
                        <ul className="space-y-3">
                          {displayedContent.map((item, index) => (
                            <li key={index} className="text-sm border-l-2 border-[#5893D4] pl-3 py-2 bg-white rounded-md shadow-sm hover:shadow transition-shadow">
                              {typeof item === 'string' ? item : 'Contenido no disponible'}
                            </li>
                          ))}
                        </ul>
                        
                        {hasMoreContent && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-4 w-full text-sm"
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
                <Button onClick={() => generateMutation.mutate()} variant="outline" className="mr-2">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerar Recomendaciones
                </Button>
              </div>
              
              {/* Fecha de generación */}
              <div className="text-xs text-muted-foreground text-right mt-2">
                Generado el: {formatDate(new Date().toISOString())}
              </div>
            </div>
          ) : (
            <Card className="mt-6 rounded-xl overflow-hidden shadow-sm border-0">
              <CardHeader className="pb-3 bg-white border-b border-gray-100">
                <CardTitle className="text-lg">Recomendaciones Pedagógicas</CardTitle>
                <CardDescription>Asistente educativo IA</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 bg-[#F0F2F5]">
                {isLoadingRecommendations ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4"></div>
                    <p>Cargando recomendaciones...</p>
                  </div>
                ) : generateMutation.isPending ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4"></div>
                    <p>Generando recomendaciones pedagógicas...</p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No hay recomendaciones disponibles</h3>
                    <p className="text-gray-500 mt-1 mb-6">
                      Selecciona un grupo y genera nuevas recomendaciones pedagógicas.
                    </p>
                    <Button 
                      variant="default" 
                      onClick={() => generateMutation.mutate()} 
                      disabled={!selectedGroupId || generateMutation.isPending}
                      className="bg-white hover:bg-gray-50"
                    >
                      {generateMutation.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Lightbulb className="mr-2 h-4 w-4" />
                          Generar Recomendaciones
                        </>
                      )}
                    </Button>
                    
                    {/* Debug de estado y contenido generado */}
                    {(aiGeneratedContent || Object.keys(parsedAIContent).length > 0) && (
                      <div className="mt-6 text-xs">
                        <details>
                          <summary className="text-blue-500 cursor-pointer font-medium">Información de depuración</summary>
                          <div className="mt-2 p-2 bg-gray-100 rounded">
                            <p>Estado parsedAIContent: {JSON.stringify(Object.keys(parsedAIContent))}</p>
                            <p>aiGeneratedContent disponible: {aiGeneratedContent ? 'Sí' : 'No'}</p>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
      
      {/* SECCIÓN SIMPLIFICADA Y DIRECTA DE DEPURACIÓN */}
      <div className="mt-8 border-t border-gray-200 pt-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Sparkles className="inline-block mr-2 h-5 w-5 text-[#5893D4]" />
          Recomendaciones Pedagógicas Generadas
          {Object.keys(parsedAIContent).length > 0 && (
            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 border border-green-300">
              ✓ Contenido disponible
            </span>
          )}
        </h2>
        
        {/* PANEL DE DEPURACIÓN MEJORADO - SIEMPRE VISIBLE */}
        <div className="bg-amber-50 p-4 rounded-md border border-amber-200 mb-6">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Estado de parsedAIContent:</p>
              <span className="px-2 py-1 text-xs rounded-full bg-white border">
                {Object.keys(parsedAIContent).length > 0 ? (
                  <span className="text-green-600 font-medium">Datos cargados ✓ ({Object.keys(parsedAIContent).length} secciones)</span>
                ) : (
                  <span className="text-red-600 font-medium">Sin datos ✗</span>
                )}
              </span>
            </div>
            <div className="text-xs bg-white p-2 rounded border border-amber-200 mb-2">
              <p className="font-semibold">Claves disponibles:</p>
              <p className="font-mono">{Object.keys(parsedAIContent).join(', ') || 'Ninguna'}</p>
            </div>
            <div className="text-xs bg-white p-2 rounded border border-amber-200">
              <p className="font-semibold">Modo debug - Contenido JSON:</p>
              <pre className="overflow-auto max-h-32 font-mono text-[10px] mt-1">
                {JSON.stringify(parsedAIContent, null, 2)}
              </pre>
            </div>
          </div>
        </div>
        
        {/* RENDERIZADO DIRECTO FORZADO DE LAS TARJETAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {Object.entries(parsedAIContent).map(([key, section]) => (
            <div key={key} className="bg-white rounded-lg border border-blue-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center">
                {section.icon}
                <h3 className="ml-2 font-medium text-blue-800">{section.title}</h3>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  {Array.isArray(section.content) && section.content.length > 0 ? (
                    section.content.map((item, idx) => (
                      <li key={idx} className="text-sm pl-3 border-l-2 border-blue-400 py-1">
                        {item}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-500 italic">No hay contenido disponible</li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
        
        {/* BOTÓN DE GENERACIÓN SIEMPRE VISIBLE */}
        <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-700 mb-3">
            {Object.keys(parsedAIContent).length > 0 ? 
              "Puede regenerar las recomendaciones en cualquier momento:" :
              "Seleccione un grupo y genere nuevas recomendaciones:"
            }
          </p>
          
          <Button 
            onClick={() => generateMutation.mutate()} 
            disabled={!selectedGroupId || generateMutation.isPending}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {generateMutation.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generando recomendaciones...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {Object.keys(parsedAIContent).length > 0 ? "Regenerar Recomendaciones" : "Generar Recomendaciones"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeacherRecommendationsPage;