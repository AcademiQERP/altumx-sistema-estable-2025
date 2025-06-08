import { useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useRoute, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Task, InsertTaskSubmission } from "@shared/schema";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Icons
import {
  Home,
  FileText,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  ExternalLink,
  Upload,
  Loader2,
  BookOpen,
  Users,
  User,
  FileUp,
} from "lucide-react";

function TaskDetailPage() {
  const [matched, params] = useRoute("/tareas/:id");
  const taskId = matched ? parseInt(params.id) : null;
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const { user } = useAuth();
  const { toast } = useToast();
  const isStudent = user?.rol === "alumno";
  const isTeacher = user?.rol === "docente";
  const isAdmin = user?.rol === "admin";
  const isParent = user?.rol === "padre";

  // Fetch task details
  const {
    data: task,
    isLoading: taskLoading,
    error: taskError,
  } = useQuery<Task>({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: !!taskId,
  });

  // Fetch group details
  const { data: group } = useQuery({
    queryKey: [`/api/groups/${task?.grupoId}`],
    enabled: !!task?.grupoId,
  });

  // Fetch subject details
  const { data: subject } = useQuery({
    queryKey: [`/api/subjects/${task?.materiaId}`],
    enabled: !!task?.materiaId,
  });

  // Fetch teacher details
  const { data: teacher } = useQuery({
    queryKey: [`/api/teachers/${task?.profesorId}`],
    enabled: !!task?.profesorId,
  });

  // Fetch submissions by student
  const { data: mySubmissions, isLoading: submissionsLoading } = useQuery({
    queryKey: [`/api/task-submissions/student/${user?.id}`, taskId],
    enabled: !!user?.id && isStudent && !!taskId,
  });

  // For parents, fetch children information
  const { data: childrenRelations } = useQuery({
    queryKey: [`/api/parent-student-relations/parent/${user?.id}`],
    enabled: !!user?.id && isParent,
  });

  // Create submission mutation
  const submitTaskMutation = useMutation({
    mutationFn: async (submissionData: InsertTaskSubmission) => {
      const response = await apiRequest("POST", "/api/task-submissions", submissionData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/task-submissions/student/${user?.id}`, taskId] });
      toast({
        title: "Entrega enviada",
        description: "Tu entrega ha sido enviada exitosamente.",
      });
      setUploadStatus("success");
      setFile(null);
    },
    onError: (error) => {
      console.error("Error submitting task:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar la entrega. Por favor intenta de nuevo.",
        variant: "destructive",
      });
      setUploadStatus("error");
    },
  });

  // File upload handling
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  // Handle task submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!task || !user?.id) return;
    
    const comments = (event.currentTarget.elements.namedItem("comments") as HTMLTextAreaElement)?.value || null;
    
    setUploadStatus("uploading");
    
    // In a real application, you'd upload the file to a storage service
    // and then set the URL to the file location
    let fileUrl = null;
    
    if (file) {
      try {
        // Simulate file upload with a delay
        await new Promise((resolve) => setTimeout(resolve, 1500));
        fileUrl = `https://storage.example.com/submissions/${Date.now()}-${file.name}`;
      } catch (error) {
        console.error("Error uploading file:", error);
        setUploadStatus("error");
        toast({
          title: "Error",
          description: "No se pudo subir el archivo. Por favor intenta de nuevo.",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Create the submission
    const submissionData: InsertTaskSubmission = {
      tareaId: task.id,
      alumnoId: Number(user.id),
      estado: "entregada",
      fechaEntrega: new Date(),
      archivoUrl: fileUrl,
      comentarios: comments,
      calificacion: null,
    };
    
    submitTaskMutation.mutate(submissionData);
  };

  // Format date
  const formatDate = useCallback((dateString: string | Date) => {
    const date = new Date(dateString);
    return format(date, "PPP", { locale: es });
  }, []);

  // Check if task is late
  const isTaskLate = useCallback(() => {
    if (!task) return false;
    return new Date(task.fechaEntrega) < new Date();
  }, [task]);

  // Check if student has already submitted
  const hasSubmitted = useCallback(() => {
    if (!mySubmissions || !Array.isArray(mySubmissions)) return false;
    return mySubmissions.length > 0;
  }, [mySubmissions]);

  // Error state
  if (taskError) {
    return (
      <div className="p-4 md:p-8">
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No se pudo cargar la información de la tarea. Por favor intenta de nuevo.</p>
            <Button className="mt-4" onClick={() => navigate("/tareas")}>
              Volver a Tareas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (taskLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando detalles de la tarea...</p>
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
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{task.titulo}</CardTitle>
                  <CardDescription className="mt-2">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{subject?.nombre || "Materia no especificada"}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <Users className="h-4 w-4" />
                      <span>{group?.nombre || "Grupo no especificado"}</span>
                    </div>
                  </CardDescription>
                </div>
                <Badge
                  className={`${
                    task.estado === "activo"
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : task.estado === "completada"
                      ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                      : "bg-red-100 text-red-800 hover:bg-red-100"
                  }`}
                >
                  {task.estado === "activo" ? (
                    <Clock className="mr-1 h-3 w-3" />
                  ) : task.estado === "completada" ? (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  ) : (
                    <XCircle className="mr-1 h-3 w-3" />
                  )}
                  {task.estado === "activo"
                    ? "Activa"
                    : task.estado === "completada"
                    ? "Completada"
                    : "Vencida"}
                </Badge>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold mb-2">Instrucciones</h3>
                <div className="whitespace-pre-line">{task.instrucciones}</div>
              </div>

              {(task.archivoUrl || task.enlaceUrl) && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Recursos</h3>
                  <div className="space-y-2">
                    {task.archivoUrl && (
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={task.archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar archivo
                          </a>
                        </Button>
                      </div>
                    )}
                    {task.enlaceUrl && (
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={task.enlaceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver recurso en línea
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isStudent && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Mi Entrega</h3>
                  {submissionsLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Cargando entregas...</span>
                    </div>
                  ) : hasSubmitted() ? (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex items-center mb-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                        <span className="font-medium text-green-800">
                          Ya has entregado esta tarea
                        </span>
                      </div>
                      {Array.isArray(mySubmissions) && mySubmissions.map((submission) => (
                        <div key={submission.id} className="space-y-2 text-sm">
                          <p className="text-gray-600">
                            <strong>Fecha de entrega:</strong>{" "}
                            {formatDate(submission.fechaEntrega)}
                          </p>
                          {submission.archivoUrl && (
                            <div>
                              <a
                                href={submission.archivoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Ver mi archivo
                              </a>
                            </div>
                          )}
                          {submission.comentarios && (
                            <div>
                              <p className="font-medium">Mis comentarios:</p>
                              <p className="text-gray-600">
                                {submission.comentarios}
                              </p>
                            </div>
                          )}
                          {submission.calificacion && (
                            <div className="mt-2">
                              <p className="font-medium">Calificación:</p>
                              <p className="text-lg font-bold text-blue-700">
                                {submission.calificacion}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">
                          Enviar mi entrega
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="file">Archivo (opcional)</Label>
                            <Input
                              id="file"
                              type="file"
                              onChange={handleFileChange}
                              disabled={uploadStatus === "uploading"}
                            />
                            {file && (
                              <p className="text-sm text-muted-foreground">
                                Archivo seleccionado: {file.name}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="comments">
                              Comentarios (opcional)
                            </Label>
                            <Textarea
                              id="comments"
                              placeholder="Añade comentarios o notas sobre tu entrega..."
                              disabled={uploadStatus === "uploading"}
                            />
                          </div>

                          <div className="flex justify-end">
                            <Button
                              type="submit"
                              disabled={
                                uploadStatus === "uploading" || isTaskLate()
                              }
                              className={isTaskLate() ? "bg-gray-400" : ""}
                            >
                              {uploadStatus === "uploading" && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              {isTaskLate() ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Entrega vencida
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 h-4 w-4" />
                                  Enviar entrega
                                </>
                              )}
                            </Button>
                          </div>

                          {isTaskLate() && (
                            <p className="text-sm text-red-500">
                              La fecha límite de entrega ha pasado.
                            </p>
                          )}
                        </form>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* For teachers, show link to submissions page */}
              {(isTeacher || isAdmin) && user?.id === task.profesorId && (
                <div className="mt-8">
                  <Button asChild>
                    <Link href={`/tareas/entregas/${task.id}`}>
                      <FileUp className="mr-2 h-4 w-4" />
                      Ver Entregas
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Detalles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Fecha de Creación
                  </h4>
                  <p className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    {formatDate(task.fechaCreacion)}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Fecha de Entrega
                  </h4>
                  <p className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    {formatDate(task.fechaEntrega)}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Profesor
                  </h4>
                  <p className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    {teacher?.nombreCompleto || "No especificado"}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Estado
                  </h4>
                  <div
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.estado === "activo"
                        ? "bg-green-100 text-green-800"
                        : task.estado === "completada"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {task.estado === "activo" ? (
                      <>
                        <Clock className="mr-1 h-3 w-3" /> Activa
                      </>
                    ) : task.estado === "completada" ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Completada
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" /> Vencida
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Tiempo Restante
                  </h4>
                  <p
                    className={
                      isTaskLate() ? "text-red-500 font-medium" : "text-green-600"
                    }
                  >
                    {isTaskLate()
                      ? "Plazo vencido"
                      : "Aún hay tiempo para entregar"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailPage;