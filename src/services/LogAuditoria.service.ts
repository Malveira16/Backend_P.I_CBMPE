import { LogAuditoria } from "../entities/LogAuditoria";
import { logAuditoriaRepository } from "../repositories/LogAuditoria.repository";

export class LogAuditoriaService {

    async getAllLogs(): Promise<LogAuditoria[]> {
        return await logAuditoriaRepository().find();
    }

    async getLogById(id: number): Promise<LogAuditoria | null> {
        return await logAuditoriaRepository().findOneBy({ id });
    }

    async getLogsByUserId(userId: number): Promise<LogAuditoria[]> {
        return await logAuditoriaRepository().findBy({ usuarioId: userId });
    }

    async createLog(logData: Partial<LogAuditoria>): Promise<LogAuditoria> {
        const newLog = logAuditoriaRepository().create(logData);
        return await logAuditoriaRepository().save(newLog);
    }

   

}