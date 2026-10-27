import express from "express";
import session from "express-session";
import cors from "cors";
import path from "path";
import taskRoutes from "./routes/task_routes.mjs";
import { syncSteamGames } from './services/importGamesSteam.mjs';

//INSTALAMOS PARA NODE npm install node-cache apicache

// ── AÑADIDO: importamos node-cache para caché en memoria del servidor ──────────
import NodeCache from "node-cache";

// ── AÑADIDO: instancia global de caché con TTL de 120 segundos ────────────────
// stdTTL: tiempo de vida de cada entrada (en segundos)
// checkperiod: cada cuántos segundos se eliminan entradas caducadas
export const cache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

const app = express();
const PORT = 60000;

app.use((req, res, next) => {
    console.log('Origin recibido:', req.headers.origin);
    next();
});

app.use(cors({
    origin: ["http://localhost:60001", "https://localhost", "http://192.168.50.119"],
    credentials: true
}));

app.use(session({
  secret: "gamestore_secret_key",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 horas
    sameSite: "lax"
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(path.resolve("."), "views"));

// ── MODIFICADO: se añaden opciones de caché HTTP a los archivos estáticos ─────
// maxAge: el navegador guarda los estáticos (CSS, JS, imágenes) durante 7 días
// etag: activa ETags para que el navegador valide si el archivo cambió (304)
// lastModified: envía cabecera Last-Modified para revalidación condicional
app.use(
  express.static(path.join(path.resolve("."), "public"), {
    maxAge: "7d",
    etag: true,
    lastModified: true,
  })
);

// ── AÑADIDO: middleware de caché en memoria para rutas GET ────────────────────
// Guarda la respuesta renderizada en NodeCache durante `ttl` segundos.
// En peticiones siguientes, devuelve la respuesta guardada sin ejecutar el controlador.
export function cacheMiddleware(ttl = 120) {
  return (req, res, next) => {
    if (req.method !== "GET") return next(); // solo cachea GET
    if (req.originalUrl.includes("/get-session")) return next(); // nunca cachear sesión
    if (req.originalUrl.includes("/favoritos")) return next(); // personal por usuario
    if (req.originalUrl.includes("/carrito-temp")) return next(); // personal por usuario

    const key = `__cache__${req.originalUrl}_${req.user?.sub || "guest"}`;
    const cached = cache.get(key);

    if (cached !== undefined) {
      console.log(`[CACHÉ HIT] ${req.originalUrl}`);
      return res.send(cached);
    }

    // Interceptamos res.send para guardar la respuesta antes de enviarla
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      if (res.statusCode === 200) {
        cache.set(key, body, ttl);
        console.log(`[CACHÉ SET] ${req.originalUrl} — TTL: ${ttl}s`);
      }
      return originalSend(body);
    };

    next();
  };
}

// ── AÑADIDO: función para invalidar entradas de caché por patrón ──────────────
// Se llama desde las rutas POST/PUT/DELETE cuando los datos cambian,
// para que la siguiente GET no devuelva datos obsoletos.
export function invalidateCache(pattern) {
  const keys = cache.keys().filter((k) => k.includes(pattern));
  keys.forEach((k) => cache.del(k));
  console.log(`[CACHÉ INVALIDADA] ${keys.length} entradas (${pattern})`);
}

// ── AÑADIDO: aplicamos el middleware de caché a todas las rutas ───────────────
app.use("/", cacheMiddleware(120), taskRoutes);

// ── AÑADIDO: endpoint de diagnóstico (solo en desarrollo) ─────────────────────
// Accesible en http://localhost:60001/__cache/stats
// Muestra las claves activas y estadísticas de hits/misses
if (process.env.NODE_ENV !== "production") {
  app.get("/__cache/stats", (req, res) => {
    res.json({
      keys: cache.keys(),
      stats: cache.getStats(),
    });
  });
}

app.listen(PORT, async () => {
  console.log("Servidor WEB escuchando en:", PORT);

  try {
    const RepoTask = (await import("./repositories/task_repository.mjs")).default;
    const juegos = await RepoTask.showCatalog();

    if (juegos.length === 0) {
      console.log("Tabla games vacía, importando juegos desde Steam...");
      await syncSteamGames();
      console.log("✅ Juegos importados correctamente");
    } else {
      console.log(`✅ Catálogo ya tiene ${juegos.length} juegos, omitiendo importación`);
    }
  } catch (err) {
    console.error("❌ Error al importar juegos al arrancar:", err.message);
  }
});

export default app;
