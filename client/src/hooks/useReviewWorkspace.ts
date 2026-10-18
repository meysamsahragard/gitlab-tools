import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  summarizeNotes,
  type CollectCommentsResponse,
  type MergeRequestCommentsResponse,
  type MergeRequestListResponse,
  type MergeRequestStateFilter,
  type MergeRequestSummary,
  type ProjectDetails,
  type SettingsResponse,
} from '@gitlab-tools/shared';
import { apiGet, apiPost, isAbort, toMessage } from '../api';
import { DEFAULT_COMMENT_FILTERS, type CommentFilters } from '../lib/threads';

export function useReviewWorkspace() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [projectKey, setProjectKey] = useState('');
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [state, setState] = useState<MergeRequestStateFilter>('opened');
  const [mrSearch, setMrSearch] = useState('');
  const [mergeRequests, setMergeRequests] = useState<MergeRequestSummary[]>([]);
  const [listMeta, setListMeta] = useState<{ total: number | null; truncated: boolean }>({ total: null, truncated: false });
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedIid, setSelectedIid] = useState<number | null>(null);
  const [mode, setMode] = useState<'single' | 'all'>('single');
  const [single, setSingle] = useState<MergeRequestCommentsResponse | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [aggregate, setAggregate] = useState<CollectCommentsResponse | null>(null);
  const [aggregateLoading, setAggregateLoading] = useState(false);
  const [aggregateError, setAggregateError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CommentFilters>(DEFAULT_COMMENT_FILTERS);
  const collectSeq = useRef(0);
  const listAbort = useRef<AbortController | null>(null);
  const commentAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const data = await apiGet<SettingsResponse>('/api/settings', controller.signal);
        setSettings(data);
        setProjectKey(data.activeProjectId);
      } catch (error) {
        if (!isAbort(error)) setSettingsError(toMessage(error));
      } finally {
        if (!controller.signal.aborted) setSettingsLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const loadList = useCallback(async (refresh: boolean) => {
    if (!projectKey) return;
    listAbort.current?.abort();
    const controller = new AbortController();
    listAbort.current = controller;
    setListLoading(true);
    setListError(null);
    try {
      const refreshQuery = refresh ? '&refresh=true' : '';
      const [details, list] = await Promise.all([
        apiGet<ProjectDetails>(`/api/projects/${encodeURIComponent(projectKey)}${refresh ? '?refresh=true' : ''}`, controller.signal),
        apiGet<MergeRequestListResponse>(
          `/api/projects/${encodeURIComponent(projectKey)}/merge-requests?state=${state}${refreshQuery}`,
          controller.signal,
        ),
      ]);
      if (controller.signal.aborted) return;
      setProject(details);
      setMergeRequests(list.mergeRequests);
      setListMeta({ total: list.total, truncated: list.truncated });
    } catch (error) {
      if (isAbort(error) || controller.signal.aborted) return;
      if (!refresh) {
        setProject(null);
        setMergeRequests([]);
      }
      setListError(toMessage(error));
    } finally {
      if (!controller.signal.aborted) setListLoading(false);
    }
  }, [projectKey, state]);

  const loadComments = useCallback(async (iid: number, refresh: boolean) => {
    if (!projectKey) return;
    commentAbort.current?.abort();
    const controller = new AbortController();
    commentAbort.current = controller;
    setSingleLoading(true);
    setSingleError(null);
    if (!refresh) setSingle(null);
    try {
      const data = await apiGet<MergeRequestCommentsResponse>(
        `/api/projects/${encodeURIComponent(projectKey)}/merge-requests/${iid}/comments${refresh ? '?refresh=true' : ''}`,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setSingle(data);
    } catch (error) {
      if (isAbort(error) || controller.signal.aborted) return;
      setSingleError(toMessage(error));
    } finally {
      if (!controller.signal.aborted) setSingleLoading(false);
    }
  }, [projectKey]);

  useEffect(() => {
    if (!projectKey || !settings?.tokenConfigured) return;
    void loadList(false);
    return () => listAbort.current?.abort();
  }, [loadList, projectKey, settings?.tokenConfigured]);

  useEffect(() => {
    if (!selectedIid || !projectKey || !settings?.tokenConfigured) return;
    void loadComments(selectedIid, false);
    return () => commentAbort.current?.abort();
  }, [loadComments, projectKey, selectedIid, settings?.tokenConfigured]);

  const filteredMergeRequests = useMemo(() => {
    const query = mrSearch.trim().toLowerCase();
    if (!query) return mergeRequests;
    return mergeRequests.filter((mergeRequest) => {
      const haystack = [
        String(mergeRequest.iid),
        mergeRequest.title,
        mergeRequest.author.name,
        mergeRequest.author.username,
        mergeRequest.sourceBranch,
        mergeRequest.targetBranch,
        ...mergeRequest.labels,
      ]
        .join('\n')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [mergeRequests, mrSearch]);

  async function loadAll(refresh: boolean): Promise<void> {
    if (!projectKey || !settings) return;
    const iids = filteredMergeRequests.map((mergeRequest) => mergeRequest.iid);
    const seq = collectSeq.current + 1;
    collectSeq.current = seq;
    setMode('all');
    setAggregateLoading(true);
    setAggregateError(null);

    if (iids.length === 0) {
      setAggregate({ threads: [], stats: summarizeNotes([]), errors: [], truncatedMergeRequests: [] });
      setAggregateLoading(false);
      return;
    }

    try {
      const combined: CollectCommentsResponse = {
        threads: [],
        stats: summarizeNotes([]),
        errors: [],
        truncatedMergeRequests: [],
      };
      for (const part of chunk(iids, settings.limits.maxCollectIds)) {
        const page = await apiPost<CollectCommentsResponse>(
          `/api/projects/${encodeURIComponent(projectKey)}/review-comments`,
          { iids: part, refresh },
        );
        if (collectSeq.current !== seq) return;
        combined.threads.push(...page.threads);
        combined.errors.push(...page.errors);
        combined.truncatedMergeRequests.push(...page.truncatedMergeRequests);
      }
      combined.stats = summarizeNotes(combined.threads.flatMap((thread) => thread.notes));
      if (collectSeq.current !== seq) return;
      setAggregate(combined);
    } catch (error) {
      if (collectSeq.current !== seq) return;
      setAggregateError(toMessage(error));
    } finally {
      if (collectSeq.current === seq) setAggregateLoading(false);
    }
  }

  function changeState(next: MergeRequestStateFilter): void {
    collectSeq.current += 1;
    setState(next);
    setSelectedIid(null);
    setSingle(null);
    setAggregate(null);
    setMode('single');
  }

  function changeProject(next: string): void {
    collectSeq.current += 1;
    setProjectKey(next);
    setSelectedIid(null);
    setSingle(null);
    setAggregate(null);
    setMode('single');
    setMrSearch('');
    setFilters(DEFAULT_COMMENT_FILTERS);
  }

  function selectMergeRequest(iid: number): void {
    setMode('single');
    setSelectedIid(iid);
  }

  function refresh(): void {
    void loadList(true);
    if (mode === 'all') void loadAll(true);
    else if (selectedIid) void loadComments(selectedIid, true);
  }

  const selected = filteredMergeRequests.find((mergeRequest) => mergeRequest.iid === selectedIid)
    ?? mergeRequests.find((mergeRequest) => mergeRequest.iid === selectedIid)
    ?? null;

  return {
    settings,
    settingsLoading,
    settingsError,
    projectKey,
    project,
    state,
    mrSearch,
    setMrSearch,
    filteredMergeRequests,
    listMeta,
    listLoading,
    listError,
    selectedIid,
    selected,
    mode,
    single,
    singleLoading,
    singleError,
    aggregate,
    aggregateLoading,
    aggregateError,
    filters,
    setFilters,
    changeState,
    changeProject,
    selectMergeRequest,
    loadAll,
    refresh,
  };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const safeSize = Math.max(1, size);
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += safeSize) {
    chunks.push(items.slice(index, index + safeSize));
  }
  return chunks;
}
