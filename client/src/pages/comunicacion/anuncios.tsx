import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  Calendar,
  Check,
  Info,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Trash,
  User,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

// Tipo para los anuncios
type Anuncio = {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdByName?: string;
  targetRoles: string[];
  targetId?: string;
  createdAt: string;
  scheduledDate: string;
};

export default function AnunciosTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [anuncioSeleccionado, setAnuncioSeleccionado] = useState<Anuncio | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [nuevoAnuncio, setNuevoAnuncio] = useState({
    title: "",
    content: "",
    targetRoles: [] as string[],
    scheduledDate: format(new Date(), "yyyy-MM-dd'T'HH:mm")
  });

  // Consultar anuncios
  const { data: anuncios, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/announcements'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/announcements');
      return await res.json();
    }
  });

  // Consultar grupos (solo para administradores y coordinadores)
  const { data: grupos, isLoading: loadingGroups } = useQuery({
    queryKey: ['/api/groups'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/groups');
      return await res.json();
    },
    enabled: user?.rol === 'admin' || user?.rol === 'coordinador'
  });

  // Consultar estudiantes (solo para administradores y coordinadores)
  const { data: estudiantes, isLoading: loadingStudents } = useQuery({
    queryKey: ['/api/students'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/students');
      return await res.json();
    },
    enabled: user?.rol === 'admin' || user?.rol === 'coordinador'
  });

  // Mutación para crear anuncio
  const crearAnuncioMutation = useMutation({
    mutationFn: async (anuncio: typeof nuevoAnuncio) => {
      const res = await apiRequest('POST', '/api/announcements', anuncio);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Anuncio creado",
        description: "Tu anuncio ha sido creado correctamente.",
        variant: "default",
      });
      setDialogOpen(false);
      setNuevoAnuncio({
        title: "",
        content: "",
        targetRoles: [],
        scheduledDate: format(new Date(), "yyyy-MM-dd'T'HH:mm")
      });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
    },
    onError: (error) => {
      toast({
        title: "Error al crear anuncio",
        description: "Hubo un problema al crear tu anuncio. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  });

  // Mutación para eliminar anuncio
  const eliminarAnuncioMutation = useMutation({
    mutationFn: async (anuncioId: string) => {
      const res = await apiRequest('DELETE', `/api/announcements/${anuncioId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      toast({
        title: "Anuncio eliminado",
        description: "El anuncio ha sido eliminado permanentemente.",
      });
      setDetalleOpen(false);
    }
  });

  // Handle submit del formulario de nuevo anuncio
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    crearAnuncioMutation.mutate(nuevoAnuncio);
  };

  // Filtrar anuncios según la búsqueda
  const anunciosFiltrados = anuncios ? anuncios.filter((anuncio: Anuncio) => {
    return anuncio.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
           anuncio.content.toLowerCase().includes(searchTerm.toLowerCase());
  }) : [];

  // Función para abrir la vista detallada del anuncio
  const verDetalleAnuncio = (anuncio: Anuncio) => {
    setAnuncioSeleccionado(anuncio);
    setDetalleOpen(true);
  };

  // Renderizar esqueleto de carga
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-[300px]">
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-8 w-1/3" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  // Renderizar mensaje de error
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            Error al cargar anuncios
          </CardTitle>
          <CardDescription>
            No pudimos cargar los anuncios. Por favor, intenta nuevamente más tarde.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refetch()} variant="outline" className="flex items-center">
            <RefreshCw className="mr-2 h-4 w-4" />
            Intentar nuevamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative w-full md:w-[350px]">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar anuncios..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        {(user?.rol === 'admin' || user?.rol === 'coordinador' || user?.rol === 'docente') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Anuncio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Crear Nuevo Anuncio</DialogTitle>
                  <DialogDescription>
                    Crea un nuevo anuncio para la comunidad escolar.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="titulo" className="text-right">
                      Título
                    </Label>
                    <Input
                      id="titulo"
                      value={nuevoAnuncio.title}
                      onChange={(e) => setNuevoAnuncio({...nuevoAnuncio, title: e.target.value})}
                      className="col-span-3"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label htmlFor="contenido" className="text-right pt-2">
                      Contenido
                    </Label>
                    <Textarea
                      id="contenido"
                      value={nuevoAnuncio.content}
                      onChange={(e) => setNuevoAnuncio({...nuevoAnuncio, content: e.target.value})}
                      className="col-span-3"
                      rows={6}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fecha" className="text-right">
                      Programación
                    </Label>
                    <Input
                      id="fecha"
                      type="datetime-local"
                      value={nuevoAnuncio.scheduledDate}
                      onChange={(e) => setNuevoAnuncio({...nuevoAnuncio, scheduledDate: e.target.value})}
                      className="col-span-3"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">
                      Destinatarios
                    </Label>
                    <div className="col-span-3 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="todos" 
                            checked={nuevoAnuncio.targetRoles.includes('todos')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNuevoAnuncio({
                                  ...nuevoAnuncio, 
                                  targetRoles: ['todos']
                                });
                              } else {
                                setNuevoAnuncio({
                                  ...nuevoAnuncio, 
                                  targetRoles: nuevoAnuncio.targetRoles.filter(r => r !== 'todos')
                                });
                              }
                            }}
                          />
                          <label
                            htmlFor="todos"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Toda la escuela
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="padres" 
                            checked={nuevoAnuncio.targetRoles.includes('padres')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNuevoAnuncio({
                                  ...nuevoAnuncio, 
                                  targetRoles: [...nuevoAnuncio.targetRoles.filter(r => r !== 'todos'), 'padres']
                                });
                              } else {
                                setNuevoAnuncio({
                                  ...nuevoAnuncio, 
                                  targetRoles: nuevoAnuncio.targetRoles.filter(r => r !== 'padres')
                                });
                              }
                            }}
                            disabled={nuevoAnuncio.targetRoles.includes('todos')}
                          />
                          <label
                            htmlFor="padres"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Padres de familia
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="docentes" 
                            checked={nuevoAnuncio.targetRoles.includes('docentes')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNuevoAnuncio({
                                  ...nuevoAnuncio, 
                                  targetRoles: [...nuevoAnuncio.targetRoles.filter(r => r !== 'todos'), 'docentes']
                                });
                              } else {
                                setNuevoAnuncio({
                                  ...nuevoAnuncio, 
                                  targetRoles: nuevoAnuncio.targetRoles.filter(r => r !== 'docentes')
                                });
                              }
                            }}
                            disabled={nuevoAnuncio.targetRoles.includes('todos')}
                          />
                          <label
                            htmlFor="docentes"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Docentes
                          </label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="alumnos" 
                            checked={nuevoAnuncio.targetRoles.includes('alumnos')}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNuevoAnuncio({
                                  ...nuevoAnuncio, 
                                  targetRoles: [...nuevoAnuncio.targetRoles.filter(r => r !== 'todos'), 'alumnos']
                                });
                              } else {
                                setNuevoAnuncio({
                                  ...nuevoAnuncio, 
                                  targetRoles: nuevoAnuncio.targetRoles.filter(r => r !== 'alumnos')
                                });
                              }
                            }}
                            disabled={nuevoAnuncio.targetRoles.includes('todos')}
                          />
                          <label
                            htmlFor="alumnos"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Alumnos
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={crearAnuncioMutation.isPending || nuevoAnuncio.targetRoles.length === 0}>
                    {crearAnuncioMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Publicando...
                      </>
                    ) : (
                      <>
                        <Megaphone className="mr-2 h-4 w-4" />
                        Publicar Anuncio
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {anunciosFiltrados.length === 0 ? (
        <Card className="w-full text-center py-12">
          <CardContent>
            <div className="flex flex-col items-center justify-center">
              <Info className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No se encontraron anuncios.</p>
              {(user?.rol === 'admin' || user?.rol === 'coordinador' || user?.rol === 'docente') && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Crear nuevo anuncio
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {anunciosFiltrados.map((anuncio: Anuncio) => (
            <Card key={anuncio.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle 
                    className="text-xl hover:text-primary transition-colors cursor-pointer"
                    onClick={() => verDetalleAnuncio(anuncio)}
                  >
                    {anuncio.title}
                  </CardTitle>
                  
                  {(user?.id === anuncio.createdBy || user?.rol === 'admin') && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => eliminarAnuncioMutation.mutate(anuncio.id)}
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <CardDescription className="flex items-center text-xs mt-1">
                  <User className="h-3 w-3 mr-1" />
                  {anuncio.createdByName || 'Administración'}
                  <span className="mx-1">•</span>
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(parseISO(anuncio.scheduledDate), "dd MMM yyyy, HH:mm", { locale: es })}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm line-clamp-4">{anuncio.content}</p>
              </CardContent>
              <CardFooter className="flex justify-between items-center pt-2">
                <div className="flex space-x-2">
                  {anuncio.targetRoles.includes('todos') ? (
                    <Badge variant="outline" className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      Toda la escuela
                    </Badge>
                  ) : (
                    anuncio.targetRoles.map(role => {
                      let label = "";
                      let icon = <User className="h-3 w-3 mr-1" />;
                      
                      switch(role) {
                        case 'padres':
                          label = "Padres";
                          break;
                        case 'docentes':
                          label = "Docentes";
                          break;
                        case 'alumnos':
                          label = "Alumnos";
                          break;
                        default:
                          label = role;
                      }
                      
                      return (
                        <Badge key={role} variant="outline" className="flex items-center text-xs">
                          {icon} {label}
                        </Badge>
                      );
                    })
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => verDetalleAnuncio(anuncio)}
                >
                  Leer más
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para ver detalle de anuncio */}
      <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {anuncioSeleccionado && (
            <>
              <DialogHeader>
                <DialogTitle>{anuncioSeleccionado.title}</DialogTitle>
                <DialogDescription className="flex justify-between items-center">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {anuncioSeleccionado.createdByName || 'Administración'}
                    <span className="mx-1">•</span>
                    <Calendar className="h-4 w-4 mr-1" />
                    {format(parseISO(anuncioSeleccionado.scheduledDate), "dd MMMM yyyy, HH:mm", { locale: es })}
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="whitespace-pre-wrap p-2 min-h-[150px]">
                  {anuncioSeleccionado.content}
                </div>
              </div>
              <div className="py-2 border-t flex items-center">
                <span className="text-sm text-muted-foreground mr-2">Dirigido a:</span>
                <div className="flex flex-wrap gap-2">
                  {anuncioSeleccionado.targetRoles.includes('todos') ? (
                    <Badge variant="outline" className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      Toda la escuela
                    </Badge>
                  ) : (
                    anuncioSeleccionado.targetRoles.map(role => {
                      let label = "";
                      let icon = <User className="h-3 w-3 mr-1" />;
                      
                      switch(role) {
                        case 'padres':
                          label = "Padres";
                          break;
                        case 'docentes':
                          label = "Docentes";
                          break;
                        case 'alumnos':
                          label = "Alumnos";
                          break;
                        default:
                          label = role;
                      }
                      
                      return (
                        <Badge key={role} variant="outline" className="flex items-center">
                          {icon} {label}
                        </Badge>
                      );
                    })
                  )}
                </div>
              </div>
              <DialogFooter>
                {(user?.id === anuncioSeleccionado.createdBy || user?.rol === 'admin') && (
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      eliminarAnuncioMutation.mutate(anuncioSeleccionado.id);
                    }}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}