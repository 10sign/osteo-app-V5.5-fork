import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-xl bg-white shadow-card transition-shadow',
  {
    variants: {
      variant: {
        default: 'hover:shadow-card-hover',
        bordered: 'border border-gray-200 hover:shadow-card-hover',
        success: 'bg-green-50 border border-green-200',
        warning: 'bg-yellow-50 border border-yellow-200',
        error: 'bg-red-50 border border-red-200',
        info: 'bg-primary-50 border border-primary-200',
      },
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-card-hover transform hover:-translate-y-1 transition-all duration-200',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, interactive, title, subtitle, headerAction, children, ...props }, ref) => {
    return (
      <div
        className={cardVariants({ variant, size, interactive, className })}
        ref={ref}
        {...props}
      >
        {(title || subtitle || headerAction) && (
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                {title && (
                  <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                )}
                {subtitle && (
                  <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
                )}
              </div>
              {headerAction && (
                <div>{headerAction}</div>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card, cardVariants };