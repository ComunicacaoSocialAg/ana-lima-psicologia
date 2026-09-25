import { AssessmentType } from '../types';

export interface AssessmentQuestion {
  id: number;
  text: string;
}

export const PHQ9_QUESTIONS: AssessmentQuestion[] = [
  { id: 1, text: "Pouco interesse ou pouco prazer em fazer as coisas" },
  { id: 2, text: "Sentir-se para baixo, deprimido(a) ou sem perspectiva" },
  { id: 3, text: "Dificuldade para pegar no sono, permanecer dormindo ou dormir demais" },
  { id: 4, text: "Sentir-se cansado(a) ou com pouca energia" },
  { id: 5, text: "Falta de apetite ou comer demais" },
  { id: 6, text: "Sentir-se mal consigo mesmo(a) — ou achar que é um fracasso ou que decepcionou a si ou sua família" },
  { id: 7, text: "Dificuldade para se concentrar nas coisas, como ler o jornal ou ver televisão" },
  { id: 8, text: "Lentidão para se movimentar ou falar (a ponto de outras pessoas perceberem), ou o oposto: agitação física excessiva" },
  { id: 9, text: "Pensamentos de que seria melhor estar morto(a) ou de ferir a si mesmo(a) de alguma maneira" },
];

export const GAD7_QUESTIONS: AssessmentQuestion[] = [
  { id: 1, text: "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)" },
  { id: 2, text: "Não ser capaz de impedir ou de controlar as preocupações" },
  { id: 3, text: "Preocupar-se demais com diversas coisas diferentes" },
  { id: 4, text: "Dificuldade para relaxar" },
  { id: 5, text: "Ficar tão agitado(a) que se torna difícil ficar parado(a)" },
  { id: 6, text: "Ficar facilmente irritado(a) ou chateado(a)" },
  { id: 7, text: "Sentir medo como se algo terrível fosse acontecer" },
];

export const FREQUENCY_OPTIONS = [
  { value: 0, label: "Nenhum dia" },
  { value: 1, label: "Vários dias" },
  { value: 2, label: "Mais da metade dos dias" },
  { value: 3, label: "Quase todos os dias" },
];

export function calculateScore(answers: number[]): number {
  return answers.reduce((sum, val) => sum + (val || 0), 0);
}

export function interpretScore(type: AssessmentType, score: number): { severity: string; description: string; color: string } {
  if (type === 'PHQ-9') {
    if (score <= 4) {
      return { severity: "Mínima ou Ausente", description: "Sintomas depressivos mínimos ou clinicamente não significativos.", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    } else if (score <= 9) {
      return { severity: "Leve", description: "Sintomas depressivos leves. Observação clínica recomendada.", color: "text-blue-700 bg-blue-50 border-blue-200" };
    } else if (score <= 14) {
      return { severity: "Moderada", description: "Sintomas moderados. Acompanhamento psicoterapêutico ativo indicado.", color: "text-amber-700 bg-amber-50 border-amber-200" };
    } else if (score <= 19) {
      return { severity: "Moderadamente Severa", description: "Sintomas consideráveis. Avaliar encaminhamento conjunto para psiquiatria.", color: "text-orange-700 bg-orange-50 border-orange-200" };
    } else {
      return { severity: "Severa", description: "Quadro depressivo severo. Necessidade de plano de intervenção intensivo.", color: "text-rose-700 bg-rose-50 border-rose-200" };
    }
  } else {
    // GAD-7
    if (score <= 4) {
      return { severity: "Mínima", description: "Ansiedade dentro dos parâmetros usuais e adaptativos.", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    } else if (score <= 9) {
      return { severity: "Leve", description: "Sintomas ansiosos leves. Monitorar fatores estressores.", color: "text-blue-700 bg-blue-50 border-blue-200" };
    } else if (score <= 14) {
      return { severity: "Moderada", description: "Ansiedade clinicamente relevante. Intervenção psicológica recomendada.", color: "text-amber-700 bg-amber-50 border-amber-200" };
    } else {
      return { severity: "Severa", description: "Ansiedade intensa. Intervenção psicoterapêutica e avaliação psiquiátrica prioritárias.", color: "text-rose-700 bg-rose-50 border-rose-200" };
    }
  }
}
