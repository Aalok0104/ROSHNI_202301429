// src/types.ts

export type UserRole = 'civilian' | 'responder' | 'commander';

export type SessionUser = {
  user_id: string;
  email: string;
  role: string;
  is_profile_complete: boolean;
  profile_picture?: string | null;
};

export type SessionResponse = {
  user: SessionUser | null;
};
