import { useEffect, useState } from 'react';
import { COMMAND_FEEDBACK_EVENT, type CommandFeedbackDetail } from '@/lib/commandIntents';

/**
 * GlobalToast — 全局操作反馈 toast（UX P1）
 *
 * 监听 COMMAND_FEEDBACK_EVENT，在页面底部居中显示反馈提示。
 * 所有工作区通过 dispatchCommandFeedback() 触发，统一交互反馈。
 */
export function GlobalToast() {
  const [toast, setToast] = useState<CommandFeedbackDetail | null>(null);

  useEffect(() => {
    function handleFeedback(event: Event) {
      const detail = (event as CustomEvent<CommandFeedbackDetail>).detail;
      setToast(detail);
      window.setTimeout(() => setToast(null), 2600);
    }
    window.addEventListener(COMMAND_FEEDBACK_EVENT, handleFeedback);
    return () => window.removeEventListener(COMMAND_FEEDBACK_EVENT, handleFeedback);
  }, []);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-full border px-5 py-2.5 text-sm shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md transition ${
      toast.tone === 'success'
        ? 'border-jade-500/30 bg-ink-900/95 text-jade-300'
        : 'border-white/10 bg-ink-900/95 text-jade-100/70'
    }">
      <span className="font-semibold">{toast.title}</span>
      {toast.description && <span className="ml-2 text-jade-100/45">{toast.description}</span>}
    </div>
  );
}
