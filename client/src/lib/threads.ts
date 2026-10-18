import type { ReviewNote, ReviewThread } from '@gitlab-tools/shared';

export interface CommentFilters {
  text: string;
  kind: 'all' | 'inline' | 'discussion';
  resolution: 'all' | 'open' | 'resolved';
  author: string;
  file: string;
}

export const DEFAULT_COMMENT_FILTERS: CommentFilters = {
  text: '',
  kind: 'all',
  resolution: 'all',
  author: 'all',
  file: 'all',
};

export function filtersAreActive(filters: CommentFilters): boolean {
  return (
    filters.text.trim() !== '' ||
    filters.kind !== 'all' ||
    filters.resolution !== 'all' ||
    filters.author !== 'all' ||
    filters.file !== 'all'
  );
}

export function filterThreads(threads: readonly ReviewThread[], filters: CommentFilters): ReviewThread[] {
  const text = filters.text.trim().toLowerCase();
  return threads.filter((thread) => {
    if (filters.kind !== 'all' && thread.kind !== filters.kind) return false;
    if (filters.resolution === 'open' && (!thread.resolvable || thread.resolved)) return false;
    if (filters.resolution === 'resolved' && (!thread.resolvable || !thread.resolved)) return false;
    if (filters.author !== 'all' && !thread.notes.some((note) => note.author.username === filters.author)) return false;
    if (filters.file !== 'all') {
      const file = thread.position?.newPath || thread.position?.oldPath;
      if (file !== filters.file) return false;
    }
    if (!text) return true;
    const file = thread.position?.newPath || thread.position?.oldPath || '';
    const haystack = [file, ...thread.notes.flatMap((note) => [note.body, note.author.name, note.author.username])]
      .join('\n')
      .toLowerCase();
    return haystack.includes(text);
  });
}

export interface FileGroup {
  file: string | null;
  threads: ReviewThread[];
}

export function groupThreadsByFile(threads: readonly ReviewThread[]): FileGroup[] {
  const general: ReviewThread[] = [];
  const byFile = new Map<string, ReviewThread[]>();

  for (const thread of threads) {
    if (thread.kind !== 'inline') {
      general.push(thread);
      continue;
    }
    const file = thread.position?.newPath || thread.position?.oldPath || 'Unknown file';
    const list = byFile.get(file) ?? [];
    list.push(thread);
    byFile.set(file, list);
  }

  const groups: FileGroup[] = [...byFile.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([file, list]) => ({
      file,
      threads: [...list].sort((left, right) => lineOf(left) - lineOf(right) || createdOf(left).localeCompare(createdOf(right))),
    }));

  if (general.length > 0) groups.push({ file: null, threads: general });
  return groups;
}

export function groupThreadsByMergeRequest(threads: readonly ReviewThread[]): Map<number, ReviewThread[]> {
  const grouped = new Map<number, ReviewThread[]>();
  for (const thread of threads) {
    const list = grouped.get(thread.mergeRequestIid) ?? [];
    list.push(thread);
    grouped.set(thread.mergeRequestIid, list);
  }
  return grouped;
}

export function commentAuthors(threads: readonly ReviewThread[]): Array<{ username: string; name: string }> {
  const authors = new Map<string, string>();
  for (const thread of threads) {
    for (const note of thread.notes) authors.set(note.author.username, note.author.name);
  }
  return [...authors.entries()]
    .map(([username, name]) => ({ username, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function commentFiles(threads: readonly ReviewThread[]): string[] {
  const files = new Set<string>();
  for (const thread of threads) {
    const file = thread.position?.newPath || thread.position?.oldPath;
    if (file) files.add(file);
  }
  return [...files].sort((left, right) => left.localeCompare(right));
}

export function notesIn(threads: readonly ReviewThread[]): ReviewNote[] {
  return threads.flatMap((thread) => thread.notes);
}

function lineOf(thread: ReviewThread): number {
  return thread.position?.newLine ?? thread.position?.oldLine ?? Number.MAX_SAFE_INTEGER;
}

function createdOf(thread: ReviewThread): string {
  return thread.notes[0]?.createdAt ?? '';
}
