import type { CommentPosition } from '@gitlab-tools/shared';

export function formatRelative(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;
  const delta = time - Date.now();
  const abs = Math.abs(delta);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < hour) return rtf.format(Math.round(delta / minute), 'minute');
  if (abs < day) return rtf.format(Math.round(delta / hour), 'hour');
  if (abs < 30 * day) return rtf.format(Math.round(delta / day), 'day');
  return formatDateTime(iso);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatPosition(position: CommentPosition | null): string | null {
  if (!position) return null;
  const file = position.newPath || position.oldPath;
  if (!file) return null;
  if (position.newLine && position.oldLine && position.newLine !== position.oldLine) {
    return `${file}:${position.oldLine}→${position.newLine}`;
  }
  const line = position.newLine ?? position.oldLine;
  return line ? `${file}:${line}` : file;
}

export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('');
  return letters.toUpperCase() || '?';
}
