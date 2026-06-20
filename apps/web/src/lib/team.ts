/** Fetcher de equipe — Server Components. */
import { cookies } from 'next/headers';
import { apiFetch } from './api';
import { ACCESS_COOKIE } from './cookies';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
}

export async function getMembers(): Promise<Member[] | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  try {
    const res = await apiFetch('/iam/users', { headers: { Authorization: `Bearer ${access}` } });
    if (!res.ok) return null;
    return (await res.json()) as Member[];
  } catch {
    return null;
  }
}
