/**
 * Templates de e-mail (funções puras → {subject, html, text}). Sem provedor,
 * sem segredos. Reutilizados pelos fluxos de reset de senha e verificação.
 */

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

interface RenderOpts {
  heading: string;
  intro: string;
  cta?: { label: string; url: string };
  outro?: string;
}

const BRAND = 'MarketMind AI';

/** Layout simples e seguro (inline styles; sem rastreadores). */
function render(subject: string, o: RenderOpts): EmailContent {
  const button = o.cta
    ? `<p style="margin:24px 0"><a href="${o.cta.url}" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${o.cta.label}</a></p>
       <p style="font-size:12px;color:#64748b">Se o botão não funcionar, copie e cole este link no navegador:<br>${o.cta.url}</p>`
    : '';
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:520px;margin:0 auto;padding:24px">
    <h1 style="color:#4f46e5;font-size:20px">${BRAND}</h1>
    <h2 style="font-size:18px">${o.heading}</h2>
    <p>${o.intro}</p>
    ${button}
    ${o.outro ? `<p style="color:#64748b;font-size:13px">${o.outro}</p>` : ''}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="color:#94a3b8;font-size:12px">${BRAND} — este é um e-mail automático.</p>
  </body></html>`;
  const text = [o.heading, '', o.intro, o.cta ? `\n${o.cta.label}: ${o.cta.url}` : '', o.outro ?? '', '', `${BRAND}`]
    .filter((l) => l !== undefined)
    .join('\n');
  return { subject, html, text };
}

export function passwordResetEmail(resetUrl: string): EmailContent {
  return render('Redefinir sua senha', {
    heading: 'Redefinir sua senha',
    intro: 'Recebemos um pedido para redefinir a senha da sua conta. O link expira em 1 hora e só pode ser usado uma vez.',
    cta: { label: 'Redefinir senha', url: resetUrl },
    outro: 'Se você não solicitou, ignore este e-mail — sua senha continua a mesma.',
  });
}

export function emailVerificationEmail(verifyUrl: string): EmailContent {
  return render('Confirme seu e-mail', {
    heading: 'Confirme seu e-mail',
    intro: 'Bem-vindo ao MarketMind AI! Confirme seu endereço de e-mail para ativar todos os recursos da conta.',
    cta: { label: 'Confirmar e-mail', url: verifyUrl },
    outro: 'O link expira em 24 horas.',
  });
}
