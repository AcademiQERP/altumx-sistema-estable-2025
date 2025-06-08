import { useAuth, LoginData, RegisterData } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

function AuthHero() {
  return (
    <div className="hidden lg:flex flex-col justify-center items-center bg-muted h-full p-10 text-center">
      <div className="space-y-6 max-w-md">
        <div className="flex flex-col items-center">
          <div className="text-2xl text-primary mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-14 h-14">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0 0H9m3 0h3" />
            </svg>
          </div>
          <div className="text-2xl font-semibold leading-tight tracking-tight text-gray-900">
            Academi<span className="font-bold text-primary">Q</span>
          </div>
          <div className="text-sm text-gray-500 -mt-1">
            La nueva inteligencia en educación
          </div>
        </div>
        <p className="text-lg">
          Sistema integral para la gestión educativa en instituciones mexicanas.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-card p-4 rounded-lg shadow">
            <h3 className="font-medium">Gestión Académica</h3>
            <p className="text-sm text-muted-foreground">
              Administra estudiantes, grupos, materias y calificaciones.
            </p>
          </div>
          <div className="bg-card p-4 rounded-lg shadow">
            <h3 className="font-medium">Control Financiero</h3>
            <p className="text-sm text-muted-foreground">
              Gestiona pagos, adeudos y conceptos de pago fácilmente.
            </p>
          </div>
          <div className="bg-card p-4 rounded-lg shadow">
            <h3 className="font-medium">Acceso Multinivel</h3>
            <p className="text-sm text-muted-foreground">
              Diferentes roles para administradores, docentes, padres y alumnos.
            </p>
          </div>
          <div className="bg-card p-4 rounded-lg shadow">
            <h3 className="font-medium">Reportes Completos</h3>
            <p className="text-sm text-muted-foreground">
              Genera reportes académicos y estados de cuenta actualizados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { loginMutation } = useAuth();
  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      correo: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="correo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <Input
                  placeholder="correo@ejemplo.com"
                  {...field}
                  disabled={loginMutation.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...field}
                  disabled={loginMutation.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ingresando...
            </>
          ) : (
            "Iniciar sesión"
          )}
        </Button>
      </form>
    </Form>
  );
}

function RegisterForm() {
  const { registerMutation } = useAuth();
  const registerSchema = loginSchema.extend({
    nombreCompleto: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    rol: z.enum(["admin", "docente", "padre", "alumno"]),
  });

  const form = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      correo: "",
      password: "",
      nombreCompleto: "",
      rol: "alumno",
    },
  });

  const onSubmit = (data: RegisterData) => {
    registerMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombreCompleto"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input
                  placeholder="Juan Pérez Rodríguez"
                  {...field}
                  disabled={registerMutation.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="correo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <Input
                  placeholder="correo@ejemplo.com"
                  {...field}
                  disabled={registerMutation.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  {...field}
                  disabled={registerMutation.isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={registerMutation.isPending}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="docente">Docente</SelectItem>
                  <SelectItem value="padre">Padre/Tutor</SelectItem>
                  <SelectItem value="alumno">Alumno</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            "Registrarse"
          )}
        </Button>
      </form>
    </Form>
  );
}

export default function AuthPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<string>("login");
  const [authError, setAuthError] = useState<string | null>(null);

  // Comprobar si hay un mensaje de error de autenticación en los parámetros de URL
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const error = queryParams.get('error');
    if (error) {
      setAuthError(decodeURIComponent(error));
    }
  }, []);

  // Redirigir si el usuario ya está autenticado
  useEffect(() => {
    if (user) {
      // Comprobar si hay una ruta guardada para redirigir después del login
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      
      if (redirectPath) {
        // Limpiar el storage para futuras sesiones
        sessionStorage.removeItem('redirectAfterLogin');
        // Redirigir a la ruta guardada
        navigate(redirectPath);
      } else {
        // Si no hay ruta guardada, redirigir según el rol
        if (user.rol === "padre") {
          navigate("/portal-padres");
        } else {
          navigate("/");
        }
      }
    }
  }, [user, navigate]);

  return (
    <div className="grid lg:grid-cols-2 h-screen">
      <AuthHero />
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>AcademiQ</CardTitle>
            <CardDescription>
              Accede al sistema de gestión educativa para escuelas mexicanas
            </CardDescription>
          </CardHeader>
          {authError && (
            <div className="mb-4 p-3 bg-destructive/15 text-destructive rounded-md text-sm">
              <p className="font-medium">Error de autenticación</p>
              <p>{authError}</p>
            </div>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>
            <CardContent className="pt-6">
              <TabsContent value="login">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </CardContent>
          </Tabs>
          <CardFooter className="flex flex-col items-center justify-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} AcademiQ. Todos los derechos reservados.</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}