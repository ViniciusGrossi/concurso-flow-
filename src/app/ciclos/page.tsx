'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Zap, ArrowRight, Type, Building2, Briefcase, Calendar, Hash, Palette } from 'lucide-react';
import { db, type TCiclo, type TMateria, type TProgressoCiclo, type TConcurso, genId, seedDemoData } from '@/lib/db';
import Ring from '@/components/Ring';
import PageTransition from '@/components/PageTransition';

type Priority = 'alta' | 'media' | 'baixa';

export default function CiclosPage() {
    const [ciclos, setCiclos] = useState<TCiclo[]>([]);
    const [materias, setMaterias] = useState<Map<string, TMateria>>(new Map());
    const [progresso, setProgresso] = useState<TProgressoCiclo[]>([]);
    const [concursos, setConcursos] = useState<Map<string, TConcurso>>(new Map());
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            // await seedDemoData(); // Removed
            const [ciclosList, matList, progList, concList] = await Promise.all([
                db.ciclos.orderBy('iniciadoEm').reverse().toArray(),
                db.materias.toArray(),
                db.progressoCiclos.toArray(),
                db.concursos.toArray(),
            ]);
            setCiclos(ciclosList);
            setMaterias(new Map(matList.map((m: TMateria) => [m.id, m])));
            setProgresso(progList);
            setConcursos(new Map(concList.map((c: TConcurso) => [c.id, c])));
        } catch (err) {
            console.error('[Ciclos] DB error:', err);
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

    const getCicloProgress = (cicloId: string) => {
        const ps = progresso.filter(p => p.cicloId === cicloId);
        const done = ps.filter(p => p.status === 'concluido').length;
        return { total: ps.length, done, pct: ps.length > 0 ? Math.round((done / ps.length) * 100) : 0 };
    };

    const cicloAtual = ciclos.find(c => !c.concluidoEm);
    const historico = ciclos.filter(c => !!c.concluidoEm);

    const [isConcursoModalOpen, setIsConcursoModalOpen] = useState(false);
    const [isMateriaModalOpen, setIsMateriaModalOpen] = useState(false);
    const [isCreateCicloOpen, setIsCreateCicloOpen] = useState(false);

    const [newConcurso, setNewConcurso] = useState({ nome: '', banca: '', cargo: '', dataProva: '' });
    const [newMateria, setNewMateria] = useState({ nome: '', prioridade: 'media' as Priority, concursoId: '', cor: '#4D9EFF' });
    const [selectedConcursoForCiclo, setSelectedConcursoForCiclo] = useState('');
    const [selectedBancas, setSelectedBancas] = useState<string[]>([]);

    const listaBancas = [
        'CESPE/CEBRASPE', 'FCC', 'FUNRIO', 'FGV', 'CESGRANRIO',
        'IBFC', 'VUNESP', 'AOCP', 'IADES', 'IDECAN', 'OUTROS'
    ];

    const sugestoesMaterias = [
        'Português', 'Raciocínio Lógico', 'Direito Administrativo',
        'Direito Constitucional', 'Ética', 'Informática', 'Direito Penal'
    ];

    const handleAddConcurso = async (e: React.FormEvent) => {
        e.preventDefault();
        await db.concursos.add({
            ...newConcurso,
            banca: selectedBancas.join(', '),
            status: 'ativo',
            createdAt: new Date().toISOString()
        });
        setIsConcursoModalOpen(false);
        setNewConcurso({ nome: '', banca: '', cargo: '', dataProva: '' });
        setSelectedBancas([]);
        await load();
    };

    const handleAddMateria = async (e: React.FormEvent) => {
        e.preventDefault();
        await db.materias.add({
            ...newMateria,
            metaHorasCiclo: 5,
            ordem: materias.size
        });
        setIsMateriaModalOpen(false);
        setNewMateria({ nome: '', prioridade: 'media', concursoId: '', cor: '#4D9EFF' });
        await load();
    };

    const handleStartCiclo = async () => {
        if (!selectedConcursoForCiclo) return;

        const matsForConc = Array.from(materias.values()).filter(m => m.concursoId === selectedConcursoForCiclo);
        if (matsForConc.length === 0) {
            alert('Adicione matérias a este concurso antes de iniciar um ciclo.');
            return;
        }

        // Find highest number for this contest
        const concCiclos = ciclos.filter(c => c.concursoId === selectedConcursoForCiclo);
        const nextNum = concCiclos.length + 1;

        await db.ciclos.add({
            concursoId: selectedConcursoForCiclo,
            nome: `${concursos.get(selectedConcursoForCiclo)?.nome} - Ciclo ${nextNum}`,
            numero: nextNum,
            materias: matsForConc.map(m => m.id),
            iniciadoEm: new Date().toISOString()
        });

        setIsCreateCicloOpen(false);
        setSelectedConcursoForCiclo('');
        await load();
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }} role="status">
            <Zap size={32} style={{ color: 'var(--blue-neon)' }} aria-hidden="true" />
            <span className="sr-only">Carregando...</span>
        </div>
    );

    return (
        <PageTransition>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <h1 className="page-title">Ciclos de Estudo</h1>
                        {cicloAtual && concursos.get(cicloAtual.concursoId) && (
                            <p className="page-subtitle">{concursos.get(cicloAtual.concursoId)?.nome} · Ciclo #{cicloAtual.numero}</p>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => setIsConcursoModalOpen(true)} className="btn btn-secondary" style={{ gap: 8 }}>
                            <Plus size={16} /> Concurso
                        </button>
                        <button onClick={() => setIsMateriaModalOpen(true)} className="btn btn-secondary" style={{ gap: 8 }}>
                            <Plus size={16} /> Matéria
                        </button>
                    </div>
                </div>

                {isConcursoModalOpen && (
                    <div className="modal-backdrop" onClick={() => setIsConcursoModalOpen(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(26,111,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-neon)' }}>
                                    <Building2 size={20} />
                                </div>
                                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800 }}>Novo Concurso</h2>
                            </div>

                            <form onSubmit={handleAddConcurso} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div className="input-group">
                                    <label className="input-label">Nome do Concurso</label>
                                    <div className="premium-input-wrapper">
                                        <Type className="premium-input-icon" size={18} />
                                        <input className="input-field" placeholder="Ex: Receita Federal" required value={newConcurso.nome} onChange={e => setNewConcurso({ ...newConcurso, nome: e.target.value })} />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Banca Examinadora (Multi-seleção)</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                        {listaBancas.map(b => {
                                            const isSelected = selectedBancas.includes(b);
                                            return (
                                                <button
                                                    key={b}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedBancas(selectedBancas.filter(item => item !== b));
                                                        } else {
                                                            setSelectedBancas([...selectedBancas, b]);
                                                        }
                                                    }}
                                                    className={`badge ${isSelected ? 'badge-active' : 'badge-pending'}`}
                                                    style={{
                                                        cursor: 'pointer',
                                                        textTransform: 'none',
                                                        padding: '8px 12px',
                                                        fontSize: 12,
                                                        border: isSelected ? '1px solid var(--blue-neon)' : '1px solid var(--border-ghost)',
                                                        background: isSelected ? 'rgba(26,111,255,0.15)' : 'rgba(255,255,255,0.03)',
                                                        color: isSelected ? 'var(--blue-neon)' : 'var(--text-muted)',
                                                        transition: 'all 0.2s',
                                                        fontWeight: isSelected ? 700 : 500
                                                    }}
                                                >
                                                    {b}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="premium-input-wrapper" style={{ opacity: 0.6 }}>
                                        <Hash className="premium-input-icon" size={18} />
                                        <input
                                            className="input-field"
                                            placeholder="Bancas selecionadas aparecerão aqui"
                                            value={selectedBancas.join(', ')}
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="input-group">
                                        <label className="input-label">Cargo</label>
                                        <div className="premium-input-wrapper">
                                            <Briefcase className="premium-input-icon" size={18} />
                                            <input className="input-field" placeholder="Ex: Auditor" value={newConcurso.cargo} onChange={e => setNewConcurso({ ...newConcurso, cargo: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Data da Prova (Opcional)</label>
                                        <div className="premium-input-wrapper">
                                            <Calendar className="premium-input-icon" size={18} />
                                            <input className="input-field" type="date" value={newConcurso.dataProva} onChange={e => setNewConcurso({ ...newConcurso, dataProva: e.target.value })} style={{ colorScheme: 'dark' }} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                    <button type="button" onClick={() => setIsConcursoModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1, height: 48 }}>SALVAR CONCURSO</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isMateriaModalOpen && (
                    <div className="modal-backdrop" onClick={() => setIsMateriaModalOpen(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(157,111,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple-neon)' }}>
                                    <Zap size={20} />
                                </div>
                                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800 }}>Nova Matéria</h2>
                            </div>

                            <form onSubmit={handleAddMateria} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div className="input-group">
                                    <label className="input-label">Concurso Vinculado</label>
                                    <div className="premium-input-wrapper">
                                        <Building2 className="premium-input-icon" size={18} />
                                        <select className="input-field" required value={newMateria.concursoId} onChange={e => setNewMateria({ ...newMateria, concursoId: e.target.value })}>
                                            <option value="">Selecione um concurso</option>
                                            {Array.from(concursos.values()).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Nome da Matéria</label>
                                    <div className="premium-input-wrapper">
                                        <Type className="premium-input-icon" size={18} />
                                        <input className="input-field" placeholder="Ex: Direito Constitucional" required value={newMateria.nome} onChange={e => setNewMateria({ ...newMateria, nome: e.target.value })} />
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                        {sugestoesMaterias.map(s => (
                                            <button
                                                key={s}
                                                type="button"
                                                className="badge badge-pending"
                                                style={{ cursor: 'pointer', textTransform: 'none', border: '1px solid var(--border-ghost)', transition: 'all 0.2s' }}
                                                onClick={() => setNewMateria({ ...newMateria, nome: s })}
                                                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--blue-neon)')}
                                                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-ghost)')}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid-2">
                                    <div className="input-group">
                                        <label className="input-label">Prioridade</label>
                                        <div className="premium-input-wrapper">
                                            <Zap className="premium-input-icon" size={18} />
                                            <select className="input-field" value={newMateria.prioridade} onChange={e => setNewMateria({ ...newMateria, prioridade: e.target.value as Priority })}>
                                                <option value="alta">Alta</option>
                                                <option value="media">Média</option>
                                                <option value="baixa">Baixa</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Cor de Identificação</label>
                                        <div className="premium-input-wrapper">
                                            <Palette className="premium-input-icon" size={18} />
                                            <input className="input-field" type="color" value={newMateria.cor} onChange={e => setNewMateria({ ...newMateria, cor: e.target.value })} style={{ paddingLeft: 42 }} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                    <button type="button" onClick={() => setIsMateriaModalOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 1, height: 48, background: 'var(--gradient-progress-purple)', borderColor: 'rgba(157,111,255,0.4)' }}>SALVAR MATÉRIA</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isCreateCicloOpen && (
                    <div className="modal-backdrop" onClick={() => setIsCreateCicloOpen(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(26,111,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue-neon)' }}>
                                    <Zap size={20} />
                                </div>
                                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800 }}>Iniciar Novo Ciclo</h2>
                            </div>

                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
                                Isso criará uma sequência de estudos com todas as matérias cadastradas para o concurso selecionado.
                            </p>

                            <div className="input-group" style={{ marginBottom: 24 }}>
                                <label className="input-label">Selecione o Concurso</label>
                                <div className="premium-input-wrapper">
                                    <Building2 className="premium-input-icon" size={18} />
                                    <select className="input-field" value={selectedConcursoForCiclo} onChange={e => setSelectedConcursoForCiclo(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {Array.from(concursos.values()).map(c => (
                                            <option key={c.id} value={c.id}>{c.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={() => setIsCreateCicloOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
                                <button
                                    onClick={handleStartCiclo}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                    disabled={!selectedConcursoForCiclo}
                                >
                                    INICIAR AGORA
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {cicloAtual ? (
                    <div className="card card-session-active" style={{ padding: 28 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700 }}>{cicloAtual.nome}</h2>
                                    <span className="badge badge-active">EM ANDAMENTO</span>
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                                    Iniciado em {new Date(cicloAtual.iniciadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <Ring
                                    value={getCicloProgress(cicloAtual.id).pct}
                                    size={80}
                                    strokeWidth={7}
                                    variant="blue"
                                    label={`${getCicloProgress(cicloAtual.id).pct}%`}
                                    sublabel="concluído"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: 28 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Progresso do ciclo</span>
                                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--blue-300)' }}>
                                    {getCicloProgress(cicloAtual.id).done}/{getCicloProgress(cicloAtual.id).total} matérias
                                </span>
                            </div>
                            <div className="progress-track" style={{ height: 6 }}>
                                <div className="progress-fill" style={{ width: `${getCicloProgress(cicloAtual.id).pct}%` }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            {cicloAtual.materias.map(mId => {
                                const prog = progresso.find(p => p.cicloId === cicloAtual.id && p.materiaId === mId && p.status === 'em_curso');
                                if (!prog) return null;
                                const mat = materias.get(mId);
                                return (
                                    <div key={mId} style={{
                                        background: 'rgba(26,111,255,0.06)', border: '1px solid var(--border-default)',
                                        borderRadius: 'var(--radius-lg)', padding: '16px 20px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                                    }}>
                                        <div>
                                            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: 'var(--blue-300)', marginBottom: 4 }}>
                                                📖 Estudando agora: {mat?.nome}
                                            </p>
                                            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                Meta: {mat?.metaHorasCiclo || 5}h neste ciclo
                                            </p>
                                        </div>
                                        <Link href="/sessao/nova" className="btn btn-primary" style={{ gap: 8 }}>
                                            Iniciar sessão <ArrowRight size={16} />
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
                        <div className="empty-state">
                            <div className="empty-icon" style={{ marginBottom: 16 }}><Zap size={32} style={{ color: 'var(--blue-neon)' }} /></div>
                            <p className="empty-title" style={{ fontSize: 20, marginBottom: 8 }}>Prepare seu novo ciclo</p>
                            <p className="empty-body" style={{ maxWidth: 360, margin: '0 auto 24px' }}>Crie um ciclo de estudos para organizar suas matérias em sequência e acompanhar seu progresso automático.</p>
                            <button onClick={() => setIsCreateCicloOpen(true)} className="btn btn-primary btn-primary-lg" style={{ gap: 10 }}>
                                <Zap size={18} /> INICIAR CICLO DE ESTUDOS
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid-3">
                    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                        <p className="section-label" style={{ margin: '0 0 8px' }}>Ciclos Concluídos</p>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, color: 'var(--success)', textShadow: 'var(--glow-success)' }}>{historico.length}</p>
                    </div>
                    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                        <p className="section-label" style={{ margin: '0 0 8px' }}>Ciclo Atual</p>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, color: 'var(--blue-bright)', textShadow: 'var(--text-glow-blue)' }}>
                            #{cicloAtual?.numero || '—'}
                        </p>
                    </div>
                    <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                        <p className="section-label" style={{ margin: '0 0 8px' }}>Matérias Ativas</p>
                        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 32, color: 'var(--purple-300)', textShadow: 'var(--text-glow-purple)' }}>
                            {cicloAtual?.materias.length || 0}
                        </p>
                    </div>
                </div>

                {historico.length > 0 && (
                    <div className="card" style={{ padding: 24 }}>
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Ciclos Anteriores</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {historico.map(c => {
                                const prog = getCicloProgress(c.id);
                                return (
                                    <div key={c.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px 16px', borderRadius: 'var(--radius-md)',
                                        background: 'var(--bg-input)', border: '1px solid var(--border-ghost)',
                                        flexWrap: 'wrap', gap: 8,
                                    }}>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>{c.nome}</span>
                                            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                                                {c.concluidoEm && `concluído em ${new Date(c.concluidoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: 'var(--text-muted)' }}>{prog.total} matérias</span>
                                            <span className="badge badge-done">CONCLUÍDO</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </PageTransition>
    );
}
