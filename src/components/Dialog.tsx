import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Dialog({ title, eyebrow, onClose, children, className = '' }: {
  title: string; eyebrow: string; onClose: () => void; children: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const panel = ref.current!;
    const focusable = () => [...panel.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')];
    focusable()[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = focusable(), first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    panel.addEventListener('keydown', trap);
    return () => panel.removeEventListener('keydown', trap);
  }, []);
  return <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section ref={ref} className={`help-dialog ${className}`} role="dialog" aria-modal="true" aria-label={title}>
      <button className="modal-close" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}><Icon name="close" /></button>
      <span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{children}
    </section>
  </div>;
}
