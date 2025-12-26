import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.ML_BASE_URL;

if (!BASE_URL) {
  throw new Error("A variável de ambiente ML_BASE_URL não está definida!");
}

export async function getPrevisao(
  municipio: string,
  dataInicio: string,
  dias = 7
) {
  try {
    const response = await axios.get(`${BASE_URL}/previsao`, {
      params: {
        municipio,
        data_inicio: dataInicio,
        dias,
      },
    });

    return response.data; // { municipio, previsoes: [...] }
  } catch (error) {
    console.error("Erro ao chamar microserviço de previsão:", error);
    throw error;
  }
}
