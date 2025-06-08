import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { insertSubjectSchema } from "@shared/schema";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Switch } from "@/components/ui/switch";

// Extender el esquema para validación adicional
const subjectFormSchema = insertSubjectSchema.extend({
  horasPorSemana: z.number().optional().nullable().or(z.string().transform(val => val === "" ? null : parseInt(val, 10))),
  nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres").max(100, "El nombre no puede exceder los 100 caracteres"),
  estado: z.enum(["activo", "inactivo"]).default("activo"),
  id: z.number().optional(),
  // Campo para el profesor asignado
  profesorId: z.number().optional().nullable(),
});
type SubjectFormValues = z.infer<typeof subjectFormSchema>;

interface SubjectFormProps {
  initialData?: Partial<SubjectFormValues> & { id?: number };
  isEditing?: boolean;
}

export default function SubjectForm({ initialData, isEditing = false }: SubjectFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Cargar la lista de profesores
  const { data: teachers, isLoading: isLoadingTeachers } = useQuery({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/teachers");
      if (!response.ok) {
        throw new Error("Error al cargar profesores");
      }
      return response.json();
    }
  });

  // Configurar el formulario
  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      nombre: initialData?.nombre || "",
      nivel: initialData?.nivel || "",
      areaAcademica: initialData?.areaAcademica || "",
      horasPorSemana: initialData?.horasPorSemana || null,
      tipoMateria: initialData?.tipoMateria || "",
      estado: (initialData?.estado as "activo" | "inactivo") || "activo",
      id: initialData?.id,
      profesorId: initialData?.profesorId || null
    }
  });

  // Mutación para crear o actualizar una materia
  const submitSubject = useMutation({
    mutationFn: async (data: SubjectFormValues) => {
      // Verificar si ya existe una materia con el mismo nombre y nivel
      const subjects = await apiRequest("GET", "/api/subjects");
      const subjectsData = await subjects.json();
      
      // Comprobar duplicados solo en creación o si cambia el nombre/nivel
      if (!isEditing || (initialData?.nombre !== data.nombre || initialData?.nivel !== data.nivel)) {
        const duplicate = subjectsData.find((subject: any) => 
          subject.nombre.toLowerCase() === data.nombre.toLowerCase() && 
          subject.nivel === data.nivel &&
          (isEditing ? subject.id !== initialData?.id : true)
        );
        
        if (duplicate) {
          throw new Error(`Ya existe una materia '${data.nombre}' para el nivel ${data.nivel}`);
        }
      }
      
      // Extraemos el profesorId para procesarlo después
      const profesorId = data.profesorId;
      // Eliminamos el campo profesorId ya que no es parte del esquema de materia
      const { profesorId: _, ...subjectData } = data;
      
      let response;
      
      // Si es edición, actualizar materia
      if (isEditing && initialData?.id) {
        response = await apiRequest("PUT", `/api/subjects/${initialData.id}`, subjectData);
        if (!response.ok) {
          throw new Error(`Error al actualizar materia: ${response.statusText}`);
        }
        const updatedSubject = await response.json();
        
        // Si hay un profesor seleccionado, actualizar la asignación
        if (profesorId) {
          // Solo crear asignación si estamos editando y se seleccionó un profesor
          // Buscamos el primer grupo disponible para asignar (requisito del sistema)
          const gruposResponse = await apiRequest("GET", "/api/groups");
          const grupos = await gruposResponse.json();
          const primerGrupoId = grupos.length > 0 ? grupos[0].id : 1; // Usar el primer grupo o 1 por defecto
          
          await apiRequest("POST", "/api/assignments", {
            materiaId: updatedSubject.id,
            profesorId: profesorId,
            // Asignamos a un grupo por defecto (la API requiere un grupo válido)
            grupoId: primerGrupoId
          });
        }
        
        return updatedSubject;
      }
      
      // Si es creación, crear materia
      response = await apiRequest("POST", "/api/subjects", subjectData);
      if (!response.ok) {
        throw new Error(`Error al crear materia: ${response.statusText}`);
      }
      const newSubject = await response.json();
      
      // Si hay un profesor seleccionado, crear la asignación
      if (profesorId) {
        // Buscamos el primer grupo disponible para asignar (requisito del sistema)
        const gruposResponse = await apiRequest("GET", "/api/groups");
        const grupos = await gruposResponse.json();
        const primerGrupoId = grupos.length > 0 ? grupos[0].id : 1; // Usar el primer grupo o 1 por defecto
          
        await apiRequest("POST", "/api/assignments", {
          materiaId: newSubject.id,
          profesorId: profesorId,
          // Asignamos a un grupo por defecto (la API requiere un grupo válido)
          grupoId: primerGrupoId
        });
      }
      
      return newSubject;
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Materia actualizada" : "Materia creada",
        description: isEditing 
          ? "La materia ha sido actualizada correctamente" 
          : "La materia ha sido creada correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      if (isEditing && initialData?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/subjects/${initialData.id}`] });
      }
      navigate("/materias");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al ${isEditing ? 'actualizar' : 'crear'} materia: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: SubjectFormValues) {
    submitSubject.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de la Materia</FormLabel>
                <FormControl>
                  <Input placeholder="Ejemplo: Matemáticas" {...field} />
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
                <FormLabel>Nivel</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || ""}
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
                    <SelectItem value="Preparatoria">Preparatoria</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="areaAcademica"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Área Académica</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar área académica" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Ciencias">Ciencias</SelectItem>
                    <SelectItem value="Humanidades">Humanidades</SelectItem>
                    <SelectItem value="Artes">Artes</SelectItem>
                    <SelectItem value="Deportes">Deportes</SelectItem>
                    <SelectItem value="Tecnología">Tecnología</SelectItem>
                    <SelectItem value="Matemáticas">Matemáticas</SelectItem>
                    <SelectItem value="Idiomas">Idiomas</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Área del conocimiento a la que pertenece la materia
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="horasPorSemana"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horas por Semana</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1" 
                    max="40" 
                    placeholder="Ej: 5" 
                    {...field}
                    value={field.value === null ? "" : field.value}
                    onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                  />
                </FormControl>
                <FormDescription>
                  Número de horas semanales de la materia
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipoMateria"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Materia</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Regular">Regular</SelectItem>
                    <SelectItem value="Optativa">Optativa</SelectItem>
                    <SelectItem value="Taller">Taller</SelectItem>
                    <SelectItem value="Laboratorio">Laboratorio</SelectItem>
                    <SelectItem value="Extracurricular">Extracurricular</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Tipo de materia según su naturaleza curricular
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="estado"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Estado</FormLabel>
                  <FormDescription>
                    {field.value === "activo" 
                      ? "La materia está activa y disponible para asignaciones" 
                      : "La materia está inactiva y no disponible para nuevas asignaciones"}
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value === "activo"}
                    onCheckedChange={(checked) => 
                      field.onChange(checked ? "activo" : "inactivo")
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Selector de profesor */}
          <FormField
            control={form.control}
            name="profesorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asignar a Profesor</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} 
                  value={field.value?.toString() || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar profesor (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingTeachers ? (
                      <div className="flex justify-center p-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : teachers && teachers.length > 0 ? (
                      <>
                        <SelectItem value="none">-- Sin asignar --</SelectItem>
                        {teachers.map((teacher: any) => (
                          <SelectItem key={teacher.id} value={teacher.id.toString()}>
                            {teacher.nombreCompleto}
                          </SelectItem>
                        ))}
                      </>
                    ) : (
                      <SelectItem value="no_disponible" disabled>No hay profesores disponibles</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Selecciona un profesor para asignar automáticamente esta materia
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/materias")}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={submitSubject.isPending}
          >
            {submitSubject.isPending 
              ? (isEditing ? "Actualizando..." : "Guardando...") 
              : (isEditing ? "Actualizar" : "Guardar")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
