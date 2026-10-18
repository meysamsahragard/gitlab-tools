import type { MergeRequestSummary, ReviewThread } from '@gitlab-tools/shared';
import { formatPosition } from './format';

export interface CommentListItem {
  index: number;
  mergeRequestIid: number;
  mergeRequestTitle: string;
  author: string;
  location: string | null;
  body: string;
}

export function commentListItems(
  threads: readonly ReviewThread[],
  mergeRequests: readonly MergeRequestSummary[],
): CommentListItem[] {
  const byIid = new Map(mergeRequests.map((mergeRequest) => [mergeRequest.iid, mergeRequest]));
  const items: CommentListItem[] = [];

  for (const thread of threads) {
    const mergeRequest = byIid.get(thread.mergeRequestIid);
    for (const note of thread.notes) {
      const location = formatPosition(note.position ?? thread.position);
      items.push({
        index: items.length + 1,
        mergeRequestIid: thread.mergeRequestIid,
        mergeRequestTitle: mergeRequest?.title ?? '',
        author: note.author.name,
        location,
        body: note.body.trim() || '(empty comment)',
      });
    }
  }

  return items;
}

export function formatCommentList(items: readonly CommentListItem[]): string {
  return items
    .map((item) => {
      const title = item.mergeRequestTitle ? ` ${item.mergeRequestTitle}` : '';
      const location = item.location ? ` — ${item.location}` : '';
      return `${item.index}. !${item.mergeRequestIid}${title} — ${item.author}${location}\n${item.body}`;
    })
    .join('\n\n');
}
