import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2 } from "lucide-react";

// Esquema para validar el formulario de observación
const observacionSchema = z.object({
  grupoId: z.string().min(1, {
    message: "Por favor, seleccione un grupo",
  }),
  alumnoId: z.string().min(1, {
    message: "Por favor, seleccione un alumno",
  }),
  materiaId: z.string().min(1, {
    message: "Por favor, seleccione una materia",
  }),
  categoria: z.string().optional(),
  contenido: z.string().min(10, {
    message: "La observación debe tener al menos 10 caracteres",
  }).max(500, {
    message: "La observación no debe exceder los 500 caracteres",
  }),
});

export default function NuevaObservacion() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null);

  // Redireccionar si el usuario no es docente o admin
  if (user && !["admin", "docente"].includes(user.rol)) {
    navigate("/");
    return null;
  }

  // Consultar los grupos disponibles
  const { data: grupos, isLoading: isLoadingGrupos } = useQuery({
    queryKey: ["/api/groups"],
    enabled: !!user,
  });

  // Consultar los alumnos del grupo seleccionado
  const { data: alumnos, isLoading: isLoadingAlumnos } = useQuery({
    queryKey: ["/api/students/group", selectedGrupoId],
    queryFn: async () => {
      const response = await fetch(`/api/students/group/${selectedGrupoId}`);
      if (!response.ok) {
        throw new Error('Error al cargar los alumnos');
      }
      return response.json();
    },
    enabled: !!selectedGrupoId,
  });

  // Consultar las materias asignadas al profesor
  const { data: materias, isLoading: isLoadingMaterias } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: !!user,
  });

  // Configurar el formulario con la validación
  const form = useForm<z.infer<typeof observacionSchema>>({
    resolver: zodResolver(observacionSchema),
    defaultValues: {
      grupoId: "",
      alumnoId: "",
      materiaId: "",
      categoria: "",
      contenido: "",
    },
  });

  // Manejar el cambio de grupo seleccionado
  useEffect(() => {
    const grupoId = form.watch("grupoId");
    if (grupoId) {
      setSelectedGrupoId(grupoId);
      // Resetear el alumno seleccionado
      form.setValue("alumnoId", "");
    }
  }, [form.watch("grupoId")]);

  // Mutación para crear una nueva observación
  const createObservacionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof observacionSchema>) => {
      // Enviar solo los datos del formulario sin incluir profesorId
      // El backend se encargará de obtener el profesorId automáticamente
      return await apiRequest("POST", "/api/observaciones", {
        grupoId: parseInt(data.grupoId),
        alumnoId: parseInt(data.alumnoId),
        materiaId: parseInt(data.materiaId),
        categoria: data.categoria === "sin_categoria" ? null : data.categoria,
        contenido: data.contenido,
      });
    },
    onSuccess: () => {
      toast({
        title: "Observación registrada",
        description: "La observación ha sido registrada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/observaciones"] });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/profesores", user?.profesorId, "observaciones"] 
      });
      navigate("/observaciones");
    },
    onError: (error) => {
      console.error("Error al crear observación:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la observación. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    },
  });

  // Manejar el envío del formulario
  const onSubmit = (data: z.infer<typeof observacionSchema>) => {
    createObservacionMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          className="mr-2" 
          onClick={() => navigate("/observaciones")}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Nueva Observación</h1>
      </div>
      
      <Separator />
      
      <Card>
        <CardHeader>
          <CardTitle>Registrar observación del estudiante</CardTitle>
          <CardDescription>
            Complete el formulario para registrar una nueva observación académica o de comportamiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Selección de Grupo */}
                <FormField
                  control={form.control}
                  name="grupoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grupo</FormLabel>
                      <Select
                        disabled={isLoadingGrupos}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un grupo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {grupos?.map((grupo) => (
                            <SelectItem key={grupo.id} value={grupo.id.toString()}>
                              {grupo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Grupo al que pertenece el estudiante
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selección de Alumno */}
                <FormField
                  control={form.control}
                  name="alumnoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alumno</FormLabel>
                      <Select
                        disabled={!selectedGrupoId || isLoadingAlumnos}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un alumno" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {alumnos?.map((alumno) => (
                            <SelectItem key={alumno.id} value={alumno.id.toString()}>
                              {alumno.nombreCompleto}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Estudiante al que corresponde la observación
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selección de Materia */}
                <FormField
                  control={form.control}
                  name="materiaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Materia</FormLabel>
                      <Select
                        disabled={isLoadingMaterias}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione una materia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {materias?.map((materia) => (
                            <SelectItem key={materia.id} value={materia.id.toString()}>
                              {materia.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Materia relacionada con la observación
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Categoría */}
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría (opcional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sin_categoria">Sin categoría</SelectItem>
                        <SelectItem value="académica">Académica</SelectItem>
                        <SelectItem value="comportamiento">Comportamiento</SelectItem>
                        <SelectItem value="asistencia">Asistencia</SelectItem>
                        <SelectItem value="desempeño">Desempeño</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Categoría de la observación (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contenido de la observación */}
              <FormField
                control={form.control}
                name="contenido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observación</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ingrese la observación sobre el estudiante"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Ingrese los detalles de la observación (mínimo 10 caracteres)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="mr-2"
                  onClick={() => navigate("/observaciones")}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createObservacionMutation.isPending}
                >
                  {createObservacionMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Guardar Observación
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}