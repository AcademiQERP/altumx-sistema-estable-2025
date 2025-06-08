import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { BookOpen, ArrowLeft } from "lucide-react";
import { type Subject } from "@shared/schema";
import SubjectForm from "@/components/subjects/SubjectForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditSubject() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  // Obtener datos de la materia
  const { data: subject, isLoading, isError } = useQuery<Subject>({
    queryKey: [`/api/subjects/${id}`],
    enabled: !!id,
  });

  if (isError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          <p className="font-medium">Error al cargar la materia</p>
          <p className="text-sm">No se pudo obtener la información. Intente nuevamente más tarde.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/materias")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Materias
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Editar Materia</h1>
        <div className="flex items-center text-sm">
          <Link href="/">
            <span className="text-primary cursor-pointer">Inicio</span>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href="/materias">
            <span className="text-primary cursor-pointer">Materias</span>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>Editar</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Datos de la Materia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          ) : (
            subject && <SubjectForm initialData={subject} isEditing={true} />
          )}
        </CardContent>
      </Card>
    </>
  );
}