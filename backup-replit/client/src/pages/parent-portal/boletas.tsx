import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

// Componente para mostrar indicadores dinámicos de cada estudiante
function StudentReportIndicators({ studentId }: { studentId: number }) {
  const { data: reportCard, isLoading } = useQuery({
    queryKey: [`/api/parent-portal/report-cards/${studentId}`],
    enabled: !!studentId,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Calcular promedio general desde los datos reales
  const calculateOverallAverage = () => {
    if (!reportCard?.reportCard || reportCard.reportCard.length === 0) return null;
    
    let totalSum = 0;
    let totalCount = 0;
    
    reportCard.reportCard.forEach((subject: any) => {
      subject.periods.forEach((period: any) => {
        if (period.average && period.average > 0) {
          totalSum += period.average;
          totalCount++;
        }
      });
    });
    
    return totalCount > 0 ? (totalSum / totalCount).toFixed(1) : null;
  };

  const overallAverage = calculateOverallAverage();
  // Buscar asistencia en los datos del estudiante
  const attendancePercentage = reportCard?.student?.attendancePercentage || 
                               reportCard?.attendance?.percentage ||
                               reportCard?.attendanceData?.percentage;

  if (isLoading) {
    return (
      <div className="mt-3 p-2 bg-gray-50 rounded-lg border">
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1 text-gray-500">
            📊 Cargando promedio...
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            📘 Cargando asistencia...
          </div>
        </div>
      </div>
    );
  }

  // Solo mostrar el bloque si tenemos al menos uno de los datos
  if (!overallAverage && !attendancePercentage) {
    return null;
  }

  return (
    <div className="mt-3 p-2 bg-gray-50 rounded-lg border">
      <div className="flex justify-between items-center text-xs">
        {overallAverage && (
          <div className="flex items-center gap-1 text-green-700">
            📊 Promedio general: <span className="font-semibold">{overallAverage}</span>
          </div>
        )}
        {attendancePercentage && (
          <div className="flex items-center gap-1 text-blue-700">
            📘 Asistencia: <span className="font-semibold">{attendancePercentage}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Página de Boletas Académicas para el portal de padres
 * Muestra la selección de estudiantes vinculados al padre
 */
export default function BoletasPage() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Obtener lista de estudiantes vinculados al padre
  const { data: children, isLoading } = useQuery({
    queryKey: [`/api/parents/${user?.id}/students`],
    enabled: !!user?.id,
  });

  // Filtrar estudiantes por término de búsqueda
  const filteredChildren = Array.isArray(children)
    ? children.filter((child) =>
        child.nombreCompleto?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando estudiantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Boletas Académicas</h1>
            <p className="text-muted-foreground">Consulta el desempeño académico detallado de tus hijos</p>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar estudiante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChildren.map((child) => (
          <Card 
            key={child.id}
            className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
            onClick={() => navigate(`/portal-padres/boletas/${child.id}`)}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                  {child.nivel || "Preparatoria"}
                </Badge>
                {child.grupo && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">
                    Grupo {child.grupo}
                  </Badge>
                )}
              </div>
              <div className="flex items-center mt-3">
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarImage src={child.fotoUrl || ""} alt={child.nombreCompleto} />
                  <AvatarFallback>{child.nombreCompleto?.charAt(0) || "E"}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{child.nombreCompleto}</CardTitle>
                  <CardDescription>{`Matrícula: ${child.matricula || child.id}`}</CardDescription>
                  <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    📅 Periodo: {new Date().toLocaleDateString('es-ES', { month: 'long' })} – {new Date(Date.now() + 60*24*60*60*1000).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <p className="text-sm text-muted-foreground">
                Esta boleta académica integra todos los datos de desempeño académico y asistencia. 
                Para más detalle, puedes descargar la versión en PDF.
              </p>
              
              {/* Indicadores clave con datos reales */}
              <StudentReportIndicators studentId={child.id} />
            </CardContent>
            <CardFooter className="pt-0">
              <Button 
                className="w-full text-center" 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/portal-padres/boletas/${child.id}`);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                Ver Boleta
              </Button>
              
              {/* Indicador de consulta */}
              <div className="mt-2 text-center">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                  📥 Boleta consultada
                </p>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {filteredChildren.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <FileText className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? "No se encontraron estudiantes" : "No hay estudiantes vinculados"}
          </h3>
          <p className="text-muted-foreground">
            {searchTerm 
              ? "Intenta con un término de búsqueda diferente." 
              : "No hay estudiantes vinculados a este padre de familia."}
          </p>
        </div>
      )}
    </div>
  );
}