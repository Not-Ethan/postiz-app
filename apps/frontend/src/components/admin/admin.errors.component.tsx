'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { useRouter, useSearchParams } from 'next/navigation';
import { UtcToLocalDateRender } from '@gitroom/react/helpers/utc.date.render';
import clsx from 'clsx';

type AdminErrorRow = {
  id: string;
  message: string;
  body: string;
  platform: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
  };
  post: {
    id: string;
    content: string;
    publishDate: string;
    state: string;
    releaseURL: string | null;
    integration: {
      name: string | null;
      providerIdentifier: string;
    };
  };
};

type AdminErrorsResponse = {
  total: number;
  page: number;
  pageSize: number;
  errors: AdminErrorRow[];
};

export const AdminErrorsComponent = () => {
  const fetch = useFetch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const pageSize = 25;

  const load = useCallback(
    async (path: string) => {
      return (await fetch(path)).json() as Promise<AdminErrorsResponse>;
    },
    [fetch]
  );

  const { data, isLoading } = useSWR(
    `/admin/errors?page=${page}&pageSize=${pageSize}`,
    load,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenHidden: false,
      revalidateIfStale: false,
    }
  );

  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.max(1, Math.ceil(data.total / pageSize));
  }, [data?.total]);

  const changePage = useCallback(
    (nextPage: number) => () => {
      router.replace(`/admin?page=${nextPage}`);
    },
    [router]
  );

  return (
    <div className="flex flex-1 flex-col gap-[16px] p-[20px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[22px] font-[600] text-newTextColor">
            Admin Errors
          </div>
          <div className="text-[12px] text-textItemBlur">
            {data?.total ?? 0} total
          </div>
        </div>
        <div className="flex items-center gap-[8px] text-textItemBlur">
          <button
            className={clsx(
              'px-[10px] py-[6px] rounded-[8px] border border-tableBorder',
              (page <= 1 || isLoading) && 'opacity-50 pointer-events-none'
            )}
            onClick={changePage(page - 1)}
          >
            Prev
          </button>
          <div className="text-[12px]">
            Page {page} / {totalPages}
          </div>
          <button
            className={clsx(
              'px-[10px] py-[6px] rounded-[8px] border border-tableBorder',
              (page >= totalPages || isLoading) &&
                'opacity-50 pointer-events-none'
            )}
            onClick={changePage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
      <div className="bg-newBgColorInner border border-tableBorder rounded-[12px] overflow-hidden">
        <div className="grid grid-cols-[160px_160px_140px_1fr_1.5fr] gap-[12px] text-[12px] text-textItemBlur px-[16px] py-[12px] border-b border-tableBorder">
          <div>Time</div>
          <div>Org</div>
          <div>Platform</div>
          <div>Error</div>
          <div>Post</div>
        </div>
        {isLoading && (
          <div className="px-[16px] py-[20px] text-textItemBlur">
            Loading...
          </div>
        )}
        {!isLoading && (!data?.errors || data.errors.length === 0) && (
          <div className="px-[16px] py-[20px] text-textItemBlur">
            No errors found.
          </div>
        )}
        {data?.errors?.map((error) => (
          <div
            key={error.id}
            className="grid grid-cols-[160px_160px_140px_1fr_1.5fr] gap-[12px] px-[16px] py-[12px] text-[12px] text-newTextColor border-b border-tableBorder last:border-b-0"
          >
            <div className="text-textItemBlur">
              <UtcToLocalDateRender date={error.createdAt} format="MMM D, YYYY HH:mm" />
            </div>
            <div className="truncate" title={error.organization?.name}>
              {error.organization?.name || 'Unknown'}
            </div>
            <div className="uppercase text-textItemBlur">
              {error.platform}
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="line-clamp-2" title={error.message}>
                {error.message}
              </div>
              {error.body && error.body !== '{}' && (
                <details className="text-textItemBlur">
                  <summary className="cursor-pointer">Body</summary>
                  <pre className="whitespace-pre-wrap break-words text-[11px] mt-[6px]">
                    {error.body}
                  </pre>
                </details>
              )}
            </div>
            <div className="flex flex-col gap-[6px]">
              <div className="line-clamp-2" title={error.post?.content}>
                {error.post?.content || 'No post content'}
              </div>
              <div className="text-textItemBlur">
                {error.post?.state}
                {error.post?.publishDate && (
                  <span>
                    {' '}
                    ·{' '}
                    <UtcToLocalDateRender
                      date={error.post.publishDate}
                      format="MMM D, YYYY HH:mm"
                    />
                  </span>
                )}
              </div>
              {error.post?.releaseURL && (
                <a
                  href={error.post.releaseURL}
                  className="text-[11px] underline text-textItemBlur"
                  target="_blank"
                  rel="noreferrer"
                >
                  View published post
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
