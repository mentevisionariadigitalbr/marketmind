import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullMqQueueProvider, JobDispatcher, StructuredLogger } from '@marketmind/queue';
import { JOB_DISPATCHER } from './queue.tokens';
import { NoopJobDispatcher } from './noop-dispatcher';

/**
 * Produtor de jobs para a API. A API apenas DESPACHA (não consome) — o
 * processamento pesado vive em `apps/workers`. Sem REDIS_URL, usa um no-op.
 */
@Global()
@Module({
  providers: [
    {
      provide: JOB_DISPATCHER,
      useFactory: (config: ConfigService): JobDispatcher => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (!redisUrl) return new NoopJobDispatcher();
        const provider = new BullMqQueueProvider({
          redisUrl,
          logger: new StructuredLogger({ service: 'api' }),
        });
        return provider.dispatcher();
      },
      inject: [ConfigService],
    },
  ],
  exports: [JOB_DISPATCHER],
})
export class QueueModule {}
