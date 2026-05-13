'use client';
import ErrorState from '@/components/ui/ErrorState';

export default function HealthError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="p-10 w-full">
      <ErrorState error={error} reset={reset} title="Health Terminal Failure" />
    </div>
  );
}