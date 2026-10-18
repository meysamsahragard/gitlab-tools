export interface GitLabUser {
  id: number;
  username: string;
  name: string;
  avatar_url?: string | null;
  web_url?: string;
}

export interface GitLabNotePosition {
  new_path?: string | null;
  old_path?: string | null;
  new_line?: number | null;
  old_line?: number | null;
  position_type?: string;
}

export interface GitLabNote {
  id: number;
  type?: string | null;
  body?: string | null;
  author?: GitLabUser | null;
  created_at: string;
  updated_at: string;
  system?: boolean;
  resolvable?: boolean;
  resolved?: boolean;
  resolved_by?: GitLabUser | null;
  position?: GitLabNotePosition | null;
}

export interface GitLabDiscussion {
  id: string;
  individual_note?: boolean;
  notes?: GitLabNote[];
}

export interface GitLabMergeRequest {
  iid: number;
  title: string;
  state: string;
  web_url: string;
  source_branch: string;
  target_branch: string;
  author: GitLabUser;
  reviewers?: GitLabUser[];
  created_at: string;
  updated_at: string;
  draft?: boolean;
  work_in_progress?: boolean;
  labels?: string[];
  user_notes_count?: number;
  upvotes?: number;
  downvotes?: number;
}

export interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  default_branch?: string | null;
  description?: string | null;
  avatar_url?: string | null;
}
