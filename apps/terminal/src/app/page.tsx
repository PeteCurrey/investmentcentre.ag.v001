import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('console_session')?.value;

  if (session === 'active_session') {
    redirect('/brief');
  } else {
    redirect('/login');
  }
}
