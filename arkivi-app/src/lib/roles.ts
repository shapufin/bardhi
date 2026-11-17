import type { Access, FieldAccess } from 'payload';

type RoleUser = { id?: string | number; role?: string } | null | undefined;

export const isSuperuser = (user: RoleUser): boolean => user?.role === 'superuser';

/** Payload access: superusers only. */
export const superuserOnly: Access = ({ req }) => isSuperuser(req.user as RoleUser);

/** Field-level variant of `superuserOnly`. */
export const superuserOnlyField: FieldAccess = ({ req }) => isSuperuser(req.user as RoleUser);
