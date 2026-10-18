import type { MergeRequestStateFilter } from '@gitlab-tools/shared';
import { MergeRequestList } from './components/MergeRequestList';
import { SetupNotice } from './components/SetupNotice';
import { ThreadList } from './components/ThreadList';
import { useReviewWorkspace } from './hooks/useReviewWorkspace';

export function App() {
  const workspace = useReviewWorkspace();
  const configured = workspace.settings?.projects.find((project) => project.id === workspace.projectKey)
    ?? workspace.settings?.projects.find((project) => project.id === workspace.settings?.activeProjectId);
  const projectUrl = workspace.project?.webUrl ?? configured?.url;
  const projectLabel = workspace.project?.pathWithNamespace ?? configured?.path ?? 'Project';
  const busy = workspace.listLoading || workspace.singleLoading || workspace.aggregateLoading;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" />
            <path
              fill="#fff"
              d="M8 9h16v8.2a5 5 0 0 1-5 5H13l-4.2 3.3a.8.8 0 0 1-1.3-.6V22H8a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z"
            />
          </svg>
          <div>
            <p className="product">GitLab Tools</p>
            <h1>Review comments</h1>
          </div>
        </div>
        <div className="topbar-project">
          {workspace.settings && workspace.settings.projects.length > 1 ? (
            <select
              aria-label="GitLab project"
              value={workspace.projectKey}
              onChange={(event) => workspace.changeProject(event.target.value)}
            >
              {workspace.settings.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.path}
                </option>
              ))}
            </select>
          ) : (
            <strong>{projectLabel}</strong>
          )}
          {projectUrl ? (
            <a href={projectUrl} target="_blank" rel="noreferrer">
              Open project
            </a>
          ) : null}
          {workspace.project?.defaultBranch ? <span className="muted">{workspace.project.defaultBranch}</span> : null}
          <button type="button" className="button" onClick={workspace.refresh} disabled={!workspace.settings?.tokenConfigured || busy}>
            Refresh
          </button>
        </div>
      </header>

      <main className="workspace">
        {workspace.settingsLoading ? <p className="empty">Loading workspace…</p> : null}
        {workspace.settingsError ? <p className="banner banner-error page-banner">{workspace.settingsError}</p> : null}
        {workspace.settings && !workspace.settings.tokenConfigured ? <SetupNotice settings={workspace.settings} /> : null}
        {workspace.settings?.tokenConfigured ? (
          <>
            <MergeRequestList
              mergeRequests={workspace.filteredMergeRequests}
              selectedIid={workspace.mode === 'single' ? workspace.selectedIid : null}
              state={workspace.state}
              search={workspace.mrSearch}
              loading={workspace.listLoading}
              error={workspace.listError}
              truncated={workspace.listMeta.truncated}
              total={workspace.listMeta.total}
              limit={workspace.settings.limits.maxMergeRequests}
              onStateChange={(next: MergeRequestStateFilter) => workspace.changeState(next)}
              onSearchChange={workspace.setMrSearch}
              onSelect={workspace.selectMergeRequest}
            />
            <ThreadList
              projectKey={workspace.projectKey}
              mode={workspace.mode}
              mergeRequests={workspace.filteredMergeRequests}
              selected={workspace.selected}
              single={workspace.single}
              singleLoading={workspace.singleLoading}
              singleError={workspace.singleError}
              aggregate={workspace.aggregate}
              aggregateLoading={workspace.aggregateLoading}
              aggregateError={workspace.aggregateError}
              filters={workspace.filters}
              listCount={workspace.filteredMergeRequests.length}
              onFiltersChange={workspace.setFilters}
              onLoadAll={() => void workspace.loadAll(Boolean(workspace.aggregate))}
              onOpenMergeRequest={workspace.selectMergeRequest}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}
