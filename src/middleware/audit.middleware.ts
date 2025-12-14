import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { LogAuditoriaService } from '../services/LogAuditoria.service';
import { logAuditoriaRepository } from '../repositories/LogAuditoria.repository';
import { AppDataSource } from '../config/data-source';

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
  res.send = function(this: Response, data?: any): Response {
    // Só loga operações que ALTERAM ESTADO (não GET)
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);

    if (isStateChanging) {
      // Se o controller/service já gravou o log legado, marque com header `X-Audit-Logged`.
      // Nesse caso, pulamos o logging do middleware para evitar duplicidade.
      try {
        const already = res.getHeader && res.getHeader('X-Audit-Logged');
        if (already) {
          return originalSend.call(this, data) as Response;
        }
      } catch (e) {
        // ignore header read errors
      }

      const processingTime = Date.now() - (req.startTime || 0);

      // Determina resultado baseado no status HTTP
      let outcome: 'success' | 'failure' | 'error' = 'success';
      if (res.statusCode >= 400 && res.statusCode < 500) outcome = 'failure'; // Erro do cliente
      if (res.statusCode >= 500) outcome = 'error'; // Erro do servidor

      // monta payload
      const metadata = {
        method: req.method,
        endpoint: req.path,
        status_code: res.statusCode,
        processing_time_ms: processingTime,
        body_size: req.body ? JSON.stringify(req.body).length : 0
      };

      // captura IP com prioridade para múltiplos headers (quando atrás de proxy)
      const rawIp = getRequestIp(req);
      const ip = normalizeIp(rawIp as string | null);

      const actorIdRaw = extractUserIdFromRequest(req);

      const legPayload: Partial<any> = {
        acao: `${req.method} ${req.route?.path || req.path}`,
        recurso: 'http_endpoint',
        detalhes: JSON.stringify({ request_id: req.requestId, resource_id: req.path, metadata, body: sanitize(req.body) }),
        ip,
        userAgent: String(req.headers['user-agent'] || ''),
        justificativa: (metadata as any).justificativa ?? null,
        usuario: actorIdRaw ? ({ id: /^[0-9]+$/.test(String(actorIdRaw)) ? Number(actorIdRaw) : String(actorIdRaw) } as any) : undefined
      };

      // grava assincronamente e evita duplicidade usando request_id
      (async () => {
        try {
          if (AppDataSource.isInitialized) {
            try {
              const repo = logAuditoriaRepository();
              const existing = await repo.createQueryBuilder('l')
                .where('l.detalhes LIKE :q', { q: `%"request_id":"${req.requestId}"%` })
                .getOne();
              if (existing) return;
            } catch (e) {
              // se a checagem falhar, continuamos e tentamos gravar (não falhará a requisição)
            }
          }

          const logService = new LogAuditoriaService();
          await logService.createLog(legPayload);
        } catch (err: any) {
          console.error('Falha ao salvar log_auditoria (legado):', err);
        }
      })();
    }

    return originalSend.call(this, data) as Response;
  };

  next(); // Passa para o próximo middleware/controller
};

// Placeholder: quando implementar auth JWT, extrair matricula do token
function extractUserIdFromRequest(req: Request): string | undefined {
  // Tentativa de extrair id disponível no req.user (middleware de auth seta req.user.id)
  try {
    const u = (req as any).user;
    if (u && (u.id || u.usuarioId || u.matricula)) {
      return String(u.id ?? u.usuarioId ?? u.matricula);
    }
  } catch (err) {
    // ignore
  }

  // Checa headers que alguns frontends/proxies podem setar
  const headerKeys = ['x-user-id', 'x-usuario-id', 'x-audit-user-id', 'x-actor-id'];
  for (const k of headerKeys) {
    const v = req.headers[k as keyof typeof req.headers];
    if (v) return String(v);
  }

  // Checa o corpo da requisição por campo que indique o usuário que está agindo
  try {
    const b = req.body as any;
    if (b) {
      const candidate = b.actor_user_id ?? b.usuarioId ?? b.usuario_id ?? b.userId;
      if (candidate) return String(candidate);
    }
  } catch (err) {
    // ignore
  }

  // Checa query params
  try {
    const q: any = req.query as any;
    if (q) {
      const candidate = q.userId ?? q.usuarioId ?? q.id;
      if (candidate) return String(candidate);
    }
  } catch (err) {
    // ignore
  }

  return undefined;
}

// Normaliza formatos comuns de IP retornados por proxies/sockets
function normalizeIp(input: string | null | undefined): string | null {
  if (!input) return null;
  let ip = String(input);
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  // Remove porta se existir
  ip = ip.replace(/:\d+$/, '');
  // IPv6-mapped IPv4
  const v4match = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/i);
  if (v4match) return v4match[1];
  // IPv6 loopback -> IPv4 loopback
  if (ip === '::1') return '127.0.0.1';
  // Remove zone id (ex: %lo0)
  if (ip.includes('%')) ip = ip.split('%')[0];
  return ip;
}

// Extrai o IP da requisição checando vários headers e propriedades do socket/connection
function getRequestIp(req: Request): string | null {
  try {
    // Common proxy headers
    const headerKeys = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip',
      'fastly-client-ip',
      'true-client-ip',
      'x-cluster-client-ip',
      'forwarded',
      'forwarded-for'
    ];

    for (const k of headerKeys) {
      const v = req.headers[k as keyof typeof req.headers];
      if (v) {
        const s = Array.isArray(v) ? v[0] : String(v);
        if (s) return s.split(',')[0].trim();
      }
    }

    // express sets req.ip (may be behind proxy and require trust proxy)
    if (req.ip) return String(req.ip);

    // socket / connection fallbacks
    const socketAny: any = (req.socket || (req as any).connection || {});
    if (socketAny.remoteAddress) return String(socketAny.remoteAddress);
    if ((req as any).connection && (req as any).connection.socket && (req as any).connection.socket.remoteAddress) {
      return String((req as any).connection.socket.remoteAddress);
    }
  } catch (err) {
    // ignore and return null
  }
  return null;
}

// Sanitiza campos sensíveis de objetos simples (remove senhas, tokens)
function sanitize(obj: any): any {
  if (!obj) return obj;
  if (typeof obj !== 'object') return obj;

  const sensitive = ['senha', 'password', 'token', 'secret', 'pushToken'];

  const clone: any = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    try {
      const v = obj[k];
      if (sensitive.some(s => k.toLowerCase().includes(s))) {
        clone[k] = '[PROTECTED]';
      } else if (v && typeof v === 'object') {
        clone[k] = sanitize(v);
      } else {
        clone[k] = v;
      }
    } catch (err) {
      clone[k] = '[UNSERIALIZABLE]';
    }
  }
  return clone;
}