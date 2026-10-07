import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { Job } from '../types';

// Polls a real backend job until it reaches a terminal state.
// Returns the latest job snapshot. No timers/fake progress — the
// backend reports genuine stage completion.
export function useJobPoll(jobId: string | null, onComplete?: (job: Job) => void) {
  const [job, setJob] = useState<Job | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!jobId) return;
    doneRef.current = false;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const j = await api.job(jobId);
        if (cancelled) return;
        setJob(j);
        if (j.status === 'completed' || j.status === 'failed') {
          doneRef.current = true;
          onComplete?.(j);
          return;
        }
        timer = setTimeout(poll, 1200);
      } catch {
        if (!cancelled) timer = setTimeout(poll, 2000);
      }
    };
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId]);

  return job;
}
