import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Brain, Users, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react";

interface Student {
  id: number;
  nombre: string;
  nivel: string;
  matricula: string;
  hasRecommendation: boolean;
}

interface BatchGenerationRequest {
  studentIds: number[];
}

interface BatchGenerationResponse {
  success: boolean;
  results: {
    studentId: number;
    studentName: string;
    success: boolean;
    error?: string;
  }[];
  totalProcessed: number;
  successCount: number;
  errorCount: number;
}

export default function IARecommendationsBatchPage() {
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [aiServiceUnavailable, setAiServiceUnavailable] = useState(true); // Temporarily disabled
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all students with their recommendation status
  const { data: students, isLoading, error, refetch } = useQuery<Student[]>({
    queryKey: ["/api/students/ia-recommendations-status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/students/ia-recommendations-status");
      return response.json();
    },
  });

  // Batch generation mutation
  const batchGenerationMutation = useMutation({
    mutationFn: async (request: BatchGenerationRequest) => {
      const response = await apiRequest("POST", "/api/ia-recommendations/batch-generate", request);
      return response.json() as Promise<BatchGenerationResponse>;
    },
    onSuccess: (data) => {
      // Show detailed results
      const successfulGenerations = data.results.filter(r => r.success);
      const failedGenerations = data.results.filter(r => !r.success);
      
      if (successfulGenerations.length > 0) {
        toast({
          title: "Generación por lote completada",
          description: `Se generaron ${successfulGenerations.length} recomendaciones exitosamente.`,
        });
      }
      
      if (failedGenerations.length > 0) {
        toast({
          title: "Algunos errores encontrados",
          description: `${failedGenerations.length} recomendaciones no pudieron generarse.`,
          variant: "destructive",
        });
      }
      
      // Clear selection and refresh data
      setSelectedStudents([]);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/students/ia-recommendations-status"] });
    },
    onError: (error) => {
      console.error('Error en generación por lote:', error);
      
      let errorMessage = "Error al generar recomendaciones por lote.";
      
      if (error instanceof Error) {
        const errorText = error.message;
        if (errorText.includes('429')) {
          errorMessage = "No se pudieron generar las recomendaciones porque se ha alcanzado el límite de uso de la IA.";
        } else if (errorText.includes('402')) {
          errorMessage = "Error de configuración de la IA. Por favor, contacta al administrador técnico.";
        } else if (errorText.includes('503')) {
          errorMessage = "El servicio de IA no está disponible temporalmente.";
        }
      }
      
      toast({
        title: "Error en generación por lote",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleStudentSelection = (studentId: number, checked: boolean) => {
    if (checked) {
      // Limit to 5 students maximum
      if (selectedStudents.length < 5) {
        setSelectedStudents([...selectedStudents, studentId]);
      } else {
        toast({
          title: "Límite alcanzado",
          description: "Solo puedes seleccionar hasta 5 estudiantes por lote.",
          variant: "destructive",
        });
      }
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
    }
  };

  const handleSelectAll = () => {
    const studentsWithoutRecommendation = students?.filter(s => !s.hasRecommendation) || [];
    const maxSelectable = Math.min(5, studentsWithoutRecommendation.length);
    const newSelection = studentsWithoutRecommendation.slice(0, maxSelectable).map(s => s.id);
    setSelectedStudents(newSelection);
  };

  const handleClearSelection = () => {
    setSelectedStudents([]);
  };

  const handleBatchGeneration = () => {
    if (selectedStudents.length === 0) return;
    
    if (aiServiceUnavailable) {
      toast({
        title: "Servicio no disponible",
        description: "La generación por lote está temporalmente deshabilitada.",
        variant: "destructive",
      });
      return;
    }

    batchGenerationMutation.mutate({ studentIds: selectedStudents });
  };

  const studentsWithoutRecommendation = students?.filter(s => !s.hasRecommendation) || [];
  const studentsWithRecommendation = students?.filter(s => s.hasRecommendation) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-lg">Cargando estudiantes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar la lista de estudiantes. Por favor, intenta recargar la página.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Brain className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold">Generación por Lote - Recomendaciones IA</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total de Estudiantes</p>
                <p className="text-2xl font-bold">{students?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Con Recomendación</p>
                <p className="text-2xl font-bold text-green-600">{studentsWithRecommendation.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Sin Recomendación</p>
                <p className="text-2xl font-bold text-orange-600">{studentsWithoutRecommendation.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Generación por Lote</CardTitle>
          <CardDescription>
            Selecciona hasta 5 estudiantes sin recomendación para generar sus recomendaciones IA simultáneamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSelectAll}
                disabled={studentsWithoutRecommendation.length === 0 || batchGenerationMutation.isPending}
              >
                Seleccionar Primeros 5
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearSelection}
                disabled={selectedStudents.length === 0 || batchGenerationMutation.isPending}
              >
                Limpiar Selección
              </Button>
              <span className="text-sm text-gray-500">
                ({selectedStudents.length}/5 seleccionados)
              </span>
            </div>

            <div className="flex flex-col items-end space-y-1">
              <Button
                onClick={handleBatchGeneration}
                disabled={aiServiceUnavailable || selectedStudents.length === 0 || batchGenerationMutation.isPending}
                className={`${
                  aiServiceUnavailable 
                    ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                title={aiServiceUnavailable ? "Función temporalmente deshabilitada por límite de uso de la IA" : "Generar recomendaciones para estudiantes seleccionados"}
              >
                {batchGenerationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Generar Recomendaciones IA
                  </>
                )}
              </Button>
              
              {aiServiceUnavailable && (
                <p className="text-xs text-gray-500 text-right">
                  🔒 Función temporalmente deshabilitada por límite de uso de la IA
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students without recommendations */}
      {studentsWithoutRecommendation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-orange-600" />
              <span>Estudiantes sin Recomendación IA</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {studentsWithoutRecommendation.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={(checked) => handleStudentSelection(student.id, checked as boolean)}
                      disabled={batchGenerationMutation.isPending || (selectedStudents.length >= 5 && !selectedStudents.includes(student.id))}
                    />
                    <div>
                      <p className="font-medium">{student.nombre}</p>
                      <p className="text-sm text-gray-500">Matrícula: {student.matricula}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    {student.nivel}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students with recommendations */}
      {studentsWithRecommendation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Estudiantes con Recomendación IA</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {studentsWithRecommendation.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                  <div>
                    <p className="font-medium">{student.nombre}</p>
                    <p className="text-sm text-gray-500">Matrícula: {student.matricula}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {student.nivel}
                    </Badge>
                    <Badge className="bg-green-600">
                      Completado
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {(!students || students.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600">No se encontraron estudiantes en el sistema</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}