// src/types.ts

export type UserRole = 'civilian' | 'responder' | 'commander';

export type SessionUser = {
  email: string;
  name?: string | null;
  role?: string | null;
};

export type SessionResponse = {
  user: SessionUser | null;
};
