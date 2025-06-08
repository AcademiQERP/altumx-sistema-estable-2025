import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { BellRing, Info, AlertTriangle, Check, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type Comunicado = {
  id: number;
  fecha: string;
  titulo: string;
  contenido: string;
  tipo: 'general' | 'nivel' | 'grupo' | 'individual';
  remitente: string;
  destinatario?: string;
  leido: boolean;
};

const TIPOS_MAP = {
  general: { label: 'General', color: 'bg-blue-100 text-blue-800' },
  nivel: { label: 'Nivel', color: 'bg-purple-100 text-purple-800' },
  grupo: { label: 'Grupo', color: 'bg-amber-100 text-amber-800' },
  individual: { label: 'Individual', color: 'bg-green-100 text-green-800' },
};

const Comunicados = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('todos');

  // Función para simular datos de comunicados (para demo)
  const mockComunicados = (): Comunicado[] => [
    {
      id: 1,
      fecha: '2025-04-10',
      titulo: 'Suspensión de clases',
      contenido: 'Se suspenden las clases el día 15 de abril por junta de profesores.',
      tipo: 'general',
      remitente: 'Dirección General',
      leido: true,
    },
    {
      id: 2,
      fecha: '2025-04-09',
      titulo: 'Reunión de evaluación',
      contenido: 'Reunión de evaluación para docentes del nivel primaria el próximo viernes.',
      tipo: 'nivel',
      remitente: 'Coordinación Académica',
      leido: false,
    },
    {
      id: 3,
      fecha: '2025-04-08',
      titulo: 'Entrega de calificaciones',
      contenido: 'Recordatorio para entregar calificaciones del primer parcial antes del miércoles.',
      tipo: 'grupo',
      remitente: 'Coordinación Académica',
      leido: false,
    },
  ];

  // Usamos useQuery para simular la carga desde una API
  const { data: comunicados = [], isLoading, error } = useQuery({
    queryKey: ['/api/comunicados'],
    queryFn: async () => {
      // Simulamos un retraso de red
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockComunicados();
    },
  });

  // Filtro de comunicados según la pestaña activa
  const comunicadosFiltrados = activeTab === 'todos' 
    ? comunicados 
    : activeTab === 'no-leidos' 
      ? comunicados.filter(com => !com.leido) 
      : comunicados.filter(com => com.tipo === activeTab);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-center">
          <BellRing className="h-10 w-10 mx-auto mb-4 text-primary/70" />
          <p className="text-muted-foreground">Cargando comunicados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-lg mx-auto mt-10">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Ocurrió un error al cargar los comunicados. Intente nuevamente más tarde.
        </AlertDescription>
      </Alert>
    );
  }

  if (comunicados.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-primary" />
              Comunicados
            </CardTitle>
            <CardDescription>
              Sistema de comunicación entre administración, docentes y padres de familia
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Sin comunicados</AlertTitle>
              <AlertDescription>
                No hay comunicados disponibles por el momento.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Comunicados
          </CardTitle>
          <CardDescription>
            Sistema de comunicación entre administración, docentes y padres de familia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="no-leidos">No leídos</TabsTrigger>
              <TabsTrigger value="general">Generales</TabsTrigger>
              <TabsTrigger value="nivel">Nivel</TabsTrigger>
              <TabsTrigger value="grupo">Grupo</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {comunicadosFiltrados.length === 0 ? (
                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertTitle>Sin resultados</AlertTitle>
                  <AlertDescription>
                    No se encontraron comunicados con el filtro seleccionado.
                  </AlertDescription>
                </Alert>
              ) : (
                comunicadosFiltrados.map(comunicado => (
                  <Card key={comunicado.id} className={comunicado.leido ? 'opacity-80' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base">
                          {comunicado.titulo}
                          {!comunicado.leido && (
                            <Badge variant="secondary" className="ml-2 h-fit">Nuevo</Badge>
                          )}
                        </CardTitle>
                        <Badge className={TIPOS_MAP[comunicado.tipo].color}>
                          {TIPOS_MAP[comunicado.tipo].label}
                        </Badge>
                      </div>
                      <CardDescription className="flex justify-between">
                        <span>De: {comunicado.remitente}</span>
                        <span>{new Date(comunicado.fecha).toLocaleDateString()}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{comunicado.contenido}</p>
                      {comunicado.leido && (
                        <div className="flex items-center mt-3 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 mr-1" />
                          Leído
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Comunicados;