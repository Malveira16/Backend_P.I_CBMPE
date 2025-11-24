import express from "express";
import { userRoutes } from "./routes/User.routes";
import cors from "cors";
import { auditMiddleware } from "./middleware/audit.middleware";

export const app = express();

// 1. CORS primeiro
app.use(cors(
  { origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"] }
));

// 2. Middleware de auditoria (antes de parsear o body)
app.use(auditMiddleware);

// 3. Parser de JSON
app.use(express.json());

// 4. Rotas
app.use("/users", userRoutes);

app.post("/teste", (req, res) => {
  console.log("📩 Body recebido em /teste:", req.body);
  res.json({ recebido: req.body });
});

