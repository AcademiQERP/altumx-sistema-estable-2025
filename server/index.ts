import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
// Importamos la función predictRiskWithAI para crear un endpoint no protegido para pruebas
import { predictRiskWithAI, simulatePrediction, RiskPredictionInput } from "./services/ai-risk-prediction";
// Importamos las rutas temporales usando importación dinámica
import * as temporaryRoutesModule from "./temp-routes";
// Importamos los cron jobs
import { initializeCronJobs, stopAllCronJobs } from "./cron";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(process.cwd(), 'public')));

// Ruta específica para servir archivos PDF de recibos
app.use('/recibos', express.static(path.join(process.cwd(), 'public', 'recibos')));

// Ruta específica para servir archivos PDF de informes académicos
app.use('/informes', express.static(path.join(process.cwd(), 'public', 'informes')));

// Log para archivos solicitados en las carpetas de PDFs
app.use('/recibos', (req, res, next) => {
  console.log(`📄 Solicitando archivo de recibo: ${req.path}`);
  next();
});

app.use('/informes', (req, res, next) => {
  console.log(`📊 Solicitando archivo de informe académico: ${req.path}`);
  next();
});

// Configuración de variables de entorno para servicios
// Establecer el remitente por defecto para todos los servicios de correo - debe coincidir con una identidad de remitente verificada en SendGrid
if (!process.env.SENDGRID_SENDER) {
  process.env.SENDGRID_SENDER = 'noreply@sendgrid.net'; // Dominio verificado por defecto
  console.log('Configurando remitente de correo por defecto:', process.env.SENDGRID_SENDER);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Endpoint temporal para regenerar recibos con QR codes
app.post('/regenerate-receipts', async (req, res) => {
  try {
    const { receiptGenerator } = await import('./services/receipt-generator.js');
    const { storage } = await import('./storage.js');
    
    const paymentIds = req.body.paymentIds || [8, 15];
    const results = [];
    
    for (const paymentId of paymentIds) {
      try {
        const payment = await storage.getPayment(paymentId);
        if (payment) {
          const pdfUrl = await receiptGenerator.generateReceipt(payment);
          await storage.updatePayment(paymentId, { pdfUrl });
          results.push({ paymentId, success: true, pdfUrl });
        } else {
          results.push({ paymentId, success: false, error: 'Payment not found' });
        }
      } catch (error) {
        results.push({ paymentId, success: false, error: error.message });
      }
    }
    
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint no protegido para pruebas de predicción IA
app.post('/test-ai-predict', async (req, res) => {
  try {
    const predictionData = req.body;
    
    // Verificamos si tenemos el prompt estructurado
    const hasStructuredPrompt = predictionData.structured_prompt && typeof predictionData.structured_prompt === 'string';
    
    // Verificamos si tenemos la API key configurada
    const useRealAI = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 10;
    
    // Realizamos la predicción
    let result;
    if (useRealAI) {
      console.log("Usando Claude AI para predicción de riesgo");
      if (hasStructuredPrompt) {
        // Si tenemos un prompt estructurado, usamos ese formato
        result = await predictRiskWithAI({
          ...predictionData,
          // Pasamos el prompt estructurado como propiedad adicional
          structured_prompt: predictionData.structured_prompt
        });
      } else {
        // Si no, usamos el formato anterior
        result = await predictRiskWithAI(predictionData);
      }
    } else {
      console.log("Usando simulación para predicción de riesgo (ANTHROPIC_API_KEY no configurada)");
      result = simulatePrediction(predictionData);
    }
    
    // Devolvemos el resultado
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error en la predicción de riesgo:", error);
    return res.status(500).json({
      error: "Error al procesar la predicción",
      message: error.message,
    });
  }
});

(async () => {
  // Registrar primero las rutas temporales
  temporaryRoutesModule.default(app);
  
  // Luego registrar las rutas normales
  const server = await registerRoutes(app);

  // Ruta base para confirmar que el servidor está activo
app.get("/", (_req, res) => {
  res.send("✅ AcademiQ ERP está corriendo correctamente.");
});
feat: Ruta raíz `/` agregada para evitar error 404 en Railway
  
  // Middleware para manejar rutas API inexistentes y responder con JSON en lugar de HTML
  app.use('/api/*', (req: Request, res: Response) => {
    console.log(`[404] Ruta API no encontrada: ${req.originalUrl}`);
    return res.status(404).json({ error: 'Ruta API no encontrada', path: req.originalUrl });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Inicializar los trabajos cron al arrancar el servidor
    try {
      log('Inicializando trabajos cron...');
      initializeCronJobs();
      log('Trabajos cron inicializados correctamente');
    } catch (cronError) {
      log(`Error al inicializar trabajos cron: ${cronError instanceof Error ? cronError.message : String(cronError)}`);
    }
  });
  
  // Manejar el cierre del servidor para detener los cron jobs
  process.on('SIGINT', () => {
    log('Deteniendo trabajos cron antes de cerrar el servidor...');
    stopAllCronJobs();
    process.exit(0);
  });
})();
