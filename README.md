# Psicóloga Ana Lima (CRP 04/60205) — Site Institucional Cinemático & Sistema de Gestão Clínica

Repositório contendo os dois projetos integrados da **Psicóloga Clínica Ana Lima (CRP 04/60205 • Poços de Caldas/MG)**:

## 1. Site Institucional Cinemático (`/Site`)
- **Arquivo principal:** [`Site/index.html`](./Site/index.html)
- **Direção de Arte:** Editorial clara em papel Linho Cru (`#F7F5F0`), Musgo Profundo (`#1C2B22`), Basalto Quente (`#262421`) e Terracota Queimado (`#A85A3F`), com tipografia *Cormorant Garamond* e *Plus Jakarta Sans*.
- **Motor Botânico 3D Interativo & Metamorfose (`Dente-de-Leão Completo ⇄ Semente-Guia 360°`):**
  - Na Hero, o vídeo do sopro toca 1x na coluna direita e dissolve revelando um jardim interativo de **3 unidades de Dente-de-Leão** em diferentes planos de profundidade.
  - Durante a rolagem entre as seções (`I.` a `VII.`), a entidade protagonista executa uma **metamorfose contínua em 3D (`morphFactor`)**: as 92 sementes da coroa em esfera de Fibonacci se desprendem em vórtice espiral revelando a **Semente-Guia Protagonista** (com ampliação macro até `2.85x` e **giro 360° tridimensional no próprio eixo**), e voltam a convergir no ar para reconstruir o **Dente-de-Leão Completo** nas seções seguintes.
  - **Tipografia Cinemática Sincronizada:** Títulos divididos palavra por palavra (`.cine-word`) com entrada em onda 3D, blocos de prosa com deriva direcional de vento (`.cine-flow-item`), paralaxe multicamada (`--parallax-y`) e fios editoriais de `1px` auto-desenhados.

## 2. Sistema de Gestão Clínica (`/src`)
Aplicação web/PWA em **React 18 + TypeScript + Vite + Tailwind CSS + Firebase (Auth & Firestore)**:
- **`src/components/dashboard/`**: Painel geral de métricas clínicas, sessões do dia e alertas.
- **`src/components/schedule/`**: Agenda clínica integrada automaticamente ao módulo Financeiro.
- **`src/components/patients/`**: Gestão de pacientes, Ficha de Anamnese, Prontuário Clínico com trilha de auditoria CFP (Resolução 01/2009), Documentos/Laudos em PDF e Ficha Pública de Pré-Cadastro (`/?cadastro=1`).
- **`src/components/assessments/`**: Aplicação e gráficos evolutivos de escalas psicométricas (`PHQ-9`, `GAD-7`, `BDI-II`, `PSS-10`).
- **`src/components/financial/`**: Controle financeiro sincronizado com a agenda, emissão de recibos e exportação.
- **`src/components/settings/` & `src/components/layout/LockScreen.tsx`**: Configurações do consultório, cadastro/alteração de PIN/Senha de bloqueio de tela (persistente contra recarregamento `F5`) e backup criptografado/redundante.
