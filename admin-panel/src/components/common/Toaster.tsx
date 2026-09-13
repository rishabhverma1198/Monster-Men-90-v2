import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './Toast';
import { useToast } from '../../hooks/useToast';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const getIcon = () => {
          switch (variant) {
            case 'success':
              return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
            case 'error':
              return <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
            case 'warning':
              return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
            case 'info':
              return <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
            default:
              return null;
          }
        };

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start space-x-3">
              {getIcon() && <div className="flex-shrink-0">{getIcon()}</div>}
              <div className="flex-1">
                {title && (
                  <ToastTitle className="text-gray-900 dark:text-gray-100">
                    {title}
                  </ToastTitle>
                )}
                {description && (
                  <ToastDescription className="text-gray-600 dark:text-gray-400">
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
