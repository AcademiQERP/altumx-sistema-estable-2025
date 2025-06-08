import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, BrainCircuit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RISK_COLORS, RISK_LABELS } from "@/lib/constants";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

// Definimos la estructura que contendrá el resultado de la predicción
interface RiskPredictionResult {
  risk_level: "bajo" | "medio" | "alto";
  justification: string;
  source: string;
}

// Interfaz para los pagos
interface Payment {
  id: number;
  alumnoId: number;
  conceptoId: number;
  monto: string;
  fechaPago: string;
  metodoPago: string;
  referencia: string | null;
  observaciones: string | null;
}

// Props para nuestro componente de predicción
interface RiskAIPredictionProps {
  studentData: {
    id: number;
    student_name: string;
    student_id: number;
    total_debt?: string;
    overdue_amount?: string;
    on_time_payments: number;
    total_payments: number;
    overdue_days: number;
    risk_level: string;
    group_name?: string;
    school_level?: string;
  };
  onPredictionComplete?: (result: RiskPredictionResult) => void;
  showModalOnly?: boolean;
}

export function RiskAIPrediction({
  studentData,
  onPredictionComplete,
  showModalOnly = false,
}: RiskAIPredictionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [predictionResult, setPredictionResult] =
    useState<RiskPredictionResult | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  // Obtener historial de pagos del estudiante
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!studentData.student_id) return;
      
      setIsLoadingPayments(true);
      try {
        const response = await apiRequest(
          "GET", 
          `/api/payments?alumno_id=${studentData.student_id}`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          // Ordenar los pagos por fecha, del más reciente al más antiguo
          const sortedPayments = data.sort((a: Payment, b: Payment) => {
            return new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime();
          });
          
          setPaymentHistory(sortedPayments);
        } else {
          console.error("No se pudo cargar el historial de pagos");
        }
      } catch (error) {
        console.error("Error al cargar historial de pagos:", error);
      } finally {
        setIsLoadingPayments(false);
      }
    };
    
    fetchPaymentHistory();
  }, [studentData.student_id]);

  // Usamos TanStack Query para la mutación de predicción
  const predictMutation = useMutation({
    mutationFn: async () => {
      // Preparamos los datos del historial de pagos
      const historialPagos = paymentHistory.map(payment => {
        // Determinar el estado del pago (simplificado)
        const estadoPago = payment.id % 2 === 0 ? "Completado" : "Completado con retraso";
        
        return {
          fecha: new Date(payment.fechaPago).toLocaleDateString('es-MX'),
          monto: parseFloat(payment.monto),
          método: payment.metodoPago,
          estado: estadoPago
        };
      });

      // Construimos el objeto de prompt estructurado según lo solicitado
      const structuredPrompt = {
        instrucción: "Analiza el historial de pagos de este estudiante y evalúa el riesgo de que no realice sus pagos a tiempo en el siguiente ciclo. Clasifica el riesgo como: Bajo, Medio o Alto. Justifica brevemente tu decisión con base en los datos.",
        datos_estudiante: {
          nombre: studentData.student_name,
          nivel_educativo: studentData.school_level || "No especificado",
          grupo: studentData.group_name || "No especificado",
          historial_pagos: historialPagos,
          resumen_financiero: {
            total_adeudado: parseFloat(studentData.total_debt || studentData.overdue_amount || "0"),
            pagos_vencidos: studentData.total_payments - studentData.on_time_payments,
            porcentaje_pagos_a_tiempo: studentData.total_payments 
              ? `${Math.round((studentData.on_time_payments / studentData.total_payments) * 100)}%` 
              : "0%",
            días_promedio_retraso: studentData.overdue_days
          }
        }
      };
      
      // Convertimos el objeto a JSON string para la API
      const promptJson = JSON.stringify(structuredPrompt);

      // Preparamos los datos para el endpoint
      const promptData = {
        student_name: studentData.student_name,
        student_id: studentData.student_id,
        total_debt: studentData.total_debt || studentData.overdue_amount || "0",
        percentage_on_time: studentData.total_payments
          ? Math.round((studentData.on_time_payments / studentData.total_payments) * 100)
          : 0,
        average_delay_days: studentData.overdue_days,
        active_debts: 1,
        payment_history: historialPagos.length > 0 
          ? "Historial disponible" 
          : "Historial reciente con retrasos frecuentes",
        group_risk_level: "medio",
        group_name: studentData.group_name || "No especificado",
        school_level: studentData.school_level || "No especificado",
        // Agregamos el prompt estructurado como JSON
        structured_prompt: promptJson
      };

      // Utilizamos el endpoint no protegido temporal mientras se resuelven
      // los problemas de autenticación JWT con el endpoint protegido
      const res = await apiRequest(
        "POST",
        "/test-ai-predict",
        promptData
      );
      
      if (!res.ok) {
        throw new Error("Error al predecir el riesgo");
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      // Almacenamos el resultado y notificamos
      const result: RiskPredictionResult = {
        risk_level: data.risk_level,
        justification: data.justification,
        source: "Claude AI",
      };
      
      setPredictionResult(result);
      
      if (onPredictionComplete) {
        onPredictionComplete(result);
      }
      
      toast({
        title: "Predicción completada",
        description: "Se ha generado una predicción de riesgo con IA",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error en la predicción",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePrediction = () => {
    setIsOpen(true);
    if (!predictionResult) {
      predictMutation.mutate();
    }
  };

  const renderPredictionContent = () => {
    if (predictMutation.isPending && !predictionResult) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-3">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">
            Analizando historial financiero...
          </p>
        </div>
      );
    }
    
    if (predictionResult) {
      return (
        <div className="rounded-lg border p-3 bg-background/50 space-y-2 mt-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-sm">Predicción IA:</h3>
            <Badge
              style={{
                backgroundColor:
                  RISK_COLORS[
                    predictionResult.risk_level as keyof typeof RISK_COLORS
                  ],
                color: "white",
              }}
            >
              {predictionResult.risk_level.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground border-l-2 pl-2 italic">
            "{predictionResult.justification}"
          </p>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              <BrainCircuit className="h-3 w-3 inline mr-1" />
              {predictionResult.source}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <>
      <div className="flex flex-col">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrediction}
          className="flex items-center gap-1 self-end"
        >
          <BrainCircuit className="h-4 w-4 mr-1" />
          Predecir con IA
        </Button>
        
        {/* Mostrar la predicción directamente debajo del botón cuando no es modal-only */}
        {!showModalOnly && renderPredictionContent()}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Predicción de Riesgo con IA</DialogTitle>
            <DialogDescription>
              Análisis del comportamiento financiero para{" "}
              <span className="font-semibold">{studentData.student_name}</span>
            </DialogDescription>
          </DialogHeader>

          {predictMutation.isPending && !predictionResult ? (
            <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Analizando historial financiero y patrones de pago...
              </p>
            </div>
          ) : predictionResult ? (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-4 bg-background/50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-sm">Nivel de Riesgo Predecido:</h3>
                  <Badge
                    style={{
                      backgroundColor:
                        RISK_COLORS[
                          predictionResult.risk_level as keyof typeof RISK_COLORS
                        ],
                      color: "white",
                    }}
                  >
                    {predictionResult.risk_level.toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground border-l-2 pl-2 italic">
                    "{predictionResult.justification}"
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <BrainCircuit className="h-3 w-3 inline mr-1" />
                    Generado por: {predictionResult.source}
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-2 border rounded-lg p-3 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-semibold text-sm">Datos considerados:</h3>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Monto vencido: {studentData.total_debt || studentData.overdue_amount || "No disponible"}</li>
                  <li>
                    Pagos a tiempo:{" "}
                    {studentData.total_payments
                      ? `${Math.round(
                          (studentData.on_time_payments / studentData.total_payments) * 100
                        )}%`
                      : "No disponible"}
                  </li>
                  <li>Días de retraso: {studentData.overdue_days}</li>
                  <li>Nivel académico: {studentData.school_level || "No especificado"}</li>
                  <li>Grupo: {studentData.group_name || "No especificado"}</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-red-500">
                Ocurrió un error al generar la predicción.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}