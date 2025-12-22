import { OrganizationAdminPanel } from '@gitroom/frontend/components/organizations/organization.admin.panel';

export default function Page({ params }: { params: { id: string } }) {
  return <OrganizationAdminPanel orgId={params.id} />;
}
