import { importSpecifiers, listSourceFiles } from './scan';

interface Rule {
  name: string;
  dir: string;
  forbidden: RegExp[];
}

/**
 * Dependency Rule (Sprint 2.7): nenhuma app importa outra app; packages não
 * importam apps. Estes testes FALHAM se algum import cruzado for introduzido.
 */
const RULES: Rule[] = [
  { name: 'apps/workers NÃO importa apps/api', dir: 'apps/workers/src', forbidden: [/(^|\/)api\//, /apps\/api/, /@marketmind\/api/] },
  { name: 'apps/api NÃO importa apps/workers', dir: 'apps/api/src', forbidden: [/(^|\/)workers\//, /apps\/workers/, /@marketmind\/workers/] },
  { name: 'apps/web NÃO importa apps/api ou apps/workers', dir: 'apps/web/src', forbidden: [/(^|\/)(api|workers)\/src/, /apps\/(api|workers)/, /@marketmind\/(api|workers)/] },
];

function violations(rule: Rule): string[] {
  const found: string[] = [];
  for (const file of listSourceFiles(rule.dir)) {
    for (const spec of importSpecifiers(file)) {
      if (rule.forbidden.some((re) => re.test(spec))) {
        found.push(`${file.replace(/\\/g, '/').split('/marketmind-ai/')[1]} -> ${spec}`);
      }
    }
  }
  return found;
}

describe('Architecture boundaries (dependency rule)', () => {
  for (const rule of RULES) {
    it(rule.name, () => {
      expect(violations(rule)).toEqual([]);
    });
  }

  it('packages/* NÃO importam apps/*', () => {
    const found: string[] = [];
    for (const file of listSourceFiles('packages')) {
      for (const spec of importSpecifiers(file)) {
        if (/apps\//.test(spec) || /@marketmind\/(api|workers|web)/.test(spec)) {
          found.push(`${file} -> ${spec}`);
        }
      }
    }
    expect(found).toEqual([]);
  });

  it('kernel não depende de outros packages @marketmind (é a base)', () => {
    const found: string[] = [];
    for (const file of listSourceFiles('packages/kernel/src')) {
      for (const spec of importSpecifiers(file)) {
        if (/@marketmind\//.test(spec)) found.push(`${file} -> ${spec}`);
      }
    }
    expect(found).toEqual([]);
  });
});
