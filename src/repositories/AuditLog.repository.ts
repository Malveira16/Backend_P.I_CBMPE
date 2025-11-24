import { AppDataSource } from "../config/data-source";
import { AuditLog } from "../entities/AuditLog";

// Repository do TypeORM para AuditLog
// Exemplo de uso: auditLogRepository.find({ where: { actor_user_id: 'CBMPE00001' } })
export const auditLogRepository = AppDataSource.getRepository(AuditLog);