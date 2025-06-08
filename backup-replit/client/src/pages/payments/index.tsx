import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Payment, PaymentConcept, Student } from "@shared/schema";
import { Plus, Edit, Trash2, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DownloadReceiptButton from "@/components/payments/DownloadReceiptButton";
import OnboardingCard from "@/components/financials/OnboardingCard";
import FinanceWelcomeCard from "@/components/financials/FinanceWelcomeCard";

export default function PaymentsList() {
  const { toast } = useToast();
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
  const [studentFilter, setStudentFilter] = useState<string>("todos");
  const [location] = useLocation();
  
  // Detectar si hay un studentId en la URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const studentIdParam = searchParams.get("studentId");
    
    if (studentIdParam) {
      setStudentFilter(studentIdParam);
    }
  }, [location]);

  const { data: payments, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['/api/payments'],
    refetchOnWindowFocus: false,
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/students'],
    refetchOnWindowFocus: false,
  });

  const { data: concepts, isLoading: conceptsLoading } = useQuery({
    queryKey: ['/api/payment-concepts'],
    refetchOnWindowFocus: false,
  });

  const isLoading = paymentsLoading || studentsLoading || conceptsLoading;

  const getStudentName = (studentId: number) => {
    if (!students) return "Cargando...";
    const student = students.find((s: Student) => s.id === studentId);
    return student ? student.nombreCompleto : "Desconocido";
  };

  const getConceptName = (conceptId: number) => {
    if (!concepts) return "Cargando...";
    const concept = concepts.find((c: PaymentConcept) => c.id === conceptId);
    return concept ? concept.nombre : "Desconocido";
  };

  const getPaymentMethodText = (method: string) => {
    const methods: {[key: string]: string} = {
      "efectivo": "Efectivo",
      "tarjeta": "Tarjeta",
      "transferencia": "Transferencia",
      "cheque": "Cheque",
      "otro": "Otro"
    };
    return methods[method] || method;
  };

  const handleDelete = async () => {
    if (!paymentToDelete) return;

    try {
      await apiRequest(
        'DELETE',
        `/api/payments/${paymentToDelete.id}`
      );

      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      toast({
        title: "Pago eliminado",
        description: "El pago ha sido eliminado correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el pago",
        variant: "destructive",
      });
    } finally {
      setPaymentToDelete(null);
    }
  };

  const filteredPayments = studentFilter === "todos" 
    ? payments 
    : payments?.filter((payment: Payment) => payment.alumnoId === parseInt(studentFilter));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Cargando pagos...</p>
        </div>
      </div>
    );
  }

  if (paymentsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-500">
          <p>Error al cargar los pagos</p>
          <p className="text-sm">Por favor, intente nuevamente más tarde</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Tarjeta de bienvenida general del módulo de Finanzas */}
      <FinanceWelcomeCard />
      
      {/* Componente de Onboarding para el módulo de pagos */}
      <OnboardingCard moduleType="pagos" />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagos</h1>
          <p className="text-muted-foreground">
            Registra y administra los pagos de los estudiantes
          </p>
        </div>
        <Link href="/payments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Pago
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Pagos</CardTitle>
          <CardDescription>
            Historial de todos los pagos realizados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Filtrar por estudiante:</span>
              <Select 
                value={studentFilter} 
                onValueChange={setStudentFilter}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Seleccionar estudiante" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estudiantes</SelectItem>
                  {students?.map((student: Student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.nombreCompleto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredPayments && filteredPayments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha de Pago</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment: Payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{getStudentName(payment.alumnoId)}</TableCell>
                    <TableCell>{getConceptName(payment.conceptoId)}</TableCell>
                    <TableCell className="font-medium">${parseFloat(payment.monto).toFixed(2)}</TableCell>
                    <TableCell>
                      {format(new Date(payment.fechaPago), "PPP", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                        {getPaymentMethodText(payment.metodoPago)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {payment.referencia || "--"}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link href={`/payments/${payment.id}/edit`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      </Link>
                      <DownloadReceiptButton
                        payment={payment}
                        studentName={getStudentName(payment.alumnoId)}
                        conceptName={getConceptName(payment.conceptoId)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        showLabel={false}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setPaymentToDelete(payment)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No hay pagos registrados
                {studentFilter !== "todos" && " para este estudiante"}
              </p>
              <Link href="/payments/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Pago
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!paymentToDelete} onOpenChange={() => setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el registro de pago por ${paymentToDelete?.monto} realizado el{" "}
              {paymentToDelete && format(new Date(paymentToDelete.fechaPago), "PPP", { locale: es })}.
              <br /><br />
              Esta acción no se puede deshacer y puede afectar el estado de adeudos relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}