import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { insertGroupSchema } from "@shared/schema";
import { z } from "zod";

import {
  Form,
  FormControl,
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

// Extender el esquema para validación adicional si es necesario
const groupFormSchema = insertGroupSchema;
type GroupFormValues = z.infer<typeof groupFormSchema>;

export default function GroupForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Configurar el formulario
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      nombre: "",
      nivel: "",
      cicloEscolar: ""
    }
  });

  // Mutación para crear un grupo
  const createGroup = useMutation({
    mutationFn: (data: GroupFormValues) => 
      apiRequest("POST", "/api/groups", data),
    onSuccess: () => {
      toast({
        title: "Grupo creado",
        description: "El grupo ha sido creado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      navigate("/grupos");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Error al crear grupo: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  function onSubmit(data: GroupFormValues) {
    createGroup.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Grupo</FormLabel>
                <FormControl>
                  <Input placeholder="Ejemplo: 1°A Primaria" {...field} />
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
                  defaultValue={field.value}
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
            name="cicloEscolar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciclo Escolar</FormLabel>
                <FormControl>
                  <Input placeholder="Ejemplo: 2023-2024" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/grupos")}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={createGroup.isPending}
          >
            {createGroup.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
