'use client';

interface SkeletonProps {
    variant?: 'card' | 'text' | 'metric' | 'circle';
    width?: string;
    height?: string;
    className?: string;
}

export default function LoadingSkeleton({ 
    variant = 'card', 
    width, 
    height,
    className = '' 
}: SkeletonProps) {
    const baseStyle: React.CSSProperties = {
        background: 'linear-gradient(90deg, var(--bg-card) 0%, var(--bg-card-hover) 50%, var(--bg-card) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s ease-in-out infinite',
        borderRadius: 'var(--radius-md)',
    };

    const variantStyles: Record<string, React.CSSProperties> = {
        card: { ...baseStyle, width: width || '100%', height: height || '200px', borderRadius: 'var(--radius-xl)' },
        text: { ...baseStyle, width: width || '80%', height: height || '16px', borderRadius: '4px' },
        metric: { ...baseStyle, width: width || '120px', height: height || '48px', borderRadius: '8px' },
        circle: { ...baseStyle, width: width || '80px', height: height || '80px', borderRadius: '50%' },
    };

    return (
        <>
            <div className={className} style={variantStyles[variant]} aria-label="Carregando..." />
            <style>{`
                @keyframes skeleton-loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </>
    );
}

export function DashboardSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Header */}
            <div>
                <LoadingSkeleton variant="text" width="200px" height="32px" />
                <LoadingSkeleton variant="text" width="300px" height="16px" className="mt-2" />
            </div>
            {/* Metrics */}
            <div className="grid-4">
                <LoadingSkeleton variant="card" height="140px" />
                <LoadingSkeleton variant="card" height="140px" />
                <LoadingSkeleton variant="card" height="140px" />
                <LoadingSkeleton variant="card" height="140px" />
            </div>
            {/* Content */}
            <div className="grid-2">
                <LoadingSkeleton variant="card" height="400px" />
                <LoadingSkeleton variant="card" height="400px" />
            </div>
        </div>
    );
}
