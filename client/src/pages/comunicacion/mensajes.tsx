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

// Utilidades
function getIniciales(nombre: string): string {
  if (!nombre) return "";
  return nombre
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

function getColorPorRol(rol: string): string {
  switch (rol) {
    case "admin":
      return "bg-purple-500 text-white";
    case "coordinador":
      return "bg-blue-500 text-white";
    case "docente":
      return "bg-green-500 text-white";
    case "padre":
      return "bg-amber-500 text-white";
    case "alumno":
      return "bg-pink-500 text-white";
    default:
      return "bg-slate-500 text-white";
  }
}

export default function MensajesTab() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  // Estados locales
  const [conversacionActual, setConversacionActual] = useState<string | null>(null);
  const [mensajeNuevo, setMensajeNuevo] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "noLeidos" | "archivados">("todos");
  const [busquedaConversacion, setBusquedaConversacion] = useState("");
  const [nuevoMensajeModal, setNuevoMensajeModal] = useState(false);
  const [busquedaContacto, setBusquedaContacto] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpoMensaje, setCuerpoMensaje] = useState("");
  const [prioridadMensaje, setPrioridadMensaje] = useState<"alta" | "media" | "baja" | null>(null);
  const [resumenConversacion, setResumenConversacion] = useState("");

  // Queries con autenticación JWT
  const { data: mensajes = [], isLoading: cargandoMensajes } = useQuery({
    queryKey: ["/api/mensajes"],
    enabled: !!user, // Solo ejecutar si hay usuario autenticado
  });

  const { data: usuarios = [] } = useQuery({
    queryKey: ["/api/usuarios"],
    enabled: !!user, // Solo ejecutar si hay usuario autenticado
  });

  // Mutaciones
  const enviarMensajeMutation = useMutation({
    mutationFn: async (mensaje: { senderId: string; receiverId: string; subject: string; body: string; priority: string }) => {
      const res = await apiRequest("POST", "/api/mensajes", mensaje);
      if (!res.ok) throw new Error("Error al enviar el mensaje");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mensajes"] });
      toast({
        title: "Mensaje enviado",
        description: "El mensaje se ha enviado correctamente",
      });
      setMensajeNuevo("");
    },
    onError: (error) => {
      toast({
        title: "Error al enviar mensaje",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const simularMensajeRecibidoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mensajes/simular", { receiverId: user?.id });
      if (!res.ok) throw new Error("Error al simular mensaje");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mensajes"] });
      toast({
        title: "Mensaje recibido",
        description: "Has recibido un nuevo mensaje simulado",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al simular mensaje",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const marcarLeidoMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/mensajes/${id}`, { isRead: true });
      if (!res.ok) throw new Error("Error al marcar como leído");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mensajes"] });
    },
    onError: (error) => {
      toast({
        title: "Error al marcar como leído",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const archivarMensajeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/mensajes/${id}`, { isArchived: true });
      if (!res.ok) throw new Error("Error al archivar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mensajes"] });
      toast({
        title: "Conversación archivada",
        description: "La conversación se ha archivado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al archivar conversación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const eliminarMensajeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/mensajes/${id}`);
      if (!res.ok) throw new Error("Error al eliminar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mensajes"] });
      setConversacionActual(null);
      toast({
        title: "Conversación eliminada",
        description: "La conversación se ha eliminado correctamente",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al eliminar conversación",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const analizarPrioridadMutation = useMutation({
    mutationFn: async (data: { asunto: string; mensaje: string; rolRemitente: string }) => {
      const res = await apiRequest("POST", "/api/mensajes/analizar-prioridad", data);
      if (!res.ok) throw new Error("Error al analizar prioridad");
      return res.json();
    },
    onSuccess: (data) => {
      setPrioridadMensaje(data.priority);
      toast({
        title: `Prioridad sugerida: ${data.priority.toUpperCase()}`,
        description: data.reason,
      });
    },
    onError: (error) => {
      toast({
        title: "Error al analizar prioridad",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generarResumenMutation = useMutation({
    mutationFn: async (mensajes: Mensaje[]) => {
      const res = await apiRequest("POST", "/api/mensajes/generar-resumen", { mensajes });
      if (!res.ok) throw new Error("Error al generar resumen");
      return res.json();
    },
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

  // Procesamiento de datos
  const conversaciones = useMemo(() => {
    if (!mensajes || !user?.id) return [];

    const conversacionesMap = new Map<string, Conversacion>();

    mensajes.forEach((mensaje: Mensaje) => {
      const contactoId = mensaje.senderId === user.id ? mensaje.receiverId : mensaje.senderId;
      
      const contactoInfo = usuarios.find((u: Usuario) => u.id === contactoId);
      if (!contactoInfo) return;

      if (!conversacionesMap.has(contactoId)) {
        conversacionesMap.set(contactoId, {
          contacto: contactoInfo,
          ultimoMensaje: mensaje,
          totalNoLeidos: mensaje.receiverId === user.id && !mensaje.isRead ? 1 : 0,
        });
      } else {
        const conv = conversacionesMap.get(contactoId)!;
        const fechaActual = new Date(mensaje.createdAt);
        const fechaUltima = new Date(conv.ultimoMensaje.createdAt);
        
        if (fechaActual > fechaUltima) {
          conv.ultimoMensaje = mensaje;
        }
        
        if (mensaje.receiverId === user.id && !mensaje.isRead) {
          conv.totalNoLeidos += 1;
        }
      }
    });

    // Filtrar según selección
    let conversacionesFiltradas = Array.from(conversacionesMap.values());
    
    if (filtro === "noLeidos") {
      conversacionesFiltradas = conversacionesFiltradas.filter((conv) => conv.totalNoLeidos > 0);
    } else if (filtro === "archivados") {
      conversacionesFiltradas = conversacionesFiltradas.filter((conv) => conv.ultimoMensaje.isArchived);
    }
    
    // Aplicar búsqueda si existe
    if (busquedaConversacion) {
      const termino = busquedaConversacion.toLowerCase();
      conversacionesFiltradas = conversacionesFiltradas.filter(
        (conv) => 
          conv.contacto.nombreCompleto.toLowerCase().includes(termino) ||
          conv.ultimoMensaje.subject.toLowerCase().includes(termino) ||
          conv.ultimoMensaje.body.toLowerCase().includes(termino) ||
          conv.contacto.rol.toLowerCase().includes(termino)
      );
    }
    
    // Ordenar por fecha del último mensaje (más reciente primero)
    return conversacionesFiltradas.sort(
      (a, b) => new Date(b.ultimoMensaje.createdAt).getTime() - new Date(a.ultimoMensaje.createdAt).getTime()
    );
  }, [mensajes, usuarios, user?.id, filtro, busquedaConversacion]);

  // Mensajes de la conversación actual
  const mensajesConversacion = useMemo(() => {
    if (!mensajes || !conversacionActual || !user?.id) return [];
    
    return mensajes
      .filter((mensaje: Mensaje) => 
        (mensaje.senderId === user.id && mensaje.receiverId === conversacionActual) ||
        (mensaje.receiverId === user.id && mensaje.senderId === conversacionActual)
      )
      .sort((a: Mensaje, b: Mensaje) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [mensajes, conversacionActual, user?.id]);

  // Agrupar mensajes por día
  const mensajesPorDia = useMemo(() => {
    const porDia: { [key: string]: Mensaje[] } = {};
    
    mensajesConversacion.forEach((mensaje: Mensaje) => {
      const fecha = new Date(mensaje.createdAt).toISOString().split('T')[0];
      if (!porDia[fecha]) {
        porDia[fecha] = [];
      }
      porDia[fecha].push(mensaje);
    });
    
    return porDia;
  }, [mensajesConversacion]);

  // Información del contacto actual
  const contactoActual = useMemo(() => {
    if (!conversacionActual) return null;
    return usuarios.find((u: Usuario) => u.id === conversacionActual);
  }, [conversacionActual, usuarios]);

  // Efectos
  useEffect(() => {
    // Marcar mensajes como leídos cuando se abre una conversación
    if (conversacionActual && mensajesConversacion.length > 0) {
      mensajesConversacion.forEach((mensaje: Mensaje) => {
        if (mensaje.receiverId === user?.id && !mensaje.isRead) {
          marcarLeidoMutation.mutate(mensaje.id);
        }
      });
    }
  }, [conversacionActual, mensajesConversacion]);

  // Funciones auxiliares
  const enviarMensaje = () => {
    if (!mensajeNuevo.trim() || !conversacionActual) return;
    
    enviarMensajeMutation.mutate({
      senderId: user?.id || "",
      receiverId: conversacionActual,
      subject: mensajesConversacion.length > 0 ? mensajesConversacion[0].subject : "Sin asunto",
      body: mensajeNuevo,
      priority: "media", // Prioridad por defecto
    });
  };

  const enviarMensajeNuevo = () => {
    if (!cuerpoMensaje.trim() || !destinatario || !asunto) return;
    
    enviarMensajeMutation.mutate({
      senderId: user?.id || "",
      receiverId: destinatario,
      subject: asunto,
      body: cuerpoMensaje,
      priority: prioridadMensaje || "media", // Usar la prioridad sugerida o media por defecto
    });
    
    // Limpiar y cerrar modal
    setDestinatario("");
    setAsunto("");
    setCuerpoMensaje("");
    setPrioridadMensaje(null);
    setNuevoMensajeModal(false);
    setBusquedaContacto("");
  };

  const analizarPrioridad = () => {
    if (!cuerpoMensaje.trim() || !asunto) return;
    
    analizarPrioridadMutation.mutate({
      asunto: asunto,
      mensaje: cuerpoMensaje,
      rolRemitente: user?.rol || "docente",
    });
  };

  const generarResumen = () => {
    if (mensajesConversacion.length < 5) {
      toast({
        title: "No se puede generar resumen",
        description: "Debe haber al menos 5 mensajes en la conversación para generar un resumen.",
        variant: "destructive"
      });
      return;
    }
    
    generarResumenMutation.mutate(mensajesConversacion);
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
                  placeholder="Buscar conversaciones..."
                  value={busquedaConversacion}
                  onChange={(e) => setBusquedaConversacion(e.target.value)}
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
                                disabled={analizarPrioridadMutation.isPending || !cuerpoMensaje.trim() || !asunto}
                              >
                                {analizarPrioridadMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Sparkles className="h-4 w-4 mr-2" />
                                )}
                                {analizarPrioridadMutation.isPending ? "Analizando..." : "Sugerir prioridad"}
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
                          {mensajesDia.map((mensaje) => {
                            const esMio = mensaje.senderId === user?.id;
                            return (
                              <div 
                                key={mensaje.id}
                                className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`max-w-[70%] ${esMio ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3 shadow`}>
                                  <div className="text-sm">
                                    {mensaje.body}
                                  </div>
                                  <div className="flex items-center justify-end mt-1 space-x-1">
                                    <span className="text-xs opacity-70">
                                      {format(new Date(mensaje.createdAt), "HH:mm", { locale: es })}
                                    </span>
                                    {mensaje.priority && mensaje.priority !== "media" && (
                                      <Badge
                                        variant={mensaje.priority === "alta" ? "destructive" : "outline"}
                                        className="text-[10px] h-4 ml-1"
                                      >
                                        {mensaje.priority}
                                      </Badge>
                                    )}
                                    {esMio && (
                                      <CheckCheck className={`h-3 w-3 ${mensaje.isRead ? 'text-green-500' : 'opacity-70'}`} />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {generarResumenMutation.isPending && (
                      <div className="px-3 py-2 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          <div className="animate-pulse flex items-center">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Generando resumen con IA...
                          </div>
                        </Badge>
                      </div>
                    )}
                  </ScrollArea>
                  
                  {/* Formulario de envío */}
                  <div className="p-3 border-t">
                    <div className="flex flex-col space-y-2">
                      {/* Botón para simular mensaje recibido (solo para pruebas) */}
                      <div className="flex justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => simularMensajeRecibidoMutation.mutate()}
                          disabled={simularMensajeRecibidoMutation.isPending || !conversacionActual}
                        >
                          {simularMensajeRecibidoMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <MessageSquare className="h-4 w-4 mr-2" />
                          )}
                          Simular mensaje recibido
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Textarea
                          placeholder="Escribe tu mensaje..."
                          className="flex-grow resize-none"
                          rows={2}
                          value={mensajeNuevo}
                          onChange={(e) => setMensajeNuevo(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
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