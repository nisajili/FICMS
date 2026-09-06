import { DEFAULT_ROLE_PERMISSIONS, ROLES, PERMISSIONS } from '@ficms/config';

type RoleKey = keyof typeof DEFAULT_ROLE_PERMISSIONS;
const allRoleKeys = Object.keys(DEFAULT_ROLE_PERMISSIONS) as RoleKey[];

describe('Default role permission matrix', () => {
  it('defines permissions for every default role', () => {
    for (const role of Object.values(ROLES)) {
      expect(DEFAULT_ROLE_PERMISSIONS[role as RoleKey]).toBeDefined();
      expect(Array.isArray(DEFAULT_ROLE_PERMISSIONS[role as RoleKey])).toBe(true);
    }
  });

  it('grants full access to platform admin, org owner, clinic director and clinic admin', () => {
    for (const role of ['platform_admin', 'org_owner', 'clinic_director', 'clinic_admin'] as RoleKey[]) {
      expect(DEFAULT_ROLE_PERMISSIONS[role]).toContain('*');
    }
  });

  it('keeps the patient role self-scoped (no generic patient:view)', () => {
    const patient = DEFAULT_ROLE_PERMISSIONS.patient;
    expect(patient).toContain('patient:view_self');
    expect(patient).not.toContain('patient:view');
  });

  it('permits only known permission actions (wildcards allowed)', () => {
    const actions = Object.values(PERMISSIONS);
    for (const role of allRoleKeys) {
      for (const p of DEFAULT_ROLE_PERMISSIONS[role]) {
        if (p === '*') continue;
        const action = p.split(':')[1];
        expect(action).toBeDefined();
        // Allow `*` as a wildcard action (e.g. `admin:*`).
        if (action === '*') continue;
        expect(actions).toContain(action);
      }
    }
  });
});
