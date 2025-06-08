import React, { Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/error/ErrorBoundary";

import AppShell from "@/components/layout/AppShell";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
// Importaremos el dashboard del profesor de forma dinámica con React.lazy
import AuthPage from "@/pages/auth-page";
import ParentPortal from "@/pages/parent-portal";
import ParentPortalPayments from "@/pages/parent-portal/payments";
import HistorialPagosPage from "@/pages/parent-portal/historial-pagos";
import ParentBoletas from "@/pages/parent-portal/boletas";
import ParentBoleta from "@/pages/parent-portal/boleta";
import ReportsPage from "@/pages/reports";
import Comunicados from "@/pages/comunicados";
import ComunicacionPage from "@/pages/comunicacion";
import TestRemindersPage from "@/pages/admin/test-reminders";
import RiskClassificationPage from "@/pages/risk-classification";
import HistoricalRiskPanel from "@/pages/risk-history";

// Estudiantes
import StudentsList from "@/pages/students/index";
import NewStudent from "@/pages/students/new";
import EditStudent from "@/pages/students/edit";

// Grupos
import GroupsList from "@/pages/groups/index";
import NewGroup from "@/pages/groups/new";

// Materias
import SubjectsList from "@/pages/subjects/index";
import NewSubject from "@/pages/subjects/new";

// Profesores
import ProfesoresList from "@/pages/profesores/index";
import NewTeacher from "@/pages/profesores/nuevo";
// La página de horario del profesor se cargará de forma lazy

// Asignaciones
import AssignmentsList from "@/pages/assignments/index";
import NewAssignment from "@/pages/assignments/new";

// Calificaciones
import GradesList from "@/pages/grades/index";
import NewGrade from "@/pages/grades/new";

// Asistencias
import AttendanceList from "@/pages/attendance/index";
import NewAttendance from "@/pages/attendance/new";

// Boletas
import ReportCardsList from "@/pages/report-cards/index";
import ReportCardDetail from "@/pages/report-cards/[id]";

// Módulo de Pagos
import PaymentConceptsList from "@/pages/payment-concepts/index";
import NewPaymentConcept from "@/pages/payment-concepts/new";
import EditPaymentConcept from "@/pages/payment-concepts/edit/[id]";
import DebtsList from "@/pages/debts/index";
import NewDebt from "@/pages/debts/new";
import EditDebt from "@/pages/debts/[id]/edit";
import PaymentsList from "@/pages/payments/index";
import NewPayment from "@/pages/payments/new";
import PaymentHistory from "@/pages/payments/history";
import AccountStatement from "@/pages/account-statement/index";

// Dashboard de Finanzas
import FinancesDashboard from "@/pages/finanzas/dashboard";

// Dashboard Académico
import AcademicDashboard from "@/pages/academico/dashboard";

// Módulo de Tareas
import TasksList from "@/pages/tasks/index";
import NewTask from "@/pages/tasks/nueva";
import TaskDetail from "@/pages/tasks/[id]";
import TaskSubmissions from "@/pages/tasks/submissions";

function Router() {
  return (
    <Switch>
      {/* Ruta pública de autenticación */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Rutas públicas de prueba de autenticación */}
      <Route path="/test-auth" component={() => {
        const TestAuth = React.lazy(() => import("@/pages/test-auth"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando prueba de autenticación...</div>}>
            <TestAuth />
          </Suspense>
        );
      }} />
      <Route path="/auth-test" component={() => {
        const AuthTestPage = React.lazy(() => import("@/pages/auth-test-page"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando diagnóstico de autenticación...</div>}>
            <AuthTestPage />
          </Suspense>
        );
      }} />
      <Route path="/auth-debug" component={() => {
        const AuthDebugPage = React.lazy(() => import("@/pages/auth-debug"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando herramienta de depuración...</div>}>
            <AuthDebugPage />
          </Suspense>
        );
      }} />
      
      {/* Ruta pública para informe de padres */}
      <Route path="/informe/:id" component={() => {
        const InformeWeb = React.lazy(() => import("@/pages/informe/id"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            <p className="ml-2">Cargando informe académico...</p>
          </div>}>
            <InformeWeb />
          </Suspense>
        );
      }} />
      
      <Route path="/debug-criteria" component={() => {
        const DebugCriteriaPage = React.lazy(() => import("@/pages/debug-criteria"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando herramienta de depuración de criterios...</div>}>
            <DebugCriteriaPage />
          </Suspense>
        );
      }} />
      
      {/* Rutas protegidas - Dashboard específico según el rol */}
      <ProtectedRoute path="/" component={(props) => {
        // El componente Dashboard verifica el rol del usuario y renderiza el dashboard correspondiente
        const { user } = props;
        console.log("Usuario autenticado:", user);
        console.log("Rol de usuario:", user?.rol);
        
        if (user?.rol === "docente") {
          console.log("Renderizando dashboard de docente");
          return (
            <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando dashboard del profesor...</div>}>
              {React.createElement(React.lazy(() => import("@/pages/teacher/dashboard")))}
            </Suspense>
          );
        }
        console.log("Renderizando dashboard general");
        return <Dashboard />;
      }} />

      {/* Dashboard para docentes explícito */}
      <ProtectedRoute path="/docente" roles={["docente"]} component={() => {
        const TeacherDashboard = React.lazy(() => import("@/pages/teacher/dashboard"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando dashboard del profesor...</div>}>
            <TeacherDashboard />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/dashboard-profesor" roles={["docente"]} component={() => {
        const TeacherDashboard = React.lazy(() => import("@/pages/teacher/dashboard"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando dashboard del profesor...</div>}>
            <TeacherDashboard />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/dashboard-docente" roles={["docente"]} component={() => {
        const TeacherDashboard = React.lazy(() => import("@/pages/teacher/dashboard"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando dashboard del profesor...</div>}>
            <TeacherDashboard />
          </Suspense>
        );
      }} />
      
      {/* Rutas de Estudiantes */}
      <ProtectedRoute path="/estudiantes" component={StudentsList} />
      <ProtectedRoute path="/estudiantes/nuevo" component={NewStudent} />
      <ProtectedRoute path="/estudiantes/:id/editar" component={() => {
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando formulario de edición...</div>}>
            <EditStudent />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/estudiantes/:id" component={() => {
        const StudentDetail = React.lazy(() => import("@/pages/students/[id]"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando detalle del estudiante...</div>}>
            <StudentDetail />
          </Suspense>
        );
      }} />
      
      {/* Rutas de Grupos */}
      <ProtectedRoute path="/grupos" component={GroupsList} />
      <ProtectedRoute path="/grupos/nuevo" component={NewGroup} />
      <ProtectedRoute path="/grupos/:id/editar" component={() => {
        const EditGroup = React.lazy(() => import("@/pages/groups/edit"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <EditGroup />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/grupos/:id/horario" component={() => {
        const GroupSchedule = React.lazy(() => import("@/pages/groups/schedule"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando horario...</div>}>
            <GroupSchedule />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/grupos/:id/horario/visual" component={() => {
        const VisualSchedule = React.lazy(() => import("@/pages/groups/schedule-visual"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando vista semanal...</div>}>
            <VisualSchedule />
          </Suspense>
        );
      }} />
      
      {/* Rutas de Materias */}
      <ProtectedRoute path="/materias" component={SubjectsList} />
      <ProtectedRoute path="/materias/nueva" component={NewSubject} />
      <ProtectedRoute path="/materias/:id/editar" component={() => {
        const EditSubject = React.lazy(() => import("@/pages/subjects/edit"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <EditSubject />
          </Suspense>
        );
      }} />
      
      {/* Rutas de Profesores */}
      <ProtectedRoute path="/profesores" component={ProfesoresList} />
      <ProtectedRoute path="/profesores/nuevo" component={NewTeacher} />
      <ProtectedRoute path="/profesores/:id/editar" component={() => {
        const EditTeacher = React.lazy(() => import("@/pages/profesores/editar"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <EditTeacher />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/profesores/:id/grupos" component={() => {
        const TeacherGroups = React.lazy(() => import("@/pages/profesores/grupos-v2"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <TeacherGroups />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/profesores/:id/materias" component={() => {
        const TeacherSubjects = React.lazy(() => import("@/pages/profesores/materias"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <TeacherSubjects />
          </Suspense>
        );
      }} />
      
      {/* Ruta para el horario del profesor */}
      <ProtectedRoute path="/profesor/horario" component={() => {
        const TeacherSchedule = React.lazy(() => import("@/pages/profesor/horario"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando horario...</div>}>
            <TeacherSchedule />
          </Suspense>
        );
      }} />
      
      {/* Rutas para Asistente Pedagógico IA (Módulo Unificado) */}
      <ProtectedRoute path="/profesor/asistente-pedagogico" roles={["docente"]} component={() => {
        const AsistentePedagogico = React.lazy(() => import("@/pages/profesor/asistente-pedagogico"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando Asistente Pedagógico IA...</div>}>
            <AsistentePedagogico />
          </Suspense>
        );
      }} />

      {/* Rutas para Diagnóstico Grupal (antiguo Asistente Educativo IA) */}
      <ProtectedRoute path="/profesor/recomendaciones" roles={["docente"]} component={() => {
        const Recomendaciones = React.lazy(() => import("@/pages/teacher/recomendaciones"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando recomendaciones...</div>}>
            <Recomendaciones />
          </Suspense>
        );
      }} />
      
      <ProtectedRoute path="/profesor/plan-recuperacion" roles={["docente"]} component={() => {
        const PlanRecuperacion = React.lazy(() => import("@/pages/teacher/plan-recuperacion"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando plan de recuperación...</div>}>
            <PlanRecuperacion />
          </Suspense>
        );
      }} />
      
      {/* Rutas para Observaciones Académicas */}
      <ProtectedRoute path="/profesor/observaciones" roles={["docente"]} component={() => {
        const ObservacionesIndex = React.lazy(() => import("@/pages/profesor/observaciones/index"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando observaciones...</div>}>
            <ObservacionesIndex />
          </Suspense>
        );
      }} />
      
      <ProtectedRoute path="/profesor/observaciones/nueva" roles={["docente"]} component={() => {
        const NuevaObservacion = React.lazy(() => import("@/pages/profesor/observaciones/nueva"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando formulario...</div>}>
            <NuevaObservacion />
          </Suspense>
        );
      }} />
      
      <ProtectedRoute path="/profesor/observaciones/estadisticas" roles={["docente"]} component={() => {
        const ObservacionesEstadisticas = React.lazy(() => import("@/pages/profesor/observaciones/estadisticas"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando estadísticas...</div>}>
            <ObservacionesEstadisticas />
          </Suspense>
        );
      }} />
      
      <ProtectedRoute path="/profesor/observaciones/seguimiento-grupo" roles={["docente"]} component={() => {
        const SeguimientoGrupo = React.lazy(() => import("@/pages/profesor/observaciones/seguimiento-grupo-new"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando panel de seguimiento...</div>}>
            <SeguimientoGrupo />
          </Suspense>
        );
      }} />
      
      <ProtectedRoute path="/profesor/seguimiento/alumno/:id" roles={["docente"]} component={() => {
        const SeguimientoAlumno = React.lazy(() => import("@/pages/profesor/seguimiento/alumno/id"));
        return (
          <ErrorBoundary>
            <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando seguimiento individual...</div>}>
              <SeguimientoAlumno />
            </Suspense>
          </ErrorBoundary>
        );
      }} />
      
      <ProtectedRoute path="/profesor/observaciones/:id" roles={["docente"]} component={() => {
        const ObservacionDetalle = React.lazy(() => import("@/pages/profesor/observaciones/[id]"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando detalle...</div>}>
            <ObservacionDetalle />
          </Suspense>
        );
      }} />
      
      {/* Rutas de Asignaciones */}
      <ProtectedRoute path="/asignaciones" component={AssignmentsList} />
      <ProtectedRoute path="/asignaciones/nueva" component={NewAssignment} />
      
      {/* Rutas de Calificaciones - redirección a la nueva vista por criterio */}
      <ProtectedRoute path="/calificaciones" component={() => {
        // Redireccionar a la nueva vista de calificaciones por criterio
        const RedirectToGradesSelector = () => {
          const [, navigate] = useLocation();
          
          useEffect(() => {
            console.log("Redirigiendo de /calificaciones a /grades/selector");
            navigate("/grades/selector");
          }, [navigate]);
          
          return (
            <div className="flex justify-center items-center min-h-screen">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Redirigiendo al nuevo sistema de calificaciones por criterio...</p>
              </div>
            </div>
          );
        };
        
        return <RedirectToGradesSelector />;
      }} />
      <ProtectedRoute path="/calificaciones-admin" component={() => {
        const CalificacionesAdminPage = React.lazy(() => import("@/pages/calificaciones-admin/index"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando calificaciones...</div>}>
            <CalificacionesAdminPage />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/calificaciones/nueva" component={NewGrade} />
      
      {/* Importamos dinámicamente la vista de calificaciones por grupo y materia */}
      <ProtectedRoute path="/grades/group/:groupId/subject/:subjectId" component={() => {
        const GroupSubjectGrades = React.lazy(() => import("@/pages/grades/group/[groupId]/subject/[subjectId]"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando calificaciones...</div>}>
            <GroupSubjectGrades />
          </Suspense>
        );
      }} />

      {/* Rutas de Grades (equivalente en inglés) */}
      <ProtectedRoute path="/grades" component={GradesList} />
      <ProtectedRoute path="/grades/new" component={NewGrade} />
      {/* Selector de calificaciones por criterio */}
      <ProtectedRoute path="/grades/selector" component={() => {
        const GradesSelector = React.lazy(() => import("@/pages/grades/selector"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando selector de calificaciones...</div>}>
            <GradesSelector />
          </Suspense>
        );
      }} />
      
      {/* Rutas de Asistencias */}
      <ProtectedRoute path="/asistencias" component={AttendanceList} />
      <ProtectedRoute path="/asistencias/nueva" component={NewAttendance} />
      
      {/* Rutas de Boletas */}
      <ProtectedRoute path="/boletas" component={ReportCardsList} />
      <ProtectedRoute path="/boletas/:id" component={ReportCardDetail} />
      
      {/* Rutas de Report Cards (versión en inglés) */}
      <ProtectedRoute path="/report-cards" component={ReportCardsList} />
      <ProtectedRoute path="/report-cards/:id" component={ReportCardDetail} />
      
      {/* Rutas de Conceptos de Pago */}
      <ProtectedRoute path="/conceptos-pago" component={PaymentConceptsList} />
      <ProtectedRoute path="/conceptos-pago/nuevo" component={NewPaymentConcept} />
      
      {/* Nuevas rutas en inglés para Payment Concepts */}
      <ProtectedRoute path="/payment-concepts" component={PaymentConceptsList} />
      <ProtectedRoute path="/payment-concepts/new" component={NewPaymentConcept} />
      <ProtectedRoute path="/payment-concepts/edit/:id" component={EditPaymentConcept} />
      
      {/* Rutas de Adeudos */}
      <ProtectedRoute path="/adeudos" component={DebtsList} />
      <ProtectedRoute path="/adeudos/nuevo" component={NewDebt} />
      <ProtectedRoute path="/adeudos/:id/editar" component={EditDebt} />
      
      {/* Dashboard Principal de Finanzas */}
      <ProtectedRoute path="/finanzas/dashboard" roles={["admin", "coordinador"]} component={FinancesDashboard} />
      
      {/* Dashboard Académico */}
      <ProtectedRoute path="/academico/dashboard" roles={["admin", "coordinador", "docente"]} component={AcademicDashboard} />
      <ProtectedRoute path="/finanzas" roles={["admin", "coordinador"]} component={FinancesDashboard} />
      
      {/* Rutas de Pagos - versión en español (compatibilidad) */}
      <ProtectedRoute path="/pagos" component={PaymentsList} />
      <ProtectedRoute path="/pagos/nuevo" component={NewPayment} />
      <ProtectedRoute path="/pagos/:id/editar" component={NewPayment} />
      <ProtectedRoute path="/pagos/historial/:alumnoId" component={PaymentHistory} />
      
      {/* Rutas de Pagos - versión en inglés (estándar) */}
      <ProtectedRoute path="/payments" component={PaymentsList} />
      <ProtectedRoute path="/payments/new" component={NewPayment} />
      <ProtectedRoute path="/payments/:id/edit" component={NewPayment} />
      <ProtectedRoute path="/payments/history/:alumnoId" component={PaymentHistory} />
      
      {/* Rutas de Estado de Cuenta */}
      <ProtectedRoute path="/estado-cuenta" component={AccountStatement} />
      <ProtectedRoute path="/account-statement/:studentId" component={AccountStatement} />
      <ProtectedRoute path="/estado-cuenta/:studentId" component={AccountStatement} />
      
      {/* Clasificación de Riesgo */}
      <ProtectedRoute path="/risk-classification" component={RiskClassificationPage} />
      <ProtectedRoute path="/clasificacion-riesgo" component={RiskClassificationPage} />
      
      {/* Análisis Histórico de Riesgo */}
      <ProtectedRoute path="/risk-history" component={HistoricalRiskPanel} />
      <ProtectedRoute path="/historico-riesgo" component={HistoricalRiskPanel} />
      
      {/* Portal para Padres - Ruta principal */}
      <ProtectedRoute path="/portal-padres" component={ParentPortal} />
      
      {/* Portal para Padres - Secciones dedicadas */}
      <ProtectedRoute path="/portal-padres/dashboard" component={() => {
        const ParentDashboard = React.lazy(() => import("@/pages/parent-portal/dashboard"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando dashboard...</div>}>
            <ParentDashboard />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/portal-padres/asistencias" component={() => {
        const AsistenciasPage = React.lazy(() => import("@/pages/parent-portal/asistencias"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <AsistenciasPage />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/portal-padres/tareas" component={ParentPortal} />
      <ProtectedRoute path="/portal-padres/estado-cuenta" component={ParentPortal} />
      <ProtectedRoute path="/portal-padres/historial-pagos" component={HistorialPagosPage} />
      <ProtectedRoute path="/portal-padres/historial-academico" component={() => {
        const HistorialAcademico = React.lazy(() => import("@/pages/parent-portal/historial-academico"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando historial académico...</div>}>
            <HistorialAcademico />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/portal-padres/avisos" component={ParentPortal} />
      <ProtectedRoute path="/portal-padres/chatbot" component={ParentPortal} />

      {/* Nueva boleta académica */}
      <ProtectedRoute path="/portal-padres/boletas" component={ParentBoletas} />
      <ProtectedRoute path="/portal-padres/boletas/:studentId" component={ParentBoleta} />
      <ProtectedRoute path="/portal-padres/resumen-ia" component={() => {
        const ReporteIA = React.lazy(() => import("@/pages/parent-portal/reporte-ia"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <ReporteIA />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/portal-padres/agenda" component={() => {
        const AgendaSemanal = React.lazy(() => import("@/pages/parent-portal/agenda"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <AgendaSemanal />
          </Suspense>
        );
      }} />
      
      {/* Rutas de Portal en inglés (compatibilidad) */}
      <ProtectedRoute path="/parent-portal/:studentId" component={ParentPortal} />
      <ProtectedRoute path="/parent-portal/payments/:studentId" component={ParentPortalPayments} />
      <ProtectedRoute path="/parent-portal/payments/:studentId/:debtId" component={ParentPortalPayments} />
      
      {/* Reportes y Análisis */}
      <ProtectedRoute path="/reportes" component={ReportsPage} />
      
      {/* Herramientas de Administración */}
      <ProtectedRoute path="/admin/test-reminders" component={TestRemindersPage} />
      <ProtectedRoute path="/admin/recordatorios" component={() => {
        const RemindersDashboard = React.lazy(() => import("@/pages/admin/recordatorios"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <RemindersDashboard />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/admin/reportes-financieros" roles={["admin", "coordinador"]} component={() => {
        const ReportesFinancieros = React.lazy(() => import("@/pages/admin/reportes-financieros"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <ReportesFinancieros />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/admin/historial-ia" roles={["admin", "coordinador"]} component={() => {
        const HistorialIA = React.lazy(() => import("@/pages/admin/historial-ia"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <HistorialIA />
          </Suspense>
        );
      }} />
      
      <ProtectedRoute path="/admin/ia-recommendations/batch" roles={["admin"]} component={() => {
        const BatchIAViewer = React.lazy(() => import("@/pages/admin/BatchIAViewer"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando visor de lotes IA...</div>}>
            <BatchIAViewer />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/admin/ia-recommendations" roles={["admin"]} component={() => {
        const IARecommendations = React.lazy(() => import("@/pages/admin/ia-recommendations"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando recomendaciones IA...</div>}>
            <IARecommendations />
          </Suspense>
        );
      }} />
      
      {/* Phase 6: Role-based IA Recommendation Routes */}
      <ProtectedRoute path="/teacher/ia-recommendations" roles={["docente"]} component={() => {
        const TeacherIARecommendations = React.lazy(() => import("@/pages/teacher/ia-recommendations"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando recomendaciones IA...</div>}>
            <TeacherIARecommendations />
          </Suspense>
        );
      }} />
      
      <ProtectedRoute path="/parent/ia-recommendation" roles={["padre"]} component={() => {
        const ParentIARecommendation = React.lazy(() => import("@/pages/parent/ia-recommendation"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando recomendación IA...</div>}>
            <ParentIARecommendation />
          </Suspense>
        );
      }} />
      
      {/* Rutas de Simulación Segura - Solo para Administradores */}
      <ProtectedRoute path="/simulacion/profesor/:teacherId" roles={["admin"]} component={() => {
        const SimulatedTeacherPortal = React.lazy(() => import("@/pages/simulacion/profesor"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando vista simulada del profesor...</div>}>
            <SimulatedTeacherPortal />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/simulacion/padre/:parentId" roles={["admin"]} component={() => {
        const SimulatedParentPortal = React.lazy(() => import("@/pages/simulacion/padre"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando vista simulada del portal de padres...</div>}>
            <SimulatedParentPortal />
          </Suspense>
        );
      }} />

      {/* Comunicación */}
      <ProtectedRoute path="/comunicacion" component={ComunicacionPage} />
      <ProtectedRoute path="/comunicacion/mensajes" component={ComunicacionPage} />
      <ProtectedRoute path="/comunicacion/anuncios" component={ComunicacionPage} />
      <ProtectedRoute path="/comunicacion/notificaciones" component={ComunicacionPage} />
      <ProtectedRoute path="/comunicacion/calendario" component={ComunicacionPage} />
      <ProtectedRoute path="/comunicados" component={Comunicados} />
      
      {/* Tareas */}
      <ProtectedRoute path="/tareas" component={TasksList} />
      <ProtectedRoute path="/tareas/nueva" component={NewTask} />
      <ProtectedRoute path="/tareas/:id" component={TaskDetail} />
      <ProtectedRoute path="/tareas/entregas/:id" component={TaskSubmissions} />
      
      {/* Observaciones */}
      <ProtectedRoute path="/observaciones" roles={["admin", "docente"]} component={() => {
        const ObservacionesList = React.lazy(() => import("@/pages/observaciones/index"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <ObservacionesList />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/observaciones/nueva" roles={["admin", "docente"]} component={() => {
        const NuevaObservacion = React.lazy(() => import("@/pages/observaciones/nueva"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <NuevaObservacion />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/observaciones/:id" roles={["admin", "docente"]} component={() => {
        const ObservacionDetail = React.lazy(() => import("@/pages/observaciones/[id]"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <ObservacionDetail />
          </Suspense>
        );
      }} />
      <ProtectedRoute path="/observaciones/:id/editar" roles={["admin", "docente"]} component={() => {
        const EditarObservacion = React.lazy(() => import("@/pages/observaciones/[id]/editar"));
        return (
          <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
            <EditarObservacion />
          </Suspense>
        );
      }} />
      
      {/* Fallback a 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Remover importaciones duplicadas

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Componente separado para renderizar el contenido condicional con AppShell
function AppContent() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  
  // No necesitamos el AppShell en la página de autenticación
  const isAuthPage = location === "/auth";
  
  if (isAuthPage) {
    return <Router />;
  }
  
  return (
    <ErrorBoundary>
      <AppShell>
        <Router />
      </AppShell>
    </ErrorBoundary>
  );
}

export default App;
