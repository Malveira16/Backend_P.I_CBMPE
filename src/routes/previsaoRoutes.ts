import { Router } from "express";
import { previsaoController } from "../controllers/previsaoController";

const router = Router();

router.get("/", previsaoController);

export default router;
