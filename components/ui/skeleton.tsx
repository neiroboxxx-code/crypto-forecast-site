type SkeletonProps = {
    className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
    return <div className={`animate-pulse rounded-md bg-white/[0.06] ${className}`} />;
}

export function SkeletonRow({ rows = 3 }: { rows?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
            ))}
        </div>
    );
}
