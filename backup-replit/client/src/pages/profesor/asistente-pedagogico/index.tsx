import { useState } from "react";
import { Helmet } from "react-helmet";
import { useLocation, Link } from "wouter";
import { 
  BookOpen, 
  NotebookPen, 
  Sparkles, 
  FileText, 
  ClipboardList, 
  BarChart,
  Lightbulb 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { WelcomeCard } from "@/components/assistant/WelcomeCard";
import { Button } from "@/components/ui/button";

export default function AsistentePedagogicoPage() {
  const [location, setLocation] = useLocation();

  return (
    <div className="container py-6 space-y-6">
      <Helmet>
        <title>Asistente Pedagógico IA | Altum Educación</title>
      </Helmet>

      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">📘 Asistente Pedagógico IA</h1>
        <p className="text-muted-foreground">
          Utiliza inteligencia artificial para mejorar la experiencia educativa y dar seguimiento personalizado al grupo.
        </p>
      </div>

      <WelcomeCard id="asistente-pedagogico" title="Asistente Pedagógico IA">
        <div className="prose prose-sm">
          <p className="mb-4">
            Este módulo integra todas las herramientas que necesitas para mejorar el aprendizaje 
            de tu grupo de forma personalizada, utilizando el poder de la inteligencia artificial.
          </p>

          <div className="space-y-2">
            <h4 className="text-base font-medium text-emerald-700">🧠 Diagnóstico Grupal</h4>
            <p>
              Explora recomendaciones pedagógicas generadas por IA y accede a planes de 
              recuperación adaptados a las necesidades de tu grupo.
            </p>

            <h4 className="text-base font-medium text-blue-700">👤 Seguimiento Individual</h4>
            <p>
              Evalúa el progreso de cada estudiante, genera observaciones automatizadas 
              y crea informes de apoyo personalizados.
            </p>
          </div>

          <p className="mt-4">
            Todo en un solo lugar, con flujos guiados, claros y enfocados en facilitar tu labor docente.
          </p>
        </div>
      </WelcomeCard>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Sección: Diagnóstico Grupal */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-medium text-emerald-700">
              <BookOpen className="h-5 w-5" />
              Diagnóstico Grupal
            </CardTitle>
            <CardDescription>
              Análisis académico grupal y recomendaciones pedagógicas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Link href="/profesor/recomendaciones">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Sparkles className="h-4 w-4" />
                  Ver Recomendaciones
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground px-2">
                Explora estrategias pedagógicas personalizadas para mejorar el rendimiento grupal
              </p>
            </div>

            <div className="space-y-2">
              <Link href="/profesor/plan-recuperacion">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  Ver Plan de Recuperación
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground px-2">
                Visualiza planes de recuperación académica para estudiantes con bajo rendimiento
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sección: Seguimiento Individual */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-medium text-blue-700">
              <NotebookPen className="h-5 w-5" />
              Seguimiento Individual
            </CardTitle>
            <CardDescription>
              Observaciones y seguimiento personalizado por alumno
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Link href="/profesor/observaciones/seguimiento-grupo">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Seguimiento Grupal
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground px-2">
                Panel de monitoreo de alumnos, evaluaciones y generación de reportes
              </p>
            </div>

            <div className="space-y-2">
              <Link href="/profesor/observaciones">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  Ver Observaciones
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground px-2">
                Administra y consulta las observaciones académicas generadas
              </p>
            </div>

            <div className="space-y-2">
              <Link href="/profesor/observaciones/nueva">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Generar Observación
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground px-2">
                Genera observaciones académicas personalizadas utilizando IA
              </p>
            </div>

            <div className="space-y-2">
              <Link href="/profesor/observaciones/estadisticas">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <BarChart className="h-4 w-4" />
                  Estadísticas
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground px-2">
                Visualiza métricas y tendencias de las observaciones generadas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}