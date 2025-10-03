import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ReportesPage = () => {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Reportes</h1>
        <p className="mt-1 text-muted-foreground">
          Visualiza y exporta los reportes de tu negocio.
        </p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Página de Reportes</CardTitle>
        </CardHeader>
        <CardContent>
          <p>El contenido para la página de reportes se implementará aquí.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportesPage;
