import { Link } from "wouter";
import { Users } from "lucide-react";
import GroupForm from "@/components/groups/GroupForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewGroup() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Crear Nuevo Grupo</h1>
        <div className="flex items-center text-sm">
          <Link href="/">
            <a className="text-primary">Inicio</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href="/grupos">
            <a className="text-primary">Grupos</a>
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span>Nuevo</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Datos del Grupo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GroupForm />
        </CardContent>
      </Card>
    </>
  );
}
