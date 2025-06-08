import { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { AIAssistantService, AssistantMessage } from "@/services/ai-assistant-service";
import { generateUserContext, UserContextData } from "@/services/user-context-service";
import { useLocation } from "wouter";
import { 
  HelpCircle, 
  Send, 
  MessageSquare, 
  RefreshCcw, 
  Loader2, 
  CreditCard, 
  FileText, 
  Mail, 
  FileCheck, 
  BarChart3, 
  User, 
  Briefcase, 
  Settings,
  AlertCircle
} from "lucide-react";
import { 
  QUICK_ACTIONS, 
  CATEGORIZED_PROMPTS, 
  QuickActionItem, 
  generateSystemPrompt,
  convertSuggestionsToQuickActions
} from "./assistantPrompts";

// Íconos para las diferentes categorías
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "pagos": <CreditCard className="h-4 w-4 mr-2" />,
  "estados-cuenta": <FileText className="h-4 w-4 mr-2" />,
  "recordatorios": <Mail className="h-4 w-4 mr-2" />,
  "grupos-alumnos": <User className="h-4 w-4 mr-2" />,
  "reportes-boletas": <FileCheck className="h-4 w-4 mr-2" />,
  "academico": <Briefcase className="h-4 w-4 mr-2" />,
  "configuracion": <Settings className="h-4 w-4 mr-2" />,
  "reportes": <BarChart3 className="h-4 w-4 mr-2" />,
  "comunicacion": <MessageSquare className="h-4 w-4 mr-2" />,
  "general": <HelpCircle className="h-4 w-4 mr-2" />,
  "default": <HelpCircle className="h-4 w-4 mr-2" />,
};

export function AssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<UserContextData | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [personalizedSuggestions, setPersonalizedSuggestions] = useState<QuickActionItem[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generar un saludo personalizado basado en el nombre del usuario
  const personalizedGreeting = useMemo(() => {
    const firstName = user?.nombreCompleto?.split(' ')[0] || '';
    
    if (!firstName) return "Hola, bienvenido. ¿En qué puedo ayudarte hoy?";
    
    if (userContext?.estadisticas?.pagosVencidos && userContext.estadisticas.pagosVencidos > 0) {
      return `Hola, ${firstName}. Detecté ${userContext.estadisticas.pagosVencidos} pagos vencidos en el sistema. ¿Te gustaría ver cómo gestionarlos?`;
    }
    
    if (userContext?.estadisticas?.recordatoriosPendientes && userContext.estadisticas.recordatoriosPendientes > 0) {
      return `Hola, ${firstName}. Hay ${userContext.estadisticas.recordatoriosPendientes} recordatorios pendientes por enviar. ¿Necesitas ayuda con esto?`;
    }
    
    if (userContext?.estadisticas?.tareasProximas && userContext.estadisticas.tareasProximas > 0) {
      return `Hola, ${firstName}. Tienes ${userContext.estadisticas.tareasProximas} tareas próximas a vencer. ¿Quieres saber cómo revisarlas?`;
    }
    
    return `Hola, ${firstName}. ¿En qué puedo ayudarte hoy?`;
  }, [user?.nombreCompleto, userContext]);

  // Lista de categorías únicas para las pestañas
  const categories = useMemo(() => {
    return Object.keys(CATEGORIZED_PROMPTS);
  }, []);

  // Cargar contexto del usuario cuando se abre el chat
  useEffect(() => {
    async function loadUserContext() {
      if (isOpen && user && !userContext) {
        setContextLoading(true);
        try {
          const context = await generateUserContext(user);
          setUserContext(context);
          
          if (context && context.sugerenciasPersonalizadas) {
            setPersonalizedSuggestions(
              convertSuggestionsToQuickActions(context.sugerenciasPersonalizadas)
            );
          }
        } catch (error) {
          console.error("Error al generar contexto de usuario:", error);
        } finally {
          setContextLoading(false);
        }
      }
    }
    
    loadUserContext();
  }, [isOpen, user, userContext]);

  // Autoscroll en mensajes nuevos
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mensaje de bienvenida
  useEffect(() => {
    if (isOpen && messages.length === 0 && !contextLoading) {
      setMessages([
        {
          role: "assistant",
          content: personalizedGreeting
        }
      ]);
    }
  }, [isOpen, messages.length, personalizedGreeting, contextLoading]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;
    
    // Agregar mensaje del usuario a la conversación
    const userMessage = {
      role: "user" as const,
      content: currentMessage
    };
    
    // Guardar el mensaje actual antes de limpiarlo
    const messageToBeSent = currentMessage;
    
    // Actualizar interfaz
    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setLoading(true);
    
    try {
      console.log("📩 Enviando mensaje al asistente:", messageToBeSent.substring(0, 50) + "...");
      
      // Generar prompt personalizado basado en el contexto del usuario
      const systemPrompt = generateSystemPrompt(userContext);
      
      // Enviar mensaje al asistente y recibir respuesta
      const response = await AIAssistantService.sendMessage(
        messageToBeSent, 
        user?.rol || null,
        systemPrompt
      );
      
      if (response.success) {
        console.log("✅ Respuesta recibida del asistente:", response.response.substring(0, 50) + "...");
        setMessages(prev => [
          ...prev, 
          { role: "assistant", content: response.response }
        ]);
      } else {
        console.error("❌ Error al recibir respuesta del asistente:", response);
        toast({
          title: "Error",
          description: "No se pudo obtener una respuesta del asistente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("❌ Error al comunicarse con el asistente:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al comunicarse con el asistente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    setCurrentMessage(prompt);
    // Opcionalmente, enviar automáticamente
    // handleSendMessage();
  };

  const handleReset = () => {
    setMessages([]);
    // Recargar el contexto de usuario
    setUserContext(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Función para manejar navegación desde sugerencias con intent
  const handleSuggestionClick = (suggestion: QuickActionItem) => {
    if (!suggestion || !suggestion.navigateTo) {
      // Si no tiene ruta de navegación, usarlo como prompt
      if (suggestion.prompt) {
        handleQuickAction(suggestion.prompt);
      }
      return;
    }

    try {
      // Cerrar el diálogo del asistente
      setIsOpen(false);
      
      // Navegar a la ruta especificada con parámetros si existen
      if (suggestion.params && Object.keys(suggestion.params).length > 0) {
        navigate(suggestion.navigateTo, { state: suggestion.params });
      } else {
        navigate(suggestion.navigateTo);
      }
    } catch (error) {
      console.error("Error al navegar desde la sugerencia:", error);
      toast({
        title: "Error de navegación",
        description: "No se pudo navegar a la página solicitada.",
        variant: "destructive"
      });
    }
  };

  // Determinar si hay alertas prioritarias basadas en el contexto
  const hasPriorityAlerts = useMemo(() => {
    if (!userContext) return false;
    return (
      (userContext.estadisticas.pagosVencidos && userContext.estadisticas.pagosVencidos > 0) ||
      (userContext.estadisticas.recordatoriosPendientes && userContext.estadisticas.recordatoriosPendientes > 0)
    );
  }, [userContext]);

  return (
    <>
      {/* Botón flotante para abrir el chat */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 rounded-full w-14 h-14 shadow-lg p-0 ${
          hasPriorityAlerts 
            ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
        } z-50`}
        aria-label="Abrir asistente"
      >
        {hasPriorityAlerts ? (
          <AlertCircle size={24} />
        ) : (
          <HelpCircle size={24} />
        )}
        
        {/* Badge para notificaciones importantes */}
        {hasPriorityAlerts && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 px-1.5 py-0.5">
            {(userContext?.estadisticas.pagosVencidos || 0) + (userContext?.estadisticas.recordatoriosPendientes || 0)}
          </Badge>
        )}
      </Button>

      {/* Panel de chat */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[550px] h-[80vh] flex flex-col p-0">
          <DialogHeader className="border-b p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <DialogTitle className="flex items-center">
              <MessageSquare className="mr-2" size={20} />
              Asistente EduMex
            </DialogTitle>
            <DialogDescription className="text-gray-100">
              Pregúntame lo que necesites saber sobre el sistema
            </DialogDescription>
          </DialogHeader>
          
          {/* Contenedor de mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {contextLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2">Cargando contexto...</span>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div 
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <div className="whitespace-pre-line">{message.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-gray-800">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Acciones rápidas y contextuales - Solo visible cuando hay pocos mensajes */}
          {messages.length <= 1 && !contextLoading && (
            <div className="border-t border-gray-200 bg-gray-50 py-3">
              {/* Alertas contextuales si existen */}
              {hasPriorityAlerts && (
                <div className="px-4 mb-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <h3 className="text-sm font-medium text-orange-800 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Acciones recomendadas
                    </h3>
                    <div className="mt-2 space-y-2">
                      {userContext?.estadisticas.pagosVencidos && userContext.estadisticas.pagosVencidos > 0 && (
                        <Button
                          variant="outline"
                          className="w-full justify-start border-orange-200 bg-white text-orange-700 hover:bg-orange-50 hover:text-orange-800 hover:border-orange-300"
                          onClick={() => handleSuggestionClick({
                            label: `Ver ${userContext.estadisticas.pagosVencidos} pagos vencidos`,
                            prompt: "¿Cómo veo los pagos vencidos?",
                            navigateTo: "/pagos",
                            params: { vencidos: true },
                            category: "pagos",
                            intent: "ver_pagos_vencidos"
                          })}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          <span className="text-xs">Ver {userContext.estadisticas.pagosVencidos} pagos vencidos</span>
                        </Button>
                      )}
                      
                      {userContext?.estadisticas.recordatoriosPendientes && userContext.estadisticas.recordatoriosPendientes > 0 && (
                        <Button
                          variant="outline"
                          className="w-full justify-start border-orange-200 bg-white text-orange-700 hover:bg-orange-50 hover:text-orange-800 hover:border-orange-300"
                          onClick={() => handleSuggestionClick({
                            label: `Enviar ${userContext.estadisticas.recordatoriosPendientes} recordatorios`,
                            prompt: "¿Cómo envío recordatorios de pago?",
                            navigateTo: "/admin/recordatorios",
                            params: { ejecutar: true },
                            category: "comunicacion",
                            intent: "enviar_recordatorios"
                          })}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          <span className="text-xs">Enviar {userContext.estadisticas.recordatoriosPendientes} recordatorios</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Sugerencias personalizadas basadas en contexto */}
              {personalizedSuggestions.length > 0 && (
                <div className="px-4 mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Sugerencias personalizadas:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {personalizedSuggestions
                      .slice(0, 4) // Limitar a 4 sugerencias para no sobrecargar la interfaz
                      .map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="justify-start text-left h-auto py-2"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {CATEGORY_ICONS[suggestion.category || 'default']}
                          <span className="text-xs">{suggestion.label}</span>
                        </Button>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Sugerencias rápidas predefinidas */}
              <div className="px-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Sugerencias rápidas:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_ACTIONS.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start text-left h-auto py-2"
                      onClick={() => handleSuggestionClick(action)}
                    >
                      {CATEGORY_ICONS[action.category || 'default']}
                      <span className="text-xs">{action.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Pestañas de categorías */}
              <div className="mt-4 px-4">
                <Tabs defaultValue={categories[0]} onValueChange={setActiveCategory}>
                  <TabsList className="w-full h-auto flex overflow-x-auto py-1">
                    {categories.map((category) => (
                      <TabsTrigger 
                        key={category} 
                        value={category}
                        className="text-xs px-2 py-1 flex-shrink-0"
                      >
                        {CATEGORY_ICONS[category]}
                        <span className="capitalize">
                          {category.replace(/-/g, ' ')}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {categories.map((category) => (
                    <TabsContent key={category} value={category} className="mt-2">
                      <ScrollArea className="h-32">
                        <div className="space-y-1">
                          {CATEGORIZED_PROMPTS[category].map((item: QuickActionItem, idx) => (
                            <Button
                              key={idx}
                              variant="ghost"
                              className="w-full justify-start text-left text-xs h-auto py-1.5"
                              onClick={() => handleSuggestionClick(item)}
                            >
                              {item.label}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </div>
          )}
          
          {/* Controles inferiores */}
          <div className="border-t p-4 flex flex-col space-y-2">
            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleReset}
                title="Reiniciar conversación"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
              
              <Textarea
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Escribe tu mensaje aquí..."
                className="resize-none flex-1"
                rows={2}
                disabled={loading || contextLoading}
              />
              
              <Button 
                onClick={handleSendMessage} 
                disabled={!currentMessage.trim() || loading || contextLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}