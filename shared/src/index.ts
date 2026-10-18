export type MergeRequestState = 'opened' | 'closed' | 'merged' | 'locked';

export type MergeRequestStateFilter = MergeRequestState | 'all';

export interface UserRef {
  id: number;
  username: string;
  name: string;
  avatarUrl: string | null;
  webUrl: string;
}

export interface ConfiguredProject {
  id: string;
  path: string;
  url: string;
  default: boolean;
}

export interface SettingsResponse {
  gitlabBaseUrl: string;
  tokenConfigured: boolean;
  projects: ConfiguredProject[];
  activeProjectId: string;
  limits: {
    maxMergeRequests: number;
    maxCollectIds: number;
  };
}

export interface ProjectDetails {
  id: number;
  name: string;
  pathWithNamespace: string;
  webUrl: string;
  defaultBranch: string | null;
  description: string | null;
  avatarUrl: string | null;
}

export interface MergeRequestSummary {
  iid: number;
  title: string;
  state: MergeRequestState;
  webUrl: string;
  sourceBranch: string;
  targetBranch: string;
  author: UserRef;
  reviewers: UserRef[];
  createdAt: string;
  updatedAt: string;
  draft: boolean;
  labels: string[];
  userNotesCount: number;
  upvotes: number;
  downvotes: number;
}

export interface CommentPosition {
  newPath: string | null;
  oldPath: string | null;
  newLine: number | null;
  oldLine: number | null;
}

export interface ReviewNote {
  id: number;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: UserRef;
  kind: 'inline' | 'discussion';
  suggestion: boolean;
  resolvable: boolean;
  resolved: boolean;
  resolvedBy: UserRef | null;
  position: CommentPosition | null;
  url: string;
}

export interface ReviewThread {
  id: string;
  mergeRequestIid: number;
  individualNote: boolean;
  kind: 'inline' | 'discussion';
  resolvable: boolean;
  resolved: boolean;
  position: CommentPosition | null;
  notes: ReviewNote[];
}

export interface CommentStats {
  total: number;
  inline: number;
  discussion: number;
  unresolved: number;
  resolved: number;
}

export interface MergeRequestListResponse {
  project: ConfiguredProject;
  mergeRequests: MergeRequestSummary[];
  total: number | null;
  truncated: boolean;
}

export interface MergeRequestCommentsResponse {
  mergeRequest: MergeRequestSummary;
  threads: ReviewThread[];
  stats: CommentStats;
  truncated: boolean;
}

export interface CollectCommentsRequest {
  iids: number[];
  refresh?: boolean;
}

export interface CollectCommentsResponse {
  threads: ReviewThread[];
  stats: CommentStats;
  errors: Array<{ iid: number; message: string }>;
  truncatedMergeRequests: number[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export function summarizeNotes(
  notes: ReadonlyArray<Pick<ReviewNote, 'kind' | 'resolvable' | 'resolved'>>,
): CommentStats {
  let inline = 0;
  let discussion = 0;
  let unresolved = 0;
  let resolved = 0;

  for (const note of notes) {
    if (note.kind === 'inline') inline += 1;
    else discussion += 1;
    if (!note.resolvable) continue;
    if (note.resolved) resolved += 1;
    else unresolved += 1;
  }

  return {
    total: notes.length,
    inline,
    discussion,
    unresolved,
    resolved,
  };
}
