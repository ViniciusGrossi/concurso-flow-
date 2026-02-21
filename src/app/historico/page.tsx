'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, Zap } from 'lucide-react';
import { db, type TSessao, type TMateria, type TConcurso, formatDuration, formatDate, seedDemoData } from '@/lib/db';
import { useDebounce } from '@/hooks/useDebounce';
import PageTransition from '@/components/PageTransition';

export default function HistoricoPage() {
    const [sessions, setSessions] = useState<TSessao[]>([]);
    const [materias, setMaterias] = useState<Map<string, TMateria>>(new Map());
    const [concursos, setConcursos] = useState<Map<string, TConcurso>>(new Map());
    const [search, setSearch] = useState('');
    const [filterExercise, setFilterExercise] = useState(false);
    const [loading, setLoading] = useState(true);
    const debouncedSearch = useDebounce(search, 300);

    const load = useCallback(async () => {
        // await seedDemoData(); // Removed
        const [sess, mats, concs] = await Promise.all([
            db.sessoes.orderBy('inicioEm').reverse().toArray(),
            db.materias.toArray(),
            db.concursos.toArray(),
        ]);
        setSessions(sess);
        setMaterias(new Map(mats.map(m => [m.id, m])));
        setConcursos(new Map(concs.map(c => [c.id, c])));
        setLoading(false);
    }, []);

    useEffect(() => {
        const init = async () => {
            await load();
        };
        init();
    }, [load]);

    const filtered = sessions
        .filter(s => s.fimEm) // only completed
        .filter(s => {
            if (filterExercise && !s.fezExercicios) return false;
            if (debouncedSearch) {
                const mat = materias.get(s.materiaId);
                const term = debouncedSearch.toLowerCase();
                return (
                    mat?.nome.toLowerCase().includes(term) ||
                    s.resumo?.toLowerCase().includes(term)
                );
            }
            return true;
        });

    const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }} role="status" aria-live="polite"><Zap size={32} style={{ color: 'var(--blue-neon)' }} aria-hidden="true" /><span className="sr-only">Carregando...</span></div>;

    return (
        <PageTransition>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div className="page-header">
                    <div>
                        <p className="section-label" style={{ marginBottom: 4 }}>REGISTROS CORE</p>
                        <h1 className="page-title">Histórico de Sessões</h1>
                    </div>
                    <p className="page-subtitle" style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>
                        {sessions.filter(s => s.fimEm).length} sessões registradas
                    </p>
                </div>

                <div className="section-split" role="search">
                    <div className="premium-input-wrapper" style={{ flex: '1 1 auto', width: '100%' }}>
                        <Search className="premium-input-icon" size={18} />
                        <input
                            className="input-field"
                            placeholder="Buscar por matéria ou resumo..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            aria-label="Buscar sessões por matéria ou resumo"
                            type="search"
                        />
                    </div>
                    <button
                        className={`btn ${filterExercise ? 'btn-secondary' : 'btn-ghost'}`}
                        onClick={() => setFilterExercise(f => !f)}
                        style={{ gap: 8, height: 42, whiteSpace: 'nowrap' }}
                        aria-label={filterExercise ? 'Remover filtro de exercícios' : 'Filtrar apenas sessões com exercícios'}
                        aria-pressed={filterExercise}
                    >
                        <Filter size={16} aria-hidden="true" />
                        Exercícios {filterExercise && `(${filtered.length})`}
                    </button>
                </div>

                {filtered.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filtered.map(s => {
                            const mat = materias.get(s.materiaId);
                            const conc = concursos.get(s.concursoId);
                            const acertoRate = s.quantidadeQuestoes && s.quantidadeAcertos
                                ? Math.round((s.quantidadeAcertos / s.quantidadeQuestoes) * 100)
                                : null;
                            return (
                                <details key={s.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-ghost)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
                                    <summary style={{
                                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
                                        cursor: 'pointer', listStyle: 'none', userSelect: 'none',
                                        transition: 'background var(--dur-fast)',
                                    }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: mat?.cor || 'var(--blue-neon)', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 500, fontSize: 14 }}>{mat?.nome || 'Matéria'}</span>
                                                {conc && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {conc.nome}</span>}
                                            </div>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                                                {formatDate(s.inicioEm)} {s.inicioEm ? `· ${new Date(s.inicioEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            {s.fezExercicios && <span className="badge badge-exercise">exerc.</span>}
                                            {s.avaliacao && <span style={{ color: 'var(--warning)', fontSize: 13 }}>{stars(s.avaliacao)}</span>}
                                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: 'var(--blue-bright)', textShadow: 'var(--text-glow-blue)' }}>
                                                {formatDuration(s.duracaoSegundos)}
                                            </span>
                                        </div>
                                    </summary>
                                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border-ghost)', marginTop: 0 }}>
                                        <div className="grid-3" style={{ marginTop: 16, marginBottom: 16 }}>
                                            <div>
                                                <p className="section-label" style={{ margin: '0 0 4px' }}>Duração real</p>
                                                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: 'var(--blue-bright)' }}>{formatDuration(s.duracaoSegundos)}</p>
                                            </div>
                                            {s.tempoPausaSegundos > 0 && (
                                                <div>
                                                    <p className="section-label" style={{ margin: '0 0 4px' }}>Tempo em pausa</p>
                                                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: 'var(--warning)' }}>{formatDuration(s.tempoPausaSegundos)}</p>
                                                </div>
                                            )}
                                            {acertoRate !== null && (
                                                <div>
                                                    <p className="section-label" style={{ margin: '0 0 4px' }}>Taxa de acerto</p>
                                                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: acertoRate >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                                                        {acertoRate}% ({s.quantidadeAcertos}/{s.quantidadeQuestoes})
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {s.resumo && (
                                            <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                                                <p className="section-label" style={{ margin: '0 0 8px' }}>Resumo da sessão</p>
                                                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{s.resumo}</p>
                                            </div>
                                        )}
                                    </div>
                                </details>
                            );
                        })}
                    </div>
                ) : (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-icon"><BookOpen size={24} /></div>
                            <p className="empty-title">{search || filterExercise ? 'Nenhum resultado' : 'Nenhuma sessão ainda'}</p>
                            <p className="empty-body">{search ? 'Tente outras palavras na busca.' : 'Inicie sua primeira sessão de estudos!'}</p>
                            {!search && !filterExercise && (
                                <Link href="/sessao/nova" className="btn btn-primary" style={{ marginTop: 8 }}>Iniciar sessão</Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
