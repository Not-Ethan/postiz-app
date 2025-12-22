'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToaster } from '@gitroom/react/toaster/toaster';

type OrganizationResponse = Array<{
  id: string;
  name: string;
  subscription?: {
    subscriptionTier?: string;
  };
  users: Array<{
    role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  }>;
}>;

export const OrganizationsDirectory = () => {
  const fetcher = useFetch();
  const router = useRouter();
  const toast = useToaster();
  const [createName, setCreateName] = useState('');
  const [joinId, setJoinId] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const loadOrganizations = useCallback(async () => {
    const res = await fetcher('/user/organizations');
    if (!res.ok) {
      throw new Error('Failed to load organizations');
    }
    return (await res.json()) as OrganizationResponse;
  }, [fetcher]);

  const { data, isLoading, mutate } = useSWR(
    'organizations:list',
    loadOrganizations,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const setActiveOrganization = useCallback(
    async (orgId: string) => {
      await fetcher('/user/change-org', {
        method: 'POST',
        body: JSON.stringify({ id: orgId }),
      });
      router.push('/launches');
    },
    [fetcher, router]
  );

  const createOrganization = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!createName.trim()) {
        toast.danger('Please provide an organization name.');
        return;
      }
      try {
        setCreating(true);
        const res = await fetcher('/organizations', {
          method: 'POST',
          body: JSON.stringify({ name: createName.trim() }),
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        const organization = await res.json();
        setCreateName('');
        toast.success('Organization created.');
        await mutate();
        await setActiveOrganization(organization.id);
      } catch (error: any) {
        toast.danger(error?.message || 'Unable to create organization.');
      } finally {
        setCreating(false);
      }
    },
    [createName, fetcher, mutate, setActiveOrganization, toast]
  );

  const joinOrganization = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!joinId.trim()) {
        toast.danger('Enter an organization id to join.');
        return;
      }
      try {
        setJoining(true);
        const res = await fetcher('/organizations/join', {
          method: 'POST',
          body: JSON.stringify({ organizationId: joinId.trim() }),
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        setJoinId('');
        toast.success('Joined organization.');
        await mutate();
      } catch (error: any) {
        toast.danger(error?.message || 'Unable to join organization.');
      } finally {
        setJoining(false);
      }
    },
    [fetcher, joinId, mutate, toast]
  );

  const organizations = useMemo(() => data || [], [data]);

  return (
    <div className="flex-1 flex flex-col gap-[24px] p-[24px] text-newTextColor w-full">
      <div className="bg-newBgColorInner rounded-[12px] p-[24px] flex flex-col gap-[16px]">
        <h1 className="text-[28px] font-semibold">Organizations</h1>
        <p className="text-newTextColor/70">
          Select an existing organization, create a new one, or join with an ID
          shared by an owner.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
          <form
            onSubmit={createOrganization}
            className="bg-newBgLineColor rounded-[12px] p-[16px] flex flex-col gap-[12px]"
          >
            <h2 className="text-lg font-semibold">Create Organization</h2>
            <Input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Organization name"
            />
            <Button type="submit" loading={creating}>
              Create
            </Button>
          </form>
          <form
            onSubmit={joinOrganization}
            className="bg-newBgLineColor rounded-[12px] p-[16px] flex flex-col gap-[12px]"
          >
            <h2 className="text-lg font-semibold">Join Organization</h2>
            <Input
              value={joinId}
              onChange={(event) => setJoinId(event.target.value)}
              placeholder="Organization ID"
            />
            <Button type="submit" loading={joining} secondary>
              Join
            </Button>
          </form>
        </div>
      </div>

      <div className="bg-newBgColorInner rounded-[12px] p-[24px] flex-1">
        <h2 className="text-xl font-semibold mb-[16px]">Your organizations</h2>
        {isLoading ? (
          <div className="text-newTextColor/70">Loading organizations...</div>
        ) : organizations.length === 0 ? (
          <div className="text-newTextColor/70">
            No organizations yet. Create or join one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[16px]">
            {organizations.map((organization) => {
              const role = organization.users[0]?.role || 'USER';
              const tier =
                organization.subscription?.subscriptionTier || 'STANDARD';
              return (
                <div
                  key={organization.id}
                  className="border border-borderColor rounded-[12px] p-[16px] flex flex-col gap-[12px] bg-newBgLineColor"
                >
                  <div className="flex flex-wrap gap-[8px] items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">
                        {organization.name}
                      </div>
                      <div className="text-sm text-newTextColor/70">
                        Role: {role} • Tier: {tier}
                      </div>
                    </div>
                    <div className="flex gap-[8px] flex-wrap">
                      {(role === 'ADMIN' || role === 'SUPERADMIN') && (
                        <Button
                          type="button"
                          secondary
                          onClick={() =>
                            router.push(`/organizations/${organization.id}/admin`)
                          }
                        >
                          Admin Panel
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={() => setActiveOrganization(organization.id)}
                      >
                        Enter Dashboard
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-newTextColor/50 break-all">
                    ID: {organization.id}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
