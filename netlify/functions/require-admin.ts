import { createClient } from '@supabase/supabase-js';

type AuthError = { error: { statusCode: number; body: string } };
type AuthSuccess = { user: { id: string } };

async function getVerifiedUser(
  headers: Record<string, string | undefined>
): Promise<AuthError | AuthSuccess> {
  const authHeader = headers['authorization'] || headers['Authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return { error: { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) } };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return { error: { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) } };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { error: { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) } };
  }

  return { user: { id: user.id } };
}

/**
 * Requires any valid authenticated user.
 */
export async function requireAuth(
  headers: Record<string, string | undefined>
): Promise<AuthError | AuthSuccess> {
  return getVerifiedUser(headers);
}

/**
 * Requires a valid authenticated admin user.
 */
export async function requireAdmin(
  headers: Record<string, string | undefined>
): Promise<AuthError | AuthSuccess> {
  const result = await getVerifiedUser(headers);
  if ('error' in result) return result;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', result.user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) } };
  }

  return result;
}
