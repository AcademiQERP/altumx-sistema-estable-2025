import { useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Student, Subject, Group, CriteriaGrade, EvaluationCriteria } from "@shared/schema";
import { BarChart, PlusCircle, ArrowLeft, AlertCircle } from "lucide-react";
import CriteriaGradesTable from "@/components/grades-table/CriteriaGradesTable";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

export default function GroupSubjectGrades() {
  const params = useParams();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const groupId = parseInt(params.groupId);
  const subjectId = parseInt(params.subjectId);
  const isValidParams = !isNaN(groupId) && !isNaN(subjectId);

  // Consultar datos del grupo y materia
  const { data: group } = useQuery<Group>({
    queryKey: ["/api/groups", groupId],
    enabled: isValidParams,
  });

  const { data: subject } = useQuery<Subject>({
    queryKey: ["/api/subjects", subjectId],
    enabled: isValidParams,
  });

  // Consultar estudiantes del grupo
  const { data: students, isLoading: isLoadingStudents, error: studentsError } = useQuery<Student[]>({
    queryKey: [`/api/students/group/${groupId}`],
    enabled: isValidParams && !!groupId,
    // No especificamos queryFn para usar el predeterminado que maneja autenticación
  });

  // Agregar logging para depuración
  useEffect(() => {
    console.log("Parámetros de la página:", { groupId, subjectId, isValidParams });
    console.log("Datos de estudiantes:", { students, isLoadingStudents, studentsError });
  }, [groupId, subjectId, students, isLoadingStudents, studentsError]);

  // Nota: Se ha eliminado la consulta para calificaciones tradicionales, 
  // ahora usaremos exclusivamente las calificaciones por criterio
  
  // Consultar calificaciones por criterio (nuevo sistema)
  interface CriteriaGradesResponse {
    criteriaGrades: CriteriaGrade[];
    criteria: EvaluationCriteria[];
    students: Student[];
    success: boolean;
  }
  
  // Utilizamos apiRequest para cargar las calificaciones por criterio
  // para garantizar que se incluyan los headers de autenticación correctamente
  const fetchCriteriaGrades = async () => {
    console.log(`🔍 DEBUG: Intentando cargar calificaciones por criterio para grupo ${groupId}, materia ${subjectId}`);
    
    // Usar la función centralizada apiRequest para garantizar autenticación
    try {
      const url = `/api/grades-criteria/group/${groupId}/subject/${subjectId}`;
      console.log(`📡 DEBUG: URL completa: ${url}`);
      
      // Usar apiRequest desde queryClient para garantizar que se envíen headers auth
      const response = await apiRequest("GET", url);
      
      if (!response.ok) {
        console.error(`❌ DEBUG: Error en la solicitud de criterios: ${response.status} ${response.statusText}`);
        console.error('Detalles completos:', await response.text());
        throw new Error(`Error al cargar calificaciones por criterio: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ DEBUG: Datos de calificaciones por criterio recibidos:`, data);
      return data;
    } catch (error) {
      console.error(`❌ ERROR CRÍTICO al cargar calificaciones por criterio:`, error);
      throw error;
    }
  };
  
  const { 
    data: criteriaGradesData, 
    isLoading: isLoadingCriteriaGrades,
    refetch: refetchCriteriaGrades,
    error: criteriaGradesError 
  } = useQuery<CriteriaGradesResponse>({
    queryKey: [`/api/grades-criteria/group/${groupId}/subject/${subjectId}`],
    enabled: isValidParams && !!groupId && !!subjectId,
    // Usamos una función personalizada para asegurar que los headers se envíen correctamente
    queryFn: fetchCriteriaGrades
  });
  
  // Log para depuración de calificaciones
  useEffect(() => {
    // Verificar y mostrar información del token
    const token = localStorage.getItem("auth_token");
    console.log("🔑 Token JWT disponible:", token ? `${token.substring(0, 15)}...` : "No hay token");
    
    // Datos de calificaciones por criterio
    console.log("Datos de calificaciones por criterio:", { criteriaGradesData, isLoadingCriteriaGrades, criteriaGradesError });
    console.log("Rendering CriteriaGradesTable", criteriaGradesData); // Log añadido según instrucción
    
    // Mensaje detallado de error, si existe
    if (criteriaGradesError) {
      console.error("Error detallado en calificaciones por criterio:", criteriaGradesError);
    }
  }, [criteriaGradesData, isLoadingCriteriaGrades, criteriaGradesError]);

  // Función para refrescar los datos
  const refreshData = () => {
    refetchCriteriaGrades();
  };

  if (!isValidParams) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <BarChart className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Parámetros inválidos</h2>
        <p className="text-muted-foreground mb-6">No se pudo cargar la información solicitada.</p>
        <Button onClick={() => navigate("/grades")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a calificaciones
        </Button>
      </div>
    );
  }

  const isLoading = isLoadingStudents || !group || !subject;
  const isLoadingCriteria = isLoadingCriteriaGrades || !criteriaGradesData;
  const hasCriteriaGrades = criteriaGradesData && criteriaGradesData.criteria && criteriaGradesData.criteria.length > 0;

  // Verificar si hay algún error en los datos
  const hasError = criteriaGradesError;
  const showErrorMessage = criteriaGradesError;
  
  // Logs adicionales para depurar estado de carga de criterios
  useEffect(() => {
    console.log("⭐ Estado de calificaciones por criterio:", {
      isLoadingCriteria,
      hasCriteriaGrades: !!criteriaGradesData,
      criteriaGradesError,
      criteriaEndpoint: `/api/grades-criteria/group/${groupId}/subject/${subjectId}`
    });
    
    if (criteriaGradesError) {
      console.error("❌ Error detallado en calificaciones por criterio:", criteriaGradesError);
    }
    
    if (criteriaGradesData) {
      console.log("✅ Datos de calificaciones por criterio recibidos:", criteriaGradesData);
    }
  }, [groupId, subjectId, criteriaGradesData, isLoadingCriteria, criteriaGradesError]);
  
  // Log adicional para verificar la URL exacta que se está usando
  useEffect(() => {
    console.log("⭐ Sistema de calificaciones por criterio activado");
    console.log("🌐 URL endpoint de criterios:", `/api/grades-criteria/group/${groupId}/subject/${subjectId}`);
    console.log("🔑 Token JWT activo:", localStorage.getItem("auth_token") ? "Presente" : "No presente");
  }, [groupId, subjectId]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Calificaciones por Grupo y Materia</h1>
        <div className="flex items-center text-sm">
          <Link href="/">
            <span className="text-primary cursor-pointer">Inicio</span>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href="/calificaciones">
            <span className="text-primary cursor-pointer">Calificaciones</span>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>Grupo y Materia</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          {isLoading ? (
            <div className="flex items-center space-x-2 h-7 animate-pulse">
              <div className="h-5 w-48 bg-gray-200 rounded"></div>
              <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </div>
          ) : (
            <h2 className="text-lg font-medium">
              {subject?.nombre} - {group?.nombre}
            </h2>
          )}
          <p className="text-sm text-muted-foreground">
            {group?.cicloEscolar || ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/calificaciones")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Link href="/grades/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Calificación Manual
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Mensaje de error en caso necesario */}
      {showErrorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar calificaciones</AlertTitle>
          <AlertDescription>
            Ocurrió un error al intentar cargar las calificaciones. Por favor, intenta nuevamente o contacta al administrador.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Sistema de calificaciones por criterio - Con mejor experiencia de carga */}
      {isLoadingCriteria && !hasCriteriaGrades ? (
        <div className="bg-card p-6 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-col space-y-6">
            {/* Skeleton para título y descripción */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-7 w-64 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-9 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-5 w-80 bg-gray-200/70 rounded animate-pulse mb-6"></div>
            </div>
            
            {/* Skeleton para pestañas de trimestres */}
            <div className="border-b mb-4">
              <div className="flex space-x-6 mb-2">
                <div className="h-8 w-24 bg-gray-200 rounded-t animate-pulse"></div>
                <div className="h-8 w-24 bg-gray-200/50 rounded-t animate-pulse"></div>
                <div className="h-8 w-24 bg-gray-200/50 rounded-t animate-pulse"></div>
              </div>
            </div>
            
            {/* Skeleton para la tabla de calificaciones */}
            <div className="rounded-md border overflow-hidden">
              {/* Encabezados de la tabla */}
              <div className="grid grid-cols-5 gap-4 p-3 bg-gray-50 border-b">
                <div className="h-6 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-6 w-full bg-gray-200 rounded animate-pulse"></div>
              </div>
              
              {/* Filas de estudiantes simulados */}
              {[1, 2, 3].map((index) => (
                <div key={index} className="grid grid-cols-5 gap-4 p-4 border-b">
                  <div className="flex items-center space-x-2">
                    <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mx-auto"></div>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mx-auto"></div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-center py-2">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-3"></div>
              <p className="text-muted-foreground text-sm font-medium">Cargando datos del grupo...</p>
            </div>
          </div>
        </div>
      ) : criteriaGradesError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar calificaciones por criterio</AlertTitle>
          <AlertDescription>
            {criteriaGradesError instanceof Error ? criteriaGradesError.message : "Error desconocido"}
          </AlertDescription>
        </Alert>
      ) : !hasCriteriaGrades ? (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No hay criterios de evaluación asignados</AlertTitle>
          <AlertDescription>
            No se encontraron criterios de evaluación para esta materia y grupo. Comunícate con el administrador para configurarlos.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h3 className="text-xl font-medium mb-4">Calificaciones por Criterio</h3>
          <p className="text-muted-foreground mb-6">
            Sistema de evaluación basado en {criteriaGradesData.criteria.length} criterios para {students?.length || 0} estudiantes.
          </p>
          
          <CriteriaGradesTable
            groupId={groupId}
            subjectId={subjectId}
            groupName={group?.nombre}
            subjectName={subject?.nombre}
            students={students || []}
            criteriaGrades={criteriaGradesData.criteriaGrades}
            criteria={criteriaGradesData.criteria}
            isLoading={isLoadingCriteria}
            onRefetch={refreshData}
          />
        </div>
      )}
    </>
  );
}