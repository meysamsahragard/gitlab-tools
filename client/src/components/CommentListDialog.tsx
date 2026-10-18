import { useEffect, useId, useState } from 'react';
import type { MergeRequestSummary, ReviewThread } from '@gitlab-tools/shared';
import { commentListItems, formatCommentList } from '../lib/commentList';

interface CommentListDialogProps {
  threads: readonly ReviewThread[];
  mergeRequests: readonly MergeRequestSummary[];
  onClose: () => void;
}

export function CommentListDialog({ threads, mergeRequests, onClose }: CommentListDialogProps) {
  const titleId = useId();
  const items = commentListItems(threads, mergeRequests);
  const text = formatCommentList(items);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function copyList(): Promise<void> {
    setCopyError(null);
    if (copyWithSelection(text)) {
      setCopied(true);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyError('Could not copy. Select the list and copy it manually.');
    }
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-head">
          <div>
            <h2 id={titleId}>Comment list</h2>
            <p className="meta-line">{items.length === 1 ? '1 comment' : `${items.length} comments`}</p>
          </div>
          <div className="button-row">
            <button type="button" className="button primary" onClick={() => void copyList()} disabled={items.length === 0}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" className="button" onClick={onClose}>
              Close
            </button>
          </div>
        </header>
        {copyError ? <p className="banner banner-error">{copyError}</p> : null}
        {items.length === 0 ? (
          <p className="empty">No comments to list.</p>
        ) : (
          <ol className="comment-list">
            {items.map((item) => (
              <li key={item.index}>
                <p className="comment-list-meta">
                  <span className="mr-iid">!{item.mergeRequestIid}</span>
                  {item.mergeRequestTitle ? <span>{item.mergeRequestTitle}</span> : null}
                  <span className="muted">{item.author}</span>
                  {item.location ? <code>{item.location}</code> : null}
                </p>
                <pre>{item.body}</pre>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function copyWithSelection(value: string): boolean {
  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', 'true');
  area.style.position = 'fixed';
  area.style.top = '0';
  area.style.left = '0';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.focus();
  area.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  document.body.removeChild(area);
  return copied;
}
