import { Inject, Injectable } from '@nestjs/common';
import {
  MERCADO_LIVRE_OAUTH,
  MercadoLivreOAuthPort,
} from '../../domain/ports/mercado-livre.port';

@Injectable()
export class GetMercadoLivreAuthUrlUseCase {
  constructor(@Inject(MERCADO_LIVRE_OAUTH) private readonly oauth: MercadoLivreOAuthPort) {}

  execute(input: { state?: string }): { url: string } {
    return { url: this.oauth.authorizationUrl(input.state) };
  }
}
