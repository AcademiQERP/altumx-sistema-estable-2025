import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertTaskSchema, InsertTask } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, Loader2, Sparkles, FileText, AlertTriangle, PaperclipIcon } from "lucide-react";

// Components UI
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Extend the task schema with additional validation
const formSchema = insertTaskSchema.extend({
  fechaEntrega: z.date({
    required_error: "La fecha de entrega es requerida",
  }),
});

// Type for the form values
type FormValues = z.infer<typeof formSchema>;

function NewTaskPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isTeacher = user?.rol === "docente";
  const isAdmin = user?.rol === "admin";

  // Fetch available groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: [isTeacher ? "/api/profesor/grupos-asignados" : "/api/groups"],
    enabled: !!user,
  });

  // Para profesores, obtener las materias asignadas de todos sus grupos
  const { data: teacherAssignments, isLoading: teacherAssignmentsLoading } = useQuery({
    queryKey: ["/api/profesor/assignments/" + user?.id],
    enabled: !!user && isTeacher,
  });

  // Fetch available subjects - solo para admins cargamos todas las materias
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: !!user && !isTeacher,
  });

  // Create new task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: InsertTask) => {
      const response = await apiRequest("POST", "/api/tasks", taskData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profesor/tasks"] });
      toast({
        title: "✅ Tarea registrada exitosamente",
        description: "La tarea ha sido creada correctamente.",
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate("/tareas")}>
            📋 Ver tareas
          </Button>
        ),
      });
      navigate("/tareas");
    },
    onError: (error) => {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "No se pudo crear la tarea. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Generate task description with AI mutation
  const generateDescriptionMutation = useMutation({
    mutationFn: async (data: { 
      subject: string; 
      title: string; 
      dueDate: string;
      gradeLevel: string;
      rubric?: string;
    }) => {
      const response = await apiRequest("POST", "/api/ai/generate-task-description", data);
      return await response.json();
    },
    onSuccess: (data) => {
      form.setValue("instrucciones", data.description);
      setHasChanges(true);
      toast({
        title: "Descripción generada",
        description: "Se ha generado una descripción para la tarea con IA.",
      });
    },
    onError: (error) => {
      console.error("Error generating description:", error);
      toast({
        title: "Error",
        description: "No se pudo generar la descripción. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsGeneratingAI(false);
    }
  });

  // Initialize form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      titulo: "",
      instrucciones: "",
      estado: "activo", // Por defecto la tarea está activa
      profesorId: user?.id || "",
      fechaEntrega: new Date(new Date().setDate(new Date().getDate() + 7)), // Default to 1 week from now
      grupoId: 0,
      materiaId: 0,
      archivoUrl: null,
      enlaceUrl: null,
    },
  });

  // File upload handling
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validar tipos de archivo permitidos
      const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "⚠️ Tipo de archivo no válido",
          description: "Solo se permiten archivos PDF, Word o imagen (.pdf, .docx, .jpg, .png)",
          variant: "destructive",
        });
        event.target.value = '';
        return;
      }
      
      setIsUploading(true);
      try {
        // Simulate a network delay for uploading
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
        const mockUrl = `https://storage.example.com/tasks/${Date.now()}-${file.name}`;
        setFileUrl(mockUrl);
        setFileName(file.name);
        form.setValue("archivoUrl", mockUrl);
        setHasChanges(true);
        
        toast({
          title: "Archivo subido",
          description: "El archivo se ha subido correctamente.",
        });
      } catch (error) {
        console.error("Error uploading file:", error);
        toast({
          title: "Error",
          description: "No se pudo subir el archivo. Por favor intenta de nuevo.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Form submission handler
  const onSubmit = (data: FormValues) => {
    try {
      // Convertir explícitamente a números
      const grupoId = typeof data.grupoId === 'string' ? parseInt(data.grupoId, 10) : data.grupoId;
      const materiaId = typeof data.materiaId === 'string' ? parseInt(data.materiaId, 10) : data.materiaId;
      
      // Verificar que sean números válidos
      if (isNaN(grupoId) || isNaN(materiaId)) {
        toast({
          title: "Error de validación",
          description: "El grupo y la materia deben ser valores numéricos válidos.",
          variant: "destructive",
        });
        return;
      }
      
      // Crear objeto con los tipos correctos
      const taskData: InsertTask = {
        titulo: data.titulo,
        instrucciones: data.instrucciones,
        fechaEntrega: data.fechaEntrega,
        profesorId: data.profesorId,
        grupoId: grupoId,
        materiaId: materiaId,
        archivoUrl: data.archivoUrl,
        enlaceUrl: data.enlaceUrl,
        estado: data.estado,
      };
      
      console.log("Enviando datos de tarea:", taskData);
      createTaskMutation.mutate(taskData);
    } catch (error) {
      console.error("Error al procesar el formulario:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar el formulario. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  // Handle form change to detect unsaved changes
  const handleFormChange = () => {
    setHasChanges(true);
  };

  // Handle cancel button with confirmation if there are changes
  const handleCancel = () => {
    if (hasChanges) {
      setShowConfirmDialog(true);
    } else {
      navigate("/tareas");
    }
  };

  // If the user is not a teacher or admin, redirect to tasks list
  if (!isTeacher && !isAdmin) {
    navigate("/tareas");
    return null;
  }

  // Loading state
  const isSubjectsLoading = isAdmin ? subjectsLoading : false;
  const isTeacherDataLoading = isTeacher && teacherAssignmentsLoading;
  
  if (groupsLoading || isSubjectsLoading || isTeacherDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Nueva Tarea</h1>
        <p className="text-muted-foreground">
          Crea una nueva tarea para tus alumnos
        </p>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Detalles de la Tarea</CardTitle>
          <CardDescription>
            Completa los detalles para crear una nueva tarea o asignación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" onChange={handleFormChange}>
              {/* Sección 1: Información general de la tarea */}
              <div className="space-y-6 border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold uppercase text-muted-foreground">Información general de la tarea</h4>
                
                <FormField
                  control={form.control}
                  name="titulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título de la Tarea</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. Investigación sobre la Revolución Mexicana"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        El título debe ser claro y descriptivo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="grupoId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grupo</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(Number(value));
                            setHasChanges(true);
                          }}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un grupo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {groups?.map((group) => (
                              <SelectItem
                                key={group.id}
                                value={group.id.toString()}
                              >
                                {group.nombre} - {group.nivel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          El grupo al que se asignará esta tarea
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="materiaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Materia</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(Number(value));
                            setHasChanges(true);
                          }}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una materia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isTeacher ? (
                              teacherAssignments?.map((assignment) => {
                                const materiaId = assignment.materiaId;
                                return (
                                  <SelectItem
                                    key={materiaId}
                                    value={materiaId.toString()}
                                  >
                                    {assignment.materiaNombre || `Materia ID: ${materiaId}`}
                                  </SelectItem>
                                );
                              })
                            ) : (
                              subjects?.map((subject) => (
                                <SelectItem
                                  key={subject.id}
                                  value={subject.id.toString()}
                                >
                                  {subject.nombre}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          La materia a la que corresponde esta tarea
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="fechaEntrega"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha de Entrega</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: es })
                                ) : (
                                  <span>Selecciona una fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                field.onChange(date);
                                setHasChanges(true);
                              }}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                              locale={es}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          La fecha límite para la entrega de la tarea
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setHasChanges(true);
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="activo">Activa</SelectItem>
                            <SelectItem value="completada">Completada</SelectItem>
                            <SelectItem value="vencida">Vencida</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Define desde el inicio si será una tarea Activa o Borrador
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Sección 2: Recursos e instrucciones */}
              <div className="space-y-6 border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold uppercase text-muted-foreground">Recursos e instrucciones</h4>
                
                <FormField
                  control={form.control}
                  name="instrucciones"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel>Instrucciones</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="flex items-center gap-1"
                                onClick={() => {
                                  // Obtener valores necesarios para generar descripción
                                  const titulo = form.getValues("titulo");
                                  const materiaId = form.getValues("materiaId");
                                  const fechaEntrega = form.getValues("fechaEntrega");
                                  const grupoId = form.getValues("grupoId");
                                  
                                  // Validar que los campos necesarios estén completos
                                  if (!titulo || !materiaId || !fechaEntrega || !grupoId) {
                                    toast({
                                      title: "Campos incompletos",
                                      description: "Por favor completa el título, materia, grupo y fecha de entrega para generar una descripción con IA.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  // Obtener información de la materia y grupo para determinar el nivel
                                  let materiaNombre = "";
                                  let grupoNivel = "";
                                  
                                  // Buscar información de grupo
                                  const grupo = groups?.find(g => g.id === Number(grupoId));
                                  if (!grupo) {
                                    toast({
                                      title: "Error",
                                      description: "No se encontró información del grupo seleccionado.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  grupoNivel = grupo.nivel;
                                  
                                  // Buscar información de materia
                                  if (isTeacher) {
                                    const asignacion = teacherAssignments?.find(a => a.materiaId === Number(materiaId));
                                    materiaNombre = asignacion?.materiaNombre || "";
                                  } else {
                                    const materia = subjects?.find(m => m.id === Number(materiaId));
                                    materiaNombre = materia?.nombre || "";
                                  }
                                  
                                  if (!materiaNombre) {
                                    toast({
                                      title: "Error",
                                      description: "No se encontró información de la materia seleccionada.",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  
                                  setIsGeneratingAI(true);
                                  generateDescriptionMutation.mutate({
                                    subject: materiaNombre,
                                    title: titulo,
                                    dueDate: format(fechaEntrega, "yyyy-MM-dd"),
                                    gradeLevel: grupoNivel,
                                  });
                                }}
                                disabled={isGeneratingAI}
                              >
                                {isGeneratingAI ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <Sparkles className="h-4 w-4 mr-1" />
                                )}
                                Generar con IA
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Genera sugerencias de instrucciones con base en el título y materia seleccionada</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder="Escribe un ensayo sobre las causas de la Revolución Mexicana. Mínimo media cuartilla."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Proporciona instrucciones claras y detalladas a tus alumnos
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="enlaceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de referencia (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://ejemplo.com/recurso"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            field.onChange(e.target.value || null);
                            setHasChanges(true);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Un enlace a recursos externos relacionados con la tarea
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Archivo adjunto (opcional)</FormLabel>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.docx,.jpg,.jpeg,.png"
                    />
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        "Elegir archivo"
                      )}
                    </Label>
                  </div>
                  {fileName && (
                    <div className="mt-2 text-sm flex items-center text-green-600">
                      <PaperclipIcon className="h-4 w-4 mr-1" />
                      {fileName}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Sube un archivo PDF, Word o imagen para que los alumnos puedan descargarlo
                  </p>
                </div>
                
                <div className="mt-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" className="text-muted-foreground" disabled>
                          📊 Vincular rúbrica (Próximamente)
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Esta función estará disponible próximamente</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createTaskMutation.isPending || isUploading}
                >
                  {createTaskMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Crear Tarea
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación para cancelar */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de salir sin guardar esta tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Los cambios que has realizado no se guardarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate("/tareas")}>
              Salir sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default NewTaskPage;