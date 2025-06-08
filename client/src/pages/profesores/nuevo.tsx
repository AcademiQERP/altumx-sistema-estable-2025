import React, { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ChevronLeft, Save, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

// Esquema de validación para el formulario de nuevo profesor
const teacherFormSchema = z.object({
  nombreCompleto: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  correo: z.string().email("Ingrese un correo electrónico válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  materiaPrincipal: z.string().min(1, "Seleccione una materia principal"),
  materiasAsignadas: z.array(z.number()).optional(),
});

type TeacherFormValues = z.infer<typeof teacherFormSchema>;

export default function NuevoProfesor() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  // Consultar todas las materias disponibles
  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ["/api/subjects"],
  });

  // Consultar todos los grupos disponibles
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["/api/groups"],
  });

  // Inicializar formulario con valores por defecto
  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      nombreCompleto: "",
      correo: "",
      password: "",
      materiaPrincipal: "",
      materiasAsignadas: [],
    },
  });

  // Mutación para crear nuevo profesor
  const createTeacherMutation = useMutation({
    mutationFn: async (data: TeacherFormValues) => {
      // Crear usuario docente
      const userResponse = await apiRequest("POST", "/api/users", {
        nombreCompleto: data.nombreCompleto,
        correo: data.correo,
        password: data.password,
        rol: "docente",
      });
      
      const user = await userResponse.json();
      
      // Crear registro de profesor
      const teacherResponse = await apiRequest("POST", "/api/teachers", {
        nombreCompleto: data.nombreCompleto,
        correo: data.correo,
        materiaPrincipal: data.materiaPrincipal,
      });
      
      const teacher = await teacherResponse.json();
      
      // Asignar materias al profesor si hay seleccionadas
      if (selectedSubjects.length > 0) {
        for (const subjectId of selectedSubjects) {
          // Asumimos que asignamos al grupo 1 por defecto
          // En un sistema real, tendríamos que permitir seleccionar el grupo
          const grupoId = 1;
          
          await apiRequest("POST", "/api/subject-assignments", {
            grupoId,
            materiaId: subjectId,
            profesorId: teacher.id,
          });
        }
      }
      
      return teacher;
    },
    onSuccess: () => {
      toast({
        title: "Profesor creado",
        description: "El profesor ha sido creado exitosamente",
      });
      // Invalidar consultas para actualizar los datos
      queryClient.invalidateQueries({ queryKey: ["/api/teachers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subject-assignments"] });
      // Redirigir a la lista de profesores
      navigate("/profesores");
    },
    onError: (error) => {
      toast({
        title: "Error al crear profesor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TeacherFormValues) => {
    // Actualizar el campo materiasAsignadas con las materias seleccionadas
    data.materiasAsignadas = selectedSubjects;
    createTeacherMutation.mutate(data);
  };

  // Función para manejar la selección/deselección de materias
  const toggleSubject = (subjectId: number) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  // Obtener el nombre de la materia por ID
  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.nombre || 'Materia desconocida';
  };

  if (isLoadingSubjects || isLoadingGroups) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <h1 className="text-2xl font-bold">Nuevo Profesor</h1>
      </div>

      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Información del profesor</CardTitle>
          <CardDescription>
            Complete el formulario para registrar un nuevo profesor en el sistema
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormDescription>
                      La contraseña debe tener al menos 6 caracteres
                    </FormDescription>
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

              <FormField
                control={form.control}
                name="materiasAsignadas"
                render={() => (
                  <FormItem>
                    <FormLabel>Materias asignadas</FormLabel>
                    <div className="space-y-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            {selectedSubjects.length === 0 
                              ? "Seleccionar materias" 
                              : `${selectedSubjects.length} materias seleccionadas`
                            }
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuLabel>Materias disponibles</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {subjects.map((subject) => (
                            <DropdownMenuCheckboxItem
                              key={subject.id}
                              checked={selectedSubjects.includes(subject.id)}
                              onCheckedChange={() => toggleSubject(subject.id)}
                            >
                              {subject.nombre}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      {selectedSubjects.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-muted-foreground mb-2">Materias seleccionadas:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedSubjects.map((subjectId) => (
                              <div key={subjectId} className="bg-muted text-sm px-3 py-1 rounded-md flex items-center">
                                {getSubjectName(subjectId)}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-4 w-4 ml-1 text-muted-foreground hover:text-destructive"
                                  onClick={() => toggleSubject(subjectId)}
                                >
                                  <span className="sr-only">Quitar</span>
                                  <svg width="10" height="10" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" />
                                  </svg>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <FormDescription>
                      Seleccione todas las materias que impartirá este profesor
                    </FormDescription>
                  </FormItem>
                )}
              />

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
                  disabled={createTeacherMutation.isPending}
                  className="flex items-center gap-1"
                >
                  {createTeacherMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar profesor
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}