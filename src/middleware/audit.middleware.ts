import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { auditService } from '../services/Audit.service';

// Adiciona campos customizados ao Request do Express
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 1. GERA/GARANTE REQUEST ID (para correlação)
  req.requestId = req.headers['x-request-id'] as string || uuidv4();
  req.startTime = Date.now(); // Mede tempo de processamento

  // 2. ADICIONA REQUEST ID NO RESPONSE HEADER (cliente pode usar para suporte)
  res.setHeader('X-Request-ID', req.requestId);

  // 3. INTERCEPTA A RESPOSTA (monkey-patch do res.send)
  const originalSend = res.send;
  res.send = function(data) {
    // Só loga operações que ALTERAM ESTADO (não GET)
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    
    if (isStateChanging) {
      const processingTime = Date.now() - (req.startTime || 0);
      
      // Determina resultado baseado no status HTTP
      let outcome: 'success' | 'failure' | 'error' = 'success';
      if (res.statusCode >= 400 && res.statusCode < 500) outcome = 'failure'; // Erro do cliente
      if (res.statusCode >= 500) outcome = 'error'; // Erro do servidor

      // LOGA O EVENTO
      auditService.logEvent({
        request_id: req.requestId,
        event_type: 'http_request',
        actor: {
          user_id: extractUserIdFromRequest(req),
          ip: req.ip || req.socket.remoteAddress,
          user_agent: req.headers['user-agent']
        },
        action: `${req.method} ${req.route?.path || req.path}`,
        resource: 'http_endpoint',
        resource_id: req.path,
        outcome,
        metadata: {
          method: req.method,
          endpoint: req.path,
          status_code: res.statusCode,
          processing_time_ms: processingTime,
          body_size: req.body ? JSON.stringify(req.body).length : 0
        }
      }).catch((err: any) => {
        console.error('Falha ao logar auditoria:', err);
      });
    }

    return originalSend.call(this, data);
  };

  next(); // Passa para o próximo middleware/controller
};

// Placeholder: quando implementar auth JWT, extrair matricula do token
function extractUserIdFromRequest(req: Request): string | undefined {
  // Quando implementar JWT: return (req as any).user?.matricula;
  return undefined;
}