interface SkeletonLoaderProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export default function SkeletonLoader({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-gray-700/50 rounded';

  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'text':
        return 'rounded h-4';
      default:
        return 'rounded';
    }
  };

  const widthClass = width ? `w-[${typeof width === 'number' ? `${width}px` : width}]` : '';
  const heightClass = height ? `h-[${typeof height === 'number' ? `${height}px` : height}]` : '';

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()} mb-2 ${
              index === lines - 1 ? 'w-3/4' : 'w-full'
            } ${index === 0 ? `${widthClass} ${heightClass}` : ''}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className} ${widthClass} ${heightClass}`}
    />
  );
}
