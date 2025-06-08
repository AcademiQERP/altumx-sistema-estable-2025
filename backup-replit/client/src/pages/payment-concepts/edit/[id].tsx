import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormState } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { format, parse } from "date-fns";
import { PaymentConcept } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { insertPaymentConceptSchema } from "@shared/schema";
import { 
  validatePaymentConcept 
} from "@/utils/payment-concept-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Extender el esquema para validación
const formSchema = insertPaymentConceptSchema.extend({
  montoBase: z.string().min(1, "El monto es requerido"),
  fechaInicioVigencia: z.date().optional(),
  fechaFinVigencia: z.date().optional()
});

type FormData = z.infer<typeof formSchema>;

export default function EditPaymentConcept() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [formValid, setFormValid] = useState<{general: boolean, financiero: boolean, adicional: boolean}>({
    general: true, // Inicialmente true porque estamos editando un concepto existente
    financiero: true,
    adicional: true
  });
  const [, navigate] = useLocation();
  const [match, params] = useRoute<{ id: string }>("/payment-concepts/edit/:id");
  const { toast } = useToast();
  
  // Obtener la fecha actual y el ciclo escolar actual (formato "2024-2025")
  const currentYear = new Date().getFullYear();
  const cicloEscolarActual = `${currentYear}-${currentYear + 1}`;

  // Consultar el concepto a editar
  const { data: concept, isLoading, error } = useQuery({
    queryKey: [`/api/payment-concepts/${params?.id}`],
    enabled: !!params?.id,
    staleTime: 60 * 1000, // 1 minuto
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      montoBase: "",
      aplicaA: "individual",
      cicloEscolar: cicloEscolarActual,
      tipoAplicacion: "mensual",
      categoriaContable: "",
      notasInternas: "",
      nivelAplicable: "",
    },
    mode: "onChange",
  });
  
  // Cargar los datos del concepto cuando estén disponibles
  useEffect(() => {
    if (concept) {
      console.log("Cargando datos del concepto:", concept);
      
      form.reset({
        nombre: concept.nombre,
        descripcion: concept.descripcion || "",
        montoBase: concept.montoBase.toString(),
        aplicaA: concept.aplicaA || "individual",
        cicloEscolar: concept.cicloEscolar,
        tipoAplicacion: concept.tipoAplicacion,
        categoriaContable: concept.categoriaContable || "",
        notasInternas: concept.notasInternas || "",
        nivelAplicable: concept.nivelAplicable || "",
        // Convertir fechas de string a Date si existen
        fechaInicioVigencia: concept.fechaInicioVigencia 
          ? new Date(concept.fechaInicioVigencia) 
          : undefined,
        fechaFinVigencia: concept.fechaFinVigencia 
          ? new Date(concept.fechaFinVigencia) 
          : undefined,
      });
      
      // Inicializar los estados de validez
      setFormValid({
        general: true,
        financiero: true,
        adicional: true
      });
    }
  }, [concept]);
  
  // Acceder al estado del formulario para verificar validez y errores
  const { errors } = useFormState({
    control: form.control
  });
  
  // Debug adicional para ayudar al diagnóstico
  useEffect(() => {
    console.log("Match de ruta:", match);
    console.log("Parámetros:", params);
    console.log("ID del concepto:", params?.id);
  }, [match, params]);
  
  // Función para verificar si los campos de la pestaña actual son válidos
  const checkTabValidity = (tab: string) => {
    const requiredFieldsByTab = {
      general: ['nombre', 'aplicaA', 'cicloEscolar'],
      financiero: ['montoBase', 'tipoAplicacion'],
      adicional: [] // No hay campos obligatorios en información adicional
    };
    
    const tabFields = requiredFieldsByTab[tab as keyof typeof requiredFieldsByTab] || [];
    
    // Un tab es válido si todos sus campos requeridos tienen valores y no hay errores en ellos
    const fieldsHaveValues = tabFields.every(field => {
      const value = form.getValues(field as any);
      return value !== undefined && value !== null && value !== '';
    });
    
    const fieldsHaveNoErrors = tabFields.every(field => 
      !errors[field as keyof typeof errors]
    );
    
    console.log(`Validando ${tab}: valores=${fieldsHaveValues}, sin errores=${fieldsHaveNoErrors}`);
    
    return fieldsHaveValues && fieldsHaveNoErrors;
  };
  
  // Efecto para actualizar el estado de validez cuando cambian los valores del formulario
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Si cambió un campo, actualizar el estado de las pestañas
      if (name) {
        const generalValid = checkTabValidity('general');
        const financieroValid = checkTabValidity('financiero');
        
        console.log(`Estado de validez actualizado - General: ${generalValid}, Financiero: ${financieroValid}`);
        console.log('Valores actuales del formulario:', form.getValues());
        
        setFormValid({
          general: generalValid,
          financiero: financieroValid,
          adicional: true // Siempre válido, campos opcionales
        });
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, errors]);
  
  // Manejar cambio de pestaña
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  async function onSubmit(data: FormData) {
    if (!concept) return;
    setIsSubmitting(true);
    
    // Validación manual adicional
    const validationErrors = validatePaymentConcept(data as Partial<PaymentConcept>);
    if (validationErrors) {
      Object.entries(validationErrors).forEach(([key, message]) => {
        form.setError(key as any, { 
          type: "manual", 
          message 
        });
      });
      setIsSubmitting(false);
      return;
    }
    
    // Formatear fechas para envío al servidor si están definidas
    const formattedData: Partial<PaymentConcept> = {
      ...data,
      // Convertir las fechas de Date a string para la API
      fechaInicioVigencia: data.fechaInicioVigencia ? format(data.fechaInicioVigencia, 'yyyy-MM-dd') : null,
      fechaFinVigencia: data.fechaFinVigencia ? format(data.fechaFinVigencia, 'yyyy-MM-dd') : null,
    };
    
    try {
      await apiRequest(
        "PATCH", 
        `/api/payment-concepts/${concept.id}`, 
        formattedData
      );

      queryClient.invalidateQueries({ queryKey: ['/api/payment-concepts'] });
      queryClient.invalidateQueries({ queryKey: [`/api/payment-concepts/${concept.id}`] });
      
      toast({
        title: "Concepto actualizado",
        description: "El concepto de pago ha sido actualizado correctamente",
      });
      
      navigate("/payment-concepts");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el concepto de pago",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Generar opciones para el ciclo escolar (5 años)
  const ciclosEscolares = Array(5).fill(0).map((_, i) => {
    const year = currentYear - 2 + i;
    return `${year}-${year + 1}`;
  });

  // Mostrar carga mientras se consulta el concepto
  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="ml-2">Cargando concepto de pago...</p>
        </div>
      </div>
    );
  }

  // Mostrar error si no se pudo cargar el concepto
  if (error || !concept) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No se pudo cargar el concepto de pago. Por favor, intenta nuevamente.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate("/payment-concepts")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/payment-concepts")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la lista
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Editar Concepto de Pago</h1>
        <p className="text-muted-foreground">
          Modifica la información del concepto de pago existente
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">
                Información General
                {formValid.general && <span className="ml-1 text-green-500">✓</span>}
              </TabsTrigger>
              <TabsTrigger value="financiero">
                Datos Financieros
                {formValid.financiero && <span className="ml-1 text-green-500">✓</span>}
              </TabsTrigger>
              <TabsTrigger value="adicional">
                Información Adicional
                <span className="ml-1 text-green-500">✓</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Información General */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Información del Concepto</CardTitle>
                  <CardDescription>
                    Modifica la información básica del concepto de pago
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej. Colegiatura Mensual" {...field} />
                        </FormControl>
                        <FormDescription>
                          Nombre descriptivo del concepto de pago
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="descripcion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Ingresa una descripción detallada del concepto" 
                            {...field} 
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Descripción opcional para clarificar este concepto de pago
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="aplicaA"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aplica a</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona a quién aplica" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="individual">Alumno Individual</SelectItem>
                              <SelectItem value="grupo">Grupo</SelectItem>
                              <SelectItem value="nivel">Nivel Educativo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Define a quién se aplicará este concepto de pago
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nivelAplicable"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nivel Aplicable</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value ?? "todos"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un nivel" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="todos">Todos los niveles</SelectItem>
                              <SelectItem value="Preescolar">Preescolar</SelectItem>
                              <SelectItem value="Primaria">Primaria</SelectItem>
                              <SelectItem value="Secundaria">Secundaria</SelectItem>
                              <SelectItem value="Preparatoria">Preparatoria</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Nivel educativo al que aplica este concepto
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="cicloEscolar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciclo Escolar</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona el ciclo escolar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ciclosEscolares.map((ciclo) => (
                              <SelectItem key={ciclo} value={ciclo}>
                                {ciclo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Ciclo escolar al que pertenece este concepto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Datos Financieros */}
            <TabsContent value="financiero">
              <Card>
                <CardHeader>
                  <CardTitle>Información Financiera</CardTitle>
                  <CardDescription>
                    Configura los aspectos financieros del concepto de pago
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="montoBase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto Base</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <span className="text-gray-500">$</span>
                            </div>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className="pl-7"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Monto base de este concepto de pago
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="tipoAplicacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Aplicación</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona el tipo de aplicación" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mensual">Mensual</SelectItem>
                            <SelectItem value="anual">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          ¿Con qué frecuencia se aplica este concepto?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fechaInicioVigencia"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha Inicio Vigencia</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <span>Seleccionar fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Fecha desde la que este concepto estará vigente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="fechaFinVigencia"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha Fin Vigencia</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <span>Seleccionar fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Fecha hasta la que este concepto estará vigente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="categoriaContable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría Contable</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej. Ingresos Operativos" 
                            {...field} 
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Categoría para clasificación contable (opcional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Información Adicional */}
            <TabsContent value="adicional">
              <Card>
                <CardHeader>
                  <CardTitle>Información Adicional</CardTitle>
                  <CardDescription>
                    Datos adicionales que pueden ser útiles para la gestión
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="notasInternas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas Internas</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Notas para uso interno..." 
                            className="min-h-[120px]"
                            {...field} 
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Notas para uso administrativo interno (no visibles para los padres)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Mensaje de ayuda */}
          {(Object.keys(errors).length > 0 || !(formValid.general && formValid.financiero)) && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertTitle>Información incompleta</AlertTitle>
              <AlertDescription>
                Por favor, completa al menos los campos obligatorios en las pestañas "Información General" y "Datos Financieros".
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="mr-2"
              onClick={() => navigate("/payment-concepts")}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !(formValid.general && formValid.financiero)}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                  Guardando...
                </>
              ) : (
                "Actualizar Concepto"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}