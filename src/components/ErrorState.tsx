import MaterialIcon from './MaterialIcon';

interface Props {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

/** Professional error state — never exposes raw stack traces. */
export default function ErrorState({ title = 'Something went wrong', message, onRetry, compact }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center animate-fade-in ${
        compact ? 'py-10' : 'py-20'
      }`}
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-accent-rose flex items-center justify-center mb-4 shadow-glow-rose">
        <MaterialIcon name="error" size={24} />
      </div>
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="text-xs text-muted mt-1.5 max-w-sm leading-relaxed">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary mt-5">
          <MaterialIcon name="refresh" size={16} />
          Try again
        </button>
      )}
    </div>
  );
}