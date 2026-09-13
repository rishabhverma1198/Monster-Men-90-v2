/**
 * Admin audit log – record destructive/sensitive admin actions
 */

import { supabaseAdmin } from '../config/supabase.js';

export type AuditAction =
  | 'product.delete'
  | 'product.soft_delete'
  | 'order.status_update'
  | 'user.role_update'
  | 'user.status_update';

export interface AuditLogEntry {
  admin_id: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip?: string;
  user_agent?: string;
}

/** Write an audit log entry. Fire-and-forget; does not throw. */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: entry.admin_id,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id ?? null,
      old_value: entry.old_value ?? null,
      new_value: entry.new_value ?? null,
      ip: entry.ip ?? null,
      user_agent: entry.user_agent ?? null,
    });
  } catch (err) {
    console.warn('[audit] Failed to write audit log:', (err as Error).message);
  }
}

/** Get IP and User-Agent from Express request */
export function getRequestMeta(req: { ip?: string; headers?: Record<string, string | string[] | undefined> }): { ip?: string; user_agent?: string } {
  const headers = (req as any).headers || {};
  const ff = headers['x-forwarded-for'];
  const ipRaw = Array.isArray(ff) ? ff[0] : ff;
  const ip = (req as any).ip || (typeof ipRaw === 'string' ? ipRaw.split(',')[0]?.trim() : undefined) || (headers['x-real-ip'] as string | undefined);
  const ua = headers['user-agent'];
  const user_agent = typeof ua === 'string' ? ua : Array.isArray(ua) ? ua[0] : undefined;
  return { ip, user_agent };
}
