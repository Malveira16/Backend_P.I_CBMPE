import { v4 as uuidv4 } from 'uuid';
import crypto from 'node:crypto';
import pino from 'pino';
import { AppDataSource } from '../config/data-source';
import { AuditLog } from '../entities/AuditLog';

// Logger JSON estruturado (vai para stdout)
const logger = pino({
  name: 'audit-service',
  level: 'info',
  timestamp: pino.stdTimeFunctions.isoTime // ISO 8601
});

// Interface: define o formato de um evento de auditoria
export interface AuditEvent {
  request_id?: string;
  event_type: string;
  actor?: {
    user_id?: string;
    ip?: string;
    user_agent?: string;
  };
  action: string;
  resource: string;
  resource_id?: string;
  outcome: 'success' | 'failure' | 'error';
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: any;
}

export class AuditService {
  private readonly auditRepository = AppDataSource.getRepository(AuditLog);

  // MÉTODO PRINCIPAL: registra um evento de auditoria
  async logEvent(event: AuditEvent): Promise<void> {
    try {
      // 1. Monta o objeto do log
      const auditEntry = {
        timestamp: new Date().toISOString(),
        request_id: event.request_id || uuidv4(),
        event_type: event.event_type,
        actor_user_id: event.actor?.user_id,
        actor_ip: event.actor?.ip,
        actor_user_agent: event.actor?.user_agent,
        action: event.action,
        resource: event.resource,
        resource_id: event.resource_id,
        outcome: event.outcome,
        changes: this.sanitizeChanges(event.changes), // Remove senhas!
        metadata: event.metadata,
        event_hash: ''
      };

      // 2. Gera hash SHA-256 (integridade: detectar adulteração)
      auditEntry.event_hash = this.generateEventHash(auditEntry);

      // 3. Loga no console (JSON estruturado para Filebeat/Fluent)
      logger.info(auditEntry, `Audit: ${event.action} on ${event.resource}`);

      // 4. Salva no banco de dados (se estiver inicializado)
      if (AppDataSource.isInitialized) {
        const auditLog = this.auditRepository.create(auditEntry);
        await this.auditRepository.save(auditLog);
      } else {
        logger.warn('DataSource não inicializado, log apenas no console');
      }

    } catch (error: any) {
      // Se falhar ao logar, não quebra o sistema
      logger.error({ error: error.message, stack: error.stack }, 'Failed to log audit event');
    }
  }

  // PROTEÇÃO DE DADOS SENSÍVEIS (LGPD compliance)
  private sanitizeChanges(changes?: any): any {
    if (!changes) return null;

    // Campos que NUNCA devem aparecer em logs
    const sensitiveFields = ['senha', 'password', 'token', 'secret'];
    
    const sanitize = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const sanitized = { ...obj };
      for (const key in sanitized) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[PROTECTED]'; // Mascara dados sensíveis
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = sanitize(sanitized[key]); // Recursivo
        }
      }
      return sanitized;
    };

    return {
      before: sanitize(changes.before),
      after: sanitize(changes.after)
    };
  }

  // INTEGRIDADE: gera hash SHA-256 do evento
  private generateEventHash(event: any): string {
    const { event_hash, ...eventData } = event;
    // Ordena chaves alfabeticamente (mesma ordem sempre)
    const sortedKeys = Object.keys(eventData).sort((a, b) => a.localeCompare(b));
    const eventString = JSON.stringify(eventData, sortedKeys);
    return crypto.createHash('sha256').update(eventString).digest('hex');
  }
}

// Exporta instância singleton
export const auditService = new AuditService();