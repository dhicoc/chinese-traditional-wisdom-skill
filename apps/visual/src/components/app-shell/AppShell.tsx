import type { ModuleId } from '@/lib/modules';
import { SidebarNav } from './SidebarNav';
import { CommandBar } from './CommandBar';
import { WorkspaceTabs } from './WorkspaceTabs';
import { BirthPanel } from '@/components/shared/BirthPanel';
import { resolveWorkspace } from './workspaceRegistry';
import { HomeDashboard } from '@/features/home/HomeDashboard';

interface AppShellProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

export function AppShell({ activeModule, onSelectModule }: AppShellProps) {
  const Workspace = resolveWorkspace(activeModule);

  return (
    <div className="instrument-grid min-h-screen p-3 text-zinc-100 md:p-5">
      <div className="mx-auto grid max-w-[1480px] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="hidden lg:block lg:h-[calc(100dvh-2.5rem)] lg:sticky lg:top-5">
          <SidebarNav activeModule={activeModule} onSelectModule={onSelectModule} />
        </div>

        <main className="min-w-0 space-y-4">
          <CommandBar activeModule={activeModule} onSelectModule={onSelectModule} />
          <BirthPanel />
          <div className="lg:hidden">
            <WorkspaceTabs activeModule={activeModule} onSelectModule={onSelectModule} />
          </div>
          <div className="hidden lg:block">
            <WorkspaceTabs activeModule={activeModule} onSelectModule={onSelectModule} />
          </div>
          <Workspace activeModule={activeModule} onSelectModule={onSelectModule} />
        </main>
      </div>
    </div>
  );
}
