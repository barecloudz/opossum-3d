import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const COOKIE_NAME = 'nexalon_ref';
const COOKIE_DURATION_DAYS = 30;

export function setAffiliateCookie(code: string) {
  const expires = new Date();
  expires.setDate(expires.getDate() + COOKIE_DURATION_DAYS);
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

export function getAffiliateCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function clearAffiliateCookie() {
  document.cookie = `${COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

export default function AffiliateTracker() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (!ref) return;

    const code = ref.toUpperCase().trim();
    const subId = params.get('sub')?.trim() || null;

    const trackClick = async () => {
      try {
        const { data: affiliate } = await supabase
          .from('affiliates')
          .select('id')
          .eq('code', code)
          .eq('status', 'approved')
          .single();

        if (!affiliate) return;

        // Dedup: only log one click per session per affiliate
        const dedupKey = `nexalon_clicked_${affiliate.id}`;
        if (sessionStorage.getItem(dedupKey)) {
          // Still refresh cookie even if we don't log another click
          setAffiliateCookie(code);
          return;
        }
        sessionStorage.setItem(dedupKey, '1');

        setAffiliateCookie(code);

        await supabase
          .from('affiliate_clicks')
          .insert({ affiliate_id: affiliate.id, sub_id: subId });
      } catch {
        // silently fail — don't interrupt user experience
      }
    };

    trackClick();
  }, [location.search]);

  return null;
}
