import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import CriteriaGradesTable from "@/components/grades-table/CriteriaGradesTable";
import { Button } from "@/components/ui/button";

// Tipos necesarios
interface Student {
  id: number;
  nombreCompleto: string;
  nivel: string;
}

interface EvaluationCriteria {
  id: number;
  nombre: string;
  descripcion: string;
  peso: number;
  escala: string;
}

interface CriteriaGrade {
  id?: number;
  alumnoId: number;
  materiaId: number;
  criterioId: number;
  valor: string;
  periodo: string;
  observaciones: string | null;
}

interface CriteriaGradesResponse {
  criteriaGrades: CriteriaGrade[];
  criteria: EvaluationCriteria[];
  students: Student[];
  success: boolean;
}

export default function DebugCriteriaGrades() {
  // Parámetros de prueba fijos
  const groupId = 2; // 1-A
  const subjectId = 1; // Matemáticas
  
  // Estado para mostrar información de depuración
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [requestHeaders, setRequestHeaders] = useState<HeadersInit>({});
  
  // Verificar token para la depuración
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    console.log("🔑 DEBUG: Token disponible:", token ? "Sí" : "No");
    if (token) {
      console.log("🔑 DEBUG: Token parcial:", `${token.substring(0, 10)}...`);
      
      // Configurar headers para mostrar en la UI
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      setRequestHeaders(headers);
    }
  }, []);

  // Función especializada para obtener calificaciones por criterio
  const fetchCriteriaGrades = async () => {
    console.log(`🔍 DEBUG: Intentando cargar calificaciones por criterio (vista standalone)`);
    console.log(`📊 Parámetros: Grupo ${groupId}, Materia ${subjectId}`);
    
    try {
      // NOTA IMPORTANTE: Este es el endpoint correcto con guión entre "grades" y "criteria"
      const url = `/api/grades-criteria/group/${groupId}/subject/${subjectId}`;
      console.log(`📡 URL completa: ${url}`, "CORRECTO: ¡Este es el endpoint esperado!");
      
      const token = localStorage.getItem("auth_token");
      console.log(`🔑 Token disponible para enviar:`, token ? "Sí" : "No");
      
      const response = await apiRequest("GET", url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Error ${response.status}: ${response.statusText}`);
        console.error("Detalles:", errorText);
        throw new Error(`Error al cargar calificaciones por criterio: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Grades por criterio:", data);
      
      setDebugInfo({
        endpointUsed: url,
        responseStatus: response.status,
        criteriaCount: data.criteria?.length || 0,
        gradesCount: data.criteriaGrades?.length || 0,
        studentsCount: data.students?.length || 0,
        firstCriterion: data.criteria?.[0] || null,
        firstGrade: data.criteriaGrades?.[0] || null
      });
      
      return data;
    } catch (error) {
      console.error("❌ ERROR CRÍTICO en depuración:", error);
      setDebugInfo({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  };

  // Consulta para obtener datos
  const { 
    data, 
    isLoading,
    error,
    refetch 
  } = useQuery<CriteriaGradesResponse>({
    queryKey: [`/api/grades-criteria/group/${groupId}/subject/${subjectId}`],
    queryFn: fetchCriteriaGrades,
    retry: 1 // Solo un reintento para evitar demasiadas peticiones fallidas
  });

  // Función para refrescar datos
  const handleRefresh = () => {
    console.log("🔄 Forzando recarga de datos...");
    refetch();
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Depuración - Calificaciones por Criterio</h1>
      <p className="text-muted-foreground mb-6">Esta es una página de depuración para aislar el componente CriteriaGradesTable.</p>
      
      {/* Información del request */}
      <div className="bg-muted p-4 rounded-md mb-6">
        <h2 className="text-lg font-semibold mb-2">Información de la solicitud</h2>
        <pre className="text-xs bg-card p-2 rounded border overflow-auto max-h-40">
          {`Endpoint: /api/grades-criteria/group/${groupId}/subject/${subjectId}\nHeaders: ${JSON.stringify(requestHeaders, null, 2)}`}
        </pre>
        <Button onClick={handleRefresh} className="mt-2">Refrescar datos</Button>
      </div>
      
      {/* Estado de la carga */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        </div>
      )}
      
      {/* Errores */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar datos</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Error desconocido"}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Información de depuración */}
      <div className="bg-muted p-4 rounded-md mb-6">
        <h2 className="text-lg font-semibold mb-2">Información de depuración</h2>
        <pre className="text-xs bg-card p-2 rounded border overflow-auto max-h-80">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
      
      {/* Renderizado condicional del componente */}
      {data && data.criteria && data.criteria.length > 0 ? (
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h3 className="text-xl font-medium mb-4">Calificaciones por Criterio (Debug)</h3>
          <p className="text-muted-foreground mb-6">
            Sistema de evaluación basado en {data.criteria.length} criterios para {data.students?.length || 0} estudiantes.
          </p>
          
          <CriteriaGradesTable
            groupId={groupId}
            subjectId={subjectId}
            groupName={"1-A (Debug)"}
            subjectName={"Matemáticas (Debug)"}
            students={data.students || []}
            criteriaGrades={data.criteriaGrades}
            criteria={data.criteria}
            isLoading={isLoading}
            onRefetch={handleRefresh}
          />
        </div>
      ) : !isLoading && !error ? (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No hay criterios de evaluación</AlertTitle>
          <AlertDescription>
            No se encontraron criterios de evaluación para esta materia y grupo, o la respuesta no tiene el formato esperado.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}