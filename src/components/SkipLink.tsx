'use client';

export default function SkipLink() {
    return (
        <a
            href="#main"
            style={{
                position: 'absolute',
                left: '-9999px',
                zIndex: 9999,
                padding: '12px 20px',
                background: 'var(--blue-neon)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '0 0 8px 8px',
                fontWeight: 600,
                fontSize: 14,
            }}
            onFocus={(e) => {
                e.currentTarget.style.left = '16px';
                e.currentTarget.style.top = '16px';
            }}
            onBlur={(e) => {
                e.currentTarget.style.left = '-9999px';
            }}
        >
            Pular para conteúdo principal
        </a>
    );
}
