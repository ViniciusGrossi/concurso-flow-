'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, LayoutDashboard, Play, Repeat, BarChart3, Clock, Settings, X, Menu } from 'lucide-react';
import { useState } from 'react';

const NAV = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/sessao', icon: Play, label: 'Sessão' },
    { href: '/ciclos', icon: Repeat, label: 'Ciclos' },
    { href: '/analytics', icon: BarChart3, label: 'Analytics' },
    { href: '/historico', icon: Clock, label: 'Histórico' },
    { href: '/configuracoes', icon: Settings, label: 'Config.' },
];

interface SidebarContentProps {
    pathname: string;
    onItemClick: () => void;
}

// Fixed: Declared SidebarContent outside the main render function
function SidebarContent({ pathname, onItemClick }: SidebarContentProps) {
    return (
        <>
            {/* Logo */}
            <div style={{ padding: '32px 24px 24px', borderBottom: '1px solid var(--border-ghost)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: '4px',
                    background: 'var(--gradient-btn)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'var(--glow-blue-xs)',
                    flexShrink: 0,
                }}>
                    <Zap size={18} color="white" />
                </div>
                <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                        Concurso
                    </div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--blue-300)', lineHeight: 1.1 }}>
                        Flow
                    </div>
                </div>
            </div>

            {/* Nav area */}
            <nav style={{ flex: 1, padding: '24px 0' }}>
                <p className="section-label" style={{ padding: '0 24px 12px', opacity: 0.5, fontSize: 10 }}>SISTEMA</p>
                {NAV.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`sidebar-item ${active ? 'active' : ''}`}
                            onClick={onItemClick}
                            aria-label={label}
                            aria-current={active ? 'page' : undefined}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '14px 24px',
                                borderRadius: 0,
                                margin: 0,
                                borderLeft: active ? '3px solid var(--blue-neon)' : '3px solid transparent',
                                background: active ? 'rgba(77, 158, 255, 0.06)' : 'transparent',
                                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                                transition: 'all 0.2s var(--ease-standard)',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: active ? 600 : 400,
                            }}
                        >
                            <Icon
                                size={18}
                                strokeWidth={active ? 2.5 : 1.5}
                                style={{ color: active ? 'var(--blue-neon)' : 'inherit', filter: active ? 'drop-shadow(0 0 8px rgba(77,158,255,0.4))' : 'none' }}
                            />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom metadata */}
            <div style={{ padding: '24px', borderTop: '1px solid var(--border-ghost)', marginTop: 'auto' }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em' }}>
                    Console de Estudos // V1.0.1
                </p>
            </div>
        </>
    );
}

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="sidebar" style={{
                display: 'flex',
                flexDirection: 'column',
                width: 260,
                background: 'rgba(5, 5, 7, 0.6)',
                backdropFilter: 'blur(20px)',
                borderRight: '1px solid var(--border-ghost)',
                position: 'fixed',
                left: 0, top: 0, bottom: 0,
                zIndex: 100
            }}>
                <SidebarContent pathname={pathname} onItemClick={() => setMobileOpen(false)} />
            </aside>

            {/* Mobile hamburger */}
            <button
                className="btn btn-icon"
                onClick={() => setMobileOpen(true)}
                style={{
                    position: 'fixed', top: 12, left: 12, zIndex: 150,
                    display: 'none',
                    borderRadius: '8px',
                    background: 'rgba(13, 15, 24, 0.8)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid var(--border-subtle)',
                    width: 44,
                    height: 44,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
                id="mobile-menu-btn"
                aria-label="Abrir menu"
            >
                <Menu size={20} />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 250 }}>
                    <div
                        style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(2, 4, 8, 0.7)',
                            backdropFilter: 'blur(8px)',
                            animation: 'fadeIn 0.3s ease-out'
                        }}
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: 280,
                        background: 'var(--bg-base)', borderRight: '1px solid var(--border-ghost)',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: '20px 0 60px rgba(0,0,0,0.8)',
                        animation: 'slideIn 0.3s cubic-bezier(0.19, 1, 0.22, 1)'
                    }}>
                        <div style={{ padding: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-icon"
                                onClick={() => setMobileOpen(false)}
                                aria-label="Fechar menu"
                                style={{ background: 'transparent', border: 'none' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <SidebarContent pathname={pathname} onItemClick={() => setMobileOpen(false)} />
                    </aside>
                </div>
            )}

            {/* Mobile bottom nav */}
            <nav className="mobile-nav" role="navigation" aria-label="Navegação principal">
                {NAV.slice(0, 5).map(({ href, icon: Icon, label }) => {
                    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                    return (
                        <Link
                            key={href}
                            href={href}
                            style={{
                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                                padding: '10px 4px',
                                color: active ? 'var(--blue-neon)' : 'var(--text-secondary)',
                                textDecoration: 'none',
                                fontSize: 10,
                                fontFamily: "'DM Sans', sans-serif",
                                fontWeight: active ? 600 : 400,
                                transition: 'all 0.2s',
                                textShadow: active ? '0 0 10px rgba(77,158,255,0.3)' : 'none',
                            }}
                            aria-label={label}
                            aria-current={active ? 'page' : undefined}
                        >
                            <Icon
                                size={18}
                                strokeWidth={active ? 2.5 : 1.5}
                                aria-hidden="true"
                                style={{ color: active ? 'var(--blue-neon)' : 'inherit' }}
                            />
                            <span style={{ opacity: active ? 1 : 0.7 }}>{label}</span>
                        </Link>
                    );
                })}
            </nav>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                @media (max-width: 1024px) {
                  #mobile-menu-btn { display: flex !important; }
                  .sidebar { display: none !important; }
                  .main-content { margin-left: 0 !important; }
                }

                @media (min-width: 1025px) {
                  .mobile-nav { display: none !important; }
                  #mobile-menu-btn { display: none !important; }
                }
            `}</style>
        </>
    );
}
