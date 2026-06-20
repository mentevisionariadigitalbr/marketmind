import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/**
 * Restringe o /metrics (Sprint 3.2). Libera quando:
 *  - há `METRICS_TOKEN` e o request traz `Authorization: Bearer <token>` válido; ou
 *  - a origem é loopback/rede interna (scrape local do Prometheus).
 * Caso contrário, 403. Documentado em docs/deployment.md.
 */
@Injectable()
export class MetricsGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.config.get<string>('METRICS_TOKEN');

    if (token) {
      const auth = req.headers['authorization'];
      if (typeof auth === 'string' && auth === `Bearer ${token}`) return true;
    }

    const ip = normalizeIp(req.ip ?? req.socket?.remoteAddress ?? '');
    if (isLoopbackOrPrivate(ip)) return true;

    throw new ForbiddenException('Acesso ao /metrics restrito.');
  }
}

function normalizeIp(ip: string): string {
  return ip.replace(/^::ffff:/, ''); // IPv4 mapeado em IPv6
}

function isLoopbackOrPrivate(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.')) return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  // 172.16.0.0 – 172.31.255.255
  const m = /^172\.(\d{1,3})\./.exec(ip);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  // ULA IPv6 (fc00::/7)
  if (/^f[cd]/i.test(ip)) return true;
  return false;
}
