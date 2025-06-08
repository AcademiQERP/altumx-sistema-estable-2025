import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MessageCircle, MegaphoneIcon, Bell } from "lucide-react";

// Importamos los componentes de comunicación
import NotificacionesTab from "./notificaciones";
import CalendarioTab from "./calendario";
import MensajesTab from "./mensajes";

export default function ComunicacionPage() {
  const [location, navigate] = useLocation();
  const urlPath = location.split('/').filter(Boolean);
  const tabFromUrl = urlPath.length > 1 ? urlPath[1] : "mensajes";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/comunicacion/${value}`);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Centro de Comunicación</h1>
        <p className="text-muted-foreground">
          Gestiona todas las comunicaciones escolares desde un solo lugar
        </p>

        <Tabs
          defaultValue="mensajes"
          value={activeTab}
          className="w-full"
          onValueChange={handleTabChange}
        >
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="mensajes" className="flex items-center">
              <MessageCircle className="mr-2 h-4 w-4" />
              <span>Mensajes</span>
            </TabsTrigger>
            <TabsTrigger value="anuncios" className="flex items-center">
              <MegaphoneIcon className="mr-2 h-4 w-4" />
              <span>Anuncios</span>
            </TabsTrigger>
            <TabsTrigger value="notificaciones" className="flex items-center">
              <Bell className="mr-2 h-4 w-4" />
              <span>Notificaciones</span>
            </TabsTrigger>
            <TabsTrigger value="calendario" className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              <span>Calendario</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mensajes">
            <MensajesTab />
          </TabsContent>

          <TabsContent value="anuncios">
            <Card>
              <CardHeader>
                <CardTitle>Anuncios</CardTitle>
                <CardDescription>
                  Esta sección está en desarrollo. Pronto podrás ver los anuncios escolares aquí.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  <MegaphoneIcon className="h-16 w-16 text-primary/30 mb-4" />
                  <p className="text-muted-foreground">Próximamente disponible</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notificaciones">
            <NotificacionesTab />
          </TabsContent>

          <TabsContent value="calendario">
            <CalendarioTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}