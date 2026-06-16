import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarketMind AI',
  description: 'O CFO Inteligente para Vendedores de Marketplace',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
