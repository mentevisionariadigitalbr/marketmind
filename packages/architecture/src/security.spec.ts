import { readFileSync } from 'node:fs';
import { listSourceFiles } from './scan';

/**
 * Boundary de segurança: nenhum package deve expor/embutir tokens, segredos ou
 * credenciais. Falha se um segredo for commitado no código dos packages.
 */
const SECRET_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'Mercado Livre access token', re: /APP_USR-[0-9A-Za-z-]{10,}/ },
  { name: 'PEM private key', re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: 'hardcoded client secret', re: /client[_-]?secret\s*[:=]\s*['"][^'"\s]{12,}['"]/i },
  { name: 'hardcoded bearer token', re: /Bearer\s+[A-Za-z0-9._-]{20,}/ },
  { name: 'aws secret access key', re: /aws_secret_access_key\s*=\s*['"][^'"]{20,}/i },
];

describe('Security boundaries', () => {
  it('nenhum package embute tokens/segredos/credenciais', () => {
    const findings: string[] = [];
    for (const file of listSourceFiles('packages')) {
      if (/\.spec\.ts$/.test(file)) continue; // specs podem ter fixtures fake
      const content = readFileSync(file, 'utf8');
      for (const { name, re } of SECRET_PATTERNS) {
        if (re.test(content)) findings.push(`${file}: ${name}`);
      }
    }
    expect(findings).toEqual([]);
  });

  it('packages de domínio não re-exportam process.env diretamente', () => {
    const findings: string[] = [];
    for (const dir of ['packages/kernel/src', 'packages/integration-core/src', 'packages/marketplace-core/src']) {
      for (const file of listSourceFiles(dir)) {
        const content = readFileSync(file, 'utf8');
        // 'export ... process.env' indicaria vazamento de configuração/segredo.
        if (/export\s+const\s+\w+\s*=\s*process\.env/.test(content)) {
          findings.push(file);
        }
      }
    }
    expect(findings).toEqual([]);
  });
});
