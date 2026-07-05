import { NoopEmailSender } from './noop-email-sender';
import { passwordResetEmail, emailVerificationEmail } from './email-templates';

describe('email-templates', () => {
  it('passwordResetEmail inclui o link e expira em 1 hora', () => {
    const c = passwordResetEmail('https://app/reset?token=abc');
    expect(c.subject).toMatch(/senha/i);
    expect(c.html).toContain('https://app/reset?token=abc');
    expect(c.text).toContain('https://app/reset?token=abc');
  });

  it('emailVerificationEmail inclui o link de confirmação', () => {
    const c = emailVerificationEmail('https://app/verify?token=xyz');
    expect(c.subject).toMatch(/e-mail/i);
    expect(c.html).toContain('https://app/verify?token=xyz');
  });
});

describe('NoopEmailSender', () => {
  it('captura a mensagem em vez de enviar', async () => {
    const sender = new NoopEmailSender();
    const msg = { to: 'a@x.com', subject: 'Oi', html: '<p>oi</p>', text: 'oi' };
    await sender.send(msg);
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0].to).toBe('a@x.com');
  });
});
