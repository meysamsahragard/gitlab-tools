import { summarizeNotes, type CollectCommentsResponse, type MergeRequestCommentsResponse, type MergeRequestSummary, type ReviewThread } from '@gitlab-tools/shared';
import { exportCsv, exportJson } from '../lib/export';
import {
  commentAuthors,
  commentFiles,
  filtersAreActive,
  filterThreads,
  groupThreadsByFile,
  groupThreadsByMergeRequest,
  notesIn,
  type CommentFilters,
} from '../lib/threads';
import { ThreadCard } from './ThreadCard';

interface ThreadListProps {
  projectKey: string;
  mode: 'single' | 'all';
  mergeRequests: MergeRequestSummary[];
  selected: MergeRequestSummary | null;
  single: MergeRequestCommentsResponse | null;
  singleLoading: boolean;
  singleError: string | null;
  aggregate: CollectCommentsResponse | null;
  aggregateLoading: boolean;
  aggregateError: string | null;
  filters: CommentFilters;
  listCount: number;
  onFiltersChange: (filters: CommentFilters) => void;
  onLoadAll: () => void;
  onOpenMergeRequest: (iid: number) => void;
}

export function ThreadList({
  projectKey,
  mode,
  mergeRequests,
  selected,
  single,
  singleLoading,
  singleError,
  aggregate,
  aggregateLoading,
  aggregateError,
  filters,
  listCount,
  onFiltersChange,
  onLoadAll,
  onOpenMergeRequest,
}: ThreadListProps) {
  const sourceThreads = mode === 'all' ? aggregate?.threads ?? [] : single?.threads ?? [];
  const visible = filterThreads(sourceThreads, filters);
  const stats = summarizeNotes(notesIn(visible));
  const authors = commentAuthors(sourceThreads);
  const files = commentFiles(sourceThreads);
  const loading = mode === 'all' ? aggregateLoading : singleLoading;
  const error = mode === 'all' ? aggregateError : singleError;
  const hasSource = mode === 'all' ? aggregate !== null : single !== null;
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <section className="comments" aria-label="Review comments">
      <div className="comments-toolbar">
        <div className="comments-title">
          <div>
            <h2>{mode === 'all' ? 'All review comments' : selected ? selected.title : 'Review comments'}</h2>
            {mode === 'single' && selected ? (
              <p className="meta-line">
                !{selected.iid} · {selected.sourceBranch} → {selected.targetBranch}
              </p>
            ) : (
              <p className="meta-line">Human comments on merge requests in the current list. System notes are skipped.</p>
            )}
          </div>
          <div className="button-row">
            <button type="button" className="button primary" onClick={onLoadAll} disabled={aggregateLoading || listCount === 0}>
              {aggregateLoading ? 'Loading comments…' : `Load comments for ${listCount} merge requests`}
            </button>
            {mode === 'single' && selected ? (
              <a className="button" href={selected.webUrl} target="_blank" rel="noreferrer">
                Open merge request
              </a>
            ) : null}
            <button type="button" className="button" disabled={visible.length === 0} onClick={() => exportJson(`review-comments-${projectKey}-${stamp}.json`, visible)}>
              JSON
            </button>
            <button
              type="button"
              className="button"
              disabled={notesIn(visible).length === 0}
              onClick={() => exportCsv(`review-comments-${projectKey}-${stamp}.csv`, visible, mergeRequests)}
            >
              CSV
            </button>
          </div>
        </div>

        {hasSource ? (
          <>
            <p className="stats">
              <span>{stats.total} comments</span>
              <span>{stats.inline} inline</span>
              <span>{stats.discussion} discussion</span>
              <span>{stats.unresolved} unresolved</span>
            </p>
            <div className="filters">
              <input
                type="search"
                value={filters.text}
                placeholder="Search comments"
                aria-label="Search comments"
                onChange={(event) => onFiltersChange({ ...filters, text: event.target.value })}
              />
              <select
                aria-label="Comment kind"
                value={filters.kind}
                onChange={(event) => onFiltersChange({ ...filters, kind: event.target.value as CommentFilters['kind'] })}
              >
                <option value="all">All kinds</option>
                <option value="inline">Inline</option>
                <option value="discussion">Discussion</option>
              </select>
              <select
                aria-label="Resolution"
                value={filters.resolution}
                onChange={(event) => onFiltersChange({ ...filters, resolution: event.target.value as CommentFilters['resolution'] })}
              >
                <option value="all">Any resolution</option>
                <option value="open">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
              <select
                aria-label="Author"
                value={filters.author}
                onChange={(event) => onFiltersChange({ ...filters, author: event.target.value })}
              >
                <option value="all">All authors</option>
                {authors.map((author) => (
                  <option key={author.username} value={author.username}>
                    {author.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="File"
                value={filters.file}
                onChange={(event) => onFiltersChange({ ...filters, file: event.target.value })}
              >
                <option value="all">All files</option>
                {files.map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>
              {filtersAreActive(filters) ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    onFiltersChange({ text: '', kind: 'all', resolution: 'all', author: 'all', file: 'all' })
                  }
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="comments-scroll">
        {mode === 'single' && single?.truncated ? (
          <p className="banner">Some discussions were not loaded because this merge request exceeded the discussion limit.</p>
        ) : null}
        {mode === 'all' && aggregate && aggregate.truncatedMergeRequests.length > 0 ? (
          <p className="banner">
            Discussions were truncated for merge requests {aggregate.truncatedMergeRequests.map((iid) => `!${iid}`).join(', ')}.
          </p>
        ) : null}
        {mode === 'all' && aggregate && aggregate.errors.length > 0 ? (
          <div className="banner banner-error">
            <p>Could not load comments for {aggregate.errors.length} merge requests.</p>
            <ul>
              {aggregate.errors.map((item) => (
                <li key={item.iid}>
                  !{item.iid}: {item.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {error ? <p className="banner banner-error">{error}</p> : null}
        {loading ? <p className="empty">Reading review comments from GitLab. Large lists can take a few minutes.</p> : null}

        {!loading && mode === 'single' && !selected ? (
          <div className="empty-state">
            <h3>Choose a merge request</h3>
            <p>Open one from the list, or load review comments for every merge request currently shown.</p>
          </div>
        ) : null}

        {!loading && mode === 'single' && selected && single && visible.length === 0 ? (
          <p className="empty">{hasSource && filtersAreActive(filters) ? 'No comments match these filters.' : 'No human review comments on this merge request.'}</p>
        ) : null}

        {!loading && mode === 'all' && aggregate && visible.length === 0 ? (
          <p className="empty">{filtersAreActive(filters) ? 'No comments match these filters.' : 'No human review comments in this list.'}</p>
        ) : null}

        {!loading && mode === 'single' && visible.length > 0 ? <ThreadGroups threads={visible} /> : null}
        {!loading && mode === 'all' && visible.length > 0 ? (
          <AggregateGroups
            threads={visible}
            mergeRequests={mergeRequests}
            onOpenMergeRequest={onOpenMergeRequest}
          />
        ) : null}
      </div>
    </section>
  );
}

function ThreadGroups({ threads }: { threads: ReviewThread[] }) {
  return (
    <>
      {groupThreadsByFile(threads).map((group) => (
        <section key={group.file ?? 'general'} className="file-group">
          <h3>{group.file ?? 'General comments'}</h3>
          {group.threads.map((thread) => (
            <ThreadCard key={`${thread.mergeRequestIid}-${thread.id}`} thread={thread} />
          ))}
        </section>
      ))}
    </>
  );
}

function AggregateGroups({
  threads,
  mergeRequests,
  onOpenMergeRequest,
}: {
  threads: ReviewThread[];
  mergeRequests: MergeRequestSummary[];
  onOpenMergeRequest: (iid: number) => void;
}) {
  const grouped = groupThreadsByMergeRequest(threads);
  const known = mergeRequests.map((mergeRequest) => mergeRequest.iid).filter((iid) => grouped.has(iid));
  const extra = [...grouped.keys()].filter((iid) => !known.includes(iid));
  const order = [...known, ...extra];

  return (
    <>
      {order.map((iid) => {
        const mergeRequest = mergeRequests.find((item) => item.iid === iid);
        const mrThreads = grouped.get(iid) ?? [];
        return (
          <section key={iid} className="mr-group">
            <header className="mr-group-head">
              <div>
                <h3>
                  !{iid} {mergeRequest?.title ?? ''}
                </h3>
                <p className="meta-line">{notesIn(mrThreads).length} comments</p>
              </div>
              <div className="button-row">
                <button type="button" className="button" onClick={() => onOpenMergeRequest(iid)}>
                  Focus
                </button>
                {mergeRequest ? (
                  <a className="button" href={mergeRequest.webUrl} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : null}
              </div>
            </header>
            <ThreadGroups threads={mrThreads} />
          </section>
        );
      })}
    </>
  );
}
