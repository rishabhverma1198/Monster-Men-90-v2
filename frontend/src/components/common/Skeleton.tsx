/**
 * Skeleton Loading Components
 * Better UX than spinners - shows content structure while loading
 */

export function ProductCardSkeleton() {
  return (
    <div className="w-full max-w-[280px] mx-auto bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      {/* Image Skeleton */}
      <div className="w-full h-[280px] bg-gray-200" />
      
      {/* Content Skeleton */}
      <div className="p-3 space-y-2">
        {/* Title Skeleton */}
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        
        {/* Price and Button Row */}
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-20" />
          <div className="h-8 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="container-custom py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery Skeleton */}
        <div>
          <div className="w-full aspect-square max-w-[500px] mx-auto mb-4 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex gap-2 justify-center">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>

        {/* Product Info Skeleton */}
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-10 h-10 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="h-12 bg-gray-200 rounded w-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[150px] flex gap-4 animate-pulse">
      <div className="w-[120px] h-[120px] bg-gray-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-6 bg-gray-200 rounded w-24" />
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded" />
            <div className="w-12 h-6 bg-gray-200 rounded" />
            <div className="w-8 h-8 bg-gray-200 rounded" />
          </div>
          <div className="w-16 h-4 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="block w-full h-[150px] bg-gray-200 rounded-lg p-6 animate-pulse" />
  );
}

export function TextSkeleton({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded mb-2 animate-pulse ${
            i === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}
