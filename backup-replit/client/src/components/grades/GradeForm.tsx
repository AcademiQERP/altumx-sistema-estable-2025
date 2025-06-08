import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { insertGradeSchema } from "@shared/schema";
import { z } from "zod";
import { Student, Subject } from "@shared/schema";
import { Info, AlertTriangle, Eye, FileText, AlertCircle, Search, CheckCircle2, BadgeAlert } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Modificamos el esquema para trabajar con los tipos correctos
const gradeFormSchema = insertGradeSchema.extend({
  valor: z.coerce.number()
    .min(0, { message: "La calificación no puede ser menor a 0" })
    .max(10, { message: "La calificación no puede ser mayor a 10" })
});

type GradeFormValues = z.infer<typeof gradeFormSchema>;

export default function GradeForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Estado para confirmación de cancelación
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  
  // Estado para seguimiento del periodo actual (para autocompletar)
  const [periodoActual, setPeriodoActual] = useState("1er Trimestre");
  
  // Estados para control del flujo lógico de selección
  const [grupo, setGrupo] = useState({ id: 2, nombre: "1-A" }); // Preseleccionado por contexto
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<number | undefined>(undefined);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<number | undefined>(undefined);

  // Obtener datos para los selectores
  const { data: students } = useQuery<Student[]>({
    queryKey: ["/api/students"],
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });
  
  // Filtrar alumnos según el grupo preseleccionado
  const alumnosDelGrupo = students?.filter(student => student.grupoId === grupo.id);

  // Configurar el formulario
  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: {
      alumnoId: undefined,
      materiaId: undefined,
      rubro: "",
      valor: 0,
      periodo: periodoActual
    },
    mode: "onChange" // Validación en tiempo real
  });
  
  // Efecto para detectar cuando el valor está fuera de rango
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'valor') {
        const calificacion = Number(value.valor);
        if (calificacion < 0 || calificacion > 10) {
          form.setError('valor', {
            type: 'manual',
            message: 'La calificación debe estar entre 0 y 10'
          });
        }
      }
      
      // Control de dependencias para el flujo lógico
      if (name === 'materiaId') {
        setMateriaSeleccionada(value.materiaId as number);
      } else if (name === 'alumnoId') {
        setAlumnoSeleccionado(value.alumnoId as number);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Mutación para crear una calificación
  const createGrade = useMutation({
    mutationFn: (data: GradeFormValues) => 
      apiRequest("POST", "/api/grades", data),
    onSuccess: () => {
      toast({
        title: "✅ ¡Calificación registrada exitosamente!",
        description: "La calificación ha sido registrada en el sistema",
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      navigate("/calificaciones");
    },
    onError: (error) => {
      toast({
        title: "❌ Error",
        description: `Error al registrar calificación: ${error.message}`,
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  function onSubmit(data: GradeFormValues) {
    // Verificar que todos los campos obligatorios estén completos
    if (!data.alumnoId || !data.materiaId || !data.rubro || !data.periodo) {
      toast({
        title: "⚠️ Datos incompletos",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    // Verificar que la calificación esté en el rango permitido
    if (data.valor < 0 || data.valor > 10) {
      toast({
        title: "⚠️ Valor incorrecto",
        description: "La calificación debe estar entre 0 y 10",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }
    
    createGrade.mutate(data);
  }
  
  // Verificar si hay campos modificados
  const isFormTouched = Object.keys(form.formState.touchedFields).length > 0;
  
  // Manejar clic en cancelar
  const handleCancel = () => {
    if (isFormTouched) {
      setShowCancelConfirm(true);
    } else {
      navigate("/calificaciones");
    }
  };
  
  // Manejar clic en "Ver historial del alumno"
  const handleVerHistorialAlumno = () => {
    toast({
      title: "Función en desarrollo",
      description: "El historial del alumno estará disponible próximamente",
      duration: 3000,
    });
  };
  
  // Estilo personalizado para campo numérico
  const numericInputClass = "w-32 text-center font-medium";
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Contexto de grupo preseleccionado */}
        <div className="mb-3">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Grupo seleccionado: {grupo.nombre}</AlertTitle>
            <AlertDescription className="text-blue-700 text-sm">
              Estás registrando calificación para alumnos del grupo {grupo.nombre}
            </AlertDescription>
          </Alert>
        </div>
        
        {/* Sección de Información del Alumno */}
        <div className="p-4 border rounded-md bg-white mb-6">
          <h3 className="text-sm font-medium text-gray-700 flex items-center mb-4">
            <span className="mr-2">👤</span> Información del alumno
            <span className="h-px flex-grow bg-gray-200 ml-3"></span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primero materia (orden lógico) */}
            <FormField
              control={form.control}
              name="materiaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center font-medium">
                    Materia
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="ml-1 cursor-help text-muted-foreground">
                            <Info className="h-4 w-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Materia que estás evaluando</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(Number(value))} 
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className={!field.value ? "border-amber-200 bg-amber-50" : ""}>
                        <SelectValue placeholder="Seleccionar materia" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Alumno (deshabilitado hasta seleccionar materia) */}
            <FormField
              control={form.control}
              name="alumnoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center font-medium">
                    Alumno
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="ml-1 cursor-help text-muted-foreground">
                            <Info className="h-4 w-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Selecciona al estudiante al que deseas asignar una calificación</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(Number(value))} 
                    defaultValue={field.value?.toString()}
                    disabled={!materiaSeleccionada}
                  >
                    <FormControl>
                      <SelectTrigger className={!field.value ? "border-amber-200 bg-amber-50" : ""}>
                        <SelectValue placeholder={materiaSeleccionada ? "Seleccionar alumno" : "Primero selecciona una materia"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {alumnosDelGrupo?.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.nombreCompleto}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Ver historial del alumno (placeholder) */}
            {alumnoSeleccionado && (
              <div className="md:col-span-2 flex justify-end mb-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  disabled 
                  className="text-xs flex items-center opacity-70 cursor-not-allowed"
                  title="Función en desarrollo"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> Ver historial del alumno
                </Button>
              </div>
            )}
            
            <FormField
              control={form.control}
              name="periodo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center font-medium">
                    Periodo
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="ml-1 cursor-help text-muted-foreground">
                            <Info className="h-4 w-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Periodo académico en el que se registrará esta nota</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className={!field.value ? "border-amber-200 bg-amber-50" : ""}>
                        <SelectValue placeholder="Seleccionar periodo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1er Trimestre">1er Trimestre</SelectItem>
                      <SelectItem value="2do Trimestre">2do Trimestre</SelectItem>
                      <SelectItem value="3er Trimestre">3er Trimestre</SelectItem>
                      <SelectItem value="Final">Final</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs">
                    Periodo académico actual: {periodoActual}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Sección de Detalle de Evaluación */}
        <div className="p-4 border rounded-md bg-white mb-6">
          <h3 className="text-sm font-medium text-gray-700 flex items-center mb-4">
            <span className="mr-2">📝</span> Detalle de evaluación
            <span className="h-px flex-grow bg-gray-200 ml-3"></span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="rubro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center font-medium">
                    Rubro
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="ml-1 cursor-help text-muted-foreground">
                            <Info className="h-4 w-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Criterio específico de evaluación (Ej: Tareas, Examen, Proyecto)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={!alumnoSeleccionado} // Solo habilitado si hay alumno seleccionado
                  >
                    <FormControl>
                      <SelectTrigger className={!field.value ? "border-amber-200 bg-amber-50" : ""}>
                        <SelectValue placeholder={alumnoSeleccionado ? "Seleccionar rubro" : "Primero selecciona un alumno"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Examen">Examen</SelectItem>
                      <SelectItem value="Proyecto">Proyecto</SelectItem>
                      <SelectItem value="Tarea">Tarea</SelectItem>
                      <SelectItem value="Participación">Participación</SelectItem>
                      <SelectItem value="Final">Calificación Final</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="valor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center font-medium">
                    Calificación
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="ml-1 cursor-help text-muted-foreground">
                            <Info className="h-4 w-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ingresa una nota entre 0 y 10. Se permite un decimal.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="number" 
                        min="0" 
                        max="10" 
                        step="0.1" 
                        placeholder="Valor (0-10)" 
                        className={`${numericInputClass} ${Number(field.value) < 0 || Number(field.value) > 10 ? 'border-red-300 bg-red-50 focus:ring-red-500' : ''}`}
                        {...field} 
                      />
                      {(Number(field.value) < 0 || Number(field.value) > 10) && (
                        <div className="absolute top-0 right-[-24px]">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    Escala 0 a 10 con un decimal permitido
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        {/* Sección de Funciones Próximas */}
        <div className="mb-6">
          <Alert variant="info" className="bg-blue-50 border-blue-200">
            <BadgeAlert className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800 text-sm">Próximamente: Funcionalidades adicionales</AlertTitle>
            <AlertDescription className="text-blue-700 text-xs">
              Próximamente podrás agregar comentarios, evidencias o archivos por calificación.
            </AlertDescription>
          </Alert>
        </div>
        
        {/* Botones de acción */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          
          <div className="flex space-x-2">
            {/* Botón Vista Previa (placeholder) */}
            <Button
              type="button"
              variant="outline"
              disabled
              className="opacity-70 cursor-not-allowed"
              title="Próximamente"
            >
              <Search className="h-4 w-4 mr-1" /> Vista previa
            </Button>
            
            {/* Botón Guardar con efecto visual */}
            <Button 
              type="submit"
              disabled={createGrade.isPending}
              className="min-w-[100px]"
            >
              {createGrade.isPending ? 
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </span> : 
                <span className="flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Guardar
                </span>
              }
            </Button>
          </div>
        </div>
        
        {/* Diálogo de confirmación para cancelar */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">¿Seguro que deseas cancelar?</h3>
              <p className="text-muted-foreground mb-6">Los datos no guardados se perderán.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
                  Continuar editando
                </Button>
                <Button variant="destructive" onClick={() => navigate("/calificaciones")}>
                  Sí, descartar cambios
                </Button>
              </div>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
