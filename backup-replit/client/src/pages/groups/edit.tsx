import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGroupSchema, Group, Teacher } from "@shared/schema";
import { z } from "zod";
import { ChevronLeft, Save, RefreshCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Option, MultiSelect } from "@/components/ui/multi-select";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Esquema extendido con validaciones adicionales
const editGroupSchema = insertGroupSchema.extend({
  nombre: z.string().min(3, {
    message: "El nombre debe tener al menos 3 caracteres",
  }),
  nivel: z.string().min(1, {
    message: "El nivel es requerido",
  }),
  cicloEscolar: z.string().min(1, {
    message: "El ciclo escolar es requerido",
  }),
});

type EditGroupFormValues = z.infer<typeof editGroupSchema>;

export default function EditGroup() {
  const [match, params] = useRoute("/grupos/:id/editar");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const groupId = params?.id ? parseInt(params.id) : null;
  const [selectedTeachers, setSelectedTeachers] = useState<Option[]>([]);

  const {
    data: group,
    isLoading,
    isError,
    error,
  } = useQuery<Group>({
    queryKey: [`/api/groups/${groupId}`],
    enabled: !!groupId,
  });

  // Cargar todos los profesores disponibles
  const { data: teachers = [], isLoading: isLoadingTeachers } = useQuery<Teacher[]>({
    queryKey: ["/api/teachers"],
    enabled: !!groupId,
  });

  // Cargar profesores asignados a este grupo
  const { 
    data: assignedTeachers = [], 
    isLoading: isLoadingAssignedTeachers,
    isError: isErrorAssignedTeachers
  } = useQuery<Teacher[]>({
    queryKey: [`/api/groups/${groupId}/teachers`],
    enabled: !!groupId,
    retry: false, // No reintentar si hay un error (la tabla puede no existir aún)
    onError: (error) => {
      console.error("Error al cargar profesores asignados:", error);
    }
  });

  const form = useForm<EditGroupFormValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      nombre: "",
      nivel: "",
      cicloEscolar: "",
    },
    mode: "onChange",
  });

  // Formatear profesores para el componente MultiSelect
  const teacherOptions: Option[] = teachers.map((teacher) => ({
    label: `${teacher.nombreCompleto} - ${teacher.materiaPrincipal}`,
    value: teacher.id,
  }));

  // Inicializar profesores seleccionados cuando se cargan los datos
  useEffect(() => {
    if (assignedTeachers.length > 0) {
      const selectedOptions = assignedTeachers.map(teacher => ({
        label: `${teacher.nombreCompleto} - ${teacher.materiaPrincipal}`,
        value: teacher.id,
      }));
      setSelectedTeachers(selectedOptions);
    }
  }, [assignedTeachers]);

  // Actualizar el formulario cuando se cargan los datos del grupo
  useEffect(() => {
    if (group) {
      form.reset({
        nombre: group.nombre,
        nivel: group.nivel,
        cicloEscolar: group.cicloEscolar,
      });
    }
  }, [group, form]);

  const mutation = useMutation({
    mutationFn: async (values: EditGroupFormValues) => {
      if (!groupId) throw new Error("ID de grupo no válido");
      const response = await apiRequest("PUT", `/api/groups/${groupId}`, values);
      return response.json();
    },
    onSuccess: () => {
      // Al tener éxito con la actualización de datos básicos, actualizamos los profesores
      updateTeacherAssignments();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el grupo: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para asignar profesores
  const assignTeachersMutation = useMutation({
    mutationFn: async (teacherIds: number[]) => {
      if (!groupId) throw new Error("ID de grupo no válido");
      const response = await apiRequest("POST", `/api/groups/${groupId}/teachers`, { teacherIds });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profesores asignados",
        description: "Los profesores han sido asignados correctamente al grupo",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/teachers`] });
      navigate("/grupos");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "No se pudo asignar los profesores al grupo: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Función para actualizar asignaciones de profesores
  const updateTeacherAssignments = () => {
    const teacherIds = selectedTeachers.map(teacher => Number(teacher.value));
    assignTeachersMutation.mutate(teacherIds);
  };

  const onSubmit = (values: EditGroupFormValues) => {
    mutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <RefreshCcw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !groupId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h3 className="text-lg font-medium mb-2">
          Error al cargar la información del grupo
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {error instanceof Error ? error.message : "ID de grupo no válido"}
        </p>
        <Button variant="outline" onClick={() => navigate("/grupos")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Volver a la lista de grupos
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Editar Grupo</h1>
          <div className="flex items-center text-sm">
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => navigate("/")}
            >
              Inicio
            </Button>
            <span className="mx-2 text-muted-foreground">/</span>
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => navigate("/grupos")}
            >
              Grupos
            </Button>
            <span className="mx-2 text-muted-foreground">/</span>
            <span>Editar</span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/grupos")}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Información del Grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Grupo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 1° A Secundaria" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nivel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nivel Educativo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar nivel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Preescolar">Preescolar</SelectItem>
                        <SelectItem value="Primaria">Primaria</SelectItem>
                        <SelectItem value="Secundaria">Secundaria</SelectItem>
                        <SelectItem value="Preparatoria">
                          Preparatoria
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cicloEscolar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo Escolar</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: 2024-2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-6">
                <FormLabel className="text-base">Profesores asignados</FormLabel>
                <div className="mt-2">
                  {isLoadingTeachers ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCcw className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Cargando profesores...</span>
                    </div>
                  ) : (
                    <MultiSelect
                      options={teacherOptions}
                      selected={selectedTeachers}
                      onChange={setSelectedTeachers}
                      placeholder="Seleccionar profesores"
                      emptyText="No hay profesores disponibles"
                      className="w-full"
                    />
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    Seleccione los profesores que impartirán clases en este grupo
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="mr-2"
                  onClick={() => navigate("/grupos")}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}