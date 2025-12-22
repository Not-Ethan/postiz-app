'use client';

import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { MultiSelect, Select } from '@mantine/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useRouter } from 'next/navigation';

type Member = {
  id: string;
  role: 'USER' | 'ADMIN' | 'SUPERADMIN';
  pagePermissions?: Array<{ integrationId: string }>;
  user: {
    email: string;
    id: string;
    name?: string | null;
  };
};

type PagesResponse = {
  pages: Array<{ id: string; name: string; provider: string }>;
};

const tierOptions = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'PRO', label: 'Pro' },
  { value: 'TEAM', label: 'Team' },
  { value: 'ULTIMATE', label: 'Ultimate' },
];

export const OrganizationAdminPanel = ({ orgId }: { orgId: string }) => {
  const fetcher = useFetch();
  const toast = useToaster();
  const router = useRouter();

  const { data: membersData, mutate: mutateMembers } = useSWR(
    ['organization-members', orgId],
    async () => {
      const res = await fetcher(`/organizations/${orgId}/members`);
      if (!res.ok) {
        throw new Error('Unable to load members');
      }
      return (await res.json()) as { users: Member[] };
    }
  );

  const { data: pagesData } = useSWR<PagesResponse>(
    ['organization-pages', orgId],
    async () => {
      const res = await fetcher(`/organizations/${orgId}/pages`);
      if (!res.ok) {
        throw new Error('Unable to load pages');
      }
      return await res.json();
    }
  );

  const { data: config } = useSWR(
    ['organization-config', orgId],
    async () => {
      const res = await fetcher(`/organizations/${orgId}/form-config`);
      if (!res.ok) {
        throw new Error('Unable to load config');
      }
      return await res.json();
    }
  );

  const pageOptions = useMemo(
    () =>
      (pagesData?.pages || []).map((page) => ({
        value: page.id,
        label: `${page.name} • ${page.provider}`,
      })),
    [pagesData]
  );

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'USER'>('USER');
  const [inviting, setInviting] = useState(false);

  const [roleSaving, setRoleSaving] = useState<Record<string, boolean>>({});
  const [pagesSaving, setPagesSaving] = useState<Record<string, boolean>>({});

  const [tier, setTier] = useState('STANDARD');
  const [totalChannels, setTotalChannels] = useState('');
  const [isLifetime, setIsLifetime] = useState(false);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);

  useEffect(() => {
    if (config?.tier) {
      setTier(config.tier);
    }
  }, [config?.tier]);

  const inviteMember = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!inviteEmail.trim()) {
        toast.danger('Please provide an email address.');
        return;
      }
      try {
        setInviting(true);
        const res = await fetcher(`/organizations/${orgId}/members`, {
          method: 'POST',
          body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        setInviteEmail('');
        toast.success('Member added.');
        await mutateMembers();
      } catch (error: any) {
        toast.danger(error?.message || 'Unable to add member.');
      } finally {
        setInviting(false);
      }
    },
    [fetcher, inviteEmail, inviteRole, mutateMembers, orgId, toast]
  );

  const updateRole = useCallback(
    async (memberId: string, role: 'ADMIN' | 'USER') => {
      try {
        setRoleSaving((prev) => ({ ...prev, [memberId]: true }));
        const res = await fetcher(`/organizations/${orgId}/members/${memberId}`, {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        toast.success('Role updated.');
        await mutateMembers();
      } catch (error: any) {
        toast.danger(error?.message || 'Unable to update role.');
      } finally {
        setRoleSaving((prev) => ({ ...prev, [memberId]: false }));
      }
    },
    [fetcher, mutateMembers, orgId, toast]
  );

  const updatePages = useCallback(
    async (memberId: string, integrationIds: string[]) => {
      try {
        setPagesSaving((prev) => ({ ...prev, [memberId]: true }));
        const res = await fetcher(
          `/organizations/${orgId}/members/${memberId}/pages`,
          {
            method: 'PATCH',
            body: JSON.stringify({ integrationIds }),
          }
        );
        if (!res.ok) {
          throw new Error(await res.text());
        }
        toast.success('Permissions updated.');
        await mutateMembers();
      } catch (error: any) {
        toast.danger(error?.message || 'Unable to update permissions.');
      } finally {
        setPagesSaving((prev) => ({ ...prev, [memberId]: false }));
      }
    },
    [fetcher, mutateMembers, orgId, toast]
  );

  const updateSubscription = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      try {
        setUpdatingSubscription(true);
        const payload: {
          tier: string;
          totalChannels?: number;
          isLifetime?: boolean;
        } = {
          tier,
        };
        if (totalChannels) {
          payload.totalChannels = Number(totalChannels);
        }
        if (isLifetime) {
          payload.isLifetime = true;
        }
        const res = await fetcher(`/organizations/${orgId}/subscription`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(await res.text());
        }
        toast.success('Subscription updated.');
      } catch (error: any) {
        toast.danger(error?.message || 'Unable to update subscription.');
      } finally {
        setUpdatingSubscription(false);
      }
    },
    [fetcher, isLifetime, orgId, tier, toast, totalChannels]
  );

  const members: Member[] = membersData?.users || [];

  return (
    <div className="flex-1 flex flex-col gap-[16px] p-[24px] text-newTextColor">
      <div className="flex flex-wrap gap-[12px] items-center">
        <Button secondary onClick={() => router.push('/organizations')}>
          Back to organizations
        </Button>
        <Button onClick={() => router.push('/launches')}>
          View dashboard
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px]">
        <form
          onSubmit={inviteMember}
          className="bg-newBgColorInner rounded-[12px] p-[16px] flex flex-col gap-[12px]"
        >
          <h2 className="text-lg font-semibold">Add existing member</h2>
          <Input
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="User email"
            type="email"
          />
          <Select
            data={[
              { value: 'USER', label: 'Publisher' },
              { value: 'ADMIN', label: 'Admin' },
            ]}
            value={inviteRole}
            onChange={(value) => setInviteRole((value as any) || 'USER')}
            classNames={{ input: '!bg-newBgLineColor !text-newTextColor' }}
          />
          <Button type="submit" loading={inviting}>
            Invite member
          </Button>
        </form>
        <form
          onSubmit={updateSubscription}
          className="bg-newBgColorInner rounded-[12px] p-[16px] flex flex-col gap-[12px]"
        >
          <h2 className="text-lg font-semibold">Manual subscription</h2>
          <Select
            data={tierOptions}
            value={tier}
            onChange={(value) => setTier((value as string) || 'STANDARD')}
            classNames={{ input: '!bg-newBgLineColor !text-newTextColor' }}
          />
          <Input
            type="number"
            min={1}
            value={totalChannels}
            onChange={(event) => setTotalChannels(event.target.value)}
            placeholder="Total channels"
          />
          <label className="flex items-center gap-[8px] text-sm">
            <input
              type="checkbox"
              checked={isLifetime}
              onChange={(event) => setIsLifetime(event.target.checked)}
            />
            Lifetime access
          </label>
          <Button type="submit" loading={updatingSubscription}>
            Save subscription
          </Button>
        </form>
      </div>

      <div className="bg-newBgColorInner rounded-[12px] p-[16px] flex flex-col gap-[12px]">
        <h2 className="text-lg font-semibold">Members</h2>
        {members.length === 0 ? (
          <div className="text-newTextColor/70">
            No team members yet. Invite existing users to collaborate.
          </div>
        ) : (
          <div className="flex flex-col gap-[12px]">
            {members.map((member) => {
              const currentPages =
                member.pagePermissions?.map((permission) => permission.integrationId) ||
                [];
              const canEditRole =
                member.role === 'ADMIN' || member.role === 'USER';
              return (
                <div
                  key={member.id}
                  className="border border-borderColor rounded-[12px] p-[16px] flex flex-col gap-[12px]"
                >
                  <div>
                    <div className="font-semibold">{member.user.email}</div>
                    <div className="text-sm text-newTextColor/60">
                      {member.user.name || member.user.id}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                    <div className="flex flex-col gap-[8px]">
                      <label className="text-xs uppercase text-newTextColor/60">
                        Role
                      </label>
                      {canEditRole ? (
                        <Select
                          value={member.role}
                          data={[
                            { value: 'USER', label: 'Publisher' },
                            { value: 'ADMIN', label: 'Admin' },
                          ]}
                          onChange={(value) =>
                            value &&
                            updateRole(member.id, value as 'ADMIN' | 'USER')
                          }
                          disabled={roleSaving[member.id]}
                          classNames={{
                            input:
                              '!bg-newBgLineColor !text-newTextColor capitalize',
                          }}
                        />
                      ) : (
                        <div className="px-[12px] py-[10px] bg-newBgLineColor rounded-[8px]">
                          {member.role}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-[8px]">
                      <label className="text-xs uppercase text-newTextColor/60">
                        Page access
                      </label>
                      {member.role === 'USER' ? (
                        <MultiSelect
                          data={pageOptions}
                          value={currentPages}
                          onChange={(value) => updatePages(member.id, value)}
                          searchable
                          disabled={pagesSaving[member.id]}
                          classNames={{
                            input: '!bg-newBgLineColor !text-newTextColor',
                          }}
                          placeholder="Select allowed pages"
                        />
                      ) : (
                        <div className="text-newTextColor/70">
                          Admins have access to all pages.
                        </div>
                      )}
                    </div>
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
