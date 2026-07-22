import { Suspense } from 'react';
import type { ModuleId } from '@/lib/modules';
import { SidebarNav } from './SidebarNav';
import { CommandBar } from './CommandBar';
import { WorkspaceTabs } from './WorkspaceTabs';
import { GlobalToast } from '@/components/shared/GlobalToast';
import { SearchModal } from '@/features/search/SearchModal';
import { resolveWorkspace } from './workspaceRegistry';
import { HomeDashboard } from '@/features/home/HomeDashboard';
import { DynamicTianPanBackground } from './DynamicTianPanBackground';

/** 懒加载占位：与墨/玉主题一致的轻量骨架，避免模块 chunk 拉取时白屏 */
function WorkspaceFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-jade-100/50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-jade-500/25 border-t-jade-400" />
        <span className="text-sm tracking-wide">正在加载模块…</span>
      </div>
    </div>
  );
}

interface AppShellProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

export function AppShell({ activeModule, onSelectModule }: AppShellProps) {
  const Workspace = resolveWorkspace(activeModule);

  return (
    <div
      data-testid="app-shell"
      className="instrument-grid relative min-h-[100dvh] p-3 text-jade-100 md:p-5"
    >
      <DynamicTianPanBackground />
      <div className="relative z-10 mx-auto grid max-w-[1680px] gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="hidden lg:block lg:h-[calc(100dvh-2.5rem)] lg:sticky lg:top-5">
          <SidebarNav activeModule={activeModule} onSelectModule={onSelectModule} />
        </div>

        <main className="min-w-0 space-y-4">
          <CommandBar activeModule={activeModule} onSelectModule={onSelectModule} />
          <div className="lg:hidden">
            <WorkspaceTabs activeModule={activeModule} onSelectModule={onSelectModule} />
          </div>
          <div className="hidden lg:block">
            <WorkspaceTabs activeModule={activeModule} onSelectModule={onSelectModule} />
          </div>
          <div data-testid={`workspace-${activeModule}`} className="ct-animate-fade-in">
            <Suspense fallback={<WorkspaceFallback />}>
              <Workspace activeModule={activeModule} onSelectModule={onSelectModule} />
            </Suspense>
          </div>
        </main>
      </div>
      <GlobalToast />
      <SearchModal onSelectModule={onSelectModule} />
    </div>
  );
}
