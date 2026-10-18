import type { ReviewNote, ReviewThread } from '@gitlab-tools/shared';
import type { GitLabDiscussion, GitLabNote } from '../../infrastructure/gitlab/types.ts';
import { mapPosition, mapUser } from '../../infrastructure/gitlab/map.ts';

const SUGGESTION = /```suggestion\b/;

export function mapDiscussions(
  discussions: readonly GitLabDiscussion[],
  mergeRequestIid: number,
  mergeRequestUrl: string,
  gitlabBaseUrl: string,
): ReviewThread[] {
  const threads: ReviewThread[] = [];

  for (const discussion of discussions) {
    const notes = (discussion.notes ?? [])
      .filter((note) => note.system !== true && note.author)
      .map((note) => mapNote(note, mergeRequestUrl, gitlabBaseUrl));

    if (notes.length === 0) continue;

    const positioned = notes.find((note) => note.position);
    const resolvableNotes = notes.filter((note) => note.resolvable);
    threads.push({
      id: discussion.id,
      mergeRequestIid,
      individualNote: discussion.individual_note === true,
      kind: notes.some((note) => note.kind === 'inline') ? 'inline' : 'discussion',
      resolvable: resolvableNotes.length > 0,
      resolved: resolvableNotes.length > 0 && resolvableNotes.every((note) => note.resolved),
      position: positioned?.position ?? null,
      notes,
    });
  }

  return threads;
}

function mapNote(note: GitLabNote, mergeRequestUrl: string, gitlabBaseUrl: string): ReviewNote {
  const position = mapPosition(note.position);
  const inline = note.type === 'DiffNote' || note.type === 'ImageDiffNote' || position !== null;
  const author = note.author;
  if (!author) {
    throw new Error('Review note is missing an author.');
  }

  return {
    id: note.id,
    body: note.body ?? '',
    createdAt: note.created_at,
    updatedAt: note.updated_at,
    author: mapUser(author, gitlabBaseUrl),
    kind: inline ? 'inline' : 'discussion',
    suggestion: SUGGESTION.test(note.body ?? ''),
    resolvable: note.resolvable === true,
    resolved: note.resolved === true,
    resolvedBy: note.resolved_by ? mapUser(note.resolved_by, gitlabBaseUrl) : null,
    position,
    url: `${mergeRequestUrl}#note_${note.id}`,
  };
}
