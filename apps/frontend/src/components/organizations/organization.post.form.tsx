'use client';

import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { Button } from '@gitroom/react/form/button';
import { Input } from '@gitroom/react/form/input';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { ReactNode, useMemo, useState } from 'react';

type FormValues = {
  videoUrl: string;
  caption?: string;
  pageId: string;
  uploadDate?: string;
  thumbnailTimestamp?: string;
  type?: string;
};

type PagesResponse = {
  pages: Array<{
    id: string;
    name: string;
    provider: string;
  }>;
};

type ConfigResponse = {
  tier: string;
  showTypeField: boolean;
};

const timestampRegex = /^([0-5]?\d):([0-5]\d)$/;

export const OrganizationPostForm = () => {
  const user = useUser();
  const fetcher = useFetch();
  const toast = useToaster();
  const [submitting, setSubmitting] = useState(false);
  const orgId = user?.orgId;

  const { data: pagesData, isLoading: loadingPages } = useSWR<PagesResponse>(
    () => (orgId ? `org-pages-${orgId}` : null),
    async () => {
      const res = await fetcher(`/organizations/${orgId}/pages`);
      if (!res.ok) {
        throw new Error('Unable to load pages');
      }
      return await res.json();
    }
  );

  const { data: config } = useSWR<ConfigResponse>(
    () => (orgId ? `org-config-${orgId}` : null),
    async () => {
      const res = await fetcher(`/organizations/${orgId}/form-config`);
      if (!res.ok) {
        throw new Error('Unable to load configuration');
      }
      return await res.json();
    }
  );

  const pages = useMemo(() => pagesData?.pages || [], [pagesData]);

  const form = useForm<FormValues>({
    defaultValues: {
      videoUrl: '',
      caption: '',
      pageId: '',
      uploadDate: '',
      thumbnailTimestamp: '',
      type: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!orgId) {
      toast.danger('No organization selected.');
      return;
    }
    if (!values.pageId) {
      form.setError('pageId', { message: 'Select a page.' });
      return;
    }
    if (values.thumbnailTimestamp && !timestampRegex.test(values.thumbnailTimestamp)) {
      form.setError('thumbnailTimestamp', {
        message: 'Use mm:ss format, e.g. 02:15',
      });
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetcher(`/organizations/${orgId}/form-submit`, {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          uploadDate: values.uploadDate || undefined,
          caption: values.caption || undefined,
          thumbnailTimestamp: values.thumbnailTimestamp || undefined,
          type: config?.showTypeField ? values.type || undefined : undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      toast.success('Submission received. We will process it shortly.');
      form.reset();
    } catch (error: any) {
      toast.danger(error?.message || 'Unable to submit form.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!orgId) {
    return (
      <div className="text-newTextColor/70">
        Select or join an organization to access the form.
      </div>
    );
  }

  if (loadingPages) {
    return <div className="text-newTextColor/70">Loading form...</div>;
  }

  if (!pages.length) {
    return (
      <div className="text-newTextColor/70">
        You do not have access to any pages in this organization. Ask an admin
        to grant publish permissions.
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-[20px] max-w-[720px] w-full"
    >
      <FormSection
        label="Video URL"
        description="Paste the TikTok or social video link you want to publish."
        required
        error={form.formState.errors.videoUrl?.message}
      >
        <Input
          placeholder="https://www.tiktok.com/..."
          {...form.register('videoUrl', { required: 'Video URL is required' })}
        />
      </FormSection>

      <FormSection
        label="Caption"
        description="Leave blank to use the original caption on the destination template."
        error={form.formState.errors.caption?.message}
      >
        <textarea
          placeholder="Enter caption here"
          className="bg-newBgLineColor rounded-[8px] px-[12px] py-[10px] outline-none min-h-[120px]"
          {...form.register('caption')}
        />
      </FormSection>

      <FormSection
        label="Select Page"
        description="Choose the connected page this post should publish to."
        required
        error={form.formState.errors.pageId?.message}
      >
        <select
          className="bg-newBgLineColor rounded-[8px] px-[12px] py-[10px] outline-none"
          {...form.register('pageId', { required: 'Select a page' })}
        >
          <option value="">Select a page</option>
          {pages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.name} • {page.provider}
            </option>
          ))}
        </select>
      </FormSection>

      <FormSection
        label="Upload Date/Time"
        description="Optional. Provide a preferred publish time in your timezone."
        error={form.formState.errors.uploadDate?.message}
      >
        <Input type="datetime-local" {...form.register('uploadDate')} />
      </FormSection>

      <FormSection
        label="Thumbnail Timestamp"
        description="Optional mm:ss mark for thumbnail capture. Example: 02:15"
        error={form.formState.errors.thumbnailTimestamp?.message}
      >
        <Input placeholder="mm:ss" {...form.register('thumbnailTimestamp')} />
      </FormSection>

      {config?.showTypeField && (
        <FormSection
          label="Type"
          description="Optional custom label for reporting or routing."
          error={form.formState.errors.type?.message}
        >
          <Input placeholder="Type" {...form.register('type')} />
        </FormSection>
      )}

      <div>
        <Button type="submit" loading={submitting}>
          Submit
        </Button>
      </div>
    </form>
  );
};

const FormSection = ({
  label,
  description,
  children,
  required,
  error,
}: {
  label: string;
  description?: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
}) => {
  return (
    <div className="flex flex-col gap-[8px]">
      <div>
        <div className="font-semibold">
          {label} {required && <span className="text-red-500">*</span>}
        </div>
        {description && (
          <div className="text-sm text-newTextColor/70">{description}</div>
        )}
      </div>
      {children}
      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
};
