import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeNotes } from '@gitlab-tools/shared';
import type { GitLabDiscussion } from '../../infrastructure/gitlab/types.ts';
import { mapDiscussions } from './mapper.ts';

const author = {
  id: 7,
  username: 'reviewer',
  name: 'Reviewer',
  avatar_url: '/uploads/avatar.png',
  web_url: 'http://gitlab.corp.mabnadp.com/reviewer',
};

test('maps inline review threads and drops system notes', () => {
  const discussions: GitLabDiscussion[] = [
    {
      id: 'thread-1',
      individual_note: false,
      notes: [
        {
          id: 10,
          type: 'DiffNote',
          body: 'Please rename this.\n\n```suggestion\nconst total = 1;\n```',
          author,
          created_at: '2026-10-01T10:00:00.000Z',
          updated_at: '2026-10-01T10:00:00.000Z',
          system: false,
          resolvable: true,
          resolved: false,
          position: {
            new_path: 'src/app.ts',
            old_path: 'src/app.ts',
            new_line: 42,
            old_line: null,
          },
        },
        {
          id: 11,
          type: 'DiscussionNote',
          body: 'Updated.',
          author,
          created_at: '2026-10-01T11:00:00.000Z',
          updated_at: '2026-10-01T11:00:00.000Z',
          system: false,
          resolvable: true,
          resolved: true,
          position: null,
        },
        {
          id: 12,
          type: null,
          body: 'assigned to @dev',
          author,
          created_at: '2026-10-01T09:00:00.000Z',
          updated_at: '2026-10-01T09:00:00.000Z',
          system: true,
        },
      ],
    },
    {
      id: 'system-only',
      individual_note: true,
      notes: [
        {
          id: 13,
          type: null,
          body: 'changed the description',
          author,
          created_at: '2026-10-01T08:00:00.000Z',
          updated_at: '2026-10-01T08:00:00.000Z',
          system: true,
        },
      ],
    },
  ];

  const threads = mapDiscussions(
    discussions,
    15,
    'http://gitlab.corp.mabnadp.com/mabna/emax-web-v2/-/merge_requests/15',
    'http://gitlab.corp.mabnadp.com',
  );

  assert.equal(threads.length, 1);
  const thread = threads[0];
  assert.ok(thread);
  assert.equal(thread.kind, 'inline');
  assert.equal(thread.position?.newPath, 'src/app.ts');
  assert.equal(thread.position?.newLine, 42);
  assert.equal(thread.notes.length, 2);
  assert.equal(thread.notes[0]?.suggestion, true);
  assert.equal(thread.notes[0]?.kind, 'inline');
  assert.equal(thread.notes[1]?.kind, 'discussion');
  assert.equal(thread.notes[0]?.url, 'http://gitlab.corp.mabnadp.com/mabna/emax-web-v2/-/merge_requests/15#note_10');
  assert.equal(thread.notes[0]?.author.avatarUrl, 'http://gitlab.corp.mabnadp.com/uploads/avatar.png');
  assert.equal(thread.resolved, false);

  const stats = summarizeNotes(thread.notes);
  assert.deepEqual(stats, {
    total: 2,
    inline: 1,
    discussion: 1,
    unresolved: 1,
    resolved: 1,
  });
});

test('keeps general merge request comments', () => {
  const threads = mapDiscussions(
    [
      {
        id: 'general',
        individual_note: true,
        notes: [
          {
            id: 20,
            type: null,
            body: 'Looks good overall.',
            author,
            created_at: '2026-10-02T10:00:00.000Z',
            updated_at: '2026-10-02T10:00:00.000Z',
            system: false,
            resolvable: false,
          },
        ],
      },
    ],
    4,
    'http://gitlab.corp.mabnadp.com/mabna/emax-web-v2/-/merge_requests/4',
    'http://gitlab.corp.mabnadp.com',
  );

  assert.equal(threads.length, 1);
  assert.equal(threads[0]?.kind, 'discussion');
  assert.equal(threads[0]?.position, null);
  assert.equal(threads[0]?.notes[0]?.body, 'Looks good overall.');
});
