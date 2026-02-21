// src/lib/db.ts
// Supabase transition from Dexie (IndexedDB)
import { supabase } from './supabase';

export interface TConcurso {
    id: string;
    nome: string;
    banca?: string;
    cargo?: string;
    dataProva?: string; // mapped from data_prova
    status: 'ativo' | 'pausado' | 'concluido';
    createdAt: string;
}

export interface TMateria {
    id: string;
    concursoId: string;
    nome: string;
    prioridade: 'alta' | 'media' | 'baixa';
    cor: string;
    metaHorasCiclo?: number;
    ordem?: number;
}

export interface TCiclo {
    id: string;
    concursoId: string;
    nome: string;
    materias: string[]; // array of materiaId in order
    numero: number;
    iniciadoEm: string;
    concluidoEm?: string;
}

export interface TProgressoCiclo {
    id: string;
    cicloId: string;
    materiaId: string;
    status: 'pendente' | 'em_curso' | 'concluido';
}

export interface TSessao {
    id: string;
    materiaId: string;
    concursoId: string;
    cicloId?: string;
    inicioEm: string;
    fimEm?: string;
    duracaoSegundos: number;
    tempoPausaSegundos: number;
    fezExercicios: boolean;
    quantidadeQuestoes?: number;
    quantidadeAcertos?: number;
    resumo?: string;
    avaliacao?: 1 | 2 | 3 | 4 | 5;
}

export interface TFlashcard {
    id: string;
    materiaId: string;
    frente: string;
    verso: string;
    frequencia: number;
    proximaRevisao: string;
    nivel: number;
}

// ─── Data Access Helpers ───────────────────────────────────────────────────

export const db = {
    concursos: {
        toArray: async () => {
            const { data, error } = await supabase.from('concursos').select('*').order('created_at', { ascending: false });
            if (error) {
                console.error('[db] concursos.toArray error:', { message: error.message, code: error.code, hint: error.hint, details: error.details });
                throw error;
            }
            return (data || []).map(c => ({
                id: c.id,
                nome: c.nome,
                banca: c.banca,
                cargo: c.cargo,
                dataProva: c.data_prova,
                status: c.status,
                createdAt: c.created_at
            }));
        },
        where: (field: string) => ({
            equals: (val: unknown) => ({
                toArray: async () => {
                    const { data, error } = await supabase.from('concursos')
                        .select('*')
                        .eq(field === 'status' ? 'status' : field, val)
                        .order('created_at', { ascending: false });
                    if (error) {
                        console.error('[db] concursos.where error:', { message: error.message, code: error.code, hint: error.hint, details: error.details });
                        throw error;
                    }
                    return (data || []).map(c => ({
                        id: c.id,
                        nome: c.nome,
                        banca: c.banca,
                        cargo: c.cargo,
                        dataProva: c.data_prova,
                        status: c.status,
                        createdAt: c.created_at
                    }));
                }
            })
        }),
        add: async (item: Omit<TConcurso, 'id'>) => {
            const { data, error } = await supabase.from('concursos').insert({
                nome: item.nome,
                banca: item.banca,
                cargo: item.cargo,
                data_prova: item.dataProva || null,
                status: item.status
            }).select().single();
            if (error) {
                console.error('[db] concursos.add error:', error);
                throw error;
            }
            return {
                id: data.id,
                nome: data.nome,
                banca: data.banca,
                cargo: data.cargo,
                dataProva: data.data_prova,
                status: data.status,
                createdAt: data.created_at
            };
        },
        count: async () => {
            const { count, error } = await supabase.from('concursos').select('*', { count: 'exact', head: true });
            if (error) throw error;
            return count || 0;
        }
    },
    materias: {
        toArray: async () => {
            const { data, error } = await supabase.from('materias').select('*').order('ordem', { ascending: true });
            if (error) {
                console.error('[db] materias.toArray error:', { message: error.message, code: error.code, hint: error.hint, details: error.details });
                throw error;
            }
            return (data || []).map(m => ({
                id: m.id,
                concursoId: m.concurso_id,
                nome: m.nome,
                prioridade: m.prioridade,
                cor: m.cor,
                metaHorasCiclo: m.meta_horas_ciclo,
                ordem: m.ordem
            }));
        },
        where: (_field: string) => ({
            equals: (val: unknown) => ({
                toArray: async () => {
                    const { data, error } = await supabase.from('materias')
                        .select('*')
                        .eq('concurso_id', val)
                        .order('ordem', { ascending: true });
                    if (error) {
                        console.error('[db] materias.where error:', { message: error.message, code: error.code, hint: error.hint, details: error.details });
                        throw error;
                    }
                    return (data || []).map(m => ({
                        id: m.id,
                        concursoId: m.concurso_id,
                        nome: m.nome,
                        prioridade: m.prioridade,
                        cor: m.cor,
                        metaHorasCiclo: m.meta_horas_ciclo,
                        ordem: m.ordem
                    }));
                }
            })
        }),
        add: async (item: Omit<TMateria, 'id'>) => {
            const { data, error } = await supabase.from('materias').insert({
                concurso_id: item.concursoId,
                nome: item.nome,
                prioridade: item.prioridade,
                cor: item.cor,
                meta_horas_ciclo: item.metaHorasCiclo,
                ordem: item.ordem
            }).select().single();
            if (error) {
                console.error('[db] materias.add error:', error);
                throw error;
            }
            return {
                id: data.id,
                concursoId: data.concurso_id,
                nome: data.nome,
                prioridade: data.prioridade,
                cor: data.cor,
                metaHorasCiclo: data.meta_horas_ciclo,
                ordem: data.ordem
            };
        }
    },
    ciclos: {
        toArray: async () => {
            const { data, error } = await supabase.from('ciclos')
                .select('*, ciclo_materias(materia_id, ordem)')
                .order('iniciado_em', { ascending: false });
            if (error) {
                console.error('[db] ciclos.toArray error:', { message: error.message, code: error.code, hint: error.hint, details: error.details });
                throw error;
            }
            return (data || []).map(ciclo => ({
                id: ciclo.id,
                concursoId: ciclo.concurso_id,
                nome: ciclo.nome,
                numero: ciclo.numero,
                iniciadoEm: ciclo.iniciado_em,
                concluidoEm: ciclo.concluido_em,
                materias: Array.isArray(ciclo.ciclo_materias)
                    ? (ciclo.ciclo_materias as { materia_id: string, ordem: number }[]).sort((a, b) => a.ordem - b.ordem).map((cm) => cm.materia_id)
                    : []
            }));
        },
        orderBy: (_field: string) => {
            const chain = (n?: number) => ({
                toArray: async () => {
                    const { data, error } = await supabase.from('ciclos')
                        .select('*, ciclo_materias(materia_id, ordem)')
                        .order('iniciado_em', { ascending: false });

                    if (error) throw error;
                    let result = (data || []);
                    if (n) result = result.slice(0, n);

                    return result.map(ciclo => ({
                        id: ciclo.id,
                        concursoId: ciclo.concurso_id,
                        nome: ciclo.nome,
                        numero: ciclo.numero,
                        iniciadoEm: ciclo.iniciado_em,
                        concluidoEm: ciclo.concluido_em,
                        materias: Array.isArray(ciclo.ciclo_materias)
                            ? (ciclo.ciclo_materias as { materia_id: string, ordem: number }[]).sort((a, b) => a.ordem - b.ordem).map((cm) => cm.materia_id)
                            : []
                    }));
                }
            });

            return {
                reverse: () => ({
                    toArray: async () => chain().toArray(),
                    limit: (n: number) => chain(n)
                }),
                limit: (n: number) => chain(n),
                toArray: async () => chain().toArray()
            };
        },
        add: async (item: Omit<TCiclo, 'id'>) => {
            // Complex insert: Ciclo -> CicloMaterias -> ProgressoCiclo
            const { data: ciclo, error: cErr } = await supabase.from('ciclos').insert({
                concurso_id: item.concursoId,
                nome: item.nome,
                numero: item.numero,
                iniciado_em: item.iniciadoEm || new Date().toISOString()
            }).select().single();

            if (cErr) throw cErr;

            // Insert bridge entries
            const bridgeEntries = item.materias.map((mId, idx) => ({
                ciclo_id: ciclo.id,
                materia_id: mId,
                ordem: idx
            }));
            const { error: bErr } = await supabase.from('ciclo_materias').insert(bridgeEntries);
            if (bErr) throw bErr;

            // Insert progress entries
            const progressEntries = item.materias.map(mId => ({
                ciclo_id: ciclo.id,
                materia_id: mId,
                status: 'pendente'
            }));
            const { error: pErr } = await supabase.from('progresso_ciclo').insert(progressEntries);
            if (pErr) throw pErr;

            return ciclo;
        },
        getActive: async (concursoId: string) => {
            const { data, error } = await supabase.from('ciclos')
                .select('*, ciclo_materias(materia_id, ordem)')
                .eq('concurso_id', concursoId)
                .is('concluido_em', null)
                .order('iniciado_em', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error('[db] ciclos.getActive error:', error);
                return null;
            }
            if (!data) return null;

            return {
                id: data.id,
                concursoId: data.concurso_id,
                nome: data.nome,
                numero: data.numero,
                iniciadoEm: data.iniciado_em,
                concluidoEm: data.concluido_em,
                materias: Array.isArray(data.ciclo_materias)
                    ? (data.ciclo_materias as { materia_id: string, ordem: number }[]).sort((a, b) => a.ordem - b.ordem).map((cm) => cm.materia_id)
                    : []
            };
        }
    },
    progressoCiclos: {
        toArray: async () => {
            const { data, error } = await supabase.from('progresso_ciclo').select('*');
            if (error) {
                console.error('[db] progressoCiclos.toArray error:', { message: error.message, code: error.code, hint: error.hint, details: error.details });
                throw error;
            }
            return (data || []).map(p => ({
                id: p.id,
                cicloId: p.ciclo_id,
                materiaId: p.materia_id,
                status: p.status
            }));
        },
        update: async (id: string, changes: Partial<TProgressoCiclo>) => {
            const { error } = await supabase.from('progresso_ciclo')
                .update({ status: changes.status })
                .eq('id', id);
            if (error) throw error;
        },
        updateStatus: async (cicloId: string, materiaId: string, status: TProgressoCiclo['status']) => {
            const { error } = await supabase.from('progresso_ciclo')
                .update({ status })
                .eq('ciclo_id', cicloId)
                .eq('materia_id', materiaId);
            if (error) throw error;
        }
    },
    sessoes: {
        toArray: async () => {
            const { data, error } = await supabase.from('sessoes').select('*').order('inicio_em', { ascending: false });
            if (error) {
                console.error('[db] sessoes.toArray error:', { message: error.message, code: error.code, hint: error.hint, details: error.details });
                throw error;
            }
            return (data || []).map(s => ({
                id: s.id,
                materiaId: s.materia_id,
                concursoId: s.concurso_id,
                cicloId: s.ciclo_id,
                inicioEm: s.inicio_em,
                fimEm: s.fim_em,
                duracaoSegundos: s.duracao_segundos,
                tempoPausaSegundos: s.tempo_pausa_segundos,
                fezExercicios: s.fez_exercicios,
                quantidadeQuestoes: s.quantidade_questoes,
                quantidadeAcertos: s.quantidade_acertos,
                resumo: s.resumo,
                avaliacao: s.avaliacao
            }));
        },
        add: async (item: Omit<TSessao, 'id'>) => {
            const { data, error } = await supabase.from('sessoes').insert({
                materia_id: item.materiaId,
                concurso_id: item.concursoId,
                ciclo_id: item.cicloId,
                inicio_em: item.inicioEm,
                fim_em: item.fimEm || null,
                duracao_segundos: item.duracaoSegundos,
                tempo_pausa_segundos: item.tempoPausaSegundos,
                fez_exercicios: item.fezExercicios,
                quantidade_questoes: item.quantidadeQuestoes,
                quantidade_acertos: item.quantidadeAcertos,
                resumo: item.resumo,
                avaliacao: item.avaliacao
            }).select().single();
            if (error) {
                console.error('[db] sessoes.add error:', { message: error.message, code: error.code, hint: error.hint, details: error.details });
                throw error;
            }
            return {
                id: data.id,
                materiaId: data.materia_id,
                concursoId: data.concurso_id,
                cicloId: data.ciclo_id,
                inicioEm: data.inicio_em,
                fimEm: data.fim_em,
                duracaoSegundos: data.duracao_segundos,
                tempoPausaSegundos: data.tempo_pausa_segundos,
                fezExercicios: data.fez_exercicios,
                quantidadeQuestoes: data.quantidade_questoes,
                quantidadeAcertos: data.quantidade_acertos,
                resumo: data.resumo,
                avaliacao: data.avaliacao
            };
        },
        update: async (id: string, changes: Partial<TSessao>) => {
            const { error } = await supabase.from('sessoes')
                .update({
                    fim_em: changes.fimEm || null,
                    duracao_segundos: changes.duracaoSegundos,
                    tempo_pausa_segundos: changes.tempoPausaSegundos,
                    fez_exercicios: changes.fezExercicios,
                    quantidade_questoes: changes.quantidadeQuestoes,
                    quantidade_acertos: changes.quantidadeAcertos,
                    resumo: changes.resumo,
                    avaliacao: changes.avaliacao
                })
                .eq('id', id);
            if (error) {
                console.error('[db] sessoes.update error:', { message: error.message, code: error.code, hint: error.hint, details: error.details });
                throw error;
            }
        },
        orderBy: (_field: string) => {
            const chain = (n?: number) => ({
                toArray: async () => {
                    const { data, error } = await supabase.from('sessoes')
                        .select('*')
                        .order('inicio_em', { ascending: false });
                    if (error) {
                        console.error('[db] sessoes.orderBy error:', { message: error.message, code: error.code, hint: error.hint, details: error.details });
                        throw error;
                    }
                    let result = (data || []);
                    if (n) result = result.slice(0, n);
                    return result.map(s => ({
                        id: s.id,
                        materiaId: s.materia_id,
                        concursoId: s.concurso_id,
                        cicloId: s.ciclo_id,
                        inicioEm: s.inicio_em,
                        fimEm: s.fim_em,
                        duracaoSegundos: s.duracao_segundos,
                        tempoPausaSegundos: s.tempo_pausa_segundos,
                        fezExercicios: s.fez_exercicios,
                        quantidadeQuestoes: s.quantidade_questoes,
                        quantidadeAcertos: s.quantidade_acertos,
                        resumo: s.resumo,
                        avaliacao: s.avaliacao
                    }));
                }
            });
            return {
                reverse: () => ({
                    toArray: async () => chain().toArray(),
                    limit: (n: number) => chain(n)
                }),
                limit: (n: number) => chain(n),
                toArray: async () => chain().toArray()
            };
        },
        where: (_field: string) => ({
            above: (val: string) => ({
                toArray: async () => {
                    const { data, error } = await supabase.from('sessoes')
                        .select('*')
                        .gt('inicio_em', val);
                    if (error) {
                        console.error('[db] sessoes.where error:', { message: error.message, code: error.code, hint: error.hint, details: error.details });
                        throw error;
                    }
                    return (data || []).map(s => ({
                        id: s.id,
                        materiaId: s.materia_id,
                        concursoId: s.concurso_id,
                        cicloId: s.ciclo_id,
                        inicioEm: s.inicio_em,
                        fimEm: s.fim_em,
                        duracaoSegundos: s.duracao_segundos,
                        tempoPausaSegundos: s.tempo_pausa_segundos,
                        fezExercicios: s.fez_exercicios,
                        quantidadeQuestoes: s.quantidade_questoes,
                        quantidadeAcertos: s.quantidade_acertos,
                        resumo: s.resumo,
                        avaliacao: s.avaliacao
                    }));
                }
            })
        })
    },
    flashcards: {
        toArray: async () => {
            const { data, error } = await supabase.from('flashcards').select('*');
            if (error) throw error;
            return (data || []).map(f => ({
                id: f.id,
                materiaId: f.materia_id,
                frente: f.frente,
                verso: f.verso,
                frequencia: f.frequencia,
                proximaRevisao: f.proxima_revisao,
                nivel: f.nivel
            }));
        },
        add: async (item: Omit<TFlashcard, 'id'>) => {
            const { data, error } = await supabase.from('flashcards').insert({
                materia_id: item.materiaId,
                frente: item.frente,
                verso: item.verso,
                frequencia: item.frequencia,
                proxima_revisao: item.proximaRevisao,
                nivel: item.nivel
            }).select().single();
            if (error) throw error;
            return {
                id: data.id,
                materiaId: data.materia_id,
                frente: data.frente,
                verso: data.verso,
                frequencia: data.frequencia,
                proximaRevisao: data.proxima_revisao,
                nivel: data.nivel
            };
        }
    }
};

// Formatting helpers
export function genId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function formatTimer(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function seedDemoData() {
    return;
}
