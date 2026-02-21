'use client';
import { useEffect, useState, useCallback } from 'react';
import { BarChart3, Zap } from 'lucide-react';
import { db, type TSessao, type TMateria, formatDuration, seedDemoData } from '@/lib/db';
import PageTransition from '@/components/PageTransition';

type Period = '7' | '30' | '90';

function HeatmapGrid({ sessions }: { sessions: TSessao[] }) {
    const weeks = 12;
    const days: Date[] = [];
    const today = new Date(); today.setHours(23, 59, 59, 999);
    for (let i = weeks * 7 - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        days.push(d);
    }

    const getLevel = (date: Date) => {
        const end = new Date(date); end.setHours(23, 59, 59, 999);
        const secs = sessions.filter(s => {
            const d = new Date(s.inicioEm);
            return d >= date && d <= end;
        }).reduce((sum, s) => sum + s.duracaoSegundos, 0);
        if (secs === 0) return 0;
        if (secs < 3600) return 1;
        if (secs < 7200) return 2;
        if (secs < 14400) return 3;
        return 4;
    };

    const cols: Date[][] = [];
    for (let w = 0; w < weeks; w++) {
        cols.push(days.slice(w * 7, w * 7 + 7));
    }

    return (
        <div>
            <div style={{ display: 'flex', gap: 4 }}>
                {cols.map((week, wi) => (
                    <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {week.map((day, di) => {
                            const level = getLevel(day);
                            return (
                                <div
                                    key={di}
                                    className={`heatmap-cell${level > 0 ? ` heatmap-l${level}` : ''}`}
                                    title={`${day.toLocaleDateString('pt-BR')} — nível ${level}`}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Menos</span>
                {[0, 1, 2, 3, 4].map(l => <div key={l} className={`heatmap-cell${l > 0 ? ` heatmap-l${l}` : ''}`} style={{ width: 12, height: 12 }} />)}
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mais</span>
            </div>
        </div>
    );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, paddingTop: 16 }}>
            {data.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{
                        width: '100%', borderRadius: '4px 4px 0 0',
                        height: `${Math.max((d.value / max) * 100, 4)}%`,
                        background: 'var(--gradient-progress-blue)',
                        boxShadow: d.value > 0 ? 'var(--glow-blue-xs)' : 'none',
                        transition: 'height 0.5s var(--ease-spring)',
                        position: 'relative',
                    }}>
                        {d.value > 0 && (
                            <div style={{
                                position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
                                fontSize: 10, color: 'var(--text-secondary)', fontFamily: "'DM Mono', monospace", whiteSpace: 'nowrap',
                            }}>
                                {Math.round(d.value / 3600)}h
                            </div>
                        )}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>{d.label}</span>
                </div>
            ))}
        </div>
    );
}

export default function AnalyticsPage() {
    const [sessions, setSessions] = useState<TSessao[]>([]);
    const [materias, setMaterias] = useState<Map<string, TMateria>>(new Map());
    const [period, setPeriod] = useState<Period>('30');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        await seedDemoData();
        const [sess, mats] = await Promise.all([db.sessoes.toArray(), db.materias.toArray()]);
        setSessions(sess);
        setMaterias(new Map(mats.map(m => [m.id, m])));
        setLoading(false);
    }, []);

    useEffect(() => {
        const init = async () => {
            await load();
        };
        init();
    }, [load]);

    const periodDays = parseInt(period);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - periodDays); cutoff.setHours(0, 0, 0, 0);
    const filtered = sessions.filter(s => s.fimEm && new Date(s.inicioEm) >= cutoff);

    const totalSecs = filtered.reduce((sum, s) => sum + s.duracaoSegundos, 0);
    const avgSecs = filtered.length > 0 ? Math.round(totalSecs / filtered.length) : 0;

    const bySubject = new Map<string, number>();
    filtered.forEach(s => {
        bySubject.set(s.materiaId, (bySubject.get(s.materiaId) || 0) + s.duracaoSegundos);
    });
    const subjectArray = Array.from(bySubject.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([id, secs]) => ({ id, secs, mat: materias.get(id) }));

    const chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (7 - 1 - i));
        d.setHours(0, 0, 0, 0);
        const end = new Date(d); end.setHours(23, 59, 59, 999);
        const secs = filtered.filter(s => new Date(s.inicioEm) >= d && new Date(s.inicioEm) <= end).reduce((sum, s) => sum + s.duracaoSegundos, 0);
        const labelStr = d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
        return { label: labelStr, value: secs };
    });

    const donutColors = ['var(--blue-neon)', 'var(--purple-neon)', 'var(--success)', 'var(--warning)', '#60AAFF'];

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }} role="status"><Zap size={32} style={{ color: 'var(--blue-neon)' }} aria-hidden="true" /><span className="sr-only">Carregando...</span></div>;

    return (
        <PageTransition>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div className="page-header">
                    <div>
                        <p className="section-label" style={{ marginBottom: 4 }}>INTELIGÊNCIA DE DADOS</p>
                        <h1 className="page-title">Análise de Performance</h1>
                    </div>
                    <div className="flex gap-2" style={{ background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 8, border: '1px solid var(--border-ghost)', width: 'fit-content' }}>
                        {(['7', '30', '90'] as Period[]).map(p => (
                            <button key={p} onClick={() => setPeriod(p)} className="btn" style={{
                                height: 32, padding: '0 16px', borderRadius: 'var(--radius-full)', fontSize: 13,
                                background: period === p ? 'rgba(26,111,255,0.2)' : 'transparent',
                                color: period === p ? 'var(--blue-300)' : 'var(--text-muted)',
                            }}>
                                {p}d
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid-4">
                    <div className="card" style={{ padding: 24 }}>
                        <p className="section-label" style={{ margin: '0 0 12px' }}>Total de Horas</p>
                        <p className="metric-lg">{formatDuration(totalSecs)}</p>
                    </div>
                    <div className="card" style={{ padding: 24 }}>
                        <p className="section-label" style={{ margin: '0 0 12px' }}>Sessões</p>
                        <p className="metric-lg metric-purple">{filtered.length}</p>
                    </div>
                    <div className="card" style={{ padding: 24 }}>
                        <p className="section-label" style={{ margin: '0 0 12px' }}>Com Exercícios</p>
                        <p className="metric-lg metric-green">{filtered.filter(s => s.fezExercicios).length}</p>
                    </div>
                    <div className="card" style={{ padding: 24 }}>
                        <p className="section-label" style={{ margin: '0 0 12px' }}>Média/Sessão</p>
                        <p className="metric-lg">{formatDuration(avgSecs)}</p>
                    </div>
                </div>

                <div className="card" style={{ padding: 24 }}>
                    <div className="section-split">
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 0 }}>Horas por Dia</h2>
                        <BarChart3 size={18} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <BarChart data={chartData} />
                </div>

                <div className="grid-2">
                    <div className="card" style={{ padding: 24 }}>
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Distribuição por Matéria</h2>
                        {subjectArray.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {subjectArray.map(({ id, secs, mat }, i) => {
                                    const pct = totalSecs > 0 ? Math.round((secs / totalSecs) * 100) : 0;
                                    return (
                                        <div key={id}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: mat?.cor || donutColors[i % donutColors.length], flexShrink: 0 }} />
                                                    <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{mat?.nome || id}</span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--text-secondary)' }}>{formatDuration(secs)}</span>
                                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text-muted)', width: 36, textAlign: 'right' }}>{pct}%</span>
                                                </div>
                                            </div>
                                            <div className="progress-track" style={{ height: 4 }}>
                                                <div className="progress-fill" style={{ width: `${pct}%`, background: mat?.cor ? `linear-gradient(90deg, ${mat.cor}80, ${mat.cor})` : undefined }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '24px 0' }}>
                                <p className="empty-body">Nenhuma sessão neste período.</p>
                            </div>
                        )}
                    </div>

                    <div className="card" style={{ padding: 24 }}>
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Heatmap de Atividade</h2>
                        <HeatmapGrid sessions={sessions} />
                        {sessions.length > 0 && (() => {
                            const best = sessions.reduce((max, s) => s.duracaoSegundos > (max?.duracaoSegundos || 0) ? s : max, sessions[0]);
                            return best ? (
                                <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                                    Melhor sessão: {formatDuration(best.duracaoSegundos)} · {new Date(best.inicioEm).toLocaleDateString('pt-BR')}
                                </p>
                            ) : null;
                        })()}
                    </div>
                </div>

                {subjectArray.length > 0 && (
                    <div className="card" style={{ padding: 24 }}>
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Ranking de Matérias</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {subjectArray.map(({ id, secs, mat }, i) => (
                                <div key={id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 14px', borderRadius: 'var(--radius-md)',
                                    background: 'var(--bg-input)', border: '1px solid var(--border-ghost)',
                                }}>
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--text-muted)', width: 20 }}>#{i + 1}</span>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: mat?.cor || donutColors[i % donutColors.length], flexShrink: 0 }} />
                                    <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>{mat?.nome || id}</span>
                                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: 'var(--blue-300)', textShadow: 'var(--text-glow-blue)' }}>
                                        {formatDuration(secs)}
                                    </span>
                                    {i === 0 && <span className="badge badge-active">🏆 Mais</span>}
                                    {i === subjectArray.length - 1 && subjectArray.length > 1 && <span className="badge badge-pending">⚠️ Menos</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
