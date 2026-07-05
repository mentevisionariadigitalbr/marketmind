import { InviteMemberUseCase } from './invite-member.use-case';
import { AcceptInviteUseCase } from './accept-invite.use-case';
import { AssignRoleUseCase } from './assign-role.use-case';
import { ListUsersUseCase } from './list-users.use-case';
import {
  InMemoryUserRepository,
  InMemoryRbacRepository,
  FakeUnitOfWork,
  FakeTokenService,
  FakePasswordHasher,
} from '../__fixtures__/in-memory.fixture';
import { InvalidInviteError } from '../errors';
import { SYSTEM_ROLE_PERMISSIONS } from '../../domain/permissions';

const COMPANY = 'co-1';

function setup() {
  const users = new InMemoryUserRepository();
  const rbac = new InMemoryRbacRepository();
  const tokens = new FakeTokenService();
  const hasher = new FakePasswordHasher();
  const uow = new FakeUnitOfWork();
  return {
    users,
    rbac,
    tokens,
    invite: new InviteMemberUseCase(uow, users, rbac, tokens),
    accept: new AcceptInviteUseCase(users, tokens, hasher),
    assign: new AssignRoleUseCase(users, rbac),
    list: new ListUsersUseCase(users),
  };
}

describe('Team — convite e aceite', () => {
  it('convite cria membro INVITED com o papel e gera token', async () => {
    const { invite, users, rbac } = setup();
    const result = await invite.execute({ companyId: COMPANY, email: 'm@x.com', name: 'Membro', role: 'MEMBER' });

    const created = await users.findByEmail('m@x.com');
    expect(created?.status).toBe('INVITED');
    expect(result.token).toBeTruthy();
    const authz = await rbac.getEffectiveAuthorization(created!.id);
    expect(authz.roles).toEqual(['MEMBER']);
    // MEMBER tem leitura, não tem iam:write.
    expect(authz.permissions).toContain('dashboard:read');
    expect(authz.permissions).not.toContain('iam:write');
  });

  it('aceitar o convite ativa o usuário e define a senha', async () => {
    const { invite, accept, users } = setup();
    const { token } = await invite.execute({ companyId: COMPANY, email: 'm@x.com', name: 'M', role: 'MEMBER' });

    await accept.execute({ token, password: 'senha-forte-1' });

    const user = await users.findByEmail('m@x.com');
    expect(user?.status).toBe('ACTIVE');
    expect(user?.passwordHash).toBe('hashed:senha-forte-1');
  });

  it('token inválido → InvalidInviteError', async () => {
    const { accept } = setup();
    await expect(accept.execute({ token: 'nope', password: 'senha-forte-1' })).rejects.toBeInstanceOf(InvalidInviteError);
  });

  it('atribuir papel substitui (MEMBER → ADMIN)', async () => {
    const { invite, assign, users, rbac } = setup();
    await invite.execute({ companyId: COMPANY, email: 'm@x.com', name: 'M', role: 'MEMBER' });
    const member = await users.findByEmail('m@x.com');

    await assign.execute({ companyId: COMPANY, userId: member!.id, role: 'ADMIN' });

    const authz = await rbac.getEffectiveAuthorization(member!.id);
    expect(authz.roles).toEqual(['ADMIN']); // substituído, não acumulado
    expect(authz.permissions).toEqual(expect.arrayContaining(SYSTEM_ROLE_PERMISSIONS.ADMIN));
  });

  it('não atribui papel a usuário de outra empresa', async () => {
    const { invite, assign, users } = setup();
    await invite.execute({ companyId: COMPANY, email: 'm@x.com', name: 'M', role: 'MEMBER' });
    const member = await users.findByEmail('m@x.com');
    await expect(assign.execute({ companyId: 'outra', userId: member!.id, role: 'ADMIN' })).rejects.toThrow();
  });

  it('lista membros da empresa', async () => {
    const { invite, list } = setup();
    await invite.execute({ companyId: COMPANY, email: 'a@x.com', name: 'A', role: 'MEMBER' });
    await invite.execute({ companyId: COMPANY, email: 'b@x.com', name: 'B', role: 'ADMIN' });
    const members = await list.execute({ companyId: COMPANY });
    expect(members.map((m) => m.email).sort()).toEqual(['a@x.com', 'b@x.com']);
  });
});
