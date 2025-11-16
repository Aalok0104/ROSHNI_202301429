// src/types.ts

export type UserRole = 'civilian' | 'responder' | 'commander';

export type SessionUser = {
  id?: string;
  email: string;
  name?: string | null;
  role?: string | null;
  needsRegistration?: boolean;
};

export type SessionResponse = {
  user: SessionUser | null;
};
