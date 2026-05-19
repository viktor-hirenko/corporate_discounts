/// <reference types="@cloudflare/workers-types" />

import type { Env } from './index'

/**
 * Admin allowlist storage and role checks.
 * Allowlist lives in R2 at data/admin-allowlist.json and is cached in-memory
 * for a short TTL. Cache is invalidated after writes via invalidateAllowlist().
 */

export type Role = 'admin' | 'editor'

export interface AllowedUser {
  id: string
  email: string
  name: string
  role: Role
  addedAt: string
  addedBy: string
}

export const ALLOWLIST_KEY = 'data/admin-allowlist.json'

/** Кеш утримується недовго: компроміс між latency та свіжістю після ротації ролей. */
const ALLOWLIST_TTL_MS = 30_000

let allowlistCache: { users: AllowedUser[]; expiresAt: number } | null = null

function isAllowedUser(value: unknown): value is AllowedUser {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.email === 'string' &&
    typeof v.name === 'string' &&
    (v.role === 'admin' || v.role === 'editor') &&
    typeof v.id === 'string'
  )
}

async function readAllowlistFromR2(env: Env): Promise<AllowedUser[]> {
  const object = await env.R2_BUCKET.get(ALLOWLIST_KEY)
  if (!object) return []
  try {
    const raw = await object.json<unknown>()
    if (!Array.isArray(raw)) return []
    return raw.filter(isAllowedUser)
  } catch {
    return []
  }
}

/** Loads the admin allowlist from R2, with short in-memory cache. */
export async function loadAllowlist(env: Env): Promise<AllowedUser[]> {
  if (allowlistCache && allowlistCache.expiresAt > Date.now()) {
    return allowlistCache.users
  }
  const users = await readAllowlistFromR2(env)
  allowlistCache = { users, expiresAt: Date.now() + ALLOWLIST_TTL_MS }
  return users
}

/** Drops the in-memory allowlist cache. Call after any write. */
export function invalidateAllowlist(): void {
  allowlistCache = null
}

/** Persists the allowlist to R2 and invalidates cache. */
export async function saveAllowlist(env: Env, users: AllowedUser[]): Promise<void> {
  await env.R2_BUCKET.put(ALLOWLIST_KEY, JSON.stringify(users, null, 2), {
    httpMetadata: { contentType: 'application/json' },
  })
  invalidateAllowlist()
}

/**
 * Returns the role for the given email, or null if the user is not allowed.
 * Comparison is case-insensitive.
 */
export async function getUserRole(email: string, env: Env): Promise<Role | null> {
  const list = await loadAllowlist(env)
  const found = list.find((u) => u.email.toLowerCase() === email.toLowerCase())
  return found?.role ?? null
}
