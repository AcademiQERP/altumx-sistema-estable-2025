import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  GraduationCap,
  Calendar,
  Receipt
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface AcademicReport {
  id: number;
  studentId: number;
  studentName: string;
  period: string;
  average: number;
  associatedReceipt?: {
    id: number;
    amount: number;
    reference: string;
  };
  pdfPath: string;
  pdfUrl: string;
  status: 'validated' | 'pending' | 'error';
  createdAt: string;
  sha256Hash?: string;
}

export default function HistorialAcademico() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Obtener estudiantes vinculados al padre
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/parent/students'],
    enabled: !!user?.id,
  });

  // Obtener historial académico del estudiante seleccionado
  const { data: academicHistory, isLoading: historyLoading, error } = useQuery({
    queryKey: [`/api/parent/academic-history/${selectedStudentId}`, selectedStudentId],
    enabled: !!selectedStudentId,
  });

  // Seleccionar automáticamente el primer estudiante si solo hay uno
  useEffect(() => {
    if (students && students.length === 1 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const handleDownloadReport = async (report: AcademicReport) => {
    try {
      // Verificar que el archivo existe antes de intentar descargarlo
      const response = await fetch(report.pdfUrl, { method: 'HEAD' });
      
      if (!response.ok) {
        toast({
          title: "Error",
          description: "El informe académico no está disponible para descarga.",
          variant: "destructive",
        });
        return;
      }

      // Abrir el PDF en una nueva ventana
      window.open(report.pdfUrl, '_blank');
      
      toast({
        title: "Descarga iniciada",
        description: `Informe académico del período ${report.period} disponible.`,
      });
    } catch (error) {
      console.error('Error al descargar informe:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el informe académico.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadReceipt = async (report: AcademicReport) => {
    try {
      const receiptUrl = `/recibos/recibo_${report.id}.pdf`;
      
      // Verificar que el archivo existe antes de intentar descargarlo
      const response = await fetch(receiptUrl, { method: 'HEAD' });
      
      if (!response.ok) {
        toast({
          title: "Error",
          description: "El recibo de pago no está disponible para descarga.",
          variant: "destructive",
        });
        return;
      }

      // Abrir el PDF en una nueva ventana
      window.open(receiptUrl, '_blank');
      
      toast({
        title: "Descarga iniciada",
        description: `Recibo de pago del período ${report.period} disponible.`,
      });
    } catch (error) {
      console.error('Error al descargar recibo:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el recibo de pago.",
        variant: "destructive",
      });
    }
  };

  const checkFileExists = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Validado
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  if (studentsLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6" />
              Historial Académico
            </CardTitle>
            <CardDescription>
              No se encontraron estudiantes vinculados a su cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Contacte a la administración escolar para vincular estudiantes a su cuenta.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Encabezado */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-primary" />
          Historial Académico
        </h1>
        <p className="text-muted-foreground">
          Consulte y descargue todos los informes académicos de su hijo/a
        </p>
      </div>

      {/* Selector de estudiante (si hay múltiples) */}
      {students.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Estudiante</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {students.map((student: any) => (
                <Button
                  key={student.id}
                  variant={selectedStudentId === student.id ? "default" : "outline"}
                  onClick={() => setSelectedStudentId(student.id)}
                  className="h-auto p-4 flex flex-col items-start"
                >
                  <div className="font-semibold">{student.nombreCompleto}</div>
                  <div className="text-sm opacity-70">{student.grado} - {student.grupo}</div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial académico */}
      {selectedStudentId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Informes Académicos
            </CardTitle>
            <CardDescription>
              Historial completo de informes académicos generados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-800">Error al cargar el historial</h3>
                <p className="text-red-600">No se pudo obtener el historial académico.</p>
              </div>
            ) : !academicHistory || academicHistory.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600">Sin informes disponibles</h3>
                <p className="text-gray-500">
                  Este estudiante aún no cuenta con informes generados. Una vez que se valide un recibo de pago, 
                  el informe aparecerá aquí automáticamente.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Período
                    </TableHead>
                    <TableHead>Promedio</TableHead>
                    <TableHead className="flex items-center gap-2">
                      <Receipt className="w-4 h-4" />
                      Recibo Asociado
                    </TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Descargas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {academicHistory.map((report: AcademicReport) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {report.period}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">
                            {report.average.toFixed(2)}
                          </span>
                          <Badge 
                            variant={report.average >= 9.0 ? "default" : report.average >= 7.0 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {report.average >= 9.0 ? "Excelente" : report.average >= 7.0 ? "Bueno" : "Requiere apoyo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {report.associatedReceipt ? (
                          <div className="space-y-1">
                            <div className="font-medium">
                              #{report.associatedReceipt.id}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ${report.associatedReceipt.amount.toLocaleString('es-MX')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Ref: {report.associatedReceipt.reference}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sin recibo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(report.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            onClick={() => handleDownloadReceipt(report)}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2 text-xs"
                          >
                            <Receipt className="w-3 h-3" />
                            Recibo
                          </Button>
                          <Button
                            onClick={() => handleDownloadReport(report)}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-2 text-xs"
                          >
                            <FileText className="w-3 h-3" />
                            Informe
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}