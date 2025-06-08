import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Download, FileDown, Search, ArrowLeft } from "lucide-react";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import OnboardingCard from "@/components/financials/OnboardingCard";
import FinanceWelcomeCard from "@/components/financials/FinanceWelcomeCard";

// Risk Classification Utilities
import { 
  classifyAllStudentsRisk, 
  RiskClassification, 
  RiskLevel,
  PaymentHistory
} from "@/utils/riskClassifier";

export default function RiskClassificationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("table");
  
  // Consultas para obtener datos de la API
  const { data: students, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students"],
  });
  
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["/api/payments"],
  });
  
  const { data: debts, isLoading: isLoadingDebts } = useQuery({
    queryKey: ["/api/debts"],
  });

  // Adaptar los datos de pagos al formato esperado por el clasificador
  const adaptedPayments: PaymentHistory[] = useMemo(() => {
    if (!payments || !Array.isArray(payments)) return [];
    
    return payments.map((payment: any) => ({
      id: payment.id,
      studentId: payment.alumnoId,
      dueDate: payment.fechaPago, // Usamos la fecha de pago como referencia
      paymentDate: payment.fechaPago,
      amount: payment.monto,
      status: 'pagado',
      concept: payment.concepto || undefined
    }));
  }, [payments]);
  
  // Adaptar los datos de adeudos al formato esperado por el clasificador
  const adaptedDebts: PaymentHistory[] = useMemo(() => {
    if (!debts || !Array.isArray(debts)) return [];
    
    return debts.map((debt: any) => ({
      id: debt.id,
      studentId: debt.alumnoId,
      dueDate: debt.fechaLimite,
      paymentDate: null, // Si es un adeudo, aún no tiene fecha de pago
      amount: debt.montoTotal,
      status: debt.estatus,
      concept: debt.concepto || undefined
    }));
  }, [debts]);
  
  // Generar la clasificación de riesgo de todos los estudiantes
  const riskClassifications = useMemo(() => {
    if (!students || !Array.isArray(students) || !adaptedPayments || !adaptedDebts) return [];
    
    return classifyAllStudentsRisk(
      students as { id: number; nombreCompleto: string }[],
      adaptedPayments,
      adaptedDebts
    );
  }, [students, adaptedPayments, adaptedDebts]);
  
  // Filtrar estudiantes según la búsqueda
  const filteredClassifications = useMemo(() => {
    if (!riskClassifications) return [];
    
    if (!searchQuery) return riskClassifications;
    
    const query = searchQuery.toLowerCase();
    return riskClassifications.filter(student => 
      student.studentName.toLowerCase().includes(query)
    );
  }, [riskClassifications, searchQuery]);
  
  // Estadísticas de riesgo
  const riskStats = useMemo(() => {
    if (!riskClassifications || riskClassifications.length === 0) {
      return {
        total: 0,
        lowRisk: 0,
        mediumRisk: 0,
        highRisk: 0,
        lowRiskPercentage: 0,
        mediumRiskPercentage: 0,
        highRiskPercentage: 0
      };
    }
    
    const total = riskClassifications.length;
    const lowRisk = riskClassifications.filter(r => r.riskLevel === 'low').length;
    const mediumRisk = riskClassifications.filter(r => r.riskLevel === 'medium').length;
    const highRisk = riskClassifications.filter(r => r.riskLevel === 'high').length;
    
    return {
      total,
      lowRisk,
      mediumRisk,
      highRisk,
      lowRiskPercentage: Math.round((lowRisk / total) * 100),
      mediumRiskPercentage: Math.round((mediumRisk / total) * 100),
      highRiskPercentage: Math.round((highRisk / total) * 100)
    };
  }, [riskClassifications]);
  
  // Función para obtener el color según el nivel de riesgo
  const getRiskBadge = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case 'low':
        return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 border-green-200">Bajo</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50 border-yellow-200">Medio</Badge>;
      case 'high':
        return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200">Alto</Badge>;
    }
  };
  
  // Función para exportar datos a CSV
  const exportToCSV = () => {
    if (!filteredClassifications || filteredClassifications.length === 0) {
      toast({
        title: "No hay datos para exportar",
        description: "No hay clasificaciones de riesgo para exportar a CSV.",
        variant: "destructive",
      });
      return;
    }
    
    // Campos para el CSV
    const headers = [
      "ID Estudiante",
      "Nombre",
      "Total Pagos",
      "Total Adeudos",
      "Pagos Tardíos",
      "Adeudos Vencidos Actuales",
      "Promedio Días Retraso",
      "Nivel Riesgo",
      "Acción Sugerida"
    ];
    
    // Convertir datos a filas CSV
    const rows = filteredClassifications.map(student => [
      student.studentId,
      student.studentName,
      student.totalPayments,
      student.totalDebts,
      student.latePayments,
      student.currentOverdueDebts,
      student.averageDelayDays,
      student.riskLevel === 'low' ? 'Bajo' : (student.riskLevel === 'medium' ? 'Medio' : 'Alto'),
      student.suggestedAction
    ]);
    
    // Crear contenido CSV
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => 
        // Escapar comillas y comas en los valores
        `"${String(cell).replace(/"/g, '""')}"`
      ).join(","))
    ].join("\n");
    
    // Crear y descargar el archivo
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `clasificacion-riesgo-pago-${timestamp}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Exportación completada",
      description: `Se han exportado ${filteredClassifications.length} registros a CSV.`,
    });
  };
  
  // Solo los admin y coordinadores pueden acceder a esta página
  if (user?.rol !== "admin" && user?.rol !== "coordinador") {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-bold mb-4">Acceso Restringido</h1>
        <p>No tienes permisos para acceder a esta página.</p>
        <Button 
          className="mt-4" 
          variant="outline" 
          onClick={() => navigate("/")}
        >
          Volver al inicio
        </Button>
      </div>
    );
  }
  
  const isLoading = isLoadingStudents || isLoadingPayments || isLoadingDebts;
  
  return (
    <div className="container mx-auto py-6">
      {/* Tarjeta de bienvenida general del módulo de Finanzas */}
      <FinanceWelcomeCard />
      
      {/* Componente de Onboarding para el módulo de clasificación de riesgo */}
      <OnboardingCard moduleType="clasificacion" />
      
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Clasificación de Riesgo de Pago</h1>
        <p className="text-muted-foreground">
          Análisis del comportamiento de pago de los alumnos y clasificación de riesgo
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bajo Riesgo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600">{riskStats.lowRisk}</div>
              <div className="text-sm text-muted-foreground">{riskStats.lowRiskPercentage}% del total</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Medio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-yellow-600">{riskStats.mediumRisk}</div>
              <div className="text-sm text-muted-foreground">{riskStats.mediumRiskPercentage}% del total</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Alto Riesgo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-red-600">{riskStats.highRisk}</div>
              <div className="text-sm text-muted-foreground">{riskStats.highRiskPercentage}% del total</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs 
        defaultValue="table" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="table">Tabla de Clasificación</TabsTrigger>
          <TabsTrigger value="criteria">Criterios de Clasificación</TabsTrigger>
        </TabsList>
        
        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle>Clasificación de Riesgo de Alumnos</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="h-8 gap-1"
                    onClick={exportToCSV}
                  >
                    <FileDown className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </div>
              <CardDescription>
                Listado de alumnos y su clasificación de riesgo basada en el comportamiento de pago.
              </CardDescription>
              <div className="mt-2 relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredClassifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No se encontraron resultados para tu búsqueda." : "No hay datos de clasificación de riesgo disponibles."}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alumno</TableHead>
                        <TableHead className="text-center">Total Pagos</TableHead>
                        <TableHead className="text-center">Total Adeudos</TableHead>
                        <TableHead className="text-center">Pagos Tardíos</TableHead>
                        <TableHead className="text-center">Promedio Retraso</TableHead>
                        <TableHead className="text-center">Nivel Riesgo</TableHead>
                        <TableHead>Acción Sugerida</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClassifications.map((student) => (
                        <TableRow key={student.studentId}>
                          <TableCell className="font-medium">{student.studentName}</TableCell>
                          <TableCell className="text-center">{student.totalPayments}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {student.totalDebts}
                              {student.currentOverdueDebts > 0 && (
                                <Badge variant="destructive" className="text-xs h-5">
                                  {student.currentOverdueDebts} vencidos
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{student.latePayments}</TableCell>
                          <TableCell className="text-center">{student.averageDelayDays} días</TableCell>
                          <TableCell className="text-center">
                            {getRiskBadge(student.riskLevel)}
                          </TableCell>
                          <TableCell>{student.suggestedAction}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="criteria" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Criterios de Clasificación de Riesgo</CardTitle>
              <CardDescription>
                Estos son los criterios utilizados para clasificar el riesgo de pago de los alumnos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                  <h3 className="text-lg font-medium text-green-700 mb-2 flex items-center">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    Riesgo Bajo
                  </h3>
                  <div className="text-sm text-green-800">
                    <p>Un alumno se clasifica como de bajo riesgo cuando:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Todos sus pagos han sido realizados puntualmente.</li>
                      <li>Solo tiene 1 pago tardío con menos de 5 días de retraso.</li>
                      <li>No tiene adeudos vencidos actualmente.</li>
                    </ul>
                    <p className="mt-2 font-medium">Acción sugerida: Monitoreo regular</p>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                  <h3 className="text-lg font-medium text-yellow-700 mb-2 flex items-center">
                    <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                    Riesgo Medio
                  </h3>
                  <div className="text-sm text-yellow-800">
                    <p>Un alumno se clasifica como de riesgo medio cuando:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Tiene 2 o más pagos tardíos con retraso superior a 5 días.</li>
                      <li>Tiene 1 adeudo vencido actualmente.</li>
                      <li>No tiene un patrón consistente de morosidad grave.</li>
                    </ul>
                    <p className="mt-2 font-medium">Acción sugerida: Enviar recordatorio</p>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                  <h3 className="text-lg font-medium text-red-700 mb-2 flex items-center">
                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    Riesgo Alto
                  </h3>
                  <div className="text-sm text-red-800">
                    <p>Un alumno se clasifica como de alto riesgo cuando:</p>
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Tiene 2 o más adeudos vencidos actualmente.</li>
                      <li>Tiene un historial de morosidad significativo con retrasos superiores a 10 días en promedio.</li>
                      <li>Ha ignorado recordatorios de pago previos.</li>
                    </ul>
                    <p className="mt-2 font-medium">Acción sugerida: Contactar inmediatamente</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}