import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Task, TaskSubmission } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import {
  Home,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  MoreVertical,
  Eye,
  FileCheck,
  Loader2,
  Search,
  Filter,
  ArrowUpDown,
  User,
} from "lucide-react";

function TaskSubmissionsPage() {
  const [matched, params] = useRoute("/tareas/entregas/:id");
  const taskId = matched ? parseInt(params.id) : null;
  const [, navigate] = useLocation();
  const [selectedStudent, setSelectedStudent] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<TaskSubmission | null>(null);
  const [gradeValue, setGradeValue] = useState<string>("");
  const [gradeComments, setGradeComments] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();
  const isTeacher = user?.rol === "docente";
  const isAdmin = user?.rol === "admin";

  // Fetch task details
  const {
    data: task,
    isLoading: taskLoading,
    error: taskError,
  } = useQuery<Task>({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: !!taskId,
  });

  // Fetch submissions for this task
  const {
    data: submissions,
    isLoading: submissionsLoading,
    error: submissionsError,
  } = useQuery<TaskSubmission[]>({
    queryKey: [`/api/task-submissions/task/${taskId}`],
    enabled: !!taskId,
  });

  // Fetch students for filtering
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: [`/api/students`],
    enabled: !!user && (isTeacher || isAdmin),
  });

  // Update submission mutation (for grading)
  const updateSubmissionMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<TaskSubmission>;
    }) => {
      const response = await apiRequest("PUT", `/api/task-submissions/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/task-submissions/task/${taskId}`] });
      toast({
        title: "Entrega calificada",
        description: "La calificación ha sido guardada exitosamente.",
      });
      setGradeDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error updating submission:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la calificación. Por favor intenta de nuevo.",
        variant: "destructive",
      });
    },
  });

  // Format date
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return format(date, "PPP", { locale: es });
  };

  // Handle submission status change
  const handleStatusChange = (submission: TaskSubmission, newStatus: "entregada" | "revisada" | "retrasada") => {
    updateSubmissionMutation.mutate({
      id: submission.id,
      data: {
        ...submission,
        estado: newStatus
      }
    });
  };

  // Handle grading
  const handleGrade = () => {
    if (!currentSubmission) return;
    
    updateSubmissionMutation.mutate({
      id: currentSubmission.id,
      data: {
        ...currentSubmission,
        calificacion: gradeValue,
        comentarios: gradeComments || currentSubmission.comentarios,
        estado: "revisada"
      }
    });
  };

  // Open grade dialog
  const openGradeDialog = (submission: TaskSubmission) => {
    setCurrentSubmission(submission);
    setGradeValue(submission.calificacion || "");
    setGradeComments(submission.comentarios || "");
    setGradeDialogOpen(true);
  };

  // Filter submissions
  const filteredSubmissions = submissions?.filter((submission) => {
    if (selectedStudent !== "all" && submission.alumnoId !== parseInt(selectedStudent)) {
      return false;
    }

    if (selectedStatus !== "all" && submission.estado !== selectedStatus) {
      return false;
    }

    return true;
  });

  // Define loading state
  const isLoading = taskLoading || submissionsLoading || studentsLoading;
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando entregas...</p>
      </div>
    );
  }
  
  // Access control - only teachers who created the task or admins can see submissions
  if (task && isTeacher && user?.id !== task.profesorId && !isAdmin) {
    navigate("/tareas");
    return null;
  }

  // Error state
  if (taskError || submissionsError) {
    return (
      <div className="p-4 md:p-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No se pudo cargar la información de las entregas. Por favor intenta de nuevo.</p>
            <Button className="mt-4" onClick={() => navigate("/tareas")}>
              Volver a Tareas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If task not found
  if (!task) {
    return (
      <div className="p-4 md:p-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Tarea no encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p>La tarea que estás buscando no existe o ha sido eliminada.</p>
            <Button className="mt-4" onClick={() => navigate("/tareas")}>
              Volver a Tareas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">
                <Home className="h-4 w-4 mr-1" />
                Inicio
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/tareas">Tareas</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/tareas/${task.id}`}>
                {task.titulo}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/tareas/entregas/${task.id}`}>
                Entregas
              </BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Entregas: {task.titulo}</h1>
        <p className="text-muted-foreground">
          Revisa y califica las entregas de los alumnos para esta tarea
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Entregas de Alumnos</CardTitle>
              <CardDescription>
                {filteredSubmissions?.length || 0} entregas recibidas
              </CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="w-full md:w-auto">
                <Select
                  value={selectedStudent}
                  onValueChange={setSelectedStudent}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Todos los alumnos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los alumnos</SelectItem>
                    {students?.map((student) => (
                      <SelectItem
                        key={student.id}
                        value={student.id.toString()}
                      >
                        {student.nombreCompleto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-auto">
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="entregada">Entregadas</SelectItem>
                    <SelectItem value="revisada">Revisadas</SelectItem>
                    <SelectItem value="retrasada">Retrasadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubmissions && filteredSubmissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Fecha Entrega</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Calificación</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => {
                  const student = students?.find(
                    (s) => s.id === submission.alumnoId
                  );

                  return (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{student?.nombreCompleto || `Alumno ID: ${submission.alumnoId}`}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(submission.fechaEntrega)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              submission.estado === "entregada"
                                ? "bg-green-100 text-green-800"
                                : submission.estado === "revisada"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {submission.estado === "entregada" ? (
                              <>
                                <CheckCircle2 className="mr-1 h-3 w-3" />{" "}
                                Entregada
                              </>
                            ) : submission.estado === "revisada" ? (
                              <>
                                <FileCheck className="mr-1 h-3 w-3" />{" "}
                                Revisada
                              </>
                            ) : (
                              <>
                                <Clock className="mr-1 h-3 w-3" /> Retrasada
                              </>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {submission.calificacion ? (
                          <span className="font-medium text-primary">
                            {submission.calificacion}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Sin calificar
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0"
                              >
                                <span className="sr-only">Opciones</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => openGradeDialog(submission)}
                              >
                                <FileCheck className="mr-2 h-4 w-4" />
                                <span>Calificar</span>
                              </DropdownMenuItem>
                              {submission.archivoUrl && (
                                <DropdownMenuItem>
                                  <a
                                    href={submission.archivoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center"
                                  >
                                    <Download className="mr-2 h-4 w-4" />
                                    <span>Descargar archivo</span>
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>
                                Cambiar estado
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(submission, "entregada")
                                }
                                disabled={submission.estado === "entregada"}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                <span>Marcar como Entregada</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(submission, "revisada")
                                }
                                disabled={submission.estado === "revisada"}
                              >
                                <FileCheck className="mr-2 h-4 w-4" />
                                <span>Marcar como Revisada</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(submission, "retrasada")
                                }
                                disabled={submission.estado === "retrasada"}
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                <span>Marcar como Retrasada</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
              <h3 className="text-lg font-medium">No hay entregas</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                {selectedStudent || selectedStatus !== "all"
                  ? "No se encontraron entregas con los filtros seleccionados."
                  : "Aún no hay entregas para esta tarea."}
              </p>
              <Button
                variant="outline"
                onClick={() => navigate(`/tareas/${task.id}`)}
              >
                Volver a la Tarea
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grade Dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calificar Entrega</DialogTitle>
            <DialogDescription>
              Asigna una calificación a la entrega del alumno
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Calificación</Label>
              <Input
                id="grade"
                placeholder="Ej. 8.5 o A+"
                value={gradeValue}
                onChange={(e) => setGradeValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comments">Comentarios (opcional)</Label>
              <Textarea
                id="comments"
                placeholder="Añade comentarios sobre la entrega..."
                value={gradeComments}
                onChange={(e) => setGradeComments(e.target.value)}
              />
            </div>
            {currentSubmission?.archivoUrl && (
              <div className="pt-2">
                <Button asChild variant="outline" className="w-full">
                  <a
                    href={currentSubmission.archivoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Ver Archivo Entregado
                  </a>
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGrade} disabled={!gradeValue.trim()}>
              Guardar Calificación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TaskSubmissionsPage;