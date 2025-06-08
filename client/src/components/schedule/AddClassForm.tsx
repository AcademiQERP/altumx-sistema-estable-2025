import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus } from "lucide-react";

// Esquema de validación para el formulario
const scheduleFormSchema = z.object({
  diaSemana: z.string().min(1, "El día es requerido"),
  horaInicio: z.string().min(1, "La hora de inicio es requerida"),
  horaFin: z.string().min(1, "La hora de fin es requerida"),
  materiaId: z.string().min(1, "La materia es requerida"),
  profesorId: z.string().min(1, "El profesor es requerido"),
  modo: z.string().default("Presencial"),
  aula: z.string().optional(),
  tipo: z.string().optional(),
}).refine(data => {
  // Validar que la hora de fin sea mayor que la hora de inicio
  return data.horaInicio < data.horaFin;
}, {
  message: "La hora de fin debe ser posterior a la hora de inicio",
  path: ["horaFin"],
});

type FormValues = z.infer<typeof scheduleFormSchema>;

interface Subject {
  id: number;
  nombre: string;
  nivel: string;
}

interface Teacher {
  id: number;
  nombreCompleto: string;
  materiaPrincipal: string | null;
}

interface AddClassFormProps {
  groupId: number;
  selectedDay: string;
  onSuccess: () => void;
  schedules: any[];
}

export default function AddClassForm({ 
  groupId, 
  selectedDay, 
  onSuccess,
  schedules 
}: AddClassFormProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  // Obtener lista de materias
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['/api/subjects'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/subjects");
      return res.json() as Promise<Subject[]>;
    }
  });

  // Obtener lista de profesores
  const { data: teachers, isLoading: isLoadingTeachers } = useQuery({
    queryKey: ['/api/teachers'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/teachers");
      return res.json() as Promise<Teacher[]>;
    }
  });

  // Inicializar formulario
  const form = useForm<FormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      diaSemana: selectedDay,
      horaInicio: "",
      horaFin: "",
      materiaId: "",
      profesorId: "",
      modo: "Presencial",
      aula: "",
      tipo: "Regular",
    },
  });

  // Actualizar el día del formulario cuando cambia el día seleccionado
  useEffect(() => {
    form.setValue("diaSemana", selectedDay);
  }, [selectedDay, form]);
  
  // Verificar superposición de horarios
  const checkTimeOverlap = (startTime: string, endTime: string): boolean => {
    if (!schedules || schedules.length === 0) return false;
    
    const newStartMinutes = timeToMinutes(startTime);
    const newEndMinutes = timeToMinutes(endTime);
    
    return schedules.some(schedule => {
      if (schedule.diaSemana !== selectedDay) return false;
      
      const existingStartMinutes = timeToMinutes(schedule.horaInicio);
      const existingEndMinutes = timeToMinutes(schedule.horaFin);
      
      // Verificar si hay superposición real (permite bloques contiguos)
      // La condición correcta para superposición es: newStart < existingEnd && newEnd > existingStart
      return (
        newStartMinutes < existingEndMinutes && 
        newEndMinutes > existingStartMinutes
      );
    });
  };
  
  // Función para convertir hora (HH:MM) a minutos desde las 00:00
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Manejar envío del formulario
  const onSubmit = async (data: FormValues) => {
    // Verificar superposición de horarios
    if (checkTimeOverlap(data.horaInicio, data.horaFin)) {
      toast({
        title: "Error",
        description: "El horario se superpone con otro bloque existente",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Convertir IDs a números
      const formattedData = {
        ...data,
        materiaId: parseInt(data.materiaId),
        profesorId: parseInt(data.profesorId),
        grupoId: groupId,
        estatus: "Activo",
      };

      const res = await apiRequest(
        "POST", 
        `/api/groups/${groupId}/schedules`, 
        formattedData
      );
      
      if (res.ok) {
        toast({
          title: "¡Éxito!",
          description: "Clase agregada correctamente al horario",
        });
        setOpen(false);
        form.reset();
        onSuccess();
      } else {
        const error = await res.json();
        throw new Error(error.message || "Error al guardar la clase");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al guardar la clase",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full mt-4">
          <Plus className="h-4 w-4 mr-2" />
          Agregar clase
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Agregar clase al horario</DialogTitle>
          <DialogDescription>
            Completa el formulario para añadir una nueva clase al horario del {selectedDay.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Campo oculto para el día */}
            <FormField
              control={form.control}
              name="diaSemana"
              render={({ field }) => (
                <input type="hidden" {...field} />
              )}
            />
            
            {/* Horario de inicio */}
            <FormField
              control={form.control}
              name="horaInicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora de inicio</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Horario de fin */}
            <FormField
              control={form.control}
              name="horaFin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora de fin</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Selección de materia */}
            <FormField
              control={form.control}
              name="materiaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Materia</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una materia" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingSubjects ? (
                        <div className="flex justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
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
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Selección de profesor */}
            <FormField
              control={form.control}
              name="profesorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profesor</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un profesor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingTeachers ? (
                        <div className="flex justify-center p-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        teachers?.map((teacher) => (
                          <SelectItem 
                            key={teacher.id} 
                            value={teacher.id.toString()}
                          >
                            {teacher.nombreCompleto}
                            {teacher.materiaPrincipal && ` - ${teacher.materiaPrincipal}`}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Selección de modalidad */}
            <FormField
              control={form.control}
              name="modo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modalidad</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona la modalidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Presencial">Presencial</SelectItem>
                      <SelectItem value="Virtual">Virtual</SelectItem>
                      <SelectItem value="Híbrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Aula (opcional) */}
            <FormField
              control={form.control}
              name="aula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aula o salón (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Aula 102" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Tipo de clase (opcional) */}
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de clase (opcional)</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Regular">Regular</SelectItem>
                      <SelectItem value="Asesoría">Asesoría</SelectItem>
                      <SelectItem value="Laboratorio">Laboratorio</SelectItem>
                      <SelectItem value="Taller">Taller</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}