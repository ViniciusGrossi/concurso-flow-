'use client';
import { useEffect, useState, useCallback } from 'react';
import { User, Download, Sliders, Smartphone } from 'lucide-react';
import { db } from '@/lib/db';
import PageTransition from '@/components/PageTransition';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>;
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed',
        platform: string
    }>;
    prompt(): Promise<void>;
}

export default function ConfiguracoesPage() {
    const [metaDiaria, setMetaDiaria] = useState('4');
    const [nome, setNome] = useState('');
    const [glowIntensity, setGlowIntensity] = useState('normal');
    const [saved, setSaved] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    const load = useCallback(async () => {
        // await seedDemoData(); // Removed
        const meta = localStorage.getItem('cf_meta_diaria');
        if (meta) setMetaDiaria(meta);
        const n = localStorage.getItem('cf_nome');
        if (n) setNome(n);
        const g = localStorage.getItem('cf_glow');
        if (g) setGlowIntensity(g);
    }, []);

    useEffect(() => {
        const init = async () => {
            await load();
        };
        init();

        const handleBeforeInstallPrompt = (e: Event) => {
            console.log('Capturei o prompt de instalação!');
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            console.log('App instalado com sucesso!');
            setIsInstallable(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // A detecção de standalone para não exibir o prompt (se já instalado)
        // é lidada através do CSS ou logic de render no return, mas setState aqui 
        // seria síncrono no effect, portanto removemos.

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, [load]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstallable(false);
            setDeferredPrompt(null);
        }
    };

    const handleSave = () => {
        localStorage.setItem('cf_meta_diaria', metaDiaria);
        localStorage.setItem('cf_nome', nome);
        localStorage.setItem('cf_glow', glowIntensity);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleExport = async () => {
        const data = {
            concursos: await db.concursos.toArray(),
            materias: await db.materias.toArray(),
            ciclos: await db.ciclos.toArray(),
            sessoes: await db.sessoes.toArray(),
            progresso: await db.progressoCiclos.toArray(),
            exportedAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `concursoflow-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <PageTransition>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 680 }}>
                <div className="page-header">
                    <h1 className="page-title">Configurações</h1>
                    <p className="page-subtitle">Personalize seu ConcursoFlow</p>
                </div>

                {/* Profile */}
                <div className="card" style={{ padding: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <User size={18} style={{ color: 'var(--blue-300)' }} />
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>Perfil</h2>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Seu nome</label>
                        <div className="premium-input-wrapper">
                            <User className="premium-input-icon" size={18} />
                            <input className="input-field" value={nome} onChange={e => setNome(e.target.value)} placeholder="Como você quer ser chamado?" />
                        </div>
                    </div>
                </div>

                {/* Study goals */}
                <div className="card" style={{ padding: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <Sliders size={18} style={{ color: 'var(--blue-300)' }} />
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>Metas de Estudo</h2>
                    </div>
                    <div>
                        <label className="input-label">Meta diária de horas</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input
                                className="input"
                                type="number" min={1} max={16}
                                value={metaDiaria}
                                onChange={e => setMetaDiaria(e.target.value)}
                                style={{ maxWidth: 100 }}
                            />
                            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>horas por dia</span>
                        </div>
                    </div>
                </div>

                {/* Visual */}
                <div className="card" style={{ padding: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <Sliders size={18} style={{ color: 'var(--purple-300)' }} />
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>Personalização Visual</h2>
                    </div>
                    <div>
                        <label className="input-label">Intensidade do Glow</label>
                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                            {['sutil', 'normal', 'intenso'].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setGlowIntensity(opt)}
                                    className={`btn ${glowIntensity === opt ? 'btn-secondary' : 'btn-ghost'}`}
                                    style={{ textTransform: 'capitalize' }}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Installation / PWA */}
                <div className="card" style={{ padding: 28, border: isInstallable ? '1px solid var(--blue-neon)' : '1px solid var(--border-ghost)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <Smartphone size={18} style={{ color: 'var(--blue-300)' }} />
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>Aplicativo Desktop / Mobile</h2>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        Instale o ConcursoFlow no seu dispositivo para acesso rápido, notificações e melhor performance.
                    </p>
                    {isInstallable ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button
                                className="btn btn-primary btn-primary-lg"
                                onClick={handleInstallClick}
                                style={{ gap: 8, width: '100%', justifyContent: 'center', fontSize: 16, padding: '16px 24px' }}
                            >
                                <Download size={20} /> INSTALAR CONCURSOFLOW
                            </button>
                            <p style={{ fontSize: 12, color: 'var(--blue-300)', textAlign: 'center', margin: 0 }}>
                                Clique acima para baixar e instalar no seu sistema.
                            </p>
                        </div>
                    ) : (
                        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-ghost)' }}>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                                {typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone)
                                    ? '✨ O ConcursoFlow já está instalado no seu dispositivo!'
                                    : 'Aguarde alguns segundos ou acesse pelo Chrome/Edge (Android/PC) para habilitar o botão de instalação.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Data */}
                <div className="card" style={{ padding: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <Download size={18} style={{ color: 'var(--success)' }} />
                        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>Exportação de Dados</h2>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                        Exporte todas as suas sessões, ciclos e progresso em formato JSON para backup.
                    </p>
                    <button className="btn btn-secondary" onClick={handleExport} style={{ gap: 8 }}>
                        <Download size={16} /> Exportar JSON
                    </button>
                </div>

                {/* Save */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary btn-primary-lg" onClick={handleSave} style={{ gap: 8 }}>
                        {saved ? '✓ Salvo!' : 'Salvar Configurações'}
                    </button>
                </div>

                {/* App info */}
                <div style={{ paddingTop: 8, borderTop: '1px solid var(--border-ghost)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
                        ConcursoFlow v1.0 · Dados armazenados localmente · Offline-first PWA
                    </p>
                </div>
            </div>
        </PageTransition>
    );
}
