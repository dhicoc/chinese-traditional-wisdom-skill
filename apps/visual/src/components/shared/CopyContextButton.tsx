import { useCallback, useEffect, useRef, useState } from 'react';
import { COPY_CONTEXT_INTENT, type CopyContextIntentDetail } from '@/lib/commandIntents';

interface CopyContextButtonProps {
  label?: string;
  title: string;
  payload: unknown;
  /** 与 CommandBar 派发的复制意图匹配；未设置时只响应按钮自身点击。 */
  commandScope?: string;
}

type CopyStatus = 'idle' | 'copied' | 'error';

function toMarkdown(title: string, payload: unknown) {
  return [`# ${title}`, '', '```json', JSON.stringify(payload, null, 2), '```', ''].join('\n');
}

const FEEDBACK_MS = 1800;

export function CopyContextButton({ label = 'Copy context for AI', title, payload, commandScope }: CopyContextButtonProps) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(async () => {
    const markdown = toMarkdown(title, payload);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      } else {
        // 降级：非安全上下文或无 clipboard API 时回退到 execCommand
        const textarea = document.createElement('textarea');
        textarea.value = markdown;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setStatus('copied');
    } catch {
      setStatus('error');
    } finally {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setStatus('idle'), FEEDBACK_MS);
    }
  }, [payload, title]);

  useEffect(() => {
    if (!commandScope) return undefined;
    function handleCopyIntent(event: Event) {
      const detail = (event as CustomEvent<CopyContextIntentDetail>).detail;
      if (detail?.scope === commandScope) {
        void copy();
      }
    }
    window.addEventListener(COPY_CONTEXT_INTENT, handleCopyIntent);
    return () => window.removeEventListener(COPY_CONTEXT_INTENT, handleCopyIntent);
  }, [commandScope, copy]);

  const display = status === 'copied' ? 'Copied' : status === 'error' ? '复制失败' : label;

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-jade-500/30 hover:text-jade-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-500/40"
      data-copy-status={status}
      style={
        status === 'copied'
          ? { borderColor: 'rgba(42, 157, 143, 0.4)', color: '#2a9d8f' }
          : status === 'error'
            ? { borderColor: 'rgba(174, 32, 18, 0.4)', color: '#e76f51' }
            : undefined
      }
    >
      {display}
    </button>
  );
}
