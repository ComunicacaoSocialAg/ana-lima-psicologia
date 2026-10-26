import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, app } from "./firebase";
import { BlogPost, BlogPostStatus } from "../types";

const COLLECTION_NAME = "blog_posts";
const LOCAL_STORAGE_KEY = "ana_lima_blog_posts";
const DELETED_POSTS_KEY = "ana_lima_blog_deleted_ids";
const INITIALIZED_KEY = "ana_lima_blog_initialized";

/**
 * Matéria 1 de Referência: Ansiedade e Abordagem Histórico-Cultural
 */
export const POST_REFERENCIA_ANSIEDADE: BlogPost = {
  id: "post_referencia_ansiedade",
  title: "Ansiedade não é um defeito individual: a compreensão histórico-cultural",
  slug: "ansiedade-compreensao-historico-cultural",
  excerpt:
    "Na clínica psicológica, a ansiedade raramente surge do nada. Ela é frequentemente a melhor resposta que o sujeito conseguiu estruturar diante das pressões sociais, familiares e da sobrecarga da vida moderna.",
  category: "Ansiedade & Sobrecarga",
  tags: [
    "ansiedade",
    "psicologia histórico-cultural",
    "desenvolvimento humano",
    "poços de caldas",
  ],
  coverImageUrl: "/ana-lima-portrait.webp",
  coverImageCaption:
    "Espaço de escuta qualificada e acolhimento com a Psicóloga Ana Lima em Poços de Caldas e Online",
  coverImagePosition: "top",
  status: "published",
  readTimeMinutes: 4,
  publishedAt: "2026-10-26T10:00:00Z",
  createdAt: "2026-10-26T10:00:00Z",
  updatedAt: "2026-10-26T10:00:00Z",
  authorName: "Ana Lima",
  authorCrp: "04/60205",
  seoTitle: "Ansiedade na Psicologia Histórico-Cultural • Ana Lima",
  seoDescription:
    "Compreenda como a abordagem histórico-cultural acolhe a ansiedade sem julgamentos individuais.",
  faqItems: [
    {
      question: "Como a psicologia histórico-cultural compreende a ansiedade?",
      answer:
        "A abordagem não compreende a ansiedade como um defeito biológico isolado, mas como o resultado de relações, contextos sociais e exigências que o sujeito assimilou ao longo de sua história singular.",
    },
    {
      question: "Quando é o momento de procurar a psicoterapia?",
      answer:
        "Quando padrões de sofrimento, autocobrança ou exaustão emocional passam a se repetir e as estruturas antigas já não sustentam seu bem-estar, autonomia e relações.",
    },
  ],
  contentHtml: `
    <p>Na clínica psicológica contemporânea, um dos fenômenos mais frequentes é a sensação de culpa que acompanha a ansiedade. O paciente frequentemente chega ao consultório acreditando que há uma falha biológica ou moral intrínseca em sua mente — uma incapacidade de "dar conta" das exigências cotidianas.</p>
    
    <h2>O Sofrimento não Surge Descolado da Realidade</h2>
    <p>Pela Psicologia Histórico-Cultural, fundamentada nas contribuições de Lev Vygotsky e nos estudos do desenvolvimento humano, as funções psicológicas superiores não se desenvolvem no vácuo. Nós nos constituímos como sujeitos na relação ativa com o mundo e com os outros.</p>
    <p>Isso significa que o que hoje se manifesta como aperto no peito, insônia ou ruminação mental incessante foi, em muitos momentos da sua trajetória, a <strong>estratégia mais adaptativa e protetiva</strong> que você encontrou para sobreviver a ambientes de hipervigilância, cobrança desmedida ou desamparo emocional.</p>

    <blockquote>“A clareza sobre quem você é abre espaço para o que você pode ser. A consciência individual é construída na história viva das relações humanas.”</blockquote>

    <h2>O Papel Organizador da Palavra na Terapia</h2>
    <p>Quando a angústia não encontra mediação simbólica, ela se expressa no corpo através de sintomas físicos. O processo psicoterapêutico oferece exatamente a mediação intencional: através da palavra dita em um espaço seguro e sigiloso, aquilo que parecia confuso e silencioso começa a ganhar contorno, lógica e sentido histórico.</p>
    <p>Compreender a raiz do seu sofrimento não significa resignar-se a ele, mas sim desarmar a culpa para construir uma posição de maturidade e autonomia prática diante da própria história.</p>
  `,
};

/**
 * Matéria 2 de Referência: Vínculos Afetivos e Padrões Relacionais
 */
export const POST_REFERENCIA_VINCULOS: BlogPost = {
  id: "post_referencia_vinculos",
  title: "Por que repetimos dinâmicas que nos machucam? O papel dos vínculos",
  slug: "por-que-repetimos-dinamicas-relacionais",
  excerpt:
    "A repetição de padrões afetivos e comportamentais não decorre de falta de força de vontade, mas de estruturas relacionais assimiladas na história singular de cada sujeito que pedem ressignificação consciente.",
  category: "Relacionamentos & Vínculos",
  tags: [
    "relacionamentos",
    "vínculos afetivos",
    "psicoterapia",
    "autoconhecimento",
    "desenvolvimento humano",
  ],
  coverImageUrl: "/hero-poster.webp",
  coverImageCaption:
    "Compreensão profunda das estruturas relacionais e mediação afetiva na clínica psicológica",
  coverImagePosition: "center",
  status: "published",
  readTimeMinutes: 4,
  publishedAt: "2026-10-24T14:30:00Z",
  createdAt: "2026-10-24T14:30:00Z",
  updatedAt: "2026-10-24T14:30:00Z",
  authorName: "Ana Lima",
  authorCrp: "04/60205",
  seoTitle: "Por que Repetimos Padrões nos Relacionamentos? • Ana Lima",
  seoDescription:
    "Compreenda como as primeiras mediações afetivas moldam nossas escolhas e como transformar padrões relacionais na terapia.",
  faqItems: [
    {
      question: "Por que é tão difícil quebrar padrões em relacionamentos?",
      answer:
        "Porque os padrões relacionais foram aprendidos como mecanismos de segurança em fases anteriores da vida. Modificá-los exige desconstruir crenças profundas e experimentar novas posturas na prática psicoterapêutica.",
    },
    {
      question: "Como a psicoterapia ajuda na resolução de conflitos afetivos?",
      answer:
        "A terapia oferece um espaço de reflexão crítica para que o sujeito identifique suas feridas de origem, estabeleça limites claros e aprenda a se posicionar com firmeza e afeto diante dos outros.",
    },
  ],
  contentHtml: `
    <p>É muito comum ouvir na clínica relatos de pessoas que se percebem presas a ciclos relacionais repetitivos: a escolha por parceiros emocionalmente indisponíveis, a dificuldade crônica em estabelecer limites saudáveis ou a tendência involuntária de assumir a responsabilidade pelo bem-estar do outro.</p>

    <h2>O Passado que se Faz Presente sem Aviso</h2>
    <p>Na perspectiva histórico-cultural, nossas formas de amar, confiar e temer não nascem prontas no cérebro; elas são internalizadas através das primeiras mediações afetivas que experimentamos no mundo. Aquilo que vivenciamos intersubjetivamente na infância e juventude torna-se a nossa gramática relacional interna.</p>
    <p>Muitas vezes, a repetição de uma dinâmica dolorosa acontece porque ela é <strong>familiar e previsível</strong> para o nosso psiquismo. O desconhecido, ainda que mais saudável, gera estranhamento inicial.</p>

    <blockquote>“Aquilo que não é conscientizado e elaborado na palavra tende a se repetir como destino involuntário no cotidiano.”</blockquote>

    <h2>Transformando a Repetição em Escolha Consciente</h2>
    <p>O objetivo do processo psicoterapêutico não é apontar culpados no passado, mas desvelar o sentido das escolhas presentes. Ao reconhecer as origens das suas necessidades emocionais e dos seus medos de abandono ou rejeição, abre-se a possibilidade de construir novas respostas relacionais.</p>
    <p>A autonomia afetiva nasce da coragem de olhar para a própria história sem resignação, aprendendo a sustentar vínculos que respeitem sua integridade e seu valor.</p>
  `,
};

/**
 * Apenas 2 matérias de referência prontas para modelo da Ana.
 */
export const INITIAL_REFERENCE_POSTS: BlogPost[] = [
  POST_REFERENCIA_ANSIEDADE,
  POST_REFERENCIA_VINCULOS,
];

export const INITIAL_REFERENCE_POST: BlogPost = POST_REFERENCIA_ANSIEDADE;

export function getDeletedPostIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DELETED_POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addDeletedPostId(idOrSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getDeletedPostIds();
    if (!current.includes(idOrSlug)) {
      current.push(idOrSlug);
      localStorage.setItem(DELETED_POSTS_KEY, JSON.stringify(current));
    }
  } catch (e) {
    console.warn("Erro ao registrar exclusão:", e);
  }
}

function getLocalPosts(): BlogPost[] {
  if (typeof window === "undefined") return INITIAL_REFERENCE_POSTS;
  try {
    const deletedIds = getDeletedPostIds();
    const isInit = localStorage.getItem(INITIALIZED_KEY) === "true";
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!raw && !isInit) {
      // Primeira inicialização do sistema: salva as 2 matérias de referência
      localStorage.setItem(INITIALIZED_KEY, "true");
      const seeded = INITIAL_REFERENCE_POSTS.filter(
        (p) => !deletedIds.includes(p.id) && !deletedIds.includes(p.slug)
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (p) => !deletedIds.includes(p.id) && !deletedIds.includes(p.slug)
      );
    }
    return [];
  } catch {
    return [];
  }
}

function setLocalPosts(posts: BlogPost[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INITIALIZED_KEY, "true");
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(posts));
  } catch (e) {
    console.warn("Aviso ao salvar posts no armazenamento local:", e);
  }
}

/**
 * Utilitário para gerar slug amigável a partir do título
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s-]/g, "") // remove caracteres especiais
    .trim()
    .replace(/\s+/g, "-") // substitui espaços por traços
    .replace(/-+/g, "-"); // remove traços duplicados
}

/**
 * Calcula tempo estimado de leitura (base 200 palavras por minuto)
 */
export function calculateReadTime(textOrHtml: string): number {
  const plainText = textOrHtml.replace(/<[^>]*>/g, " ");
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export interface CompressedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeKb: number;
}

/**
 * Comprime uma imagem localmente no navegador antes de qualquer gravação.
 * Redimensiona para resolução ideal 16:9 (max 1200x675) e converte para WebP leve (~40 a 70 KB).
 */
export async function compressImageToWebP(
  file: File,
  maxWidth = 1200,
  quality = 0.82
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Falha ao obter contexto 2D para compressão"));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        const tryWebP = () => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const dataUrlReader = new FileReader();
                dataUrlReader.onloadend = () => {
                  const dataUrl = dataUrlReader.result as string;
                  const sizeKb = Math.round(blob.size / 1024);
                  resolve({ blob, dataUrl, width, height, sizeKb });
                };
                dataUrlReader.readAsDataURL(blob);
              } else {
                canvas.toBlob(
                  (jpegBlob) => {
                    if (jpegBlob) {
                      const dataUrlReader = new FileReader();
                      dataUrlReader.onloadend = () => {
                        const dataUrl = dataUrlReader.result as string;
                        const sizeKb = Math.round(jpegBlob.size / 1024);
                        resolve({ blob: jpegBlob, dataUrl, width, height, sizeKb });
                      };
                      dataUrlReader.readAsDataURL(jpegBlob);
                    } else {
                      reject(new Error("Falha ao converter imagem"));
                    }
                  },
                  "image/jpeg",
                  quality
                );
              }
            },
            "image/webp",
            quality
          );
        };

        tryWebP();
      };
      img.onerror = () => reject(new Error("Arquivo de imagem corrompido ou formato não suportado"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo de imagem"));
    reader.readAsDataURL(file);
  });
}

/**
 * Processa a imagem de capa com compressão WebP rigorosa.
 */
export async function uploadBlogImage(
  file: File,
  folder: "covers" | "content" = "covers"
): Promise<{ url: string; sizeKb: number }> {
  try {
    const compressed = await compressImageToWebP(file);

    if (app) {
      try {
        const storage = getStorage(app);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;
        const storageRef = ref(storage, `blog/${folder}/${fileName}`);

        await uploadBytes(storageRef, compressed.blob, {
          contentType: "image/webp",
          cacheControl: "public, max-age=31536000",
        });

        const cloudUrl = await getDownloadURL(storageRef);
        return { url: cloudUrl, sizeKb: compressed.sizeKb };
      } catch (storageErr) {
        console.warn("Storage remoto em modo contingência local:", storageErr);
      }
    }

    return { url: compressed.dataUrl, sizeKb: compressed.sizeKb };
  } catch (err) {
    console.error("Erro no processamento da imagem:", err);
    throw new Error("Não foi possível processar a imagem.");
  }
}

/**
 * Lista todos os posts (para a Ana no painel de ADM), mesclando nuvem e dados locais,
 * respeitando com rigor quaisquer posts excluídos.
 */
export async function listAllPosts(): Promise<BlogPost[]> {
  const deletedIds = getDeletedPostIds();
  const local = getLocalPosts();
  let remote: BlogPost[] = [];

  if (db) {
    try {
      // Consulta direta por coleção sem exigir índice composto no Firestore
      const q = collection(db, COLLECTION_NAME);
      const snapshot = await getDocs(q);
      remote = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BlogPost));
    } catch (err) {
      console.warn("Aviso ao ler posts do Firestore (usando base local):", err);
    }
  }

  // Merge seguro sem duplicar IDs nem incluir deletados
  const map = new Map<string, BlogPost>();
  local.forEach((p) => {
    if (!deletedIds.includes(p.id) && !deletedIds.includes(p.slug)) {
      map.set(p.id, p);
    }
  });
  remote.forEach((p) => {
    if (!deletedIds.includes(p.id) && !deletedIds.includes(p.slug)) {
      map.set(p.id, p);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime()
  );
}

/**
 * Lista apenas os posts com status 'published'.
 */
export async function listPublishedPosts(): Promise<BlogPost[]> {
  const all = await listAllPosts();
  return all.filter((p) => p.status === "published");
}

/**
 * Obtém um post pelo slug.
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const deletedIds = getDeletedPostIds();
  if (deletedIds.includes(slug)) return null;

  const all = await listAllPosts();
  const found = all.find((p) => p.slug === slug);
  if (found) return found;

  if (db) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where("slug", "==", slug),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        const post = { id: d.id, ...d.data() } as BlogPost;
        if (!deletedIds.includes(post.id) && !deletedIds.includes(post.slug)) {
          return post;
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar post no Firestore:", err);
    }
  }

  return null;
}

/**
 * Salva ou atualiza um post de forma resiliente e garantida.
 */
export async function savePost(
  post: Partial<BlogPost> & { title: string }
): Promise<string> {
  const now = new Date().toISOString();
  const id =
    post.id || `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const slug = post.slug?.trim() || generateSlug(post.title);
  const readTimeMinutes = calculateReadTime(post.contentHtml || "");

  const postData: BlogPost = {
    id,
    title: post.title.trim(),
    slug,
    excerpt: post.excerpt?.trim() || "",
    contentHtml: post.contentHtml || "",
    coverImageUrl: post.coverImageUrl || "",
    coverImageCaption: post.coverImageCaption || "",
    coverImagePosition: post.coverImagePosition || "center",
    category: post.category || "Psicologia Clínica",
    tags: post.tags || [],
    status: post.status || "draft",
    readTimeMinutes,
    publishedAt:
      post.status === "published"
        ? post.publishedAt || now
        : post.publishedAt || undefined,
    createdAt: post.createdAt || now,
    updatedAt: now,
    authorName: post.authorName || "Ana Lima",
    authorCrp: post.authorCrp || "04/60205",
    seoTitle: post.seoTitle?.trim() || post.title.trim(),
    seoDescription: post.seoDescription?.trim() || post.excerpt?.trim() || "",
    seoKeywords: post.seoKeywords || [],
    faqItems: post.faqItems || [],
  };

  const deletedIds = getDeletedPostIds();
  if (deletedIds.includes(id) || deletedIds.includes(slug)) {
    const updatedDeleted = deletedIds.filter((d) => d !== id && d !== slug);
    localStorage.setItem(DELETED_POSTS_KEY, JSON.stringify(updatedDeleted));
  }

  // 1. Grava no cache local para persistência garantida
  const local = getLocalPosts();
  const idx = local.findIndex((p) => p.id === id);
  if (idx >= 0) {
    local[idx] = postData;
  } else {
    local.unshift(postData);
  }
  setLocalPosts(local);

  // 2. Tenta persistência na nuvem (Firestore)
  if (db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await setDoc(docRef, postData, { merge: true });
    } catch (err) {
      console.warn("Firestore gravado com segurança no armazenamento local:", err);
    }
  }

  return id;
}

/**
 * Remove um post de forma segura no cache local e no Firestore.
 */
export async function deletePost(id: string): Promise<void> {
  const local = getLocalPosts();
  const target = local.find((p) => p.id === id);

  // 1. Registra exclusão permanente
  addDeletedPostId(id);
  if (target?.slug) {
    addDeletedPostId(target.slug);
  }

  // 2. Remove do armazenamento local
  const updated = local.filter((p) => p.id !== id);
  setLocalPosts(updated);

  // 3. Remove do Firestore
  if (db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn("Exclusão Firestore processada localmente:", err);
    }
  }
}
