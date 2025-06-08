import React, { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ChevronLeft, Save, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Esquema de validación para el formulario de editar profesor
// Simplificado para manejar solo la materia principal
const teacherFormSchema = z.object({
  nombreCompleto: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  correo: z.string().email("Ingrese un correo electrónico válido"),
  materiaPrincipal: z.string().min(1, "Seleccione una materia principal"),
  // Se ha eliminado el campo materiasAsignadas para simplificar el modelo
});

type TeacherFormValues = z.infer<typeof teacherFormSchema>;

export default function EditarProfesor() {
  const [match, params] = useRoute("/profesores/:id/editar");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  // Se eliminaron variables de estado relacionadas con materias asignadas y diálogos
  
  const teacherId = params?.id ? parseInt(params.id, 10) : undefined;

  // Consultar datos del profesor
  const { 
    data: teacher, 
    isLoading: isLoadingTeacher, 
    error: teacherError 
  } = useQuery({
    queryKey: [`/api/teachers/${teacherId}`],
    enabled: !!teacherId
  });

  // Consultar asignaciones de materias del profesor
  const { 
    data: assignmentsResponse, 
    isLoading: isLoadingAssignments 
  } = useQuery({
    queryKey: [`/api/subject-assignments/teacher/${teacherId}`],
    enabled: !!teacherId
  });
  
  // Extraer los datos de las asignaciones de la respuesta
  const assignments = Array.isArray(assignmentsResponse) 
    ? assignmentsResponse // Formato antiguo: array directo
    : assignmentsResponse?.success 
      ? assignmentsResponse.data || [] // Nuevo formato: {success, data, count}
      : [];

  // Consultar todas las materias disponibles
  const { 
    data: subjects = [], 
    isLoading: isLoadingSubjects 
  } = useQuery({
    queryKey: ["/api/subjects"],
  });

  // Inicializar formulario con valores por defecto
  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      nombreCompleto: "",
      correo: "",
      materiaPrincipal: "",
      // Ya no manejamos materiasAsignadas
    },
  });

  // Cargar datos del profesor en el formulario cuando estén disponibles
  useEffect(() => {
    if (teacher) {
      form.reset({
        nombreCompleto: teacher.nombreCompleto,
        correo: teacher.correo,
        materiaPrincipal: teacher.materiaPrincipal || "",
        // Ya no incluimos materiasAsignadas
      });
    }
  }, [teacher, form]);

  // Ya no necesitamos inicializar materias asignadas, solo usamos la materia principal

  // Mutación para actualizar profesor
  const updateTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormValues) => {
      try {
        // Actualizar solo los datos básicos del profesor, incluyendo la materia principal
        const responseTeacher = await apiRequest("PUT", `/api/teachers/${teacherId}`, {
          nombreCompleto: data.nombreCompleto,
          correo: data.correo,
          materiaPrincipal: data.materiaPrincipal,
        });
        
        const updatedTeacher = await responseTeacher.json();
        return updatedTeacher;
      } catch (error) {
        console.error("[UPDATE] Error general:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Profesor actualizado",
        description: "El profesor ha sido actualizado exitosamente",
      });
      
      // Invalidar todas las consultas relacionadas para garantizar datos frescos
      // Usamos una estrategia más amplia de invalidación para asegurar que todos
      // los datos relacionados con profesores y asignaciones se actualicen
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: [`/api/teachers/${teacherId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/subject-assignments/teacher/${teacherId}`] });
      
      // Recargar los datos antes de redirigir
      setTimeout(() => {
        // Redirigir a la lista de profesores después de un breve retraso
        // para permitir que las invalidaciones se completen
        navigate("/profesores");
      }, 500);
    },
    onError: (error) => {
      console.error("[UPDATE_ERROR] Error completo:", error);
      toast({
        title: "Error al actualizar profesor",
        description: error.message || "Ocurrió un error al actualizar el profesor",
        variant: "destructive",
      });
    },
  });

  // Ahora solo necesitamos la función onSubmit simplificada
  const onSubmit = (data: TeacherFormValues) => {
    // Solo enviamos los datos básicos del formulario, incluyendo la materia principal
    updateTeacherMutation.mutate(data);
  };

  // Ya no necesitamos la función getSubjectName

  const isLoading = isLoadingTeacher || isLoadingSubjects || isLoadingAssignments;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (teacherError || !teacher) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-destructive mb-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium">Error al cargar el profesor</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No se pudo encontrar el profesor solicitado o ocurrió un error
          </p>
          <Button variant="outline" onClick={() => navigate("/profesores")}>
            Volver a la lista de profesores
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/profesores")}
          className="mr-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Editar Profesor</h1>
      </div>

      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Información del profesor</CardTitle>
          <CardDescription>
            Actualice la información del profesor {teacher.nombreCompleto}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="nombreCompleto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="correo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input placeholder="correo@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="materiaPrincipal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Materia principal</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una materia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.nombre}>
                            {subject.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Seleccione la materia principal que impartirá este profesor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Se ha eliminado la sección de materias asignadas para simplificar el modelo */}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/profesores")}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateTeacherMutation.isPending}
                  className="flex items-center gap-1"
                >
                  {updateTeacherMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar cambios
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Se ha eliminado el diálogo de confirmación para eliminar materias asignadas */}
    </div>
  );
}