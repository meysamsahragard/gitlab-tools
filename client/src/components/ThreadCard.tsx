import type { ReviewNote, ReviewThread } from '@gitlab-tools/shared';
import { formatDateTime, formatPosition, formatRelative } from '../lib/format';
import { Avatar } from './Avatar';
import { CommentBody } from './CommentBody';

export function ThreadCard({ thread }: { thread: ReviewThread }) {
  const [first, ...replies] = thread.notes;
  if (!first) return null;
  const location = formatPosition(thread.position);

  return (
    <article className={`thread thread-${thread.kind}`}>
      <div className="thread-meta">
        {location ? <code className="location">{location}</code> : <span className="location">Discussion</span>}
        {thread.resolvable ? (
          <span className={thread.resolved ? 'badge resolved' : 'badge unresolved'}>
            {thread.resolved ? 'Resolved' : 'Unresolved'}
          </span>
        ) : null}
        {thread.notes.some((note) => note.suggestion) ? <span className="badge suggestion">Suggestion</span> : null}
      </div>
      <Note note={first} />
      {replies.length > 0 ? (
        <div className="replies">
          {replies.map((note) => (
            <Note key={note.id} note={note} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function Note({ note }: { note: ReviewNote }) {
  return (
    <div className="note">
      <div className="note-head">
        <Avatar user={note.author} />
        <strong>{note.author.name}</strong>
        <span className="muted">@{note.author.username}</span>
        <time dateTime={note.createdAt} title={formatDateTime(note.createdAt)}>
          {formatRelative(note.createdAt)}
        </time>
        <a className="note-link" href={note.url} target="_blank" rel="noreferrer">
          Open
        </a>
      </div>
      <CommentBody body={note.body} />
      {note.resolved && note.resolvedBy ? <p className="muted">Resolved by {note.resolvedBy.name}</p> : null}
    </div>
  );
}
