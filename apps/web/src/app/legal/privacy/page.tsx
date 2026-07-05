import type { Metadata } from 'next';
import { LEGAL_VERSIONS, SUPPORT_EMAIL } from '@/lib/legal';
import { ReviewNote } from '@/components/legal-review-note';

export const metadata: Metadata = { title: 'Política de Privacidade — MarketMind AI' };

export default function PrivacyPage() {
  return (
    <article className="space-y-4 text-sm leading-relaxed text-slate-700">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Política de Privacidade</h1>
        <p className="text-slate-500">Versão {LEGAL_VERSIONS.PRIVACY} · vigente a partir de 22/06/2026</p>
      </header>

      <ReviewNote>
        Rascunho conforme a LGPD (Lei 13.709/2018) para revisão jurídica. Confirmar a figura do
        controlador/operador, o Encarregado (DPO) e as bases legais antes do uso comercial.
      </ReviewNote>

      <Section title="1. Quem trata seus dados">
        O MarketMind AI opera a plataforma e atua como <strong>controlador</strong> dos dados de
        cadastro e uso dos seus usuários. Em relação aos dados que você importa dos marketplaces
        (ex.: pedidos e clientes finais), você é o controlador e o MarketMind atua como{' '}
        <strong>operador</strong>.
        <ReviewNote>Validar a divisão controlador/operador e formalizar em contrato/DPA.</ReviewNote>
      </Section>

      <Section title="2. Dados que coletamos">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Cadastro:</strong> nome, e-mail, senha (apenas hash), dados da empresa.</li>
          <li><strong>Uso e segurança:</strong> registros de acesso, IP, user-agent, trilha de auditoria.</li>
          <li><strong>Integrações:</strong> dados de marketplace autorizados por você (pedidos, catálogo) e tokens de acesso (cifrados em repouso).</li>
          <li><strong>Pagamento:</strong> dados de assinatura e faturas; o número do cartão é processado pelo provedor de pagamento — não armazenamos dados de cartão.</li>
        </ul>
      </Section>

      <Section title="3. Finalidades e bases legais">
        Tratamos dados para: prestar e operar o Serviço (execução de contrato), cobrar a assinatura
        (execução de contrato), cumprir obrigações legais/fiscais (obrigação legal), prevenir fraude
        e garantir segurança (legítimo interesse) e comunicar avisos do serviço.
        <ReviewNote>Mapear cada finalidade à base legal correta (LGPD art. 7) com o jurídico.</ReviewNote>
      </Section>

      <Section title="4. Compartilhamento e operadores">
        Compartilhamos dados apenas com operadores necessários à prestação do Serviço, como:
        provedor de pagamento (Stripe), envio de e-mail transacional (Resend), provedores de
        infraestrutura/nuvem e a API do marketplace conectado (Mercado Livre). Não vendemos seus
        dados pessoais.
      </Section>

      <Section title="5. Cookies">
        Usamos apenas cookies estritamente necessários (sessão autenticada). Detalhes na{' '}
        <a href="/legal/cookies" className="font-medium text-brand underline">Política de Cookies</a>.
      </Section>

      <Section title="6. Seus direitos (titular)">
        Você pode acessar, corrigir, <strong>exportar</strong> e solicitar a <strong>exclusão</strong>{' '}
        dos seus dados pessoais diretamente em <em>Configurações → Privacidade</em>, ou pelo e-mail{' '}
        {SUPPORT_EMAIL}. A exclusão respeita o isolamento entre empresas e as obrigações legais de
        retenção (ver item 7).
      </Section>

      <Section title="7. Retenção">
        Mantemos seus dados enquanto a conta existir. Após a exclusão, dados pessoais são
        anonimizados ou removidos, exceto registros que a lei exige reter — notadamente documentos
        fiscais/financeiros (faturas), mantidos pelo prazo legal.
        <ReviewNote>Confirmar prazos de retenção fiscal (em regra 5 anos) e contábil aplicáveis.</ReviewNote>
      </Section>

      <Section title="8. Segurança">
        Adotamos medidas como isolamento multi-inquilino (RLS), criptografia de tokens em repouso,
        senhas com hash, controle de acesso por permissões e trilha de auditoria.
      </Section>

      <Section title="9. Transferência internacional">
        Alguns operadores podem processar dados fora do Brasil.
        <ReviewNote>Documentar salvaguardas de transferência internacional (LGPD art. 33).</ReviewNote>
      </Section>

      <Section title="10. Encarregado (DPO) e contato">
        Para exercer direitos ou tirar dúvidas: {SUPPORT_EMAIL}.
        <ReviewNote>Designar e publicar o Encarregado (DPO) com canal de contato.</ReviewNote>
      </Section>

      <Section title="11. Alterações">
        Podemos atualizar esta Política; mudanças relevantes serão comunicadas. A versão vigente é
        identificada pela data no topo.
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
