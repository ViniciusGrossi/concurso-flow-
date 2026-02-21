'use client';
// SVG Ring Progress component
interface RingProps {
    value: number; // 0–100
    size?: number;
    strokeWidth?: number;
    variant?: 'blue' | 'purple' | 'green' | 'warning';
    label?: string;
    sublabel?: string;
    animated?: boolean;
}

const COLORS = {
    blue: { stroke: '#60AAFF', glow: 'rgba(77,158,255,0.5)', text: '#60AAFF' },
    purple: { stroke: '#A78BFA', glow: 'rgba(157,111,255,0.4)', text: '#A78BFA' },
    green: { stroke: '#22D3A0', glow: 'rgba(34,211,160,0.4)', text: '#22D3A0' },
    warning: { stroke: '#F59E0B', glow: 'rgba(245,158,11,0.4)', text: '#F59E0B' },
};

export default function Ring({
    value = 0,
    size = 100,
    strokeWidth = 6,
    variant = 'blue',
    label,
    sublabel,
    animated = true,
}: RingProps) {
    const r = (size - strokeWidth * 2) / 2;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - Math.min(value, 100) / 100);
    const { stroke, glow, text } = COLORS[variant];

    return (
        <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
                {/* Track */}
                <circle
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={strokeWidth}
                />
                {/* Fill */}
                <circle
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{
                        filter: `drop-shadow(0 0 6px ${glow})`,
                        transition: animated ? 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
                    }}
                />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                {label && (
                    <span style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: size > 100 ? 20 : size > 70 ? 16 : 13,
                        fontWeight: 500,
                        color: text,
                        textShadow: `0 0 8px ${glow}`,
                        lineHeight: 1,
                    }}>
                        {label}
                    </span>
                )}
                {sublabel && (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
                        {sublabel}
                    </span>
                )}
            </div>
        </div>
    );
}
