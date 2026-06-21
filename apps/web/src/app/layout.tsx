import type { Metadata } from 'next';
import './globals.css';
import { CookieConsentBanner } from '@/components/cookie-consent-banner';

export const metadata: Metadata = {
  title: 'MarketMind AI',
  description: 'O CFO Inteligente para Vendedores de Marketplace',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <CookieConsentBanner />
      </body>
    </html>
  );
}
