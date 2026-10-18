import type { MergeRequestStateFilter, MergeRequestSummary } from '@gitlab-tools/shared';
import { formatRelative } from '../lib/format';
import { Avatar } from './Avatar';

const STATES: Array<{ id: MergeRequestStateFilter; label: string }> = [
  { id: 'opened', label: 'Open' },
  { id: 'merged', label: 'Merged' },
  { id: 'closed', label: 'Closed' },
  { id: 'all', label: 'All' },
];

interface MergeRequestListProps {
  mergeRequests: MergeRequestSummary[];
  selectedIid: number | null;
  state: MergeRequestStateFilter;
  search: string;
  loading: boolean;
  error: string | null;
  truncated: boolean;
  total: number | null;
  limit: number;
  onStateChange: (state: MergeRequestStateFilter) => void;
  onSearchChange: (value: string) => void;
  onSelect: (iid: number) => void;
}

export function MergeRequestList({
  mergeRequests,
  selectedIid,
  state,
  search,
  loading,
  error,
  truncated,
  total,
  limit,
  onStateChange,
  onSearchChange,
  onSelect,
}: MergeRequestListProps) {
  return (
    <nav className="mr-list" aria-label="Merge requests">
      <div className="mr-list-head">
        <div className="segmented" role="group" aria-label="Merge request state">
          {STATES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={state === item.id}
              onClick={() => onStateChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Filter by title, author, branch, or !iid"
          aria-label="Filter merge requests"
        />
        <p className="meta-line">
          {loading ? 'Loading merge requests…' : `${mergeRequests.length} shown`}
          {total !== null && !loading ? ` of ${total}` : ''}
        </p>
        {truncated ? (
          <p className="banner">
            Showing the first {limit} merge requests. Raise <code>gitlab.maxMergeRequests</code> in{' '}
            <code>config/default.json</code> to scan further.
          </p>
        ) : null}
        {error ? <p className="banner banner-error">{error}</p> : null}
      </div>
      <div className="mr-scroll">
        {mergeRequests.length === 0 && !loading ? <p className="empty">No merge requests match.</p> : null}
        {mergeRequests.map((mergeRequest) => (
          <button
            key={mergeRequest.iid}
            type="button"
            className="mr-item"
            aria-current={selectedIid === mergeRequest.iid}
            onClick={() => onSelect(mergeRequest.iid)}
          >
            <span className="mr-item-top">
              <span className="mr-iid">!{mergeRequest.iid}</span>
              <StateBadge state={mergeRequest.state} draft={mergeRequest.draft} />
              <time dateTime={mergeRequest.updatedAt} title={mergeRequest.updatedAt}>
                {formatRelative(mergeRequest.updatedAt)}
              </time>
            </span>
            <span className="mr-title">{mergeRequest.title}</span>
            <span className="mr-branches" title={`${mergeRequest.sourceBranch} → ${mergeRequest.targetBranch}`}>
              {mergeRequest.sourceBranch} → {mergeRequest.targetBranch}
            </span>
            <span className="mr-item-bottom">
              <Avatar user={mergeRequest.author} />
              <span>{mergeRequest.author.name}</span>
              <span className="note-count" title="Note count reported by GitLab, including system notes">
                {mergeRequest.userNotesCount}
              </span>
            </span>
            {mergeRequest.labels.length > 0 ? (
              <span className="label-row">
                {mergeRequest.labels.slice(0, 3).map((label) => (
                  <span key={label} className="label">
                    {label}
                  </span>
                ))}
                {mergeRequest.labels.length > 3 ? <span className="label">+{mergeRequest.labels.length - 3}</span> : null}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </nav>
  );
}

function StateBadge({ state, draft }: { state: MergeRequestSummary['state']; draft: boolean }) {
  return (
    <span className="badge-row">
      <span className={`badge state-${state}`}>{state}</span>
      {draft ? <span className="badge state-draft">draft</span> : null}
    </span>
  );
}
