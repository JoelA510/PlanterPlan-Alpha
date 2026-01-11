

const SidebarSkeleton = () => {
  return (
    <div className="animate-pulse px-3 py-4 space-y-4">
      {/* Search/Header Skeleton */}
      <div className="h-4 bg-slate-200 rounded w-3/4 mb-6"></div>

      {/* List Items Skeleton */}
      <div className="space-y-3">
        <div className="h-8 bg-slate-100 rounded-md w-full"></div>
        <div className="h-8 bg-slate-100 rounded-md w-5/6"></div>
        <div className="h-8 bg-slate-100 rounded-md w-full"></div>
        <div className="h-8 bg-slate-100 rounded-md w-4/5"></div>
      </div>

      {/* Section Divider Skeleton */}
      <div className="h-px bg-slate-200 my-4"></div>

      {/* Secondary List Skeleton */}
      <div className="space-y-3">
        <div className="h-8 bg-slate-100 rounded-md w-full"></div>
        <div className="h-8 bg-slate-100 rounded-md w-2/3"></div>
        <div className="h-8 bg-slate-100 rounded-md w-5/6"></div>
      </div>
    </div>
  );
};

export default SidebarSkeleton;
