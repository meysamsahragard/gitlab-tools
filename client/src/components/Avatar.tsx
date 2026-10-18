import type { UserRef } from '@gitlab-tools/shared';
import { initials } from '../lib/format';

export function Avatar({ user }: { user: UserRef }) {
  if (user.avatarUrl) return <img className="avatar" src={user.avatarUrl} alt="" />;
  return (
    <span className="avatar avatar-fallback" aria-hidden="true">
      {initials(user.name)}
    </span>
  );
}
