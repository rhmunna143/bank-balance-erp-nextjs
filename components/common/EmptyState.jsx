"use client";

import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function EmptyState({ icon: Icon = FileQuestion, title, description, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-primary-light p-4 mb-4">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--color-text-muted)] max-w-md mb-4">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action}>{actionLabel}</Button>
      )}
    </div>
  );
}
