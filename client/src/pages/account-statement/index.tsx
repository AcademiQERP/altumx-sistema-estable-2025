import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { PaymentConcept, Student, Debt, Payment } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowDown,
  ArrowUp,
  CreditCard,
  Download,
  Filter,
  FileText,
  Calendar,
  Receipt,
  ReceiptText,
} from "lucide-react";
import { EstadoCuentaResumen } from "@/components/financials/EstadoCuentaResumen";
import DownloadReceiptButton from "@/components/payments/DownloadReceiptButton";
import OnboardingCard from "@/components/financials/OnboardingCard";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import FinanceWelcomeCard from "@/components/financials/FinanceWelcomeCard";

export default function AccountStatement() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [location, navigate] = useLocation();
  
  // Extraer el ID del estudiante de la URL si existe
  useEffect(() => {
    // La URL será algo como /account-statement/2
    const match = location.match(/\/account-statement\/(\d+)/);
    if (match && match[1]) {
      const idFromUrl = match[1];
      console.log("ID detectado en URL:", idFromUrl);
      setSelectedStudentId(idFromUrl);
    }
  }, [location]);

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/students'],
    refetchOnWindowFocus: false,
  });

  const { data: concepts, isLoading: conceptsLoading } = useQuery({
    queryKey: ['/api/payment-concepts'],
    refetchOnWindowFocus: false,
  });

  const { data: accountStatement, isLoading: statementLoading } = useQuery({
    queryKey: [`/api/account-statement/${selectedStudentId}`],
    enabled: !!selectedStudentId,
    refetchOnWindowFocus: false
  });

  const isLoading = studentsLoading || conceptsLoading || (selectedStudentId && statementLoading);

  const getConceptName = (conceptId: number) => {
    if (!concepts) return "Cargando...";
    const concept = concepts.find((c: PaymentConcept) => c.id === conceptId);
    return concept ? concept.nombre : "Desconocido";
  };

  const handlePrintStatement = () => {
    window.print();
  };

  if (studentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Cargando estudiantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Tarjeta de bienvenida general del módulo de Finanzas */}
      <FinanceWelcomeCard />
      
      {/* Componente de Onboarding para Estado de Cuenta */}
      <OnboardingCard moduleType="estado-cuenta" />
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Estado de Cuenta</h1>
        <p className="text-muted-foreground">
          Consulta el estado de cuenta y el balance financiero de los estudiantes
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Seleccionar Estudiante</CardTitle>
          <CardDescription>
            Selecciona un estudiante para ver su estado de cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-2/3">
              <Select onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estudiante" />
                </SelectTrigger>
                <SelectContent>
                  {students?.map((student: Student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.nombreCompleto} - {student.nivel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedStudentId && statementLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2">Cargando estado de cuenta...</p>
          </div>
        </div>
      )}

      {selectedStudentId && accountStatement && (
        <div className="space-y-6 print:space-y-4">
          <div className="flex justify-between items-center print:hidden">
            <h2 className="text-2xl font-bold">
              Estudiante: {accountStatement.student.nombreCompleto}
            </h2>
            <div className="flex gap-2">
              <Button onClick={handlePrintStatement}>
                <Download className="mr-2 h-4 w-4" />
                Imprimir / Descargar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/pagos/historial/${selectedStudentId}`)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Ver historial completo
              </Button>
            </div>
          </div>

          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-bold text-center mb-2">Estado de Cuenta</h1>
            <div className="text-center text-sm mb-4">
              <p>
                <strong>Estudiante:</strong> {accountStatement.student.nombreCompleto}
              </p>
              <p>
                <strong>Nivel:</strong> {accountStatement.student.nivel}
              </p>
              <p>
                <strong>Grupo:</strong> {accountStatement.student.grupo}
              </p>
              <p>
                <strong>Fecha:</strong> {format(new Date(), "PPP", { locale: es })}
              </p>
            </div>
            <Separator />
          </div>
          
          {/* Resumen Financiero Inteligente */}
          <div className="print:hidden">
            {console.log("AccountStatement - selectedStudentId antes de convertir:", selectedStudentId)}
            {console.log("AccountStatement - selectedStudentId como número:", typeof selectedStudentId === 'string' ? parseInt(selectedStudentId) : selectedStudentId)}
            {console.log("AccountStatement - ¿El componente EstadoCuentaResumen será renderizado?", !!selectedStudentId)}
            {selectedStudentId && (
              <>
                <div className="mb-2 p-2 bg-slate-50 border rounded text-xs text-slate-500">
                  Debugging: Estudiante ID: {selectedStudentId}
                </div>
                <EstadoCuentaResumen alumnoId={Number(selectedStudentId)} />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 print:from-white print:to-white print:border-gray-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-800 print:text-gray-700">
                  Total Adeudos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <ArrowUp className="h-5 w-5 text-blue-600 print:text-gray-600" />
                  <span className="text-2xl font-bold">
                    ${parseFloat(accountStatement.totalDebt).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 print:from-white print:to-white print:border-gray-300">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-800 print:text-gray-700">
                  Total Pagado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <ArrowDown className="h-5 w-5 text-green-600 print:text-gray-600" />
                  <span className="text-2xl font-bold">
                    ${parseFloat(accountStatement.totalPaid).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className={`
              ${parseFloat(accountStatement.balance) > 0 
                ? "bg-gradient-to-br from-red-50 to-red-100 border-red-200" 
                : "bg-gradient-to-br from-green-50 to-green-100 border-green-200"} 
              print:from-white print:to-white print:border-gray-300
            `}>
              <CardHeader className="pb-2">
                <CardTitle className={`
                  text-sm 
                  ${parseFloat(accountStatement.balance) > 0 
                    ? "text-red-800" 
                    : "text-green-800"}
                  print:text-gray-700
                `}>
                  Balance Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {parseFloat(accountStatement.balance) > 0 ? (
                    <ArrowUp className="h-5 w-5 text-red-600 print:text-gray-600" />
                  ) : (
                    <ArrowDown className="h-5 w-5 text-green-600 print:text-gray-600" />
                  )}
                  <span className={`
                    text-2xl font-bold
                    ${parseFloat(accountStatement.balance) > 0 
                      ? "text-red-600" 
                      : "text-green-600"}
                    print:text-gray-800
                  `}>
                    ${Math.abs(parseFloat(accountStatement.balance)).toFixed(2)}
                    {parseFloat(accountStatement.balance) <= 0 && " (Saldo a favor)"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="details" className="print:hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalle de Cuenta</TabsTrigger>
              <TabsTrigger value="history">Historial de Movimientos</TabsTrigger>
            </TabsList>
            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Detalle de Adeudos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {accountStatement.debts && accountStatement.debts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Fecha Límite</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountStatement.debts.map((debt: Debt) => (
                          <TableRow key={debt.id}>
                            <TableCell>{getConceptName(debt.conceptoId)}</TableCell>
                            <TableCell>
                              {format(new Date(debt.fechaLimite), "PPP", { locale: es })}
                            </TableCell>
                            <TableCell>${parseFloat(debt.montoTotal).toFixed(2)}</TableCell>
                            <TableCell>
                              {debt.pagado ? (
                                <Badge className="bg-green-100 text-green-800">Pagado</Badge>
                              ) : (
                                new Date(debt.fechaLimite) < new Date() ? (
                                  <Badge variant="destructive">Vencido</Badge>
                                ) : (
                                  <Badge variant="outline">Pendiente</Badge>
                                )
                              )}
                            </TableCell>
                            <TableCell>
                              {!debt.pagado && (
                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="sm"
                                    variant="outline"
                                    className="flex items-center"
                                    onClick={() => navigate(`/pagos/nuevo?adeudoId=${debt.id}`)}
                                  >
                                    <ReceiptText className="h-4 w-4 mr-1" />
                                    Registrar pago
                                  </Button>
                                  <Button 
                                    size="sm"
                                    variant="default"
                                    className="flex items-center bg-green-600 hover:bg-green-700"
                                    onClick={() => navigate(`/pagos/nuevo?alumnoId=${debt.alumnoId}&conceptoId=${debt.conceptoId}&amount=${debt.montoTotal}`)}
                                  >
                                    <CreditCard className="h-4 w-4 mr-1" />
                                    💰 Pagar ahora
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No hay adeudos registrados</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="history">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Historial de Pagos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {accountStatement.payments && accountStatement.payments.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Referencia</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountStatement.payments.map((payment: Payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {format(new Date(payment.fechaPago), "PPP", { locale: es })}
                            </TableCell>
                            <TableCell>{getConceptName(payment.conceptoId)}</TableCell>
                            <TableCell className="flex items-center">
                              <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                              {payment.metodoPago}
                            </TableCell>
                            <TableCell>{payment.referencia || "--"}</TableCell>
                            <TableCell className="font-medium text-green-600">
                              ${parseFloat(payment.monto).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <DownloadReceiptButton
                                payment={payment}
                                studentName={accountStatement.student?.nombreCompleto || ""}
                                conceptName={getConceptName(payment.conceptoId)}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                showLabel={false}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No hay pagos registrados</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Print version that shows both sections */}
          <div className="hidden print:block space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-2">Detalle de Adeudos</h2>
              {accountStatement.debts && accountStatement.debts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Fecha Límite</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="print:hidden">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountStatement.debts.map((debt: Debt) => (
                      <TableRow key={debt.id}>
                        <TableCell>{getConceptName(debt.conceptoId)}</TableCell>
                        <TableCell>
                          {format(new Date(debt.fechaLimite), "PPP", { locale: es })}
                        </TableCell>
                        <TableCell>${parseFloat(debt.montoTotal).toFixed(2)}</TableCell>
                        <TableCell>
                          {debt.pagado ? "Pagado" : (
                            new Date(debt.fechaLimite) < new Date() ? "Vencido" : "Pendiente"
                          )}
                        </TableCell>
                        <TableCell className="print:hidden">
                          {!debt.pagado && (
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm"
                                variant="outline"
                                className="flex items-center"
                                onClick={() => navigate(`/pagos/nuevo?adeudoId=${debt.id}`)}
                              >
                                <ReceiptText className="h-4 w-4 mr-1" />
                                Registrar pago
                              </Button>
                              <Button 
                                size="sm"
                                variant="default"
                                className="flex items-center bg-green-600 hover:bg-green-700"
                                onClick={() => navigate(`/pagos/nuevo?alumnoId=${debt.alumnoId}&conceptId=${debt.conceptoId}&amount=${debt.montoTotal}`)}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                💰 Pagar ahora
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-2">No hay adeudos registrados</p>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold mb-2">Historial de Pagos</h2>
              {accountStatement.payments && accountStatement.payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead className="print:hidden">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountStatement.payments.map((payment: Payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.fechaPago), "PPP", { locale: es })}
                        </TableCell>
                        <TableCell>{getConceptName(payment.conceptoId)}</TableCell>
                        <TableCell>{payment.metodoPago}</TableCell>
                        <TableCell>{payment.referencia || "--"}</TableCell>
                        <TableCell>${parseFloat(payment.monto).toFixed(2)}</TableCell>
                        <TableCell className="print:hidden">
                          <DownloadReceiptButton
                            payment={payment}
                            studentName={accountStatement.student?.nombreCompleto || ""}
                            conceptName={getConceptName(payment.conceptoId)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            showLabel={false}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-2">No hay pagos registrados</p>
              )}
            </div>

            <div className="text-xs text-center pt-8 text-gray-500">
              <p>Documento generado el {format(new Date(), "PPP 'a las' HH:mm", { locale: es })}</p>
              <p>Este documento no tiene validez fiscal y solo es informativo</p>
            </div>
          </div>
        </div>
      )}

      {selectedStudentId && !accountStatement && !statementLoading && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No se pudo cargar el estado de cuenta para este estudiante
            </p>
            <Button onClick={() => setSelectedStudentId(null)} variant="outline">
              Seleccionar otro estudiante
            </Button>
          </CardContent>
        </Card>
      )}

      {!selectedStudentId && !studentsLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Selecciona un estudiante para continuar</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6 text-center max-w-md">
              Selecciona un estudiante de la lista para ver su estado de cuenta,
              incluyendo adeudos pendientes y pagos realizados.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}