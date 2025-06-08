import React, { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Copy, Mail, ArrowLeft, AlertTriangle } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface StudentData {
  id: number;
  nombre: string;
  grado: string;
  promedio: number;
  observacionesAdicionales?: string;
  materias: {
    id: number;
    nombre: string;
    promedio: number;
  }[];
}

interface ProcessedRecommendations {
  fortalezas: string[];
  areasAFortalecer: string[];
  areasDesarrollo: string[];
  observaciones: string[];
  proximosPasos: string[];
  conclusionFinal: string[];
}

interface ApiResponse {
  success: boolean;
  message?: string;
  studentData?: StudentData;
  recommendations?: string;
  teacherName?: string;
  // Nuevos campos estructurados
  fortalezas?: string[];
  areasAFortalecer?: string[];
  observaciones?: string[];
  evaluacion?: string[];
  nombreAlumno?: string;
  grado?: string;
  promedioGeneral?: number;
  fecha?: string;
}

/**
 * Procesa el texto de recomendaciones de IA y lo estructura en secciones
 * @param markdown Texto plano de recomendaciones
 * @returns Recomendaciones estructuradas por secciones
 */
const processRecommendations = (markdown: string): ProcessedRecommendations => {
  const result: ProcessedRecommendations = {
    fortalezas: [],
    areasAFortalecer: [],
    areasDesarrollo: [],
    observaciones: [],
    proximosPasos: [],
    conclusionFinal: [],
  };

  let currentSection: keyof ProcessedRecommendations | null = null;

  // Reemplazar emojis con sus equivalentes para PDF
  const textLines = markdown
    .replace(/🌟|⭐/g, "★") // Estrellas
    .replace(/⚡/g, "▲")    // Áreas a fortalecer
    .replace(/✅/g, "✓")     // Check marks
    .split("\n");

  for (const line of textLines) {
    if (line.trim() === "") continue;

    // Detectar secciones
    if (line.match(/^#{1,3}\s+.*FORTALEZAS/i) || line.match(/fortalezas:/i)) {
      currentSection = "fortalezas";
      continue;
    } else if (
      line.match(/^#{1,3}\s+.*ÁREAS A FORTALECER/i) ||
      line.match(/áreas a fortalecer:/i)
    ) {
      currentSection = "areasAFortalecer";
      continue;
    } else if (
      line.match(/^#{1,3}\s+.*EVALUACIÓN.*DESARROLLO/i) ||
      line.match(/evaluación de desarrollo:/i)
    ) {
      currentSection = "areasDesarrollo";
      continue;
    } else if (
      line.match(/^#{1,3}\s+.*OBSERVACIONES/i) ||
      line.match(/observaciones:/i)
    ) {
      currentSection = "observaciones";
      continue;
    } else if (
      line.match(/^#{1,3}\s+.*PRÓXIMOS PASOS/i) ||
      line.match(/próximos pasos:/i)
    ) {
      currentSection = "proximosPasos";
      continue;
    } else if (
      line.match(/^#{1,3}\s+.*CONCLUSIÓN/i) ||
      line.match(/conclusión:/i)
    ) {
      currentSection = "conclusionFinal";
      continue;
    }

    // Si estamos en una sección y la línea contiene contenido válido (como elemento de lista)
    if (currentSection && line.trim().match(/^-|^\d+\.|^\*\s+/)) {
      const cleanLine = line
        .trim()
        .replace(/^-|\*\s+/, "")
        .replace(/^\d+\.\s*/, "")
        .trim();
      
      if (cleanLine) {
        result[currentSection].push(cleanLine);
      }
    } else if (currentSection === "conclusionFinal" && line.trim() !== "") {
      // Para la conclusión, permitimos párrafos completos sin formato de lista
      result[currentSection].push(line.trim());
    }
  }

  return result;
};

export default function InformeWeb() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [emailToSend, setEmailToSend] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isShared, setIsShared] = useState(false);
  
  // Obtener los datos del informe desde el endpoint público
  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey: [`/api/informe/${params.id}/public`], 
    enabled: !!params.id,
  });

  const reportRef = useRef<HTMLDivElement>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !studentData) return;
    
    setGeneratingPDF(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      // Agregar logo e información institucional
      pdf.setFontSize(18);
      pdf.setTextColor(13, 71, 161); // Color primario
      pdf.text('ALTUM Educación', 105, 15, { align: 'center' });
      
      // Información del informe
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Informe Académico: ${studentData.nombre}`, 105, 25, { align: 'center' });
      
      // Fecha de generación
      const fecha = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado el ${fecha}`, 105, 32, { align: 'center' });
      
      // Agregar la imagen del reporte
      pdf.addImage(imgData, 'JPEG', 0, 40, imgWidth, imgHeight);
      
      // Pie de página
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          'Informe generado automáticamente por EduMEX – Sistema Académico',
          105,
          pdf.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
      
      // Guardar PDF
      pdf.save(`Informe_${studentData.nombre.replace(/\s+/g, '_')}.pdf`);
      
      toast({
        title: "PDF generado correctamente",
        description: "El informe ha sido descargado como PDF"
      });
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast({
        title: "Error al generar PDF",
        description: "No se pudo generar el documento PDF",
        variant: "destructive"
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "¡Enlace copiado!",
        description: "El enlace al informe ha sido copiado al portapapeles.",
      });
      setIsShared(true);
      setTimeout(() => setIsShared(false), 2000);
    });
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToSend) {
      toast({
        title: "Error",
        description: "Por favor, ingresa una dirección de correo electrónico.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSending(true);
    try {
      const response = await fetch(`/api/informe/${params.id}/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailToSend }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Informe enviado",
          description: `El informe ha sido enviado a ${emailToSend}`,
        });
        setEmailToSend("");
      } else {
        toast({
          title: "Error al enviar",
          description: result.message || "No se pudo enviar el correo electrónico",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al enviar el correo",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center gap-4">
          <Spinner className="w-8 h-8 text-primary" />
          <p className="text-gray-500">Cargando informe académico...</p>
        </div>
      </div>
    );
  }

  if (error || !data || !data.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 p-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center text-red-600 mb-4">
            Este informe no está disponible
          </h1>
          <p className="text-gray-600 mb-6 text-center">
            🔒 Por favor verifica el enlace o contacta con la institución.
          </p>
          <div className="flex justify-center">
            <Link href="/">
              <Button 
                variant="default" 
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Volver al inicio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Procesar los datos reales del servidor
  const studentData = data.studentData!;
  
  // Procesar recomendaciones - usar datos estructurados si están disponibles, o procesar el texto
  let processedRecommendations = processRecommendations(data.recommendations || "");
  
  // Si tenemos datos estructurados desde el servidor, usarlos en lugar del texto procesado
  if (data.fortalezas && data.fortalezas.length > 0) {
    processedRecommendations.fortalezas = data.fortalezas;
  }
  
  if (data.areasAFortalecer && data.areasAFortalecer.length > 0) {
    processedRecommendations.areasAFortalecer = data.areasAFortalecer;
  }
  
  if (data.observaciones && data.observaciones.length > 0) {
    processedRecommendations.observaciones = data.observaciones;
  }
  
  if (data.evaluacion && data.evaluacion.length > 0) {
    processedRecommendations.areasDesarrollo = data.evaluacion;
  }
  
  const recommendations = processedRecommendations;
  const teacherName = data.teacherName || "Docente";
  
  // Usar fecha del servidor si está disponible, o generar una local
  const fecha = data.fecha ? 
    new Date(data.fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : 
    new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Encabezado con logo */}
      <div className="bg-primary text-white p-4 shadow-md mb-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl md:text-2xl font-bold text-center">
            Informe Académico
          </h1>
        </div>
      </div>
      
      {/* Contenedor principal del reporte */}
      <div ref={reportRef} className="max-w-3xl mx-auto px-4">
        {/* Datos generales del estudiante */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary border-b pb-2 mb-4">
            Datos Generales
          </h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Estudiante:</span>{" "}
              {studentData.nombre}
            </p>
            <p>
              <span className="font-medium">Grado:</span> {studentData.grado}
            </p>
            <p>
              <span className="font-medium">Fecha del informe:</span> {fecha}
            </p>
            <p>
              <span className="font-medium">Promedio General:</span>{" "}
              <span className={studentData.promedio >= 8 ? "text-green-600 font-semibold" : 
                               studentData.promedio >= 6 ? "text-amber-600 font-semibold" : 
                               "text-red-600 font-semibold"}>
                {studentData.promedio.toFixed(1)}
              </span>
            </p>
            <div className="mt-4">
              <p className="font-medium mb-2">Materias:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {studentData.materias && studentData.materias.length > 0 ? (
                  studentData.materias.map((materia: { id: number, nombre: string, promedio: number }) => (
                    <div 
                      key={materia.id}
                      className="flex justify-between p-2 rounded bg-gray-50"
                    >
                      <span>{materia.nombre}</span>
                      <span className={
                        materia.promedio >= 8 ? "text-green-600 font-semibold" : 
                        materia.promedio >= 6 ? "text-amber-600 font-semibold" : 
                        "text-red-600 font-semibold"
                      }>
                        {materia.promedio.toFixed(1)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="col-span-2 text-gray-500 italic">No hay información de materias disponible.</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Sección de fortalezas */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary border-b pb-2 mb-4">
            <span className="mr-2">★</span> Fortalezas
          </h2>
          {recommendations.fortalezas.length > 0 ? (
            <ul className="space-y-2 ml-6 list-disc">
              {recommendations.fortalezas.map((fortaleza, index) => (
                <li key={index} className="text-gray-700">{fortaleza}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No se han registrado fortalezas en esta sección aún.</p>
          )}
        </div>
        
        {/* Sección de áreas a fortalecer */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary border-b pb-2 mb-4">
            <span className="mr-2">▲</span> Áreas a fortalecer
          </h2>
          {recommendations.areasAFortalecer.length > 0 ? (
            <ul className="space-y-2 ml-6 list-disc">
              {recommendations.areasAFortalecer.map((area, index) => (
                <li key={index} className="text-gray-700">{area}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No se han registrado áreas a fortalecer en esta sección aún.</p>
          )}
        </div>
        
        {/* Sección de evaluación de desarrollo */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary border-b pb-2 mb-4">
            Evaluación de Desarrollo
          </h2>
          {recommendations.areasDesarrollo.length > 0 ? (
            <ul className="space-y-2 ml-6 list-disc">
              {recommendations.areasDesarrollo.map((area, index) => (
                <li key={index} className="text-gray-700">{area}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No se ha registrado evaluación de desarrollo en esta sección aún.</p>
          )}
        </div>
        
        {/* Sección de observaciones individuales */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary border-b pb-2 mb-4">
            Observaciones Individuales
          </h2>
          {recommendations.observaciones.length > 0 ? (
            <ul className="space-y-2 ml-6 list-disc">
              {recommendations.observaciones.map((observacion, index) => (
                <li key={index} className="text-gray-700">{observacion}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No se han registrado observaciones individuales en esta sección aún.</p>
          )}
        </div>
        
        {/* Sección de próximos pasos */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary border-b pb-2 mb-4">
            Plan de Seguimiento
          </h2>
          {recommendations.proximosPasos.length > 0 ? (
            <ul className="space-y-2 ml-6 list-disc">
              {recommendations.proximosPasos.map((paso, index) => (
                <li key={index} className="text-gray-700">{paso}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No se ha definido un plan de seguimiento en esta sección aún.</p>
          )}
        </div>
        
        {/* Sección de conclusión final */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary border-b pb-2 mb-4">
            Conclusión
          </h2>
          {recommendations.conclusionFinal.length > 0 ? (
            <div className="prose prose-blue max-w-none">
              {recommendations.conclusionFinal.map((parrafo, index) => (
                <p key={index} className="text-gray-700">{parrafo}</p>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No se ha registrado una conclusión en esta sección aún.</p>
          )}
          <div className="mt-6 pt-4 border-t">
            <p className="font-semibold text-right">{teacherName}</p>
            <p className="text-gray-500 text-sm text-right">Docente</p>
          </div>
        </div>
      </div>
      
      {/* Acciones - Fuera del reporte para que no aparezcan en el PDF */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-primary border-b pb-2 mb-4">
            Opciones
          </h2>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <Button 
                onClick={handleDownloadPDF}
                disabled={generatingPDF}
                className="flex items-center gap-2"
              >
                {generatingPDF ? <Spinner className="w-4 h-4" /> : <FileText size={16} />}
                {generatingPDF ? "Generando PDF..." : "Descargar PDF"}
              </Button>
              <Button 
                variant={isShared ? "default" : "outline"}
                onClick={handleShareLink}
                disabled={generatingPDF}
                className="flex items-center gap-2"
              >
                <Copy size={16} />
                {isShared ? "¡Enlace copiado!" : "Copiar enlace"}
              </Button>
            </div>
            
            <div className="pt-4">
              <form onSubmit={handleSendEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Enviar a correo electrónico</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={emailToSend}
                      onChange={(e) => setEmailToSend(e.target.value)}
                      required
                    />
                    <Button 
                      type="submit" 
                      disabled={isSending || generatingPDF}
                      className="flex items-center gap-2"
                    >
                      {isSending ? <Spinner className="w-4 h-4" /> : <Mail size={16} />}
                      Enviar
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}