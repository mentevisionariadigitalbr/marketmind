# LGPD — Registro de Tratamento e Base Legal (MarketMind AI)

> **⚠ Documento técnico de apoio — exige revisão de advogado(a) antes do uso comercial.**
> Este registro descreve, de forma honesta com a implementação atual, **quais** dados
> pessoais são tratados, **para quê**, sob qual **base legal** (LGPD, Lei 13.709/2018,
> art. 7º/11), por **quanto tempo** e com quais **operadores**. As páginas voltadas ao
> titular estão em `/legal/terms`, `/legal/privacy` e `/legal/cookies` (rascunhos com
> marcadores de revisão).

Versão: 2026-06-22 · vigência a partir de 22/06/2026.

## 1. Agentes de tratamento

- **Controlador** (dados de cadastro e uso dos usuários da plataforma): MarketMind AI.
- **Operador** (dados que o cliente importa do marketplace — ex.: pedidos e clientes
  finais): MarketMind AI atua como operador; o **cliente é o controlador** desses dados.
- **Encarregado (DPO):** ⚠ a designar. Canal de contato provisório: `privacidade@marketmind.ai`.

> ⚠ Revisar a divisão controlador/operador e formalizar **DPA** (contrato de operador) com
> o cliente e com os sub-operadores.

## 2. Registro de operações de tratamento (ROPA)

| # | Categoria de dado | Origem | Finalidade | Base legal (art. 7º) | Retenção | Onde (tabela) |
|---|---|---|---|---|---|---|
| 1 | Identificação e contato (nome, e-mail) | Titular (cadastro) | Criar e operar a conta | II — execução de contrato | Enquanto a conta existir; anonimizado na exclusão | `users` |
| 2 | Credenciais (hash de senha, vínculo Google) | Titular | Autenticação | II — execução de contrato | Até a exclusão (removido/anonimizado) | `users` |
| 3 | Dados da empresa (razão/nome, CNPJ, regime) | Titular | Cálculos fiscais e operação | II — execução de contrato; II/VI da L. fiscal | Até a exclusão (anonimizado); fiscais retidos | `companies` |
| 4 | Registros de acesso/segurança (IP, user-agent, sessões) | Coleta automática | Segurança, prevenção a fraude, trilha | VI — legítimo interesse; I/II — obrigação legal (Marco Civil) | Sessões: até expirar/excluir; logs: prazo de segurança | `refresh_tokens`, `audit_logs` |
| 5 | Aceite de Termos/Privacidade (versão, data, IP) | Titular | Prova de consentimento/contrato | II — execução de contrato; II — cumprimento de obrigação | Retido como prova após a exclusão | `legal_acceptances` |
| 6 | Verificação e recuperação (tokens de e-mail/senha) | Sistema | Verificar e-mail e redefinir senha | II — execução de contrato | Uso único / curta expiração; removido na exclusão | `user_tokens` |
| 7 | Dados de marketplace (pedidos, catálogo, **clientes finais**) | API do marketplace (autorizado pelo titular) | Análise financeira e gestão (CFO) | II — execução de contrato (titular é controlador) | Enquanto a conta existir; purgado na exclusão | `orders`, `order_items`, `products`, `customers`, `marketplace_accounts` |
| 8 | Tokens de marketplace (OAuth) | OAuth do marketplace | Sincronização autorizada | II — execução de contrato | Cifrados em repouso; removidos na desconexão/exclusão | `marketplace_accounts` (cifrado) |
| 9 | Cobrança e faturas | Provedor de pagamento + sistema | Cobrar assinatura e emitir fatura | II — execução de contrato; **II — obrigação legal/fiscal** | **Retido pelo prazo fiscal** (não excluído) | `subscriptions`, `invoices` |
| 10 | Pedidos de direitos do titular | Titular | Atender e comprovar LGPD | II — obrigação legal | Retido como prova | `data_subject_requests` |

> ⚠ Validar cada base legal com o jurídico (em especial legítimo interesse no item 4 e a
> qualificação dos dados de clientes finais no item 7). Definir prazos numéricos de
> retenção de logs e de documentos fiscais (em regra **5 anos**).

**Dados sensíveis (art. 11):** o produto **não** trata categorias de dados sensíveis por
finalidade. ⚠ Confirmar que nenhum dado importado do marketplace contém dado sensível.

**Dados de crianças/adolescentes:** não é público-alvo. ⚠ Confirmar.

## 3. Compartilhamento — operadores e sub-operadores

| Operador | Papel | Dados expostos | Local |
|---|---|---|---|
| Stripe | Pagamento recorrente | E-mail, identificadores de cobrança (sem dados de cartão no nosso lado) | ⚠ EUA — transferência internacional |
| Resend | E-mail transacional | E-mail e conteúdo da mensagem | ⚠ EUA — transferência internacional |
| Mercado Livre | Integração de marketplace | Tokens e dados autorizados pelo titular | Brasil/Regional |
| Provedor de infraestrutura (Postgres/Redis/hospedagem) | Armazenamento e processamento | Todos, conforme operação | ⚠ a definir (BR/internacional) |

Não há **venda** de dados pessoais. Não há uso para publicidade/marketing.

> ⚠ Documentar salvaguardas de **transferência internacional** (art. 33), assinar DPA com
> cada operador e manter a lista atualizada.

## 4. Direitos do titular (art. 18) — como exercer

- **Acesso e portabilidade:** `GET /privacy/export` (ou Configurações → Privacidade →
  *Exportar meus dados*) — devolve JSON com perfil, sessões, auditoria e aceites.
- **Eliminação:** `POST /privacy/delete-account` (Configurações → Privacidade → *Excluir
  conta*). Imediata, com confirmação. Por papel:
  - **OWNER:** anonimiza todos os usuários e **purga os dados de negócio** da empresa;
    retém faturas/assinaturas (fiscal) e o registro de aceites (prova).
  - **Demais:** anonimiza apenas o próprio usuário.
- **Correção:** Configurações → perfil/empresa.
- Todo pedido é registrado em `data_subject_requests` (quem, quando, tipo, escopo).
- Canal alternativo: `privacidade@marketmind.ai`. ⚠ Definir SLA de resposta (LGPD: 15 dias
  para confirmação de existência/acesso).

## 5. Segurança (art. 46)

- Isolamento multi-inquilino por **Row-Level Security** (RLS) do PostgreSQL, por empresa.
- Conexão de runtime com role de **menor privilégio**; migrations com role separada.
- Tokens de marketplace **cifrados em repouso** (AES-256-GCM); senhas com **hash Argon2**.
- Controle de acesso por **RBAC** (permissões) e **trilha de auditoria** global.
- Verificação de e-mail, recuperação de senha com token de uso único, rate limiting.

## 6. Retenção e eliminação

- Dados pessoais são mantidos enquanto a conta existir; na exclusão, são **anonimizados ou
  removidos**, exceto o que a lei exige reter.
- **Retidos por obrigação legal/fiscal:** `invoices`, `subscriptions` (documentos
  financeiros). ⚠ Confirmar prazo (em regra 5 anos).
- **Retidos como prova:** `legal_acceptances` (consentimento) e `audit_logs` (segurança),
  sob legítimo interesse/obrigação legal. ⚠ Definir prazo de expurgo dos logs.

## 7. Pontos pendentes de revisão jurídica (resumo)

1. Designar e publicar o **Encarregado (DPO)**.
2. Validar **bases legais** e a qualificação dos dados de clientes finais.
3. Definir **prazos de retenção** (fiscal e logs) com números.
4. Formalizar **DPA** com operadores e salvaguardas de **transferência internacional**.
5. Revisar os textos de `/legal/terms`, `/legal/privacy`, `/legal/cookies`.
6. Definir **SLA** de atendimento aos direitos do titular.
