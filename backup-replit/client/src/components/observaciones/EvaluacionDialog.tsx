import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea"; 
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, CheckCircle, MessageSquare } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GradeDisplay } from "@/components/grades/GradeDisplay";
import RecommendationBlock from "@/components/observaciones/RecommendationBlock";
import { generateRecommendations } from "@/services/recommendations-service";

type Subtema = {
  id: number;
  titulo: string;
  descripcion: string;
  completado: boolean;
  comentario?: string; // Campo opcional para comentarios del profesor
};

type EvaluacionDialogProps = {
  alumnoId: number;
  alumnoNombre: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEvaluacionCompleta: () => void;
  promedio?: number; // Añadimos el promedio del alumno como propiedad opcional
};

export function EvaluacionDialog({
  alumnoId,
  alumnoNombre,
  open,
  onOpenChange,
  onEvaluacionCompleta,
  promedio
}: EvaluacionDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [subtemas, setSubtemas] = useState<Subtema[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Calcular progreso
  const totalSubtemas = subtemas.length;
  const completados = subtemas.filter(s => s.completado).length;
  const progreso = totalSubtemas > 0 ? Math.round((completados / totalSubtemas) * 100) : 0;

  // Cargar los subtemas cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      // Aseguramos que se carguen los datos cada vez que se abre el diálogo
      console.log("Cargando subtemas para alumno", alumnoId);
      loadSubtemas();
    }
  }, [open, alumnoId]);

  // Función para cargar los subtemas del alumno
  const loadSubtemas = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Obtener los subtemas evaluables y el estado actual del alumno
      const response = await apiRequest(
        "GET", 
        `/api/academic-observer/subtemas-alumno/${alumnoId}`
      );
      
      if (!response.ok) {
        throw new Error("Error al cargar los subtemas para evaluación");
      }
      
      const data = await response.json();
      console.log("Subtemas recibidos del servidor:", data);
      
      // Creamos una copia profunda para asegurar que no se comparten referencias
      const subtemasCopy = data.map((subtema: Subtema) => ({
        ...subtema,
        comentario: subtema.comentario || ""
      }));
      
      setSubtemas(subtemasCopy);
    } catch (err) {
      setError("No se pudieron cargar los subtemas. Por favor, inténtalo de nuevo.");
      console.error("Error al cargar subtemas:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cambiar el estado de un subtema
  const toggleSubtema = (id: number) => {
    setSubtemas(prev => 
      prev.map(subtema => 
        subtema.id === id 
          ? { ...subtema, completado: !subtema.completado } 
          : subtema
      )
    );
  };

  // Guardar los cambios
  const guardarCambios = async () => {
    try {
      setIsSaving(true);
      
      // Preparamos los datos para enviar, asegurándonos de que los comentarios están incluidos
      const subtemasPrepared = subtemas.map(s => ({
        id: s.id,
        completado: s.completado,
        comentario: s.comentario || "" // Incluimos el comentario o una cadena vacía si no hay
      }));
      
      console.log("Enviando subtemas al servidor:", subtemasPrepared);
      
      // Enviar los subtemas actualizados con comentarios
      const response = await apiRequest(
        "POST",
        `/api/academic-observer/guardar-evaluacion/${alumnoId}`,
        { subtemas: subtemasPrepared }
      );
      
      if (!response.ok) {
        throw new Error("Error al guardar la evaluación");
      }
      
      const responseData = await response.json();
      console.log("Respuesta del servidor al guardar:", responseData);
      
      toast({
        title: "Evaluación guardada",
        description: "Los cambios y comentarios han sido guardados correctamente",
      });
      
      // Notificar que se completó la evaluación para refrescar la vista
      onEvaluacionCompleta();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo guardar la evaluación. Por favor, inténtalo de nuevo.",
        variant: "destructive",
      });
      console.error("Error al guardar la evaluación:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Marcar todos los subtemas
  const marcarTodos = () => {
    setSubtemas(prev => prev.map(subtema => ({ ...subtema, completado: true })));
  };

  // Desmarcar todos los subtemas
  const desmarcarTodos = () => {
    setSubtemas(prev => prev.map(subtema => ({ ...subtema, completado: false })));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evaluar a {alumnoNombre}</DialogTitle>
          <DialogDescription>
            Marque los subtemas que el alumno ha completado correctamente.
            {promedio !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <span>Promedio actual:</span>
                <GradeDisplay 
                  grade={promedio}
                  showIcon={true}
                  showLabel={true}
                  showColor={true}
                  size="sm"
                  variant="pill"
                />
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Cargando subtemas para evaluación...</p>
          </div>
        ) : error ? (
          <div className="text-center p-4 text-red-500">
            <p>{error}</p>
            <Button onClick={loadSubtemas} className="mt-2">
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium">
                Progreso: {completados} de {totalSubtemas} ({progreso}%)
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={marcarTodos}>
                  Marcar todos
                </Button>
                <Button variant="outline" size="sm" onClick={desmarcarTodos}>
                  Desmarcar todos
                </Button>
              </div>
            </div>
            
            <Progress value={progreso} className="mb-4" />
            
            <div className="space-y-4">
              {subtemas.map((subtema) => (
                <Accordion 
                  key={subtema.id} 
                  type="single" 
                  collapsible 
                  className="rounded-md border hover:bg-muted/30"
                >
                  <AccordionItem value={`subtema-${subtema.id}`} className="border-none">
                    <div className="flex items-start gap-2 p-3">
                      <Checkbox 
                        id={`subtema-${subtema.id}`} 
                        checked={subtema.completado}
                        onCheckedChange={() => toggleSubtema(subtema.id)}
                        className="mt-1"
                      />
                      <div className="grid gap-1.5 leading-none flex-1">
                        <div className="flex justify-between items-start">
                          <Label
                            htmlFor={`subtema-${subtema.id}`}
                            className="text-sm font-medium flex items-center"
                          >
                            {subtema.completado && (
                              <CheckCircle className="h-3 w-3 text-primary mr-1" />
                            )}
                            {subtema.titulo}
                          </Label>
                          <AccordionTrigger className="py-0 h-5">
                            <MessageSquare size={16} className="text-muted-foreground" />
                          </AccordionTrigger>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {subtema.descripcion}
                        </p>
                      </div>
                    </div>
                    <AccordionContent className="px-3 pb-3 pt-0">
                      <div className="pl-7">
                        <Label 
                          htmlFor={`comentario-${subtema.id}`} 
                          className="text-xs mb-1 block text-muted-foreground"
                        >
                          Agregar comentario para este subtema:
                        </Label>
                        <Textarea
                          id={`comentario-${subtema.id}`}
                          placeholder="Escriba aquí observaciones específicas sobre el desempeño del alumno en este subtema..."
                          className="min-h-[80px] text-sm"
                          value={subtema.comentario || ''}
                          onChange={(e) => {
                            setSubtemas(prev => 
                              prev.map(s => 
                                s.id === subtema.id 
                                  ? { ...s, comentario: e.target.value } 
                                  : s
                              )
                            );
                          }}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </div>
          </>
        )}

        <Separator className="my-4" />

        {/* Recomendaciones personalizadas - solo se muestran cuando hay evaluación completa */}
        {promedio !== undefined && promedio < 8.0 && (
          <div className="mb-6">
            <RecommendationBlock 
              recommendations={generateRecommendations({
                id: alumnoId,
                nombre: alumnoNombre,
                promedio: promedio,
                materias: [
                  {
                    id: 0,
                    nombre: "General",
                    promedio: promedio
                  }
                ]
              })}
              alumnoNombre={alumnoNombre}
            />
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={guardarCambios} 
            disabled={isLoading || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar evaluación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}