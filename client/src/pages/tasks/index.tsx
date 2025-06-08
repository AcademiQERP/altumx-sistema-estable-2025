import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Task } from "@shared/schema";

// Components UI
import { Button } from "@/components/ui/button";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Icons
import {
  FileText,
  Plus,
  Calendar,
  BookOpen,
  Clock,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  FileCheck,
  Users,
  Search,
  ArrowUpDown,
  Loader2,
} from "lucide-react";

function TasksPage() {
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();
  const isTeacher = user?.rol === "docente";
  const isAdmin = user?.rol === "admin";

  // Fetch tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: [isTeacher ? "/api/profesor/tasks" : "/api/tasks"],
    enabled: !!user,
  });

  // Fetch groups for filtering - usar endpoint específico para profesores si es docente
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: [isTeacher ? "/api/profesor/grupos-asignados" : "/api/groups"],
    enabled: !!user,
  });

  // Fetch subjects for filtering - usar todas las materias solo para admins
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["/api/subjects"],
    enabled: !!user && isAdmin, // Solo cargar todas las materias para admin
  });
  
  // Para profesores, obtener las materias asignadas de todos sus grupos
  const { data: teacherAssignments } = useQuery({
    queryKey: ["/api/profesor/assignments/" + user?.id],
    enabled: !!user && isTeacher,
  });
  
  // Extraer las materias únicas de las asignaciones del profesor
  const teacherSubjectsMap = new Map();
  teacherAssignments?.forEach(assignment => {
    if (subjects?.find(s => s.id === assignment.materiaId)) {
      const subject = subjects.find(s => s.id === assignment.materiaId);
      if (subject) {
        teacherSubjectsMap.set(subject.id, subject);
      }
    }
  });
  
  // Convertir el mapa a array para usar en el componente
  const teacherSubjects = Array.from(teacherSubjectsMap.values());

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      // Invalidar ambas rutas para asegurar que la caché se actualice correctamente
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profesor/tasks"] });
      toast({
        title: "Tarea eliminada",
        description: "La tarea ha sido eliminada exitosamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `No se pudo eliminar la tarea: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Helper function to format date
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  // Filter tasks
  const filteredTasks = tasks?.filter((task) => {
    // Filtros básicos que se aplican siempre
    if (
      searchTerm &&
      !task.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }

    if (selectedGroup !== "all" && task.grupoId !== parseInt(selectedGroup)) {
      return false;
    }

    if (selectedSubject !== "all" && task.materiaId !== parseInt(selectedSubject)) {
      return false;
    }

    if (selectedStatus !== "all" && task.estado !== selectedStatus) {
      return false;
    }

    // No filtramos por profesor si:
    // 1. El usuario no es profesor
    // 2. El usuario es profesor pero estamos usando el endpoint específico del profesor
    //    (que ya trae las tareas filtradas del backend)
    const usingTeacherEndpoint = isTeacher && tasks && tasks.length > 0;
    
    if (isTeacher && !usingTeacherEndpoint && user?.id !== task.profesorId) {
      return false;
    }

    return true;
  });

  // Sort tasks by due date (newest first)
  const sortedTasks = filteredTasks?.sort((a, b) => {
    return new Date(b.fechaEntrega).getTime() - new Date(a.fechaEntrega).getTime();
  });

  // Group tasks by status
  const activeTab = "all";
  
  // Loading state
  const isSubjectsLoading = isAdmin ? subjectsLoading : false;
  const isTeacherAssignmentsLoading = isTeacher && !teacherAssignments;
  
  if (tasksLoading || groupsLoading || isSubjectsLoading || isTeacherAssignmentsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando tareas...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tareas</h1>
          <p className="text-muted-foreground">
            Gestiona las tareas y asignaciones para los alumnos
          </p>
        </div>
        {(isTeacher || isAdmin) && (
          <Link href="/tareas/nueva">
            <Button className="mt-4 md:mt-0">
              <Plus className="mr-2 h-4 w-4" />
              + Crear Tarea
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <Tabs defaultValue={activeTab} className="w-full">
          <div className="p-4 border-b">
            <TabsList className="mb-4">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="activo">Activas</TabsTrigger>
              <TabsTrigger value="completada">Completadas</TabsTrigger>
              <TabsTrigger value="vencida">Vencidas</TabsTrigger>
            </TabsList>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Buscar por título..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="group">Grupo</Label>
                <Select
                  value={selectedGroup}
                  onValueChange={setSelectedGroup}
                >
                  <SelectTrigger id="group">
                    <SelectValue placeholder="Todos los grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los grupos</SelectItem>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.nombre} - {group.nivel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject">Materia</Label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Todas las materias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las materias</SelectItem>
                    {isTeacher 
                      ? teacherSubjects?.map((subject) => (
                          <SelectItem
                            key={subject.id}
                            value={subject.id.toString()}
                          >
                            {subject.nombre}
                          </SelectItem>
                        ))
                      : subjects?.map((subject) => (
                          <SelectItem
                            key={subject.id}
                            value={subject.id.toString()}
                          >
                            {subject.nombre}
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="activo">Activas</SelectItem>
                    <SelectItem value="completada">Completadas</SelectItem>
                    <SelectItem value="vencida">Vencidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <TabsContent value={activeTab} className="p-0">
            {sortedTasks && sortedTasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Título</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Materia</TableHead>
                    <TableHead>Fecha de Entrega</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTasks.map((task) => {
                    const group = groups?.find((g) => g.id === task.grupoId);
                    
                    // Para profesores, buscar la materia en sus materias asignadas
                    // Para administradores, buscar en todas las materias
                    let subjectName = "—";
                    if (isTeacher) {
                      const subject = teacherSubjects?.find((s) => s.id === task.materiaId);
                      if (subject) {
                        subjectName = subject.nombre;
                      }
                    } else {
                      const subject = subjects?.find((s) => s.id === task.materiaId);
                      if (subject) {
                        subjectName = subject.nombre;
                      }
                    }

                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          <Link href={`/tareas/${task.id}`}>
                            <span className="text-blue-600 hover:underline cursor-pointer">
                              {task.titulo}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>{group?.nombre || "—"}</TableCell>
                        <TableCell>
                          {subjectName !== "—" ? (
                            subjectName
                          ) : (
                            <span 
                              className="text-gray-500" 
                              title="Esta tarea no está vinculada a una materia específica"
                            >
                              No especificada
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(task.fechaEntrega)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {(() => {
                              // Verificar si la tarea está vencida
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const dueDate = new Date(task.fechaEntrega);
                              dueDate.setHours(0, 0, 0, 0);
                              
                              const isOverdue = dueDate < today && task.estado === "activo";
                              const isDueToday = dueDate.getTime() === today.getTime();
                              
                              if (isOverdue) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <XCircle className="mr-1 h-3 w-3" /> Vencida
                                  </span>
                                );
                              } else if (isDueToday && task.estado === "activo") {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <Clock className="mr-1 h-3 w-3" /> Entrega hoy
                                  </span>
                                );
                              } else if (task.estado === "activo") {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <Clock className="mr-1 h-3 w-3" /> Activa
                                  </span>
                                );
                              } else if (task.estado === "completada") {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Completada
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <XCircle className="mr-1 h-3 w-3" /> Vencida
                                  </span>
                                );
                              }
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Link href={`/tareas/${task.id}`}>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <FileText className="h-4 w-4" />
                                <span className="sr-only">Ver tarea</span>
                              </Button>
                            </Link>
                            {(isTeacher && user?.id === task.profesorId) || isAdmin ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs flex items-center h-8 px-2"
                                  title="Próximamente"
                                  disabled
                                >
                                  <FileCheck className="h-4 w-4 mr-1" /> Ver entregas
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Eliminar tarea</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        ¿Estás seguro?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto
                                        eliminará permanentemente la tarea y sus
                                        entregas asociadas.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancelar
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          deleteTaskMutation.mutate(task.id)
                                        }
                                        className="bg-red-500 hover:bg-red-600"
                                      >
                                        Eliminar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No hay tareas</h3>
                <p className="text-muted-foreground mt-2 mb-4">
                  {searchTerm || selectedGroup !== "all" || selectedSubject !== "all" || selectedStatus !== "all"
                    ? "No se encontraron tareas con los filtros seleccionados."
                    : isTeacher
                    ? tasks && tasks.length === 0
                      ? "No tienes grupos o materias activas asignadas, o aún no has creado tareas para tus grupos."
                      : "Aún no has creado ninguna tarea."
                    : "No hay tareas disponibles en este momento."}
                </p>
                {(isTeacher || isAdmin) && (
                  <Link href="/tareas/nueva">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear nueva tarea
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default TasksPage;