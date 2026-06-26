export const PLATFORM_ADMIN_REPOSITORY = Symbol('PlatformAdminRepository');

export interface PlatformAdminRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

export interface PlatformAdminRepository {
  findByEmail(email: string): Promise<PlatformAdminRecord | null>;
  touchLastLogin(id: string): Promise<void>;
}
