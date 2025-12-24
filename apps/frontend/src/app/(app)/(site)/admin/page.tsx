import { internalFetch } from '@gitroom/helpers/utils/internal.fetch';
import { redirect } from 'next/navigation';
import { AdminErrorsComponent } from '@gitroom/frontend/components/admin/admin.errors.component';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await (await internalFetch('/user/self')).json();
  if (!user?.admin) {
    redirect('/');
  }

  return <AdminErrorsComponent />;
}
