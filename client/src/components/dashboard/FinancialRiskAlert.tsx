import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, ArrowRight, Bell, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  classifyAllStudentsRisk, 
  PaymentHistory, 
  RiskClassification 
} from "@/utils/riskClassifier";

export interface FinancialRiskAlertProps {
  className?: string;
}

export function FinancialRiskAlert({ className }: FinancialRiskAlertProps) {
  const [highRiskCount, setHighRiskCount] = useState(0);
  const [totalOverdueAmount, setTotalOverdueAmount] = useState(0);
  const [lastReminderDays, setLastReminderDays] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  
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
  
  const { data: emailLogs, isLoading: isLoadingEmailLogs } = useQuery({
    queryKey: ["/api/email-logs"],
  });
  
  // Procesar los datos para generar las alertas
  useEffect(() => {
    if (!students || !payments || !debts) return;
    
    if (!Array.isArray(students) || !Array.isArray(payments) || !Array.isArray(debts)) return;
    
    // Adaptar los datos de pagos al formato esperado por el clasificador
    const adaptedPayments: PaymentHistory[] = payments.map((payment: any) => ({
      id: payment.id,
      studentId: payment.alumnoId,
      dueDate: payment.fechaPago,
      paymentDate: payment.fechaPago,
      amount: payment.monto,
      status: 'pagado',
      concept: payment.concepto || undefined
    }));
    
    // Adaptar los datos de adeudos al formato esperado por el clasificador
    const adaptedDebts: PaymentHistory[] = debts.map((debt: any) => ({
      id: debt.id,
      studentId: debt.alumnoId,
      dueDate: debt.fechaLimite,
      paymentDate: null,
      amount: debt.montoTotal,
      status: debt.estatus,
      concept: debt.concepto || undefined
    }));
    
    // Clasificar a todos los estudiantes
    const classifications = classifyAllStudentsRisk(
      students as { id: number; nombreCompleto: string }[],
      adaptedPayments,
      adaptedDebts
    );
    
    // Filtrar solo estudiantes con alto riesgo
    const highRiskStudents = classifications.filter(student => student.riskLevel === 'high');
    
    // Actualizar contador de alumnos en riesgo alto
    setHighRiskCount(highRiskStudents.length);
    
    // Calcular monto total de adeudos vencidos para alumnos de alto riesgo
    if (highRiskStudents.length > 0) {
      const highRiskStudentIds = highRiskStudents.map(student => student.studentId);
      
      // Filtrar adeudos vencidos de estudiantes de alto riesgo
      const overdueDebts = adaptedDebts.filter(debt => {
        const dueDate = new Date(debt.dueDate);
        const now = new Date();
        return (
          highRiskStudentIds.includes(debt.studentId) && 
          dueDate < now && 
          debt.status !== 'pagado'
        );
      });
      
      // Sumar los montos
      const totalAmount = overdueDebts.reduce((sum, debt) => {
        const amount = parseFloat(debt.amount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);
      
      setTotalOverdueAmount(totalAmount);
    }
    
    // Calcular días desde el último recordatorio (si hay datos de email)
    if (emailLogs && Array.isArray(emailLogs) && emailLogs.length > 0) {
      // Ordenar por fecha (más reciente primero)
      const sortedLogs = [...emailLogs].sort((a, b) => {
        return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
      });
      
      // Obtener la fecha del último correo enviado
      if (sortedLogs[0]) {
        const lastReminder = new Date(sortedLogs[0].sentAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastReminder.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setLastReminderDays(diffDays);
      }
    }
  }, [students, payments, debts, emailLogs]);
  
  // Si no hay alumnos en riesgo alto, no mostrar el widget
  if (highRiskCount === 0 && !isLoadingStudents && !isLoadingPayments && !isLoadingDebts) {
    return null;
  }
  
  // Mostrar esqueleto mientras carga
  if (isLoadingStudents || isLoadingPayments || isLoadingDebts) {
    return (
      <Alert className="mb-4 bg-amber-50/50 border border-amber-200 rounded-xl shadow-sm">
        <Skeleton className="h-5 w-5 rounded-full mr-2" />
        <div className="space-y-2 w-full">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Alert>
    );
  }
  
  return (
    <Alert className="mb-4 bg-amber-50/50 border border-amber-200 rounded-xl shadow-sm">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <div className="w-full">
        <div className="flex justify-between items-center">
          <AlertTitle className="text-amber-800 font-medium">
            Alerta de Riesgo de Pago
          </AlertTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-amber-600 p-1 h-auto"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
        
        <AlertDescription className="text-amber-700 mt-1">
          <div className="flex items-center space-x-1">
            <span className="font-semibold">{highRiskCount}</span>
            <span className="text-sm">
              {highRiskCount === 1 
                ? "alumno en riesgo" 
                : "alumnos en riesgo"}
            </span>
            <span className="text-sm text-muted-foreground">
              • ${totalOverdueAmount.toLocaleString('es-MX', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </span>
          </div>
          
          {expanded && (
            <div className="mt-3 space-y-2 text-sm border-t border-amber-200 pt-2">
              <div className="flex items-baseline text-amber-800">
                <span className="font-medium mr-2">Total adeudos vencidos:</span>
                <span>${totalOverdueAmount.toLocaleString('es-MX', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</span>
              </div>
              
              {lastReminderDays !== null && (
                <div className="flex items-baseline text-amber-800">
                  <span className="font-medium mr-2">Último seguimiento hace</span>
                  <span>{lastReminderDays} {lastReminderDays === 1 ? 'día' : 'días'}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 pt-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 bg-white text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-800"
                  asChild
                >
                  <Link href="/clasificacion-riesgo">
                    <span className="flex items-center text-xs">
                      Ver detalles
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </span>
                  </Link>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 bg-white text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-800"
                  asChild
                >
                  <Link href="/admin/recordatorios">
                    <span className="flex items-center text-xs">
                      <Bell className="mr-1 h-3 w-3" />
                      Enviar recordatorios
                    </span>
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
}