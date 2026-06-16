export const GOOGLE_VERIFIER = Symbol('GoogleVerifier');

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export interface GoogleVerifier {
  /** Valida o ID token do Google e devolve o perfil, ou lança em caso inválido. */
  verify(idToken: string): Promise<GoogleProfile>;
}
