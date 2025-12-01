import { VitimaRepository } from "../repositories/Vitima.repository";
import { Vitima } from "../entities/Vitima";
import { ocorrenciaRepository } from "../repositories/Ocorrencia.repository";
import { LesaoRepository } from "../repositories/Lesao.repository";

export class VitimaService {

	// Cria uma vítima. `data` pode conter `ocorrenciaId` (opcional) para relacionar.
	async create(data: any) {
		// validações mínimas

		if (!data.nome) {
			throw new Error("campo 'nome' é obrigatório");
		}

		// ocorrência é obrigatória para criar vítima
		if (!data.ocorrenciaId) {
			throw new Error("campo 'ocorrenciaId' é obrigatório");
		}

		const ocorrencia = await ocorrenciaRepository.findOneBy({ id: data.ocorrenciaId });
		if (!ocorrencia) throw new Error("Ocorrência não encontrada");

		const lesao = await LesaoRepository.findOneBy({ id: data.lesaoId });
		if (!lesao) throw new Error("Lesão não encontrada");

		const vitimaToSave: any = {
			cpfVitima: data.cpf_vitima || data.cpfVitima || null,
			nome: data.nome,
			idade: data.idade ?? null,
			sexo: data.sexo ?? null,
			tipoAtendimento: data.tipoAtendimento ?? null,
			observacoes: data.observacoes ?? null,
			etnia: data.etnia ?? null,
			destinoVitima: data.destinoVitima ?? null,
			ocorrencia,
            lesao
		};

		return await VitimaRepository.save(vitimaToSave);
	}

	// Retorna todas as vítimas
	async findAll() {
		return await VitimaRepository.find({ relations: ["ocorrencia"] });
	}

	// Retorna vítimas pela ocorrência (ocorrenciaId obrigatório)
	async findVitimasByOcorrenciaId(ocorrenciaId: number) {
		if (!ocorrenciaId) throw new Error("ocorrenciaId é obrigatório");
		return await VitimaRepository.find({
			where: { ocorrencia: { id: ocorrenciaId } as any },
			relations: ["ocorrencia"]
		});
	}

}




