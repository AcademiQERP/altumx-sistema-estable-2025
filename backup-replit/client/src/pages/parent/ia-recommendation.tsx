/**
 * Parent IA Recommendation Page - STABLE VERSION v1.0
 * 
 * VERSIÓN ESTABLE - 5 de junio de 2025
 * Estado: Producción Lista ✅
 * 
 * Funcionalidades completadas:
 * - Selector dinámico de estudiantes por padre de familia
 * - Recomendaciones personalizadas basadas en perfiles académicos
 * - Generación de PDF con diseño profesional
 * - Autenticación segura con verificación de tokens JWT
 * - Interfaz responsive optimizada para móvil y escritorio
 * 
 * Correcciones aplicadas:
 * - Mapeo correcto de datos estudiante-recomendación en BD
 * - Sincronización de tokens de autenticación
 * - Eliminación de elementos UI innecesarios (botón "N/A")
 * - Visualización de nombres completos desde base de datos
 * - Ocultamiento condicional de IDs vacíos
 * 
 * Tecnologías utilizadas:
 * - React + TypeScript
 * - shadcn/ui components
 * - TanStack Query para manejo de estado
 * - jsPDF para generación de documentos
 * - date-fns para formateo de fechas
 * 
 * Datos de prueba:
 * - Padre: Fernando Cebreros (3 hijos: Alexa, Dania, Andrea)
 * - Recomendaciones únicas por estudiante en modo simulación
 * - PDF personalizado por estudiante seleccionado
 */

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Calendar, User, FileText, Download, Heart, Users } from "lucide-react";
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
}

interface ParentRecommendationResponse {
  status: "success" | "not_found";
  recommendation?: {
    student: Student;
    recommendation: Recommendation;
  };
  message?: string;
}

interface StudentData {
  id_alumno: number;
  nombre: string;
  nivel: string;
  matricula: string;
}

export default function ParentIARecommendationPage() {
  const { toast } = useToast();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Fetch students dynamically from API
  const { data: studentsData = [], isLoading: isLoadingStudents, error: studentsError } = useQuery<StudentData[]>({
    queryKey: ['/api/parent/me/students'],
  });

  // Fetch IA recommendation for selected student with dynamic endpoint
  const { data, isLoading, error, refetch } = useQuery<ParentRecommendationResponse>({
    queryKey: ['/api/parent/ia-recommendation', selectedStudentId],
    queryFn: selectedStudentId ? 
      ({ queryKey }) => {
        const [, studentId] = queryKey;
        // Get token from the correct localStorage key used by the app
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        
        if (!token) {
          throw new Error('No hay token de autenticación disponible');
        }
        
        return fetch(`/api/parent/ia-recommendation?studentId=${studentId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }).then(async res => {
          if (!res.ok) {
            if (res.status === 403) {
              throw new Error('Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.');
            }
            throw new Error(`Error ${res.status}: ${res.statusText}`);
          }
          return res.json();
        });
      }
      : undefined,
    enabled: selectedStudentId !== null,
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message.includes('sesión ha expirado') || error.message.includes('403')) {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Refetch recommendation when student selection changes
  useEffect(() => {
    if (selectedStudentId !== null) {
      refetch();
    }
  }, [selectedStudentId, refetch]);

  // Set initial student selection to first available student from dynamic data
  useEffect(() => {
    if (selectedStudentId === null && studentsData.length > 0) {
      setSelectedStudentId(studentsData[0].id_alumno);
    }
  }, [selectedStudentId, studentsData]);

  // Debug logging as requested
  console.log('[PARENT UI] Data received:', data);
  console.log('[PARENT UI] Has recommendation:', data?.status === 'success' ? 'Yes' : 'No');

  // Dynamic PDF Export Function for Parents
  const generatePDF = () => {
    if (!data || data.status !== 'success' || !data.recommendation) return;
    
    // Get selected student data for PDF
    const selectedStudent = studentsData.find(s => s.id_alumno === selectedStudentId);
    if (!selectedStudent) return;

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
    doc.text(`Nombre: ${selectedStudent.nombre}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`ID del Estudiante: ${selectedStudent.id_alumno}`, margin, yPosition);
    yPosition += lineHeight;
    doc.text(`Nivel Académico: ${selectedStudent.nivel}`, margin, yPosition);
    yPosition += lineHeight * 2;

    // Generation Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMACIÓN DE GENERACIÓN", margin, yPosition);
    yPosition += lineHeight * 1.5;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    const generationDate = format(new Date(data.recommendation.recommendation.fecha_generacion), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
    doc.text(`Fecha de Generación: ${generationDate}`, margin, yPosition);
    yPosition += lineHeight;
    
    const modeText = data.recommendation.recommendation.cached ? "Modo Simulado (Desarrollo)" : "Generación Real (Claude AI)";
    doc.text(`Modo de Generación: ${modeText}`, margin, yPosition);
    yPosition += lineHeight * 2;

    // Recommendation Content
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CONTENIDO DE LA RECOMENDACIÓN", margin, yPosition);
    yPosition += lineHeight * 1.5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Split text into lines to fit page width
    const maxWidth = pageWidth - (margin * 2);
    const textLines = doc.splitTextToSize(data.recommendation.recommendation.texto, maxWidth);
    
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
    doc.text(`ID de Recomendación: ${data.recommendation.recommendation.id}`, pageWidth / 2, yPosition, { align: "center" });

    // Save PDF
    const fileName = `Recomendacion_IA_${selectedStudent.nombre.replace(/\s+/g, '_')}_${selectedStudent.id_alumno}.pdf`;
    doc.save(fileName);

    toast({
      title: "PDF Descargado",
      description: `La recomendación IA de ${selectedStudent.nombre} se ha descargado exitosamente.`,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Heart className="h-8 w-8 text-pink-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Recomendación IA de su Hijo(a)</h1>
              <p className="text-gray-600">Cargando información...</p>
            </div>
          </div>
          
          {/* Student Selector */}
          <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <Users className="h-5 w-5 text-blue-600" />
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Seleccionar Hijo(a):</label>
              <Select value={selectedStudentId?.toString()} onValueChange={(value) => setSelectedStudentId(Number(value))}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Seleccione un estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {studentsData.map((student) => (
                    <SelectItem key={student.id_alumno} value={student.id_alumno.toString()}>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>{student.nombre} (ID: {student.id_alumno})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Heart className="h-8 w-8 text-pink-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Recomendación IA de su Hijo(a)</h1>
              <p className="text-gray-600">Consulta la recomendación académica personalizada</p>
            </div>
          </div>
          
          {/* Student Selector */}
          <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <Users className="h-5 w-5 text-blue-600" />
            <div className="flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Seleccionar Hijo(a):</label>
              <Select value={selectedStudentId?.toString()} onValueChange={(value) => setSelectedStudentId(Number(value))}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Seleccione un estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {studentsData.map((student) => (
                    <SelectItem key={student.id_alumno} value={student.id_alumno.toString()}>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>{student.nombre} (ID: {student.id_alumno})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            Error al cargar la recomendación. Verifique su conexión o contacte al administrador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Heart className="h-8 w-8 text-pink-600" />
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Recomendación IA de su Hijo(a)</h1>
            <p className="text-gray-600">Consulta la recomendación académica personalizada</p>
          </div>
        </div>
        
        {/* Student Selector - Responsive */}
        <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm w-full lg:w-auto">
          <Users className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex flex-col flex-1 lg:flex-initial">
            <label className="text-sm font-medium text-gray-700 mb-1">Seleccionar Hijo(a):</label>
            <Select value={selectedStudentId?.toString()} onValueChange={(value) => setSelectedStudentId(Number(value))}>
              <SelectTrigger className="w-full lg:w-64">
                <SelectValue placeholder="Seleccione un estudiante" />
              </SelectTrigger>
              <SelectContent>
                {studentsData.map((student) => (
                  <SelectItem key={student.id_alumno} value={student.id_alumno.toString()}>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="truncate">{student.nombre} (ID: {student.id_alumno})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {!data || data.status !== 'success' || !data.recommendation ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Brain className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Recomendación No Disponible</h3>
            <p className="text-gray-500 text-center max-w-md">
              Aún no se ha generado la recomendación académica para este alumno. 
              Vuelva a intentarlo más adelante o contacte con la institución educativa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>{data.recommendation.student.nombre}</span>
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
              </div>
            </div>
            <CardDescription>
              👤 Estudiante: {studentsData.find(s => s.id_alumno === selectedStudentId)?.nombre || data.recommendation.student.nombre || 'Sin nombre'} (ID: {data.recommendation.student.id})
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 text-sm text-gray-600 bg-pink-50 p-3 rounded">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {data.recommendation.recommendation.fecha_generacion ? 
                    format(new Date(data.recommendation.recommendation.fecha_generacion), "d 'de' MMMM, yyyy 'a las' HH:mm", { 
                      locale: es
                    }) : 'Fecha no disponible'
                  }
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Recomendación Académica IA</span>
              </div>
              <Badge 
                variant={data.recommendation.recommendation.cached ? "secondary" : "default"}
                className={data.recommendation.recommendation.cached ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}
              >
                {data.recommendation.recommendation.cached ? "Simulado" : "Claude IA"}
              </Badge>
            </div>

            <div className="bg-white border rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4 flex items-center space-x-2">
                <Brain className="h-4 w-4 text-pink-600" />
                <span>
                  Esta recomendación fue generada con base en el perfil académico de{' '}
                  {studentsData.find(s => s.id_alumno === selectedStudentId)?.nombre || 'el estudiante'}{' '}
                  el {data.recommendation.recommendation.fecha_generacion ? 
                    format(new Date(data.recommendation.recommendation.fecha_generacion), "d 'de' MMMM, yyyy", { locale: es }) : 
                    'en fecha reciente'
                  }.
                </span>
              </h4>
              
              <div className="prose prose-sm max-w-none text-gray-700">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {data.recommendation.recommendation.texto}
                </div>
              </div>
            </div>

            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <h5 className="font-medium text-pink-900 mb-2">Nota para Padres de Familia</h5>
              <p className="text-sm text-pink-800">
                Esta recomendación ha sido generada utilizando inteligencia artificial basada en el rendimiento 
                académico y características de aprendizaje de su hijo(a). Le sugerimos compartir esta información 
                con el equipo docente para un mejor acompañamiento educativo.
              </p>
            </div>

            {data.recommendation.id && (
              <div className="text-xs text-gray-500 border-t pt-3">
                ID de recomendación: {data.recommendation.id}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-center py-8">
        <p className="text-sm text-gray-500">
          Vista familiar - Acceso exclusivo a la recomendación de su hijo(a)
        </p>
      </div>
    </div>
  );
}