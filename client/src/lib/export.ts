import type { MergeRequestSummary, ReviewThread } from '@gitlab-tools/shared';

export function exportJson(filename: string, threads: readonly ReviewThread[]): void {
  download(filename, JSON.stringify(threads, null, 2), 'application/json');
}

export function exportCsv(
  filename: string,
  threads: readonly ReviewThread[],
  mergeRequests: readonly MergeRequestSummary[],
): void {
  const byIid = new Map(mergeRequests.map((mergeRequest) => [mergeRequest.iid, mergeRequest]));
  const rows = [
    [
      'mr_iid',
      'mr_title',
      'mr_state',
      'discussion_id',
      'note_id',
      'author_username',
      'author_name',
      'created_at',
      'kind',
      'file',
      'line',
      'resolved',
      'suggestion',
      'url',
      'body',
    ],
  ];

  for (const thread of threads) {
    const mergeRequest = byIid.get(thread.mergeRequestIid);
    for (const note of thread.notes) {
      const file = note.position?.newPath || note.position?.oldPath || thread.position?.newPath || thread.position?.oldPath || '';
      const line = note.position?.newLine ?? note.position?.oldLine ?? thread.position?.newLine ?? thread.position?.oldLine ?? '';
      rows.push([
        String(thread.mergeRequestIid),
        mergeRequest?.title ?? '',
        mergeRequest?.state ?? '',
        thread.id,
        String(note.id),
        note.author.username,
        note.author.name,
        note.createdAt,
        note.kind,
        file,
        line === '' ? '' : String(line),
        note.resolvable ? String(note.resolved) : '',
        String(note.suggestion),
        note.url,
        note.body,
      ]);
    }
  }

  download(`${filename}`, `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`, 'text/csv;charset=utf-8');
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
