import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Brain, AlertTriangle, CheckCircle2, BarChart4 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Tipos para la respuesta de la predicción
interface RiskPrediction {
  riskLevel: "bajo" | "medio" | "alto";
  justification: string;
  recommendedAction: string;
  confidenceScore: number;
}

// Props para el componente de predicción
interface RiskPredictionProps {
  student: any;
  onPredictionSaved?: (prediction: RiskPrediction) => void;
}

// Mapa de colores para niveles de riesgo
const RISK_COLORS = {
  bajo: "bg-green-100 text-green-800 hover:bg-green-200",
  medio: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  alto: "bg-red-100 text-red-800 hover:bg-red-200",
};

// Mapa de iconos para niveles de riesgo
const RISK_ICONS = {
  bajo: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  medio: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  alto: <AlertTriangle className="h-4 w-4 text-red-500" />,
};

// Mapa de etiquetas para niveles de riesgo
const RISK_LEVEL_LABELS = {
  bajo: "Bajo Riesgo",
  medio: "Riesgo Medio",
  alto: "Alto Riesgo",
};

/**
 * Componente para generar y mostrar predicciones de riesgo para un estudiante
 */
export function RiskPrediction({ student, onPredictionSaved }: RiskPredictionProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<RiskPrediction | null>(null);

  // Función para generar el prompt para Claude
  function generateRiskPredictionPrompt(): string {
    // Calcular porcentaje de pagos a tiempo
    const onTimePaymentPct = student.total_payments > 0 
      ? ((student.on_time_payments / student.total_payments) * 100).toFixed(1) 
      : "0";
    
    return `
Tú eres un asistente de análisis predictivo en un sistema de gestión escolar. Se te proporcionarán datos de pagos anteriores de un estudiante y deberás predecir su nivel de riesgo de incumplimiento de pago en los próximos meses.

Datos del estudiante:
- Nombre: ${student.student_name}
- Nivel escolar: ${student.school_level}
- Grupo: ${student.group_name}
- Monto total vencido: ${formatCurrency(parseFloat(student.overdue_amount))}
- Monto total de deuda: ${formatCurrency(parseFloat(student.total_debt || student.overdue_amount))}
- % de pagos realizados a tiempo: ${onTimePaymentPct}%
- Días promedio de retraso en pagos anteriores: ${student.average_delay || 0} días
- Número de pagos vencidos: ${student.due_payments || 0}
- Número de pagos totales: ${student.total_payments || 0}
- Ciclos con historial negativo: ${student.negative_history_count || 0} períodos
- Días actuales de vencimiento: ${student.overdue_days || 0} días
- Nivel de riesgo actual: ${student.risk_level}

Analiza estos datos y predice la probabilidad de que este estudiante continúe con los mismos patrones de pago en los próximos meses.

Tu tarea es responder en formato JSON con los siguientes campos:
{
  "riskLevel": "bajo" | "medio" | "alto",
  "justification": "Breve justificación de 2 líneas máximo",
  "recommendedAction": "Acción recomendada para gestionar este caso",
  "confidenceScore": número entre 0 y 1
}

Nota: Basa tu predicción en patrones detectables en los datos proporcionados, no en información externa.
`;
  }

  // Función para solicitar la predicción a la API
  const requestPrediction = async () => {
    try {
      setLoading(true);
      
      // Generar el prompt
      const prompt = generateRiskPredictionPrompt();
      
      // Enviar el prompt a la API
      const response = await apiRequest("POST", "/api/ai/risk-prediction", {
        studentId: student.student_id,
        prompt
      });
      
      if (!response.ok) {
        throw new Error("Error al solicitar la predicción");
      }
      
      const result = await response.json();
      setPrediction(result.prediction);
      
      toast({
        title: "Predicción generada",
        description: "Se ha generado una predicción de riesgo para el estudiante.",
      });
      
      // Notificar si hay callback
      if (onPredictionSaved) {
        onPredictionSaved(result.prediction);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al generar la predicción",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Predicción de Riesgo Inteligente
        </CardTitle>
        <CardDescription>
          Análisis predictivo mediante IA del comportamiento financiero
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {prediction ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Nivel de Riesgo Predicho</h4>
                <div className="flex items-center mt-1">
                  {RISK_ICONS[prediction.riskLevel]}
                  <span className="ml-1 font-medium">
                    {RISK_LEVEL_LABELS[prediction.riskLevel]}
                  </span>
                </div>
              </div>
              
              <Badge className={RISK_COLORS[prediction.riskLevel]}>
                {(prediction.confidenceScore * 100).toFixed(0)}% confianza
              </Badge>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Justificación</h4>
              <p className="mt-1 text-sm">{prediction.justification}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Acción Recomendada</h4>
              <p className="mt-1 text-sm">{prediction.recommendedAction}</p>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BarChart4 className="h-3 w-3" />
                  <span>Generado por IA</span>
                </div>
                <button 
                  onClick={() => setPrediction(null)} 
                  className="text-xs text-blue-600 hover:underline"
                >
                  Generar nueva predicción
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="mb-4 text-center">
              <p>Utilice inteligencia artificial para predecir el nivel de riesgo futuro del estudiante basado en su historial de pagos.</p>
            </div>
            
            <Button 
              onClick={requestPrediction}
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando datos...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Predecir Riesgo Futuro
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
      
      {prediction && (
        <CardFooter className="text-xs text-muted-foreground">
          <p>
            Esta predicción es generada por un modelo de IA y debe utilizarse como referencia, no como determinación definitiva.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}