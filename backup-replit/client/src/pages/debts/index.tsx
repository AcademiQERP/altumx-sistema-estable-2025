import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Debt, PaymentConcept, Student } from "@shared/schema";
import { Plus, Edit, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
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
import {
  Badge
} from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import OnboardingCard from "@/components/financials/OnboardingCard";
import FinanceWelcomeCard from "@/components/financials/FinanceWelcomeCard";

export default function DebtsList() {
  const { toast } = useToast();
  const [debtToDelete, setDebtToDelete] = useState<Debt | null>(null);
  const [studentFilter, setStudentFilter] = useState<string>("todos");

  const { data: debts, isLoading: debtsLoading, error: debtsError } = useQuery({
    queryKey: ['/api/debts'],
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

  const isLoading = debtsLoading || studentsLoading || conceptsLoading;

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

  const handleDelete = async () => {
    if (!debtToDelete) return;

    try {
      // Corregido: El primer parámetro debe ser el método HTTP y el segundo la URL
      await apiRequest('DELETE', `/api/debts/${debtToDelete.id}`);

      queryClient.invalidateQueries({ queryKey: ['/api/debts'] });
      toast({
        title: "Adeudo eliminado",
        description: "El adeudo ha sido eliminado correctamente",
      });
    } catch (error) {
      console.error("Error al eliminar adeudo:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el adeudo",
        variant: "destructive",
      });
    } finally {
      setDebtToDelete(null);
    }
  };

  const filteredDebts = studentFilter === "todos" 
    ? debts 
    : debts?.filter((debt: Debt) => debt.alumnoId === parseInt(studentFilter));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">Cargando adeudos...</p>
        </div>
      </div>
    );
  }

  if (debtsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-500">
          <p>Error al cargar los adeudos</p>
          <p className="text-sm">Por favor, intente nuevamente más tarde</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Tarjeta de bienvenida general del módulo de Finanzas */}
      <FinanceWelcomeCard />
      
      {/* Componente de Onboarding para el módulo de adeudos */}
      <OnboardingCard moduleType="adeudos" />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Adeudos</h1>
          <p className="text-muted-foreground">
            Administra los adeudos de los estudiantes
          </p>
        </div>
        <Link href="/adeudos/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Adeudo
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Adeudos</CardTitle>
          <CardDescription>
            Listado de todos los adeudos pendientes y pagados
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

          {filteredDebts && filteredDebts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estudiante</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha Límite</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDebts.map((debt: Debt) => (
                  <TableRow key={debt.id}>
                    <TableCell>{getStudentName(debt.alumnoId)}</TableCell>
                    <TableCell>{getConceptName(debt.conceptoId)}</TableCell>
                    <TableCell>${parseFloat(debt.montoTotal).toFixed(2)}</TableCell>
                    <TableCell>
                      {format(new Date(debt.fechaLimite), "PPP", { locale: es })}
                    </TableCell>
                    <TableCell>
                      {debt.pagado ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Pagado
                        </Badge>
                      ) : (
                        new Date(debt.fechaLimite) < new Date() ? (
                          <Badge variant="destructive">
                            <AlertTriangle className="mr-1 h-3 w-3" /> Vencido
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pendiente</Badge>
                        )
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link href={`/adeudos/${debt.id}/editar`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDebtToDelete(debt)}
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
                No hay adeudos registrados
                {studentFilter !== "todos" && " para este estudiante"}
              </p>
              <Link href="/adeudos/nuevo">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Adeudo
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!debtToDelete} onOpenChange={() => setDebtToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el adeudo seleccionado. Esta acción
              no se puede deshacer.
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