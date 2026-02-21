'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, Flame, Clock, BookOpen, Zap, BarChart3, ArrowUpRight, AlertCircle } from 'lucide-react';
import { db, type TSessao, type TMateria, type TProgressoCiclo, type TCiclo, formatDuration } from '@/lib/db';
import Ring from '@/components/Ring';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import PageTransition from '@/components/PageTransition';

// Standard staggered animation container
const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
} as const;

function StatCard({ label, value, sub, variant = 'blue', icon }: {
    label: string; value: string; sub?: string;
    variant?: 'blue' | 'purple' | 'green' | 'warning'; icon?: React.ReactNode;
}) {
    const colors = { blue: 'metric-lg', purple: 'metric-lg metric-purple', green: 'metric-lg metric-green', warning: 'metric-lg' };
    const warningStyle = variant === 'warning' ? { color: 'var(--warning)', textShadow: 'var(--glow-warning)' } : {};
    return (
        <motion.div variants={item} className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <p className="section-label" style={{ margin: 0, opacity: 0.7 }}>{label}</p>
                {icon && <span style={{ color: 'var(--blue-neon)', opacity: 0.8 }}>{icon}</span>}
            </div>
            <div className={colors[variant]} style={{ ...warningStyle, fontSize: 42 }}>{value}</div>
            {sub && <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", letterSpacing: '0.02em' }}>{sub}</p>}
        </motion.div>
    );
}

export default function DashboardPage() {
    const [recentSessions, setRecentSessions] = useState<TSessao[]>([]);
    const [statsSessions, setStatsSessions] = useState<TSessao[]>([]);
    const [materias, setMaterias] = useState<Map<string, TMateria>>(new Map());
    const [progresso, setProgresso] = useState<TProgressoCiclo[]>([]);
    const [cicloAtual, setCicloAtual] = useState<TCiclo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setError(null);
            // await seedDemoData(); // Removed for Supabase migration

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);

            console.log('[Dashboard] Starting data fetch...');
            const [recent, statsSess, mats, prog, ciclos] = await Promise.all([
                db.sessoes.orderBy('inicioEm').reverse().limit(10).toArray().catch(e => { console.error('Error fetching recent sessions:', e); throw e; }),
                db.sessoes.where('inicioEm').above(thirtyDaysAgo.toISOString()).toArray().catch(e => { console.error('Error fetching stats sessions:', e); throw e; }),
                db.materias.toArray().catch(e => { console.error('Error fetching materias:', e); throw e; }),
                db.progressoCiclos.toArray().catch(e => { console.error('Error fetching progressoCiclos:', e); throw e; }),
                db.ciclos.orderBy('iniciadoEm').reverse().limit(1).toArray().catch(e => { console.error('Error fetching latest ciclo:', e); throw e; }),
            ]);
            console.log('[Dashboard] Data fetch complete.');

            setRecentSessions(recent);
            setStatsSessions(statsSess);
            setMaterias(new Map(mats.map(m => [m.id, m])));
            setProgresso(prog);
            setCicloAtual(ciclos[0] || null);

        } catch (err: unknown) {
            console.error('[Dashboard] DB error:', err);
            const errorMsg = (err as Error)?.message || JSON.stringify(err);
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await load();
        };
        init();
    }, [load]);

    const todays = useMemo(() => statsSessions.filter(s => {
        const todayAtStart = new Date(); todayAtStart.setHours(0, 0, 0, 0);
        return new Date(s.inicioEm) >= todayAtStart;
    }), [statsSessions]);

    const todaySeconds = useMemo(() => todays.reduce((sum, s) => sum + s.duracaoSegundos, 0), [todays]);

    const weekSeconds = useMemo(() => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        const cutoff = weekStart.getTime();
        return statsSessions.filter(s => new Date(s.inicioEm).getTime() >= cutoff).reduce((sum, s) => sum + s.duracaoSegundos, 0);
    }, [statsSessions]);

    const streak = useMemo(() => {
        let count = 0;
        const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
        const cursor = new Date(todayDate);

        // Pre-parse session dates for performance
        const sessionDays = new Set(statsSessions.map(s => {
            const d = new Date(s.inicioEm);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        }));

        while (true) {
            const time = cursor.getTime();
            if (sessionDays.has(time)) {
                count++;
            } else {
                if (time === todayDate.getTime()) {
                    cursor.setDate(cursor.getDate() - 1);
                    continue;
                }
                break;
            }
            cursor.setDate(cursor.getDate() - 1);
            if (count > 30) break;
        }
        return count;
    }, [statsSessions]);

    const cicloProgress = useMemo(() => {
        if (!cicloAtual) return 0;
        const total = progresso.filter(p => p.cicloId === cicloAtual.id).length;
        const done = progresso.filter(p => p.cicloId === cicloAtual.id && p.status === 'concluido').length;
        return total > 0 ? Math.round((done / total) * 100) : 0;
    }, [cicloAtual, progresso]);

    if (loading) { return <DashboardSkeleton />; }

    if (error) {
        return (
            <div className="card" style={{ padding: 40, textAlign: 'center', maxWidth: 600, margin: '60px auto' }}>
                <AlertCircle size={48} style={{ color: 'var(--error)', margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Erro ao carregar</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>{error}</p>
                {process.env.NODE_ENV === 'development' && (
                    <pre style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8, fontSize: 12, textAlign: 'left', marginBottom: 20, overflow: 'auto', maxWidth: '100%' }}>
                        {error}
                    </pre>
                )}
                <button className="btn btn-primary" onClick={() => load()}>Tentar novamente</button>
            </div>
        );
    }

    return (
        <PageTransition>
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                style={{ display: 'flex', flexDirection: 'column', gap: 32 }}
            >
                {/* Header Section (Asymmetric Impact) */}
                <motion.div variants={item} className="page-header">
                    <div>
                        <p className="section-label" style={{ marginBottom: 4 }}>BEM-VINDO AO TERMINAL</p>
                        <h1 className="page-title" style={{ letterSpacing: '-0.04em' }}>Sua Evolução</h1>
                    </div>
                    <div>
                        <p className="font-mono" style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                            Estatísticas // {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </p>
                        <Link href="/sessao/nova" className="btn btn-primary btn-primary-lg" style={{ gap: 10, borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--blue-neon)', color: 'var(--blue-300)', boxShadow: 'var(--glow-blue-xs)' }}>
                            <Zap size={18} fill="currentColor" />
                            INICIAR PROTOCOLO
                        </Link>
                    </div>
                </motion.div>

                {/* Main Asymmetric Grid */}
                <div className="grid-asymmetric-70">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Primary Impact Stats */}
                        <div className="grid-2">
                            <StatCard label="TEMPO HOJE" value={formatDuration(todaySeconds)} sub={`${todays.length} SESSÕES VALIDARDAS`} variant="blue" icon={<Clock size={20} />} />
                            <StatCard label="CONSISTÊNCIA" value={`🔥 ${streak}`} sub="DIAS EM ESTADO DE FLOW" variant="warning" icon={<Flame size={20} />} />
                        </div>

                        {/* Recent Activity (Sharp Console Style) */}
                        <motion.div variants={item} className="card" style={{ padding: '0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div className="section-split" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-ghost)', background: 'rgba(255,255,255,0.02)', marginBottom: 0 }}>
                                <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.05em', opacity: 0.6, marginBottom: 0 }}>Atividades Recentes</h2>
                                <Link href="/historico/" style={{ color: 'var(--blue-neon)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Ver Tudo +</Link>
                            </div>
                            <div style={{ padding: '12px 0' }}>
                                {recentSessions.filter(s => s.fimEm).slice(0, 4).map(s => {
                                    const mat = materias.get(s.materiaId);
                                    return (
                                        <Link key={s.id} href={`/sessao/${s.id}`} style={{ textDecoration: 'none' }}>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '12px 24px', transition: 'all 0.2s',
                                                borderLeft: '4px solid transparent',
                                                borderBottom: '1px solid var(--border-ghost)',
                                                cursor: 'pointer'
                                            }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(77, 158, 255, 0.04)';
                                                    e.currentTarget.style.borderLeftColor = 'var(--blue-neon)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.borderLeftColor = 'transparent';
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                    <div style={{ width: 44, height: 44, borderRadius: '4px', background: 'var(--bg-input)', border: '1px solid var(--border-ghost)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Zap size={16} style={{ color: mat?.cor || 'var(--blue-neon)' }} />
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{mat?.nome || '???'}</p>
                                                        <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>{new Date(s.inicioEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · PROCESSED</p>
                                                    </div>
                                                </div>
                                                <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--blue-300)', fontWeight: 600 }}>{formatDuration(s.duracaoSegundos)}</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column: Focus & Metadata */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {/* Ciclo Progress (Circular Focus) */}
                        <motion.div variants={item} className="card" style={{ padding: 24, borderRadius: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'var(--gradient-chart-blue)' }}>
                            <Ring value={cicloProgress} size={140} strokeWidth={10} variant="blue" label={`${cicloProgress}%`} sublabel="CONCLUSÃO" />
                            <div style={{ marginTop: 20 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Ciclo {cicloAtual?.numero || '0'}</h3>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Módulos validados em tempo real</p>
                            </div>
                        </motion.div>

                        {/* Secondary Metrics */}
                        <motion.div variants={item} className="card" style={{ padding: 20, borderRadius: '4px', background: 'rgba(26, 111, 255, 0.03)', border: '1px dashed var(--border-default)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.5 }}>Filtro Semanal</span>
                                <TrendingUp size={14} style={{ color: 'var(--success)' }} />
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{formatDuration(weekSeconds)}</div>
                            <div className="progress-track" style={{ height: 3 }}>
                                <div className="progress-fill" style={{ width: '65%' }} />
                            </div>
                            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, fontFamily: "'DM Mono', monospace" }}>Capacidade Total: 40H/S</p>
                        </motion.div>

                        {/* Quick Actions */}
                        <motion.div variants={item} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <Link href="/ciclos" className="btn btn-secondary" style={{ justifyContent: 'space-between', borderRadius: '4px', width: '100%', padding: '0 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><BookOpen size={16} /> Gerenciar Ciclos</div>
                                <ArrowUpRight size={14} />
                            </Link>
                            <Link href="/analytics" className="btn btn-secondary" style={{ justifyContent: 'space-between', borderRadius: '4px', width: '100%', padding: '0 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><BarChart3 size={16} /> Análise Completa</div>
                                <ArrowUpRight size={14} />
                            </Link>
                        </motion.div>
                    </div>
                </div>

            </motion.div>
        </PageTransition>
    );
}
