import { Request, Response } from "express";
import { getPrevisao } from "../services/previsaoService";

export async function previsaoController(req: Request, res: Response) {
  const { municipio, data_inicio, dias } = req.query;

  if (!municipio || !data_inicio) {
    return res.status(400).json({
      error: "Parâmetros municipio e data_inicio são obrigatórios",
    });
  }

  try {
    const resultado = await getPrevisao(
      municipio as string,
      data_inicio as string,
      dias ? Number(dias) : 7
    );

    return res.json(resultado);
  } catch (error) {
    console.error("[PREVISAO]", error);
    return res.status(500).json({
      error: "Erro ao consultar microserviço de previsão",
    });
  }
}
