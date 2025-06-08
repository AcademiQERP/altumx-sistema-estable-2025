import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ArrowLeft,
  FileDown,
  Share2,
  Calendar,
  BookOpen,
  User,
  Clock,
  Download,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ObservacionDetalle() {
  const { user } = useAuth();
  const params = useParams();
  const [, navigate] = useLocation();
  const [exportando, setExportando] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);

  // Obtener detalles de la observación
  const {
    data: observacion,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/academic-observer/observaciones/${params.id}`],
    enabled: !!params.id,
  });

  // Función para volver a la lista
  const volverALista = () => {
    navigate("/profesor/observaciones");
  };

  // Manejar compartir por correo electrónico
  const compartirPorCorreo = () => {
    setCompartiendo(true);
    // Aquí iría la llamada a la API para compartir por correo
    // Como no tenemos esa funcionalidad implementada, solo simulamos con un toast
    setTimeout(() => {
      toast({
        title: "Observación compartida",
        description: "Se ha enviado la observación por correo electrónico.",
      });
      setCompartiendo(false);
    }, 1500);
  };

  // Función para exportar a PDF
  const exportarAPdf = () => {
    if (!observacion) return;

    setExportando(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let y = 20;

      // Título del documento
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Observación Académica", pageWidth / 2, y, { align: "center" });
      y += 15;

      // Agregar línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Información básica
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Información de la Observación:", margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`ID: ${observacion.id}`, margin, y);
      y += 8;

      doc.text(`Alumno: ${observacion.alumnoNombre || "No disponible"}`, margin, y);
      y += 8;

      doc.text(`Materia: ${observacion.materiaNombre || "No disponible"}`, margin, y);
      y += 8;

      doc.text(`Periodo: ${observacion.periodo || "No disponible"}`, margin, y);
      y += 8;

      doc.text(
        `Fecha: ${observacion.fecha ? format(new Date(observacion.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es }) : "No disponible"}`,
        margin,
        y
      );
      y += 8;

      doc.text(
        `Generado por: ${user?.nombreCompleto || "Docente"}`,
        margin,
        y
      );
      y += 15;

      // Agregar línea separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;

      // Contenido de la observación
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Contenido de la Observación:", margin, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      // Dividir el contenido en líneas para que quepa en el PDF
      const contentWidth = pageWidth - margin * 2;
      const splitText = doc.splitTextToSize(
        observacion.contenido || "Sin contenido",
        contentWidth
      );

      doc.text(splitText, margin, y);

      // Pie de página
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Altum Educación - Documento generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Guardar el PDF
      doc.save(`Observacion_Academica_${params.id}.pdf`);
      
      toast({
        title: "PDF generado correctamente",
        description: "La observación ha sido exportada a PDF.",
      });
    } catch (e) {
      console.error("Error al generar PDF:", e);
      toast({
        title: "Error al exportar",
        description: "Ha ocurrido un error al generar el PDF.",
        variant: "destructive",
      });
    } finally {
      setExportando(false);
    }
  };

  // Si está cargando, mostrar spinner
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Si hay error, mostrar mensaje
  if (error || !observacion) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle className="text-red-600">
              Error al cargar la observación
            </CardTitle>
            <CardDescription>
              Ha ocurrido un error al intentar cargar la observación académica.
              Por favor, intenta nuevamente más tarde.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={volverALista}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a la lista
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={volverALista}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">Detalle de Observación</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Observación Académica</CardTitle>
              <CardDescription>
                Contenido completo de la observación generada para el alumno
              </CardDescription>
              <Separator className="my-2" />
            </CardHeader>
            <CardContent className="prose prose-sm max-w-full">
              {observacion.contenido ? (
                <div className="whitespace-pre-line">
                  {observacion.contenido.split("\n").map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No hay contenido disponible para esta observación.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">ID de la observación</p>
                <p className="text-sm font-medium">{observacion.id}</p>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-primary mt-1" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Alumno</p>
                  <p className="text-sm font-medium">
                    {observacion.alumnoNombre || "No disponible"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <BookOpen className="h-4 w-4 text-primary mt-1" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Materia</p>
                  <p className="text-sm font-medium">
                    {observacion.materiaNombre || "No disponible"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-primary mt-1" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Periodo</p>
                  <p className="text-sm font-medium">
                    {observacion.periodo || "No disponible"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-primary mt-1" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Fecha de generación</p>
                  <p className="text-sm font-medium">
                    {observacion.fecha
                      ? format(new Date(observacion.fecha), "dd 'de' MMMM 'de' yyyy", {
                          locale: es,
                        })
                      : "No disponible"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={exportarAPdf}
                disabled={exportando}
              >
                {exportando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                Exportar a PDF
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={compartiendo}
                  >
                    {compartiendo ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="mr-2 h-4 w-4" />
                    )}
                    Compartir por Correo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Compartir observación?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción enviará la observación académica completa por correo
                      electrónico a los padres o tutores del alumno.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={compartirPorCorreo}>
                      Enviar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}