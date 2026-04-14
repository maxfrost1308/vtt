import { createClient } from '@/lib/supabase/server';
import { HomeClient } from './home-client';

const ADMIN_IDS = (process.env.VTT_ADMIN_USER_IDS ?? '').split(',').filter(Boolean);

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = user ? ADMIN_IDS.length === 0 || ADMIN_IDS.includes(user.id) : false;

  return <HomeClient user={user ? { id: user.id, email: user.email ?? null, isAdmin } : null} />;
}
