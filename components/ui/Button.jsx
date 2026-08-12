"use client";

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
        destructive: 'bg-danger text-white hover:bg-red-600 shadow-sm',
        outline: 'border border-border bg-surface hover:bg-gray-50 dark:hover:bg-slate-800 text-[var(--color-text)]',
        secondary: 'bg-gray-100 text-[var(--color-text)] hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700',
        ghost: 'hover:bg-gray-100 dark:hover:bg-slate-800 text-[var(--color-text)]',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-success text-white hover:opacity-90 shadow-sm',
        warning: 'bg-warning text-white hover:opacity-90 shadow-sm',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
