# ADR-0003 — Event-driven com BullMQ + padrão Outbox

**Status:** Aceito · **Data:** 2026-06-15

## Contexto

Sincronização de marketplace, recálculo de DRE, execução de agentes de IA e envio de alertas são
operações lentas, sujeitas a falha de terceiros e que não podem bloquear a request do usuário nem
o ACK de webhooks. Precisamos de assincronismo confiável e desacoplamento entre bounded contexts.

## Decisão

Comunicação entre contexts por **eventos de domínio**, processados de forma assíncrona via
**BullMQ (Redis)**. Para garantir consistência entre escrita no banco e publicação do evento,
usamos o **padrão Outbox**: o evento é gravado na tabela `events` na mesma transação da mudança
de estado; um relay publica na fila. Jobs são **idempotentes**, com retry + backoff exponencial e
**dead-letter queue**. A tabela `jobs` espelha o estado para observabilidade.

## Alternativas consideradas

- **Chamada síncrona entre módulos:** acopla contexts e propaga falha de terceiros ao usuário.
- **Kafka/RabbitMQ:** mais robustos para event streaming, porém overhead operacional alto para o
  estágio atual; Redis/BullMQ já é dependência (cache) e cobre o caso de uso.

## Consequências

- (+) Webhooks respondem rápido; trabalho pesado isolado em workers.
- (+) Contexts desacoplados e resilientes a falha de APIs externas.
- (+) Outbox evita "escreveu no banco mas perdeu o evento".
- (−) Complexidade de idempotência e de garantir exactly-once efetivo (mitigado por chaves naturais).
- (−) Necessário monitorar profundidade de fila e DLQ.
