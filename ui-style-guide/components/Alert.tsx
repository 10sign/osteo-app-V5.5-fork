import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const alertVariants = cva(
  'rounded-lg p-4 flex items-start',
  {
    variants: {
      variant: {
        success: 'bg-green-50 border border-green-200 text-green-800',
        warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800',
        error: 'bg-red-50 border border-red-200 text-red-800',
        info: 'bg-primary-50 border border-primary-200 text-primary-800',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  }
);

const iconMap = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  title?: string;
  onClose?: () => void;
  showIcon?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'info', title, onClose, showIcon = true, children, ...props }, ref) => {
    const Icon = iconMap[variant];

    return (
      <div
        className={alertVariants({ variant, className })}
        ref={ref}
        {...props}
      >
        {showIcon && (
          <div className="flex-shrink-0 mr-3 mt-0.5">
            <Icon size={20} />
          </div>
        )}
        <div className="flex-1">
          {title && (
            <h3 className="font-medium mb-1">{title}</h3>
          )}
          <div className="text-sm">{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex-shrink-0 ml-3 text-current hover:opacity-70 transition-opacity"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

export { Alert, alertVariants };