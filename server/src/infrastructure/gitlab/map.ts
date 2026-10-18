import type {
  CommentPosition,
  MergeRequestState,
  MergeRequestSummary,
  ProjectDetails,
  UserRef,
} from '@gitlab-tools/shared';
import type { GitLabMergeRequest, GitLabProject, GitLabUser } from './types.ts';

export function mapProject(project: GitLabProject, baseUrl: string): ProjectDetails {
  const description = project.description?.trim() ?? '';
  return {
    id: project.id,
    name: project.name,
    pathWithNamespace: project.path_with_namespace,
    webUrl: project.web_url,
    defaultBranch: project.default_branch ?? null,
    description: description || null,
    avatarUrl: absoluteUrl(baseUrl, project.avatar_url),
  };
}

export function mapMergeRequest(mergeRequest: GitLabMergeRequest, baseUrl: string): MergeRequestSummary {
  return {
    iid: mergeRequest.iid,
    title: mergeRequest.title,
    state: mapState(mergeRequest.state),
    webUrl: mergeRequest.web_url,
    sourceBranch: mergeRequest.source_branch,
    targetBranch: mergeRequest.target_branch,
    author: mapUser(mergeRequest.author, baseUrl),
    reviewers: (mergeRequest.reviewers ?? []).map((reviewer) => mapUser(reviewer, baseUrl)),
    createdAt: mergeRequest.created_at,
    updatedAt: mergeRequest.updated_at,
    draft: mergeRequest.draft === true || mergeRequest.work_in_progress === true,
    labels: mergeRequest.labels ?? [],
    userNotesCount: mergeRequest.user_notes_count ?? 0,
    upvotes: mergeRequest.upvotes ?? 0,
    downvotes: mergeRequest.downvotes ?? 0,
  };
}

export function mapUser(user: GitLabUser, baseUrl: string): UserRef {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    avatarUrl: absoluteUrl(baseUrl, user.avatar_url),
    webUrl: user.web_url ?? '',
  };
}

export function mapPosition(position: {
  new_path?: string | null;
  old_path?: string | null;
  new_line?: number | null;
  old_line?: number | null;
} | null | undefined): CommentPosition | null {
  if (!position) return null;
  return {
    newPath: position.new_path ?? null,
    oldPath: position.old_path ?? null,
    newLine: position.new_line ?? null,
    oldLine: position.old_line ?? null,
  };
}

function mapState(state: string): MergeRequestState {
  if (state === 'opened' || state === 'closed' || state === 'merged' || state === 'locked') return state;
  return 'closed';
}

function absoluteUrl(baseUrl: string, value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  try {
    return new URL(value, `${baseUrl.replace(/\/+$/, '')}/`).toString();
  } catch {
    return null;
  }
}
