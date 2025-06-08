import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Brain, Calendar, User, FileText, Search, RefreshCw, History, Eye, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import jsPDF from 'jspdf';

interface Student {
  id: number;
  nombre: string;
  nivel: string;
}

interface Recommendation {
  id: string;
  texto: string;
  fecha_generacion: string;
  cached: boolean;
  generated_by_admin?: boolean;
}

interface IARecommendationResponse {
  student: Student;
  recommendation: Recommendation;
}

interface HistoryItem {
  id: string;
  version: number;
  fecha_generacion: string;
  tipo_generacion: string;
  modo_generacion: string;
  generado_por: string;
  preview: string;
}

interface IAHistoryResponse {
  student: Student;
  history: HistoryItem[];
}

interface HistoryDetailResponse {
  id: string;
  student: Student | null;
  version: number;
  contenido: string;
  fecha_generacion: string;
  tipo_generacion: string;
  modo_generacion: string;
  generado_por: string;
}

export default function IARecommendationsPage() {
  const [studentId, setStudentId] = useState<string>("");
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [aiServiceUnavailable, setAiServiceUnavailable] = useState(true); // Temporarily disabled
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Phase 5: PDF Export Function
  const generatePDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 6;
    let yPosition = margin;

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("RECOMENDACIÓN ACADÉMICA IA", pageWidth / 2, yPosition, { align: "center" });
    yPosition += lineHeight * 2;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Sistema Educativo ALTUM - AcademiQ", pageWidth / 2, yPosition, { align: "center" });
    yPosition += lineHeight * 3;

    // Student Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMACIÓN DEL ESTUDIANTE", margin, yPosition);
    yPosition += lineHeight * 1.5;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${data.student.nombre}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`ID del Estudiante: ${data.student.id}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`Nivel Académico: ${data.student.nivel}`, margin, yPosition);
    yPosition += lineHeight * 2;

    // Generation Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMACIÓN DE GENERACIÓN", margin, yPosition);
    yPosition += lineHeight * 1.5;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const generationDate = format(new Date(data.recommendation.fecha_generacion), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
    doc.text(`Fecha de Generación: ${generationDate}`, margin, yPosition);
    yPosition += lineHeight;
    
    const modeText = data.recommendation.cached ? "Modo Simulado (Desarrollo)" : "Generación Real (Claude AI)";
    doc.text(`Modo de Generación: ${modeText}`, margin, yPosition);
    yPosition += lineHeight;
    
    if (data.recommendation.generated_by_admin) {
      doc.text("Tipo: Regeneración Manual por Administrador", margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += lineHeight;

    // Recommendation Content
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CONTENIDO DE LA RECOMENDACIÓN", margin, yPosition);
    yPosition += lineHeight * 1.5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Split text into lines to fit page width
    const maxWidth = pageWidth - (margin * 2);
    const textLines = doc.splitTextToSize(data.recommendation.texto, maxWidth);
    
    for (let i = 0; i < textLines.length; i++) {
      if (yPosition > pageHeight - margin * 2) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(textLines[i], margin, yPosition);
      yPosition += lineHeight * 0.8;
    }

    // Footer
    yPosition = pageHeight - margin * 2;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Recomendación generada por Inteligencia Artificial | Sistema AcademiQ", pageWidth / 2, yPosition, { align: "center" });
    
    yPosition += lineHeight;
    doc.text(`ID de Recomendación: ${data.recommendation.id}`, pageWidth / 2, yPosition, { align: "center" });

    // Save PDF
    const fileName = `Recomendacion_IA_${data.student.nombre.replace(/\s+/g, '_')}_${data.student.id}.pdf`;
    doc.save(fileName);

    toast({
      title: "PDF Generado",
      description: `La recomendación IA de ${data.student.nombre} se ha descargado exitosamente.`,
    });
  };

  const { data, error, isLoading, refetch } = useQuery<IARecommendationResponse>({
    queryKey: [`/api/ia-recommendation/${studentId}`],
    enabled: false, // Manual trigger only
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<IAHistoryResponse>({
    queryKey: [`/api/ia-recommendation/${studentId}/history`],
    enabled: !!studentId && showHistory,
  });

  const { data: historyDetailData, isLoading: historyDetailLoading } = useQuery<HistoryDetailResponse>({
    queryKey: [`/api/ia-recommendation-history/${selectedHistoryId}`],
    enabled: !!selectedHistoryId,
  });

  const regenerateMutation = useMutation({
    mutationFn: async (currentStudentId: string) => {
      const response = await apiRequest('POST', `/api/ia-recommendation/${currentStudentId}/refresh`);
      return response.json();
    },
    onSuccess: (newData) => {
      // Update the cache with the new recommendation
      queryClient.setQueryData([`/api/ia-recommendation/${studentId}`], newData);
      toast({
        title: "Recomendación regenerada",
        description: "La recomendación IA ha sido regenerada exitosamente con nuevos datos de Claude.",
      });
    },
    onError: async (error) => {
      console.error('Error regenerando recomendación:', error);
      
      let errorMessage = "No se pudo regenerar la recomendación. Intenta nuevamente.";
      
      if (error instanceof Error) {
        try {
          // Extract HTTP status code from error message
          const errorText = error.message;
          
          if (errorText.includes('429')) {
            errorMessage = "No se pudo regenerar la recomendación porque se ha alcanzado el límite de uso de la IA. Por favor, contacta al administrador.";
          } else if (errorText.includes('402')) {
            errorMessage = "Error de configuración de la IA. Por favor, contacta al administrador técnico.";
          } else if (errorText.includes('503')) {
            errorMessage = "El servicio de IA no está disponible temporalmente. Inténtalo más tarde.";
          }
        } catch (parseError) {
          // Use default message if parsing fails
        }
      }
      
      toast({
        title: "Error al regenerar",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleSearch = () => {
    if (studentId && !isNaN(parseInt(studentId))) {
      setSearchTriggered(true);
      refetch();
    }
  };

  const handleRegenerateRecommendation = () => {
    if (!studentId) return;
    
    toast({
      title: "Generando recomendación con IA...",
      description: "Por favor espera mientras Claude genera una nueva recomendación.",
    });
    
    regenerateMutation.mutate(studentId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Brain className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Recomendaciones IA</h1>
          <p className="text-gray-600">Consulta las recomendaciones generadas por inteligencia artificial</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Buscar Recomendación</span>
          </CardTitle>
          <CardDescription>
            Ingresa el ID del estudiante para consultar su recomendación generada por IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="studentId">ID del Estudiante</Label>
              <Input
                id="studentId"
                type="number"
                placeholder="Ej: 4"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                onKeyPress={handleKeyPress}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleSearch}
                disabled={!studentId || isNaN(parseInt(studentId)) || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && searchTriggered && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            🧠 Este estudiante aún no tiene una recomendación generada.
            <br />
            Cuando el servicio de IA esté disponible, podrás generarla desde aquí.
          </AlertDescription>
        </Alert>
      )}

      {data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>{data.student.nombre}</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={generatePDF}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                >
                  <Download className="h-4 w-4" />
                  <span>Descargar PDF</span>
                </Button>
                <Button
                  onClick={() => setShowHistory(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <History className="h-4 w-4" />
                  <span>Ver Historial</span>
                </Button>
                <Badge variant="outline">
                  {data.student.nivel}
                </Badge>
              </div>
            </div>
            <CardDescription>
              Estudiante ID: {data.student.id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>
                  Generada: {format(new Date(data.recommendation.fecha_generacion), "PPP 'a las' p", { locale: es })}
                </span>
              </div>
              <Badge variant={data.recommendation.cached ? "secondary" : "default"}>
                {data.recommendation.cached ? "Desde caché" : "Recién generada"}
              </Badge>
            </div>

            <Separator />

            <div>
              <div className="flex items-center space-x-2 mb-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Recomendación Predictiva</h3>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {data.recommendation.texto}
                </div>
              </div>
              
              {/* Informative footer */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm text-blue-700 flex items-center justify-between">
                  <span>
                    🗓️ Generada el: {new Date(data.recommendation.fecha_generacion).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="text-xs">
                    Fuente: IA Claude Sonnet | Tipo: Vocacional
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                ID de recomendación: {data.recommendation.id}
              </div>
              
              <div className="flex flex-col items-end space-y-1">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleRegenerateRecommendation}
                  disabled={aiServiceUnavailable || regenerateMutation.isPending}
                  className={`flex items-center space-x-2 ${
                    aiServiceUnavailable 
                      ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  title={aiServiceUnavailable ? "🔒 Función temporalmente deshabilitada por límite de uso de la IA" : "Regenerar recomendación con Claude AI"}
                >
                  <RefreshCw className={`h-4 w-4 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>
                    {regenerateMutation.isPending ? 'Regenerando...' : '🔄 Regenerar Recomendación IA'}
                  </span>
                </Button>
                {aiServiceUnavailable && (
                  <p className="text-xs text-gray-500 text-right">
                    🔒 Función temporalmente deshabilitada por límite de uso de la IA
                  </p>
                )}
              </div>
            </div>

            {data.recommendation.generated_by_admin && (
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  ⚙️ Regenerado Manualmente
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {searchTriggered && !data && !error && !isLoading && (
        <Alert>
          <AlertDescription>
            No se encontró recomendación IA para el estudiante especificado.
          </AlertDescription>
        </Alert>
      )}

      {/* Phase 4: IA Recommendation History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <History className="h-5 w-5" />
              <span>Historial de Recomendaciones IA</span>
              {data && (
                <Badge variant="outline" className="ml-2">
                  {data.student.nombre}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex space-x-4 h-full overflow-hidden">
            {/* History List */}
            <div className="w-1/2 border-r pr-4 overflow-y-auto">
              <h3 className="font-medium mb-3 flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Versiones Generadas</span>
              </h3>
              
              {historyLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : historyData?.history && historyData.history.length > 0 ? (
                <div className="space-y-2">
                  {historyData.history.map((item) => (
                    <Card
                      key={item.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedHistoryId === item.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedHistoryId(item.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">
                            v{item.version}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              item.tipo_generacion === 'individual' 
                                ? 'text-blue-600 border-blue-600' 
                                : 'text-green-600 border-green-600'
                            }`}
                          >
                            {item.tipo_generacion === 'individual' ? 'Individual' : 'Masiva'}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              item.modo_generacion === 'simulado' 
                                ? 'text-orange-600 border-orange-600' 
                                : 'text-purple-600 border-purple-600'
                            }`}
                          >
                            {item.modo_generacion === 'simulado' ? 'Simulado' : 'Real'}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedHistoryId(item.id);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="text-xs text-gray-600 mb-1">
                        {format(new Date(item.fecha_generacion), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                      </div>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        Generado por: {item.generado_por}
                      </div>
                      
                      <div className="text-xs text-gray-700 line-clamp-2">
                        {item.preview}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>No hay historial disponible para este estudiante</p>
                </div>
              )}
            </div>

            {/* History Detail */}
            <div className="w-1/2 pl-4 overflow-y-auto">
              <h3 className="font-medium mb-3 flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Detalle de la Recomendación</span>
              </h3>
              
              {selectedHistoryId ? (
                historyDetailLoading ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="h-32 bg-gray-100 rounded animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                  </div>
                ) : historyDetailData ? (
                  <div className="space-y-4">
                    <div className="border-b pb-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="secondary">
                          Versión {historyDetailData.version}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={`${
                            historyDetailData.tipo_generacion === 'individual' 
                              ? 'text-blue-600 border-blue-600' 
                              : 'text-green-600 border-green-600'
                          }`}
                        >
                          {historyDetailData.tipo_generacion === 'individual' ? 'Individual' : 'Masiva'}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={`${
                            historyDetailData.modo_generacion === 'simulado' 
                              ? 'text-orange-600 border-orange-600' 
                              : 'text-purple-600 border-purple-600'
                          }`}
                        >
                          {historyDetailData.modo_generacion === 'simulado' ? 'Simulado' : 'Real'}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-1">
                        {format(new Date(historyDetailData.fecha_generacion), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        Generado por: {historyDetailData.generado_por}
                      </div>
                    </div>
                    
                    <div className="prose prose-sm max-w-none">
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <div className="whitespace-pre-wrap text-sm text-gray-800">
                          {historyDetailData.contenido}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>Error al cargar el detalle de la recomendación</p>
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Selecciona una versión del historial para ver su contenido completo</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}