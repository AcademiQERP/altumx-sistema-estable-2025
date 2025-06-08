import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFormState } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { PaymentConcept } from "@shared/schema";

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
  CardFooter,
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

export default function NewPaymentConcept() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [formValid, setFormValid] = useState<{general: boolean, financiero: boolean, adicional: boolean}>({
    general: false,
    financiero: false,
    adicional: true  // Información adicional es opcional, por defecto true
  });
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Obtener la fecha actual y el ciclo escolar actual (formato "2024-2025")
  const currentYear = new Date().getFullYear();
  const cicloEscolarActual = `${currentYear}-${currentYear + 1}`;

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
  
  // Acceder al estado del formulario para verificar validez y errores
  const { errors, isDirty, dirtyFields, isValid } = useFormState({
    control: form.control
  });
  
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
    
    // Iniciar con validación
    const generalValid = checkTabValidity('general');
    const financieroValid = checkTabValidity('financiero');
    
    console.log(`Validación inicial - General: ${generalValid}, Financiero: ${financieroValid}`);
    
    setFormValid({
      general: generalValid,
      financiero: financieroValid,
      adicional: true
    });
    
    return () => subscription.unsubscribe();
  }, [form, errors]);
  
  // Manejar cambio de pestaña
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  async function onSubmit(data: FormData) {
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
        "POST", 
        "/api/payment-concepts", 
        formattedData
      );

      queryClient.invalidateQueries({ queryKey: ['/api/payment-concepts'] });
      
      toast({
        title: "Concepto creado",
        description: "El concepto de pago ha sido creado correctamente",
      });
      
      navigate("/payment-concepts");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el concepto de pago",
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
        <h1 className="text-3xl font-bold tracking-tight">➕ Crear Concepto de Pago</h1>
        <p className="text-muted-foreground">
          Define los parámetros generales y financieros de un nuevo concepto
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger 
                value="general" 
                className={activeTab === "general" ? "bg-slate-100 border-b-2 border-blue-500" : ""}
              >
                📄 Información General
                {formValid.general && <span className="ml-1 text-green-500">✓</span>}
              </TabsTrigger>
              <TabsTrigger 
                value="financiero"
                className={activeTab === "financiero" ? "bg-slate-100 border-b-2 border-blue-500" : ""}
              >
                💰 Datos Financieros
                {formValid.financiero && <span className="ml-1 text-green-500">✓</span>}
              </TabsTrigger>
              <TabsTrigger 
                value="adicional"
                className={activeTab === "adicional" ? "bg-slate-100 border-b-2 border-blue-500" : ""}
              >
                📝 Información Adicional
                <span className="ml-1 text-green-500">✓</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Información General */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Información del Concepto</CardTitle>
                  <CardDescription>
                    Ingresa la información básica del concepto de pago
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
                          Descripción general del concepto, visible para los administradores
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
                          >
                            <FormControl>
                              <SelectTrigger title="Define si este concepto se aplicará por estudiante o por grupo">
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
                          <FormLabel>Nivel Escolar Aplicable</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value ?? "todos"}
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
                          defaultValue={field.value}
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
                        <div className="flex items-center gap-1">
                          <FormLabel>Monto Base</FormLabel>
                          <span 
                            className="text-muted-foreground cursor-help text-sm" 
                            title="Monto inicial a cobrar por este concepto. No incluye recargos ni descuentos."
                          >
                            ℹ️
                          </span>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <span className="text-gray-500">💲</span>
                            </div>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              className={`pl-7 ${parseFloat(field.value) > 0 ? 'border-green-500 focus:ring-green-500' : ''}`}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Monto inicial a cobrar por este concepto de pago
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
                        <div className="flex items-center gap-1">
                          <FormLabel>Frecuencia de Cobro</FormLabel>
                          <span 
                            className="text-muted-foreground cursor-help text-sm" 
                            title="Indica si se cobrará de forma mensual, anual u otra frecuencia definida"
                          >
                            ℹ️
                          </span>
                        </div>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger title="Indica si se cobrará de forma mensual, anual u otra frecuencia definida">
                              <SelectValue placeholder="Selecciona la frecuencia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="mensual">Mensual</SelectItem>
                            <SelectItem value="anual">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Define la periodicidad con la que se aplicará este cobro
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4 mt-5">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-700">📅 Período de Vigencia</span>
                      <p className="text-muted-foreground text-sm">Este concepto estará activo solo dentro del rango definido</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="fechaInicioVigencia"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <FormLabel>Fecha de Inicio</FormLabel>
                              <span className="text-muted-foreground">📅</span>
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground",
                                      field.value && "border-green-200 bg-green-50"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
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
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="fechaFinVigencia"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <FormLabel>Fecha de Fin</FormLabel>
                              <span className="text-muted-foreground">📅</span>
                            </div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground",
                                      field.value && "border-green-200 bg-green-50"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
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
                                  disabled={(date) => {
                                    // Asegurar que no elegimos fechas antiguas
                                    if (date < new Date("1900-01-01")) return true;
                                    
                                    // Comprobar si hay fecha de inicio para comparar
                                    const fechaInicio = form.getValues().fechaInicioVigencia;
                                    if (!fechaInicio) return false;
                                    
                                    // Impedir elegir fechas anteriores a la fecha de inicio
                                    return date < fechaInicio;
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="categoriaContable"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-1">
                          <FormLabel>Categoría Contable</FormLabel>
                          <span 
                            className="text-muted-foreground cursor-help text-sm" 
                            title="Útil para reportes financieros y clasificación contable"
                          >
                            ℹ️
                          </span>
                        </div>
                        <FormControl>
                          <Input 
                            placeholder="Ejemplo: Ingreso por Inscripción, Cuotas Operativas" 
                            {...field} 
                            value={field.value ?? ""}
                            className="text-muted-foreground focus:text-foreground"
                          />
                        </FormControl>
                        <FormDescription>
                          Opcional – útil para reportes financieros y clasificación contable
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
            <div className="mb-4 p-4 bg-[#fdecea] border-l-4 border-[#f44336] rounded-md shadow-sm">
              <div className="flex items-start">
                <AlertCircle className="h-6 w-6 mr-3 text-[#f44336] mt-0.5 flex-shrink-0" />
                <div>
                  <AlertTitle className="text-[#d32f2f] font-medium mb-1">
                    Campos pendientes
                  </AlertTitle>
                  <AlertDescription className="text-gray-800">
                    ⚠️ Aún faltan campos por completar. Verifica las secciones "Información General" y "Datos Financieros".
                  </AlertDescription>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 sticky bottom-4 bg-white p-4 rounded-lg shadow-md border z-10">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/payment-concepts")}
              disabled={isSubmitting}
              className="border-gray-300 hover:bg-gray-100"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> 
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !(formValid.general && formValid.financiero)}
              title="Guardar este nuevo concepto en el sistema"
              className={`${isSubmitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-white rounded-full"></div>
                  Guardando...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-save">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  Guardar Concepto
                </span>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}