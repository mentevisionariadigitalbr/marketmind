# 01 — Visão de Produto

## 1. Problema

Vendedores de marketplace operam com uma ilusão de lucro. O painel do Mercado Livre mostra
"vendas", mas não mostra:

- Comissão real por categoria (que varia e muda).
- Frete subsidiado/grátis que sai do bolso do vendedor.
- Impostos (Simples Nacional, ICMS-ST, DIFAL).
- Custo real do produto (com frete de compra, embalagem, perdas).
- Despesas operacionais rateadas.

O resultado: vendedores que "faturam" R$ 100k/mês e descobrem no fim do ano que tiveram
prejuízo em parte do mix. Eles não têm um CFO. O MarketMind AI **é** esse CFO.

## 2. Personas

| Persona | Dores | O que espera do produto |
|---------|-------|-------------------------|
| **Ricardo — Seller PME** (R$ 50k–500k/mês) | Não sabe a margem por SKU; compra no escuro; precifica por "feeling". | DRE automática, alerta de ruptura, preço mínimo por produto. |
| **Camila — Gestora de operação** (equipe 3–10) | Precisa delegar sem perder controle; relatórios para o dono. | RBAC, relatórios exportáveis, dashboard executivo. |
| **João — Vendedor profissional / agência** (multi-conta) | Gerencia várias contas/lojas; compara performance. | Multi-tenant, multi-marketplace, visão consolidada. |
| **Contador da loja** | Precisa de DRE confiável e dados fiscais. | Exportação PDF/Excel/CSV, DRE estruturada. |

## 3. Proposta de valor

> "Pare de adivinhar seu lucro. O MarketMind AI calcula o lucro real de cada venda, te avisa
> o que comprar e quando, e responde em linguagem natural onde você está perdendo dinheiro."

## 4. Jobs To Be Done

1. *Quando* fecho o mês, *quero* saber meu lucro líquido real por canal e por produto, *para*
   decidir o que manter e o que cortar.
2. *Quando* um produto está vendendo bem, *quero* ser avisado antes da ruptura, *para* não
   perder vendas nem perder posição no ranking.
3. *Quando* vou cadastrar/repreçar um anúncio, *quero* saber o preço mínimo e o ideal, *para*
   não vender no prejuízo.
4. *Quando* tenho uma dúvida de negócio, *quero* perguntar em português e receber a resposta
   baseada nos meus dados, *para* decidir rápido.

## 5. Métricas de sucesso (North Star + apoio)

- **North Star:** nº de decisões acionadas a partir de insights (compra, repreço, pausa de anúncio).
- Ativação: % de contas que conectam um marketplace e veem a 1ª DRE em < 24h.
- Retenção: churn mensal < 4%.
- Confiabilidade do dado: divergência DRE vs. extrato do marketplace < 1%.

## 6. Escopo de planos (comercial)

| Plano | Limites | Recursos |
|-------|---------|----------|
| **Starter** | 1 conta, 1k SKUs | Dashboard, DRE, estoque básico |
| **Pro** | 3 contas, 50k SKUs | + IA precificação, agentes, concorrência |
| **Business** | 10 contas, 1M SKUs | + multi-usuário avançado, API, white-label parcial |

(Refletido em `subscriptions` e `feature_flags` — ver [modelo de dados](03-modelo-de-dados.md).)

## 7. Não-objetivos (nesta fase)

- Não é ERP fiscal (não emite NF-e; integra com quem emite).
- Não é hub de gestão de anúncios (não cria anúncio; lê e analisa).
- SMS fica como evolução futura (canal previsto, não implementado no MVP).
