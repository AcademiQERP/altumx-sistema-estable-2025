import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Search, Send, MoreVertical, CheckCheck, Archive, Trash2, AlertCircle, MessageCircle, MessageSquare, Sparkles, Loader2, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Tipos
type Mensaje = {
  id: string;
  senderId: string;
  receiverId: string;
  subject: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  isArchived: boolean;
  priority: "alta" | "media" | "baja";
};

type Usuario = {
  id: string;
  nombreCompleto: string;
  rol: "admin" | "coordinador" | "docente" | "padre" | "alumno";
};

type Conversacion = {
  contacto: Usuario;
  ultimoMensaje: Mensaje;
  totalNoLeidos: number;
};

// Componente principal
export default function MensajesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [busquedaContacto, setBusquedaContacto] = useState("");
  const [conversacionActual, setConversacionActual] = useState<string | null>(null);
  const [mensajeNuevo, setMensajeNuevo] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "noLeidos" | "archivados">("todos");
  const [nuevoMensajeModal, setNuevoMensajeModal] = useState(false);
  const [destinatario, setDestinatario] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpoMensaje, setCuerpoMensaje] = useState("");

  // Obtener mensajes
  const { data: mensajesData = { messages: [] }, isLoading: cargandoMensajes } = useQuery({
    queryKey: ["/api/messages"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/messages");
      if (!res.ok) throw new Error("Error al cargar los mensajes");
      return await res.json();
    },
  });
  
  // Extraer mensajes del objeto de respuesta
  const mensajes = mensajesData.messages || [];

  // Obtener usuarios
  const { data: usuarios = [], isLoading: cargandoUsuarios } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      if (!res.ok) throw new Error("Error al cargar los usuarios");
      return await res.json();
    },
  });

  // Mutación para enviar mensaje
  const enviarMensajeMutation = useMutation({
    mutationFn: async (mensaje: { senderId?: string; receiverId: string; subject: string; body: string }) => {
      // Asegurar que se envía el senderId (ID del usuario actual)
      const mensajeCompleto = {
        senderId: mensaje.senderId || user?.id,
        receiverId: mensaje.receiverId,
        subject: mensaje.subject,
        body: mensaje.body
      };
      
      console.log("Enviando mensaje:", mensajeCompleto);
      
      const res = await apiRequest("POST", "/api/messages", mensajeCompleto);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Error al enviar el mensaje");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje ha sido enviado correctamente",
      });
      setNuevoMensajeModal(false);
      setDestinatario("");
      setAsunto("");
      setCuerpoMensaje("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para marcar como leído
  const marcarLeidoMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/messages/${id}`, { isRead: true });
      if (!res.ok) throw new Error("Error al marcar como leído");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  // Mutación para archivar mensaje
  const archivarMensajeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/messages/${id}`, { isArchived: true });
      if (!res.ok) throw new Error("Error al archivar el mensaje");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Mensaje archivado",
        description: "El mensaje ha sido archivado",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para eliminar mensaje
  const eliminarMensajeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/messages/${id}`);
      if (!res.ok) throw new Error("Error al eliminar el mensaje");
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Mensaje eliminado",
        description: "El mensaje ha sido eliminado permanentemente",
      });
      setConversacionActual(null);
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Organizar mensajes por conversaciones
  const conversaciones = useMemo(() => {
    const conversacionesMapa = new Map<string, Conversacion>();
    
    if (!user || !Array.isArray(mensajes) || mensajes.length === 0) return [];

    // Agrupar mensajes por contacto
    mensajes.forEach((mensaje: Mensaje) => {
      // Determinar quién es el contacto (el otro usuario)
      const contactoId = mensaje.senderId === user.id ? mensaje.receiverId : mensaje.senderId;
      const esEmisor = mensaje.senderId === user.id;
      
      // Buscar información del contacto
      const contactoInfo = usuarios.find((u: Usuario) => u.id === contactoId);
      if (!contactoInfo) return; // Si no encontramos al usuario, omitir
      
      // Verificar si ya tenemos una conversación con este contacto
      if (conversacionesMapa.has(contactoId)) {
        const conv = conversacionesMapa.get(contactoId)!;
        
        // Actualizar último mensaje si este es más reciente
        if (new Date(mensaje.createdAt) > new Date(conv.ultimoMensaje.createdAt)) {
          conv.ultimoMensaje = mensaje;
        }
        
        // Contar mensajes no leídos (solo los recibidos y no leídos)
        if (!mensaje.isRead && !esEmisor) {
          conv.totalNoLeidos++;
        }
      } else {
        // Crear nueva conversación
        conversacionesMapa.set(contactoId, {
          contacto: contactoInfo,
          ultimoMensaje: mensaje,
          totalNoLeidos: !mensaje.isRead && !esEmisor ? 1 : 0
        });
      }
    });
    
    // Convertir mapa a array y ordenar por fecha de último mensaje
    return Array.from(conversacionesMapa.values())
      .sort((a, b) => 
        new Date(b.ultimoMensaje.createdAt).getTime() - new Date(a.ultimoMensaje.createdAt).getTime()
      )
      .filter(conv => {
        // Aplicar filtros
        if (filtro === "noLeidos") {
          return conv.totalNoLeidos > 0;
        } else if (filtro === "archivados") {
          return conv.ultimoMensaje.isArchived;
        }
        return true;
      })
      .filter(conv => {
        // Aplicar búsqueda mejorada
        if (!busqueda) return true;
        
        const terminoBusqueda = busqueda.toLowerCase();
        
        // Buscar en el nombre del contacto
        const coincideNombre = conv.contacto.nombreCompleto.toLowerCase().includes(terminoBusqueda);
        
        // Buscar en el contenido del último mensaje
        const coincideMensaje = conv.ultimoMensaje.body.toLowerCase().includes(terminoBusqueda);
        
        // Buscar en el asunto del mensaje
        const coincideAsunto = conv.ultimoMensaje.subject.toLowerCase().includes(terminoBusqueda);
        
        // Si coincide con cualquiera de los criterios, mostrar la conversación
        return coincideNombre || coincideMensaje || coincideAsunto;
      });
  }, [mensajes, usuarios, user, busqueda, filtro]);

  // Obtener mensajes de la conversación seleccionada
  const mensajesConversacion = useMemo(() => {
    if (!conversacionActual || !Array.isArray(mensajes)) return [];
    
    return mensajes
      .filter((mensaje: Mensaje) => 
        (mensaje.senderId === conversacionActual && mensaje.receiverId === user?.id) || 
        (mensaje.receiverId === conversacionActual && mensaje.senderId === user?.id)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [conversacionActual, mensajes, user]);

  // Agrupar mensajes por día
  const mensajesPorDia = useMemo(() => {
    const grupos: Record<string, Mensaje[]> = {};
    
    mensajesConversacion.forEach((mensaje: Mensaje) => {
      const fecha = new Date(mensaje.createdAt).toISOString().split('T')[0];
      if (!grupos[fecha]) {
        grupos[fecha] = [];
      }
      grupos[fecha].push(mensaje);
    });
    
    return grupos;
  }, [mensajesConversacion]);

  // Marcar mensajes como leídos al abrir conversación
  useEffect(() => {
    if (conversacionActual && mensajesConversacion.length > 0) {
      mensajesConversacion.forEach((mensaje: Mensaje) => {
        if (mensaje.senderId === conversacionActual && !mensaje.isRead) {
          marcarLeidoMutation.mutate(mensaje.id);
        }
      });
    }
  }, [conversacionActual, mensajesConversacion]);

  // Enviar mensaje en conversación actual
  const enviarMensaje = () => {
    if (!mensajeNuevo.trim() || !conversacionActual || !user?.id) return;
    
    enviarMensajeMutation.mutate({
      senderId: user.id,
      receiverId: conversacionActual,
      subject: "Respuesta", // Para respuestas usamos un asunto genérico
      body: mensajeNuevo
    });
    
    setMensajeNuevo("");
  };

  // Estado para almacenar la prioridad analizada
  const [prioridadMensaje, setPrioridadMensaje] = useState<"alta" | "media" | "baja" | null>(null);
  const [analizandoPrioridad, setAnalizandoPrioridad] = useState(false);
  
  // Función para analizar la prioridad del mensaje
  const analizarPrioridad = () => {
    if (!asunto || !cuerpoMensaje.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Por favor completa el asunto y el cuerpo del mensaje",
        variant: "destructive"
      });
      return;
    }
    
    setAnalizandoPrioridad(true);
    analizarPrioridadMutation.mutate(
      { subject: asunto, content: cuerpoMensaje },
      {
        onSuccess: (data) => {
          setPrioridadMensaje(data.priority.priority);
          toast({
            title: `Prioridad: ${data.priority.priority.toUpperCase()}`,
            description: data.priority.reason,
          });
          setAnalizandoPrioridad(false);
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          });
          setAnalizandoPrioridad(false);
        }
      }
    );
  };

  // Enviar mensaje nuevo desde el modal
  const enviarMensajeNuevo = () => {
    if (!user?.id || !destinatario || !cuerpoMensaje.trim()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos o inicia sesión nuevamente",
        variant: "destructive",
      });
      return;
    }
    
    // Incluir explícitamente el ID del remitente
    // Construimos un objeto compatible con el tipo esperado por la mutación
    const mensajeNuevo = {
      senderId: user.id,
      receiverId: destinatario,
      subject: asunto || "Sin asunto",
      body: cuerpoMensaje
    };

    // Enviamos el mensaje
    enviarMensajeMutation.mutate(mensajeNuevo);
  };

  // Obtener contacto actual
  const contactoActual = useMemo(() => {
    if (!conversacionActual) return null;
    return usuarios.find((u: Usuario) => u.id === conversacionActual);
  }, [conversacionActual, usuarios]);

  // Función para generar iniciales del nombre
  const getIniciales = (nombre: string) => {
    return nombre
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Función para obtener color según rol
  const getColorPorRol = (rol: string) => {
    switch (rol) {
      case "admin": return "bg-red-500";
      case "coordinador": return "bg-purple-500";
      case "docente": return "bg-blue-500";
      case "padre": return "bg-green-500";
      case "alumno": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };
  
  // Mutation para simular un mensaje recibido (solo para pruebas)
  const simularMensajeRecibidoMutation = useMutation({
    mutationFn: async () => {
      if (!conversacionActual || !user?.id) {
        throw new Error("No hay conversación activa");
      }
      
      // Crear un mensaje simulado como si fuera del otro usuario
      const res = await apiRequest("POST", "/api/messages", {
        senderId: conversacionActual, // El remitente es el contacto seleccionado
        receiverId: user.id, // El destinatario es el usuario actual
        subject: "Mensaje de prueba",
        body: "Hola, este es un mensaje de prueba para generar sugerencias automáticas. ¿Podrías responderme cuando puedas? Gracias"
      });
      
      if (!res.ok) throw new Error("Error al enviar mensaje simulado");
      return await res.json();
    },
    onSuccess: () => {
      // Refrescar los mensajes para que aparezca el nuevo
      queryClient.invalidateQueries({queryKey: ["/api/messages"]});
      
      toast({
        title: "Mensaje simulado recibido",
        description: "Se ha creado un mensaje de prueba del contacto",
      });
    }
  });
  
  // Query para obtener sugerencias de IA para respuestas rápidas
  const { data: sugerenciasData, isLoading: cargandoSugerencias, refetch: refetchSugerencias } = useQuery({
    queryKey: ["/api/messages/suggestions", conversacionActual, mensajesConversacion?.length],
    queryFn: async () => {
      if (!conversacionActual || !mensajesConversacion || mensajesConversacion.length === 0) {
        console.log("[DEBUG] No hay conversación activa o mensajes para generar sugerencias");
        return { suggestions: ["Hola, ¿cómo estás?", "Gracias por la información", "Entendido, lo revisaré"] };
      }
      
      const ultimoMensaje = mensajesConversacion[mensajesConversacion.length - 1];
      console.log("[DEBUG] Último mensaje para sugerencias:", ultimoMensaje.id, ultimoMensaje.body.substring(0, 50));
      
      // Solo si el último mensaje es del contacto (no nuestro)
      if (ultimoMensaje.senderId === user?.id) {
        console.log("[DEBUG] El último mensaje es nuestro, usando sugerencias predeterminadas");
        return { suggestions: ["Gracias por la información", "Entendido, lo revisaré", "De acuerdo, estamos en contacto"] };
      }
      
      try {
        console.log("[DEBUG] Llamando a API de sugerencias con mensaje:", ultimoMensaje.id);
        
        // Usar la nueva ruta para las sugerencias
        const res = await apiRequest("POST", "/api/messages/suggestions", {
          messageContent: ultimoMensaje.body,
          messageId: ultimoMensaje.id // Añadimos el ID del mensaje para mejor contexto
        });
        
        if (!res.ok) {
          console.error("[DEBUG] Error en la respuesta de la API:", res.status);
          throw new Error("Error al generar sugerencias");
        }
        
        const data = await res.json();
        console.log("[DEBUG] Sugerencias recibidas:", data.suggestions);
        return data;
      } catch (error) {
        console.error("[DEBUG] Error en IA Sugerencias:", error);
        return { suggestions: ["Gracias por la información", "Entendido, lo revisaré", "De acuerdo, estamos en contacto"] };
      }
    },
    enabled: conversacionActual !== null && mensajesConversacion.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false
  });
  
  // Función para obtener sugerencias de respuesta
  const generarSugerenciasRespuesta = (): string[] => {
    return sugerenciasData?.suggestions || ["Gracias por la información", "Entendido, lo revisaré", "De acuerdo, estamos en contacto"];
  };
  
  // Mutation para analizar prioridad de un mensaje nuevo
  const analizarPrioridadMutation = useMutation({
    mutationFn: async ({ subject, content }: { subject: string, content: string }) => {
      const res = await apiRequest("POST", "/api/messages/analyze-priority", { subject, content });
      if (!res.ok) throw new Error("Error al analizar prioridad");
      return await res.json();
    }
  });
  
  // Mutation para generar resumen de conversación
  const generarResumenMutation = useMutation({
    mutationFn: async (mensajes: Mensaje[]) => {
      const res = await apiRequest("POST", "/api/messages/conversation-summary", { 
        messages: mensajes.map(m => ({
          isUser: m.senderId === user?.id,
          body: m.body
        }))
      });
      if (!res.ok) throw new Error("Error al generar resumen");
      return await res.json();
    }
  });
  
  // Estado para el resumen de la conversación
  const [resumenConversacion, setResumenConversacion] = useState<string>("");
  
  // Función para generar resumen de la conversación actual
  const generarResumen = () => {
    if (mensajesConversacion.length < 5) {
      toast({
        title: "No se puede generar resumen",
        description: "Se necesitan al menos 5 mensajes para generar un resumen",
        variant: "destructive"
      });
      return;
    }
    
    generarResumenMutation.mutate(mensajesConversacion, {
      onSuccess: (data) => {
        setResumenConversacion(data.summary);
      },
      onError: (error) => {
        toast({
          title: "Error al generar resumen",
          description: error.message,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="flex flex-col">
      <Card className="flex-grow overflow-hidden">
        <CardHeader className="p-4 border-b">
          <CardTitle>Mensajes</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex h-[600px]">
          {/* Panel izquierdo - Lista de conversaciones */}
          <div className="w-1/3 border-r h-full flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center mb-3">
                <Input
                  placeholder="Buscar conversación..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="flex-grow"
                />
                <Button variant="ghost" size="icon" className="ml-2">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-col space-y-3">
                <div className="flex justify-between items-center">
                  <Tabs value={filtro} onValueChange={(v) => setFiltro(v as any)}>
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="todos" className="flex items-center">
                        <Users className="h-4 w-4 mr-1.5" />
                        <span>Todos</span>
                      </TabsTrigger>
                      <TabsTrigger value="noLeidos" className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5 flex-shrink-0" />
                        <span>No leídos</span>
                      </TabsTrigger>
                      <TabsTrigger value="archivados" className="flex items-center">
                        <Archive className="h-4 w-4 mr-1.5" />
                        <span>Archivados</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Dialog open={nuevoMensajeModal} onOpenChange={setNuevoMensajeModal}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="default">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Nuevo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Nuevo mensaje</DialogTitle>
                        <DialogDescription>
                          Escribe un mensaje a otro usuario del sistema
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex flex-col gap-4 py-4">
                        <div className="flex flex-col gap-2">
                          <label htmlFor="destinatario" className="text-sm font-medium">
                            Destinatario
                          </label>
                          <div className="flex flex-col">
                            <div className="relative mb-2">
                              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Buscar contacto..."
                                className="pl-8"
                                value={busquedaContacto}
                                onChange={(e) => setBusquedaContacto(e.target.value)}
                              />
                            </div>
                            <Select onValueChange={setDestinatario}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un destinatario" />
                              </SelectTrigger>
                              <SelectContent>
                                {usuarios
                                  .filter((u: Usuario) => u.id !== user?.id)
                                  .filter((u: Usuario) => {
                                    // Filtrar según reglas de acceso
                                    if (user?.rol === "admin" || user?.rol === "coordinador") {
                                      return true; // Pueden escribir a cualquiera
                                    } else if (user?.rol === "docente") {
                                      return true; // Pueden escribir a cualquiera
                                    } else if (user?.rol === "padre") {
                                      return ["docente", "coordinador", "admin"].includes(u.rol); // Solo a profesores y directivos
                                    } else if (user?.rol === "alumno") {
                                      return ["docente"].includes(u.rol); // Solo a profesores
                                    }
                                    return false;
                                  })
                                  .filter((u: Usuario) => {
                                    // Aplicar filtro de búsqueda
                                    if (!busquedaContacto) return true;
                                    
                                    const termino = busquedaContacto.toLowerCase();
                                    return (
                                      u.nombreCompleto.toLowerCase().includes(termino) ||
                                      u.rol.toLowerCase().includes(termino)
                                    );
                                  })
                                  .map((u: Usuario) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                          <AvatarFallback className={getColorPorRol(u.rol)}>
                                            {getIniciales(u.nombreCompleto)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span>{u.nombreCompleto}</span>
                                        <Badge variant="outline" className="ml-1 text-xs">
                                          {u.rol}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label htmlFor="asunto" className="text-sm font-medium">
                            Asunto
                          </label>
                          <Input
                            id="asunto"
                            placeholder="Asunto del mensaje"
                            value={asunto}
                            onChange={(e) => setAsunto(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label htmlFor="mensaje" className="text-sm font-medium">
                            Mensaje
                          </label>
                          <Textarea
                            id="mensaje"
                            placeholder="Escribe tu mensaje aquí..."
                            rows={5}
                            value={cuerpoMensaje}
                            onChange={(e) => setCuerpoMensaje(e.target.value)}
                          />
                        </div>
                        
                        {prioridadMensaje && (
                          <div className="flex flex-row items-center mt-2 text-sm">
                            <Badge
                              variant={
                                prioridadMensaje === "alta"
                                  ? "destructive"
                                  : prioridadMensaje === "media"
                                  ? "default"
                                  : "outline"
                              }
                              className="ml-2"
                            >
                              Prioridad: {prioridadMensaje.toUpperCase()}
                            </Badge>
                            <span className="ml-2 text-xs text-muted-foreground">
                              (Análisis IA)
                            </span>
                          </div>
                        )}
                      </div>
                      <DialogFooter className="flex-col sm:flex-row gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                className="flex-shrink-0"
                                onClick={analizarPrioridad}
                                disabled={analizandoPrioridad || !cuerpoMensaje.trim() || !asunto}
                              >
                                {analizandoPrioridad ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4 mr-2" />
                                )}
                                {analizandoPrioridad ? "Analizando..." : "Sugerir prioridad"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Analiza el contenido del mensaje con IA para sugerir una prioridad</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <div className="flex gap-2 sm:ml-auto">
                          <Button type="button" variant="secondary" onClick={() => setNuevoMensajeModal(false)}>
                            Cancelar
                          </Button>
                          <Button 
                            type="button" 
                            onClick={enviarMensajeNuevo}
                            disabled={!destinatario || !cuerpoMensaje.trim() || enviarMensajeMutation.isPending}
                          >
                            {enviarMensajeMutation.isPending ? "Enviando..." : "Enviar mensaje"}
                          </Button>
                        </div>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
              </div>
            </div>
            <ScrollArea className="flex-grow">
              <div className="divide-y">
                {cargandoMensajes ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Cargando conversaciones...
                  </div>
                ) : conversaciones.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No hay conversaciones disponibles
                  </div>
                ) : (
                  conversaciones.map((conv) => (
                    <div
                      key={conv.contacto.id}
                      className={`p-3 hover:bg-muted cursor-pointer transition-colors ${
                        conversacionActual === conv.contacto.id ? "bg-muted" : ""
                      }`}
                      onClick={() => setConversacionActual(conv.contacto.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback className={getColorPorRol(conv.contacto.rol)}>
                            {getIniciales(conv.contacto.nombreCompleto)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {conv.totalNoLeidos > 0 && (
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5 flex-shrink-0 animate-pulse" />
                              )}
                              <h4 className={`font-medium text-sm truncate ${conv.totalNoLeidos > 0 ? 'font-semibold text-primary' : ''}`}>
                                {conv.contacto.nombreCompleto}
                                {conv.totalNoLeidos > 0 && (
                                  <span className="ml-1.5 text-xs font-normal bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-100">
                                    {conv.totalNoLeidos}
                                  </span>
                                )}
                              </h4>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(conv.ultimoMensaje.createdAt), "dd/MM/yy", { locale: es })}
                            </span>
                          </div>
                          <p className={`text-xs ${conv.totalNoLeidos > 0 ? 'font-medium text-foreground' : 'text-muted-foreground'} truncate`}>
                            {conv.ultimoMensaje.senderId === user?.id ? "Tú: " : ""}
                            {conv.ultimoMensaje.body.length > 40 
                              ? conv.ultimoMensaje.body.substring(0, 40) + "..." 
                              : conv.ultimoMensaje.body}
                          </p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs inline-flex items-center">
                              <Badge variant="outline" className="text-xs font-normal">
                                {conv.contacto.rol}
                              </Badge>
                            </span>
                            {conv.totalNoLeidos > 0 && (
                              <Badge variant="default" className="text-xs">
                                {conv.totalNoLeidos}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Panel derecho - Conversación actual */}
          <div className="flex-grow flex flex-col h-full">
            <AnimatePresence mode="wait">
              {!conversacionActual ? (
                <motion.div 
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-center h-full text-center p-8"
                >
                  <div>
                    <MessageCircle className="h-16 w-16 text-primary/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Mensajes privados</h3>
                    <p className="text-muted-foreground mt-2">
                      Selecciona una conversación para ver los mensajes o inicia una nueva
                    </p>
                    <Button 
                      onClick={() => setNuevoMensajeModal(true)} 
                      className="mt-4"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Nuevo mensaje
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={conversacionActual}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 25,
                    duration: 0.4 
                  }}
                  className="flex flex-col h-full"
                >
                  {/* Cabecera de conversación */}
                  <div className="p-3 border-b flex items-center justify-between">
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarFallback className={getColorPorRol(contactoActual?.rol || "")}>
                          {getIniciales(contactoActual?.nombreCompleto || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{contactoActual?.nombreCompleto}</h3>
                        <p className="text-xs text-muted-foreground">
                          {contactoActual?.rol}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          const ultimoMsg = mensajesConversacion[mensajesConversacion.length - 1];
                          if (ultimoMsg) {
                            marcarLeidoMutation.mutate(ultimoMsg.id);
                          }
                        }}>
                          <CheckCheck className="h-4 w-4 mr-2" />
                          Marcar como leído
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const ultimoMsg = mensajesConversacion[mensajesConversacion.length - 1];
                          if (ultimoMsg) {
                            archivarMensajeMutation.mutate(ultimoMsg.id);
                          }
                        }}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archivar conversación
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={generarResumen}
                          disabled={generarResumenMutation.isPending || mensajesConversacion.length < 5}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          {generarResumenMutation.isPending ? "Generando resumen..." : "Resumir conversación"}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            if (window.confirm("¿Estás seguro de eliminar esta conversación? Esta acción no se puede deshacer.")) {
                              const ultimoMsg = mensajesConversacion[mensajesConversacion.length - 1];
                              if (ultimoMsg) {
                                eliminarMensajeMutation.mutate(ultimoMsg.id);
                              }
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar conversación
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Mensajes */}
                  <ScrollArea className="flex-grow p-4">
                    {Object.entries(mensajesPorDia).map(([fecha, mensajesDia]) => (
                      <div key={fecha} className="mb-6">
                        <div className="text-center mb-4">
                          <span className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground">
                            {format(new Date(fecha), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                          </span>
                        </div>
                        <div className="space-y-4">
                          {mensajesDia.map((mensaje, index) => {
                            const esMiMensaje = mensaje.senderId === user?.id;
                            return (
                              <motion.div 
                                key={mensaje.id} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.05 }}
                                className={`flex ${esMiMensaje ? "justify-end" : "justify-start"}`}
                              >
                                <div 
                                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                                    esMiMensaje 
                                      ? "bg-primary text-primary-foreground" 
                                      : "bg-muted"
                                  }`}
                                >
                                  <div className="text-sm">
                                    {mensaje.priority === "alta" && (
                                      <span className="inline-flex items-center mb-1">
                                        <span className="h-2 w-2 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>
                                        <span className="text-xs font-medium text-red-500 mr-1">Prioridad Alta</span>
                                      </span>
                                    )}
                                    {mensaje.priority === "media" && (
                                      <span className="inline-flex items-center mb-1">
                                        <span className="h-2 w-2 rounded-full bg-amber-500 mr-1.5"></span>
                                        <span className="text-xs font-medium text-amber-500 mr-1">Prioridad Media</span>
                                      </span>
                                    )}
                                    {mensaje.body}
                                  </div>
                                  <div className="flex items-center justify-end mt-1 space-x-1">
                                    <span className="text-xs opacity-70">
                                      {format(new Date(mensaje.createdAt), "HH:mm", { locale: es })}
                                    </span>
                                    {esMiMensaje && (
                                      <CheckCheck className={`h-3 w-3 ${mensaje.isRead ? "opacity-70" : "opacity-40"}`} />
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                  
                  {/* Sugerencias de respuesta rápida */}
                  {mensajesConversacion.length > 0 && 
                   mensajesConversacion[mensajesConversacion.length - 1] && 
                   user?.id && 
                   mensajesConversacion[mensajesConversacion.length - 1].senderId !== user.id && (
                    <div className="px-3 py-2 flex flex-wrap gap-2">
                      {cargandoSugerencias ? (
                        <div className="animate-pulse flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> 
                          <span className="text-muted-foreground text-xs">Generando sugerencias...</span>
                        </div>
                      ) : generarSugerenciasRespuesta().map((sugerencia, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setMensajeNuevo(sugerencia);
                            setTimeout(() => enviarMensaje(), 100);
                          }}
                          className="text-xs"
                        >
                          {sugerencia}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* Formulario de envío */}
                  <div className="p-3 border-t">
                    <div className="flex flex-col space-y-2">
                      {/* Botón para simular mensaje recibido (solo para pruebas) */}
                      <div className="flex justify-end">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex items-center text-xs"
                                onClick={() => simularMensajeRecibidoMutation.mutate()}
                                disabled={simularMensajeRecibidoMutation.isPending || !conversacionActual}
                              >
                                {simularMensajeRecibidoMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                )}
                                Simular mensaje recibido
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Crear mensaje de prueba para mostrar sugerencias IA</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Textarea
                          placeholder="Escribe un mensaje..."
                          value={mensajeNuevo}
                          onChange={(e) => setMensajeNuevo(e.target.value)}
                          className="min-h-[2.5rem] resize-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              enviarMensaje();
                            }
                          }}
                        />
                        <Button 
                          size="icon" 
                          onClick={enviarMensaje}
                          disabled={!mensajeNuevo.trim() || enviarMensajeMutation.isPending}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
      
      {/* Modal para mostrar el resumen de la conversación */}
      <Dialog open={!!resumenConversacion} onOpenChange={(open) => !open && setResumenConversacion("")}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resumen de la conversación</DialogTitle>
            <DialogDescription>
              Resumen generado por IA de la conversación con {contactoActual?.nombreCompleto}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted p-4 rounded-lg text-sm">
              {resumenConversacion}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setResumenConversacion("")}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}