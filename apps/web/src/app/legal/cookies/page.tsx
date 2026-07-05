import type { Metadata } from 'next';
import { LEGAL_VERSIONS, SUPPORT_EMAIL } from '@/lib/legal';
import { ReviewNote } from '@/components/legal-review-note';

export const metadata: Metadata = { title: 'Política de Cookies — MarketMind AI' };

export default function CookiesPage() {
  return (
    <article className="space-y-4 text-sm leading-relaxed text-slate-700">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Política de Cookies</h1>
        <p className="text-slate-500">Versão {LEGAL_VERSIONS.COOKIES} · vigente a partir de 22/06/2026</p>
      </header>

      <ReviewNote>Rascunho para revisão jurídica.</ReviewNote>

      <Section title="1. O que são cookies">
        Cookies são pequenos arquivos guardados no seu navegador para permitir o funcionamento do
        site e lembrar preferências.
      </Section>

      <Section title="2. Cookies que utilizamos">
        Atualmente usamos apenas cookies <strong>estritamente necessários</strong>:
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li><strong>Sessão de autenticação</strong> (httpOnly): mantém você conectado com segurança.</li>
          <li><strong>Preferência de cookies</strong>: registra que você viu este aviso.</li>
        </ul>
        Não utilizamos cookies de analytics ou de marketing/publicidade. Caso isso mude, esta
        política e o aviso de cookies serão atualizados para oferecer escolha de consentimento.
      </Section>

      <Section title="3. Gerenciamento">
        Cookies estritamente necessários não podem ser desativados sem afetar o funcionamento do
        login. Você pode limpar cookies nas configurações do seu navegador.
      </Section>

      <Section title="4. Contato">
        Dúvidas: {SUPPORT_EMAIL}.
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
