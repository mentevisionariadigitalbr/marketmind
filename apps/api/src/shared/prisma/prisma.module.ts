import { Global, Module } from '@nestjs/common';
import { PrismaService } from '@marketmind/kernel';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
