import type { SettingsResponse } from '@gitlab-tools/shared';

export function SetupNotice({ settings }: { settings: SettingsResponse }) {
  const project = settings.projects.find((item) => item.id === settings.activeProjectId) ?? settings.projects[0];

  return (
    <section className="notice">
      <h2>GitLab token required</h2>
      <p>
        Review comments are read from{' '}
        {project ? (
          <a href={project.url} target="_blank" rel="noreferrer">
            {project.url}
          </a>
        ) : (
          'the configured project'
        )}
        . The token stays on the API server.
      </p>
      <ol>
        <li>
          In GitLab, open <strong>Preferences → Access Tokens</strong> and create a token with the <code>read_api</code> scope.
        </li>
        <li>
          Copy <code>.env.example</code> to <code>.env</code> in the project root.
        </li>
        <li>
          Set <code>GITLAB_TOKEN</code> to that token.
        </li>
        <li>
          Restart <code>npm run dev</code>.
        </li>
      </ol>
    </section>
  );
}
