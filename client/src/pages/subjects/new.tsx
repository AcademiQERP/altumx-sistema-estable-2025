import { Link } from "wouter";
import { BookOpen } from "lucide-react";
import SubjectForm from "@/components/subjects/SubjectForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewSubject() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Crear Nueva Materia</h1>
        <div className="flex items-center text-sm">
          <Link href="/">
            <a className="text-primary">Inicio</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href="/materias">
            <a className="text-primary">Materias</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>Nueva</span>
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
          <SubjectForm />
        </CardContent>
      </Card>
    </>
  );
}
