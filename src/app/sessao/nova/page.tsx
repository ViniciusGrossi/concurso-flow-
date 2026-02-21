'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Pause, Square, Building2, BookOpen } from 'lucide-react';
import { db, type TMateria, type TConcurso, type TSessao, formatTimer } from '@/lib/db';
import Ring from '@/components/Ring';

type TimerState = 'idle' | 'running' | 'paused' | 'done';

export default function NovaSessaoPage() {
    const router = useRouter();
    const [concursos, setConcursos] = useState<TConcurso[]>([]);
    const [materias, setMaterias] = useState<TMateria[]>([]);
    const [selectedConcurso, setSelectedConcurso] = useState('');
    const [selectedMateria, setSelectedMateria] = useState('');
    const [timerState, setTimerState] = useState<TimerState>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [pauseAccum, setPauseAccum] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [pauseStart, setPauseStart] = useState<Date | null>(null);
    const [sessaoId, setSessaoId] = useState<string>('');

    // End session fields
    const [fezExercicios, setFezExercicios] = useState(false);
    const [questoes, setQuestoes] = useState('');
    const [acertos, setAcertos] = useState('');
    const [resumo, setResumo] = useState('');
    const [avaliacao, setAvaliacao] = useState(0);
    const [showFinish, setShowFinish] = useState(false);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const metaDiaria = 4 * 3600; // 4h default

    useEffect(() => {
        const init = async () => {
            // await seedDemoData(); // Removed
            const concs = await db.concursos.toArray(); // Get all active
            setConcursos(concs);
            if (concs[0]) setSelectedConcurso(concs[0].id);
        };
        init();
    }, []);

    useEffect(() => {
        if (!selectedConcurso) {
            if (materias.length > 0) {
                Promise.resolve().then(() => setMaterias([]));
            }
            return;
        }
        db.materias.where('concursoId').equals(selectedConcurso).toArray().then(ms => {
            setMaterias(ms as TMateria[]);
            if (ms[0]) setSelectedMateria(ms[0].id);
        });
    }, [selectedConcurso, materias.length]);

    const tick = useCallback(() => {
        if (startTime) {
            const now = Date.now();
            const raw = Math.floor((now - startTime.getTime()) / 1000);
            setElapsed(raw - pauseAccum);
        }
    }, [startTime, pauseAccum]);

    useEffect(() => {
        if (timerState === 'running') {
            intervalRef.current = setInterval(tick, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [timerState, tick]);

    // Deep Focus / Option C states
    const [deepFocus, setDeepFocus] = useState(false);

    const matSelecionada = materias.find(m => m.id === selectedMateria);
    const concursoSel = concursos.find(c => c.id === selectedConcurso);

    const handleStart = async () => {
        if (!selectedConcurso || !selectedMateria) return;
        const now = new Date();

        // Find active cycle for this contest
        const activeCiclo = await db.ciclos.getActive(selectedConcurso);

        const sessao = await db.sessoes.add({
            materiaId: selectedMateria,
            concursoId: selectedConcurso,
            cicloId: activeCiclo?.id, // Link to active cycle
            inicioEm: now.toISOString(),
            duracaoSegundos: 0,
            tempoPausaSegundos: 0,
            fezExercicios: false,
        });
        setSessaoId(sessao.id);
        setStartTime(now);
        setElapsed(0);
        setPauseAccum(0);
        setTimerState('running');

        // If in a cycle, mark materia as 'em_curso'
        if (activeCiclo) {
            await db.progressoCiclos.updateStatus(activeCiclo.id, selectedMateria, 'em_curso');
        }
    };

    const handlePause = useCallback(() => {
        setPauseStart(new Date());
        setTimerState('paused');
    }, []);

    const handleResume = useCallback(() => {
        if (pauseStart) {
            const pauseDur = Math.floor((Date.now() - pauseStart.getTime()) / 1000);
            setPauseAccum(prev => prev + pauseDur);
        }
        setPauseStart(null);
        setTimerState('running');
    }, [pauseStart]);

    const handleFinish = useCallback(() => {
        if (timerState === 'running') handlePause();
        setShowFinish(true);
    }, [timerState, handlePause]);

    const handleSave = async () => {
        if (!sessaoId) return;
        const now = new Date();
        let finalPause = pauseAccum;
        if (pauseStart) finalPause += Math.floor((Date.now() - pauseStart.getTime()) / 1000);

        // Get session to check if it has a cicloId
        const sessions = await db.sessoes.toArray();
        const currentSess = sessions.find(s => s.id === sessaoId);

        await db.sessoes.update(sessaoId, {
            fimEm: now.toISOString(),
            duracaoSegundos: elapsed,
            tempoPausaSegundos: finalPause,
            fezExercicios,
            quantidadeQuestoes: questoes ? parseInt(questoes) : undefined,
            quantidadeAcertos: acertos ? parseInt(acertos) : undefined,
            resumo: resumo || undefined,
            avaliacao: (avaliacao || undefined) as TSessao['avaliacao'],
        });

        // If it was part of a cycle, mark as concluded
        if (currentSess?.cicloId) {
            await db.progressoCiclos.updateStatus(currentSess.cicloId, currentSess.materiaId, 'concluido');
        }

        setTimerState('done');
        router.push('/historico');
    };

    // Media Session API
    useEffect(() => {
        if ('mediaSession' in navigator && timerState === 'running') {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: `Estudando: ${matSelecionada?.nome || 'ConcursoFlow'}`,
                artist: 'ConcursoFlow · Foco Profundo',
                album: concursoSel?.nome || 'Sessão de Estudo',
                artwork: [{ src: 'https://placeholder.com/512x512', sizes: '512x512', type: 'image/png' }]
            });

            navigator.mediaSession.setActionHandler('play', handleResume);
            navigator.mediaSession.setActionHandler('pause', handlePause);
            navigator.mediaSession.setActionHandler('stop', handleFinish);
        }
        return () => {
            if ('mediaSession' in navigator) {
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
                navigator.mediaSession.setActionHandler('stop', null);
            }
        };
    }, [timerState, matSelecionada, concursoSel, handleResume, handlePause, handleFinish]);

    const progressoDia = Math.min((elapsed / metaDiaria) * 100, 100);

    return (
        <div style={{ maxWidth: 760, margin: '0 auto', transition: 'all 0.5s ease' }}>
            {!deepFocus && (
                <div className="page-header" style={{ opacity: timerState !== 'idle' ? 0.6 : 1 }}>
                    <h1 className="page-title">Sessão de Estudo</h1>
                    <p className="page-subtitle">Modo foco — cronômetro preciso</p>
                </div>
            )}

            {/* Config selectors (only when idle) */}
            {timerState === 'idle' && (
                <div className="card" style={{ padding: 28, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>Configurar Sessão</h2>
                    <div className="grid-2">
                        <div className="input-group">
                            <label className="input-label">Concurso</label>
                            <div className="premium-input-wrapper">
                                <Building2 className="premium-input-icon" size={18} />
                                <select className="input-field" value={selectedConcurso} onChange={e => setSelectedConcurso(e.target.value)}>
                                    <option value="">Selecione um concurso</option>
                                    {concursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Matéria</label>
                            <div className="premium-input-wrapper">
                                <BookOpen className="premium-input-icon" size={18} />
                                <select className="input-field" value={selectedMateria} onChange={e => setSelectedMateria(e.target.value)}>
                                    <option value="">Selecione uma matéria</option>
                                    {materias.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <button
                        className="btn btn-primary btn-primary-lg"
                        onClick={handleStart}
                        disabled={!selectedConcurso || !selectedMateria}
                        style={{ alignSelf: 'flex-start', gap: 10 }}
                    >
                        <Play size={18} /> Iniciar Sessão
                    </button>
                </div>
            )}

            {/* Timer card */}
            {timerState !== 'idle' && (
                <div
                    className={`card ${timerState === 'running' ? 'card-session-active' : ''}`}
                    style={{
                        padding: deepFocus ? '60px 32px' : '40px 32px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32,
                        background: deepFocus
                            ? 'radial-gradient(circle at 50% 50%, rgba(26,111,255,0.08) 0%, #050507 80%)'
                            : 'radial-gradient(circle at 50% 40%, rgba(26,111,255,0.06) 0%, transparent 70%), var(--bg-card)',
                        border: deepFocus ? 'none' : '1px solid var(--border-ghost)',
                        boxShadow: deepFocus ? 'none' : 'var(--shadow-card)',
                        position: deepFocus ? 'fixed' : 'relative',
                        inset: deepFocus ? 0 : 'auto',
                        zIndex: deepFocus ? 1000 : 1,
                        borderRadius: deepFocus ? 0 : 'var(--radius-xl)',
                        justifyContent: deepFocus ? 'center' : 'flex-start',
                    }}
                >
                    {/* Deep Focus Controls Toggles */}
                    <div style={{
                        position: 'absolute', top: 24, right: 32,
                        background: 'rgba(255,255,255,0.03)', padding: '8px 16px', borderRadius: 100,
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <button
                            onClick={() => setDeepFocus(!deepFocus)}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                cursor: 'pointer', fontSize: 11, fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 6
                            }}
                        >
                            {deepFocus ? 'SAIR FOCO' : 'MODO FOCO'}
                        </button>
                    </div>

                    {/* Subject info */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                            {matSelecionada?.cor && (
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: matSelecionada.cor, boxShadow: `0 0 8px ${matSelecionada.cor}` }} />
                            )}
                            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: deepFocus ? 32 : 24, fontWeight: 700 }}>
                                {matSelecionada?.nome || 'Matéria'}
                            </h2>
                            {!deepFocus && matSelecionada?.prioridade === 'alta' && <span className="badge badge-high">Alta</span>}
                        </div>
                        {concursoSel && (
                            <p style={{ fontSize: deepFocus ? 16 : 14, color: 'var(--text-muted)', opacity: deepFocus ? 0.6 : 1 }}>{concursoSel.nome}</p>
                        )}
                    </div>

                    {/* Ring + Timer */}
                    <div style={{ position: 'relative' }}>
                        <Ring
                            value={progressoDia}
                            size={deepFocus ? 280 : 200}
                            strokeWidth={deepFocus ? 12 : 10}
                            variant={timerState === 'paused' ? 'warning' : timerState === 'done' ? 'green' : 'blue'}
                            animated
                        />
                        <div style={{
                            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                        }}>
                            <div
                                className={`timer-display ${timerState === 'running' ? 'timer-running' : timerState === 'paused' ? 'timer-paused' : timerState === 'done' ? 'timer-done' : 'timer-idle'}`}
                                style={{ fontSize: deepFocus ? 64 : 42 }}
                            >
                                {formatTimer(elapsed)}
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
                                fontSize: deepFocus ? 13 : 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                                textTransform: 'uppercase', letterSpacing: '0.1em',
                                color: timerState === 'running' ? 'var(--blue-300)' : timerState === 'paused' ? 'var(--warning)' : 'var(--success)',
                            }}>
                                <span style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: timerState === 'running' ? 'var(--blue-neon)' : timerState === 'paused' ? 'var(--warning)' : 'var(--success)',
                                    boxShadow: timerState === 'running' ? 'var(--glow-blue-xs)' : 'none',
                                    animation: timerState === 'running' ? 'glow-breathe 2s infinite' : 'none',
                                }} />
                                {timerState === 'running' ? 'RODANDO' : timerState === 'paused' ? 'PAUSADO' : 'CONCLUÍDO'}
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', opacity: deepFocus ? 0.3 : 1, transition: 'opacity 0.3s' }}
                        onMouseEnter={e => deepFocus && (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => deepFocus && (e.currentTarget.style.opacity = '0.3')}
                    >
                        {timerState === 'running' && (
                            <button className="btn btn-warning" onClick={handlePause} style={{ gap: 8, height: 48, padding: '0 24px' }}>
                                <Pause size={18} /> Pausar
                            </button>
                        )}
                        {timerState === 'paused' && (
                            <button className="btn btn-secondary" onClick={handleResume} style={{ gap: 8, height: 48, padding: '0 24px' }}>
                                <Play size={18} /> Retomar
                            </button>
                        )}
                        {(timerState === 'running' || timerState === 'paused') && (
                            <button className="btn btn-primary btn-primary-lg" onClick={handleFinish} style={{ gap: 8 }}>
                                <Square size={18} /> Finalizar Sessão
                            </button>
                        )}
                    </div>

                    {/* Start info */}
                    {!deepFocus && startTime && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                            Iniciou às {startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </div>
            )}

            {/* Finish modal */}
            {showFinish && (
                <div className="modal-backdrop" style={{ zIndex: 1100 }} role="dialog" aria-modal="true" aria-labelledby="modal-title">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h2 id="modal-title">Encerrar Sessão</h2>
                            <button className="btn btn-icon" onClick={() => setShowFinish(false)} aria-label="Fechar modal">
                                <span aria-hidden="true">×</span>
                            </button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Summary */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
                                <div>
                                    <p className="section-label" style={{ margin: '0 0 4px' }}>Tempo estudado</p>
                                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, color: 'var(--blue-bright)', textShadow: 'var(--text-glow-blue)' }}>{formatTimer(elapsed)}</p>
                                </div>
                                <div>
                                    <p className="section-label" style={{ margin: '0 0 4px' }}>Matéria</p>
                                    <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{matSelecionada?.nome}</p>
                                </div>
                            </div>

                            {/* Exercises toggle */}
                            <div>
                                <label className="toggle-wrap">
                                    <label className="toggle">
                                        <input type="checkbox" checked={fezExercicios} onChange={e => setFezExercicios(e.target.checked)} />
                                        <span className="toggle-slider" />
                                    </label>
                                    <span style={{ fontSize: 14, fontWeight: 500 }}>Fiz exercícios nesta sessão</span>
                                </label>
                                {fezExercicios && (
                                    <div className="grid-2" style={{ marginTop: 12 }}>
                                        <div>
                                            <label className="input-label">Questões tentadas</label>
                                            <input className="input" type="number" min={0} value={questoes} onChange={e => setQuestoes(e.target.value)} placeholder="Ex: 30" />
                                        </div>
                                        <div>
                                            <label className="input-label">Acertos</label>
                                            <input className="input" type="number" min={0} value={acertos} onChange={e => setAcertos(e.target.value)} placeholder="Ex: 24" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Summary textarea */}
                            <div>
                                <label className="input-label">Resumo da sessão (opcional)</label>
                                <textarea
                                    className="input"
                                    value={resumo}
                                    onChange={e => setResumo(e.target.value)}
                                    placeholder="O que você estudou hoje? Principais conceitos, dúvidas e insights..."
                                    rows={4}
                                />
                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>{resumo.length}/2000</p>
                            </div>

                            {/* Rating */}
                            <div>
                                <label className="input-label" id="rating-label">Como foi seu entendimento?</label>
                                <div className="star-rating" role="radiogroup" aria-labelledby="rating-label">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <button
                                            key={n}
                                            type="button"
                                            className={`star ${n <= avaliacao ? 'active' : ''}`}
                                            onClick={() => setAvaliacao(n)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'ArrowRight' && n < 5) setAvaliacao(n + 1);
                                                if (e.key === 'ArrowLeft' && n > 1) setAvaliacao(n - 1);
                                            }}
                                            role="radio"
                                            aria-checked={n === avaliacao}
                                            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => {
                                setShowFinish(false);
                                setDeepFocus(false);
                            }}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSave} style={{ gap: 8 }}>
                                Salvar Sessão
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
