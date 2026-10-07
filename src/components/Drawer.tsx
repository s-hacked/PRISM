import { useEffect } from 'react';
import MaterialIcon from './MaterialIcon';

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

/** Slide-over drawer with a scrim. */
export default function Drawer({ open, onClose, children, width = 'max-w-md' }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        className={`relative w-full ${width} bg-white shadow-[0_0_60px_-12px_rgba(15,23,42,0.35)]
          animate-slide-in-right flex flex-col overflow-hidden`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 btn-icon !w-8 !h-8"
          aria-label="Close"
        >
          <MaterialIcon name="close" size={17} />
        </button>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}