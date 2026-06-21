import type { Metadata } from 'next';
import { LEGAL_VERSIONS, SUPPORT_EMAIL } from '@/lib/legal';
import { ReviewNote } from '@/components/legal-review-note';

export const metadata: Metadata = { title: 'Termos de Uso — MarketMind AI' };

export default function TermsPage() {
  return (
    <article className="space-y-4 text-sm leading-relaxed text-slate-700">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Termos de Uso</h1>
        <p className="text-slate-500">Versão {LEGAL_VERSIONS.TERMS} · vigente a partir de 22/06/2026</p>
      </header>

      <ReviewNote>
        Este é um <strong>rascunho</strong> gerado para acelerar o desenvolvimento. Todo o documento
        deve ser revisado por advogado(a) antes do uso comercial, em especial limitação de
        responsabilidade, foro e cláusulas de rescisão.
      </ReviewNote>

      <Section title="1. Aceitação">
        Ao criar uma conta ou usar o MarketMind AI (&quot;Serviço&quot;), você concorda com estes
        Termos de Uso e com a Política de Privacidade. Se não concordar, não utilize o Serviço.
      </Section>

      <Section title="2. Descrição do Serviço">
        O MarketMind AI é uma plataforma SaaS de análise financeira e gestão para vendedores de
        marketplace (CFO inteligente): integra contas de marketplace, sincroniza pedidos e catálogo
        e gera indicadores. O Serviço é fornecido &quot;como está&quot;, podendo evoluir ao longo do
        tempo.
      </Section>

      <Section title="3. Conta e cadastro">
        Você é responsável pela veracidade dos dados de cadastro, pela guarda de suas credenciais e
        por toda atividade na sua conta. Contas são multiusuário: o titular (OWNER) pode convidar
        membros e definir permissões.
      </Section>

      <Section title="4. Planos, assinatura e pagamento">
        O acesso a recursos pagos depende de assinatura ativa. Há período de teste gratuito de 14
        dias. Cobranças, renovações e cancelamentos seguem o plano contratado e são processados por
        provedor de pagamento terceirizado.
        <ReviewNote>
          Definir política de reembolso, reajuste de preços e prazo de aviso prévio de mudança de
          valores conforme CDC.
        </ReviewNote>
      </Section>

      <Section title="5. Uso aceitável">
        É vedado usar o Serviço para fins ilícitos, violar direitos de terceiros, tentar burlar
        limites de plano, acessar dados de outras empresas ou comprometer a segurança da plataforma.
      </Section>

      <Section title="6. Integrações de terceiros">
        Ao conectar uma conta de marketplace (ex.: Mercado Livre), você autoriza o Serviço a acessar
        os dados necessários via API do provedor, conforme as permissões concedidas. O uso desses
        dados segue a Política de Privacidade.
      </Section>

      <Section title="7. Propriedade intelectual">
        O software, a marca e os conteúdos do Serviço pertencem ao MarketMind AI. Seus dados de
        negócio permanecem seus; concedemos a você licença de uso do Serviço, e você nos concede
        licença para processar seus dados a fim de prestar o Serviço.
      </Section>

      <Section title="8. Limitação de responsabilidade">
        O Serviço fornece estimativas e indicadores que não substituem aconselhamento contábil,
        fiscal ou jurídico. Não nos responsabilizamos por decisões tomadas com base nos relatórios.
        <ReviewNote>Calibrar limitação de responsabilidade e exclusões conforme a legislação.</ReviewNote>
      </Section>

      <Section title="9. Rescisão">
        Você pode encerrar sua conta a qualquer momento. Podemos suspender ou encerrar contas que
        violem estes Termos. Dados são tratados conforme a Política de Privacidade e obrigações
        legais de retenção.
      </Section>

      <Section title="10. Alterações">
        Podemos atualizar estes Termos; mudanças relevantes serão comunicadas e poderão exigir novo
        aceite. A versão vigente é identificada pela data no topo desta página.
      </Section>

      <Section title="11. Lei aplicável e foro">
        Estes Termos são regidos pelas leis do Brasil.
        <ReviewNote>Definir comarca/foro de eleição e cláusula de resolução de disputas.</ReviewNote>
      </Section>

      <Section title="12. Contato">
        Dúvidas sobre estes Termos: {SUPPORT_EMAIL}.
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
