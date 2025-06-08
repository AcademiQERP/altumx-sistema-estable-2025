import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, Clock, Eye, AlertCircle, Zap, Loader2, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface StudentBatchStatus {
  id: string;
  nombre: string;
  tieneRecomendacion: boolean;
}

interface BatchGenerationResult {
  success: boolean;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  results: Array<{
    studentId: number;
    studentName: string;
    success: boolean;
    error?: string;
  }>;
}

export default function BatchIAViewer() {
  const [aiServiceUnavailable] = useState(true); // Permanently disabled - Claude service unavailable
  const [generatingStudents, setGeneratingStudents] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: students, isLoading, error } = useQuery({
    queryKey: ['/api/ia/batch-status'],
    enabled: true,
  });

  const batchGenerationMutation = useMutation({
    mutationFn: async (): Promise<BatchGenerationResult> => {
      const response = await apiRequest("POST", "/api/ia/batch-generate");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Simulación completada",
        description: `Las recomendaciones han sido generadas en modo seguro. Procesados: ${data.totalProcessed}, Éxitos: ${data.successCount}`,
      });
      
      // Refresh the batch status
      queryClient.invalidateQueries({ queryKey: ['/api/ia/batch-status'] });
    },
    onError: (error) => {
      console.error('Error en generación por lotes:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la generación por lotes",
        variant: "destructive",
      });
    },
  });

  const individualGenerationMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const response = await apiRequest("POST", `/api/ia-recommendation/${studentId}/refresh?mode=simulated`);
      return response.json();
    },
    onSuccess: (data, studentId) => {
      toast({
        title: "Recomendación generada",
        description: "La recomendación ha sido generada en modo simulado",
      });
      
      // Remove from generating set
      setGeneratingStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
      
      // Refresh the batch status
      queryClient.invalidateQueries({ queryKey: ['/api/ia/batch-status'] });
    },
    onError: (error, studentId) => {
      console.error('Error en generación individual:', error);
      toast({
        title: "Error",
        description: "No se pudo generar la recomendación",
        variant: "destructive",
      });
      
      // Remove from generating set
      setGeneratingStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Cargando estado de recomendaciones IA...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error al cargar datos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>No se pudo cargar el estado de las recomendaciones IA</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const studentsData = students as StudentBatchStatus[] || [];
  const totalStudents = studentsData.length;
  const studentsWithRecommendations = studentsData.filter(s => s.tieneRecomendacion).length;
  const pendingStudents = totalStudents - studentsWithRecommendations;

  const handleBatchGeneration = () => {
    batchGenerationMutation.mutate();
  };

  const handleIndividualGeneration = (studentId: string) => {
    // Add to generating set to prevent multiple clicks
    setGeneratingStudents(prev => new Set(prev).add(studentId));
    individualGenerationMutation.mutate(studentId);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Visor de Recomendaciones IA por Lotes</h1>
          <p className="text-muted-foreground mt-2">
            Administra el estado de las recomendaciones de IA para todos los estudiantes
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Estudiantes</CardTitle>
              <Badge variant="outline">{totalStudents}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recomendaciones Generadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{studentsWithRecommendations}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{pendingStudents}</div>
            </CardContent>
          </Card>
        </div>

        {/* Batch Generation Section */}
        {pendingStudents > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generación por Lotes</CardTitle>
              <CardDescription>
                Generar recomendaciones para todos los estudiantes pendientes en modo simulado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          onClick={handleBatchGeneration}
                          disabled={aiServiceUnavailable || batchGenerationMutation.isPending}
                          variant="default"
                          size="lg"
                        >
                          {batchGenerationMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generando...
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4 mr-2" />
                              Generar Todas ({pendingStudents})
                            </>
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {aiServiceUnavailable ? 
                        "Servicio de IA no disponible. Vuelve a intentarlo más tarde." :
                        "Generar recomendaciones simuladas para todos los estudiantes pendientes"
                      }
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {aiServiceUnavailable && (
                  <div className="text-sm text-orange-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Modo simulado activado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Estudiantes</CardTitle>
            <CardDescription>
              Estado actual de las recomendaciones IA por estudiante
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentsData.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No se encontraron estudiantes</p>
                </div>
              ) : (
                studentsData.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-medium">{student.nombre}</h3>
                        <p className="text-sm text-muted-foreground">ID: {student.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {student.tieneRecomendacion ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Generada
                            </Badge>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-orange-600" />
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              Pendiente
                            </Badge>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {!student.tieneRecomendacion && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Button
                                    onClick={() => handleIndividualGeneration(student.id)}
                                    disabled={aiServiceUnavailable || generatingStudents.has(student.id)}
                                    variant="default"
                                    size="sm"
                                  >
                                    {generatingStudents.has(student.id) ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Regenerando...
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Generar
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {aiServiceUnavailable ? 
                                  "Servicio de IA no disponible. Vuelve a intentarlo más tarde." :
                                  "Generar recomendación simulada para este estudiante"
                                }
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {student.tieneRecomendacion && (
                          <Link href={`/admin/ia-recommendations?id=${student.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}