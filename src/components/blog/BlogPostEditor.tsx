import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Sparkles,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Trash2,
  Plus,
  Eye,
  Save,
  Send,
  ExternalLink,
  Copy,
  Check,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Quote,
  List,
  ListOrdered,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import { BlogPost, BlogFaqItem, BlogPostStatus } from "../../types";
import {
  savePost,
  deletePost,
  uploadBlogImage,
  generateSlug,
  calculateReadTime,
} from "../../services/blogService";

interface BlogPostEditorProps {
  initialPost?: BlogPost | null;
  onBack: () => void;
  onSaved: (post: BlogPost) => void;
  onDelete?: (id: string) => void;
}

const CATEGORIES = [
  "Psicologia Clínica",
  "Ansiedade & Sobrecarga",
  "Relacionamentos & Vínculos",
  "Transições de Vida",
  "Abordagem Histórico-Cultural",
  "Autoconhecimento",
];

const PRESET_COVERS = [
  { label: "Foto da Ana Lima", url: "/ana-lima-portrait.webp" },
  { label: "Consultório Acolhedor", url: "/hero-poster.webp" },
  { label: "Identidade Dente-de-Leão", url: "/ana lima1.png" },
];

export const BlogPostEditor: React.FC<BlogPostEditorProps> = ({
  initialPost,
  onBack,
  onSaved,
  onDelete,
}) => {
  const [title, setTitle] = useState(initialPost?.title || "");
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || "");
  const [contentHtml, setContentHtml] = useState(initialPost?.contentHtml || "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialPost?.coverImageUrl || "");
  const [coverImageCaption, setCoverImageCaption] = useState(initialPost?.coverImageCaption || "");
  const [coverImagePosition, setCoverImagePosition] = useState<"center" | "top" | "bottom">(
    initialPost?.coverImagePosition || "top"
  );
  const [coverImageSizeKb, setCoverImageSizeKb] = useState<number | null>(null);
  const [category, setCategory] = useState(initialPost?.category || CATEGORIES[0]);
  const [tagsInput, setTagsInput] = useState(initialPost?.tags?.join(", ") || "");
  const [faqItems, setFaqItems] = useState<BlogFaqItem[]>(initialPost?.faqItems || []);
  const [status, setStatus] = useState<BlogPostStatus>(initialPost?.status || "draft");

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  const editorRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Inicializa o conteúdo no editor editable
  useEffect(() => {
    if (editorRef.current && contentHtml && editorRef.current.innerHTML !== contentHtml) {
      editorRef.current.innerHTML = contentHtml;
    }
  }, []);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!isSlugManual && (!initialPost || !initialPost.slug)) {
      setSlug(generateSlug(newTitle));
    }
  };

  const handleSlugChange = (newSlug: string) => {
    setIsSlugManual(true);
    setSlug(generateSlug(newSlug));
  };

  // Upload e compressão da Imagem de Capa com WebP de alta eficiência
  const processImageFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WebP).");
      return;
    }

    try {
      setIsUploadingCover(true);
      const res = await uploadBlogImage(file, "covers");
      setCoverImageUrl(res.url);
      setCoverImageSizeKb(res.sizeKb);
    } catch (err: any) {
      console.error("Erro ao processar imagem de capa:", err);
      alert("Não foi possível processar a imagem. Tente uma foto em formato JPG ou PNG.");
    } finally {
      setIsUploadingCover(false);
      setIsDragging(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  // Comandos da barra de ferramentas do editor
  const executeCmd = (command: string, value: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const insertQuote = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(
        "insertHTML",
        false,
        `<blockquote class="border-l-4 border-[#0f9f80] pl-4 py-2 my-4 italic text-slate-700 bg-emerald-50/40 rounded-r-lg font-serif text-lg">“Digite aqui uma reflexão ou citação importante”</blockquote><p><br></p>`
      );
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const insertHighlightBox = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(
        "insertHTML",
        false,
        `<div class="my-6 p-5 rounded-2xl bg-[#1C2B22]/5 border border-[#1C2B22]/15 text-slate-800"><h4 class="font-bold text-[#1C2B22] mb-2 text-base flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-[#0f9f80]"></span>Ponto de Atenção Clínica</h4><p class="text-sm leading-relaxed text-slate-700">Explique aqui um conceito chave de maneira clara e direta para o paciente.</p></div><p><br></p>`
      );
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  // Gerenciamento de FAQs (AEO)
  const addFaqItem = () => {
    setFaqItems([...faqItems, { question: "", answer: "" }]);
  };

  const updateFaqItem = (index: number, field: "question" | "answer", val: string) => {
    const updated = [...faqItems];
    updated[index][field] = val;
    setFaqItems(updated);
  };

  const removeFaqItem = (index: number) => {
    setFaqItems(faqItems.filter((_, i) => i !== index));
  };

  // Apagar artigo
  const handleDeletePost = async () => {
    if (!initialPost?.id) return;
    const confirm = window.confirm(
      `Deseja realmente apagar o artigo "${title || initialPost.title}"?\n\nEsta ação removerá o artigo definitivamente do site e do seu painel.`
    );
    if (!confirm) return;

    try {
      await deletePost(initialPost.id);
      onDelete?.(initialPost.id);
    } catch (err) {
      alert("Erro ao excluir artigo. Tente novamente.");
    }
  };

  // Salvar Post
  const handleSave = async (newStatus?: BlogPostStatus) => {
    const finalStatus = newStatus || status;
    const finalContent = editorRef.current?.innerHTML || contentHtml;

    if (!title.trim()) {
      alert("Por favor, preencha o título do post.");
      return;
    }

    try {
      setIsSaving(true);
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const savedId = await savePost({
        id: initialPost?.id,
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        excerpt: excerpt.trim(),
        contentHtml: finalContent,
        coverImageUrl,
        coverImageCaption,
        coverImagePosition,
        category,
        tags: parsedTags,
        status: finalStatus,
        authorName: "Ana Lima",
        authorCrp: "04/60205",
        faqItems: faqItems.filter((f) => f.question.trim() && f.answer.trim()),
      });

      setStatus(finalStatus);
      setSaveSuccessMsg(
        finalStatus === "published"
          ? "Artigo publicado com sucesso no site!"
          : "Rascunho salvo com sucesso!"
      );

      setTimeout(() => {
        setSaveSuccessMsg("");
        onSaved({
          id: savedId,
          title: title.trim(),
          slug: slug.trim() || generateSlug(title),
          excerpt: excerpt.trim(),
          contentHtml: finalContent,
          coverImageUrl,
          coverImageCaption,
          coverImagePosition,
          category,
          tags: parsedTags,
          status: finalStatus,
          readTimeMinutes: calculateReadTime(finalContent),
          createdAt: initialPost?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorName: "Ana Lima",
          authorCrp: "04/60205",
          faqItems,
        });
      }, 800);
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Não foi possível salvar o artigo. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Cálculo da pontuação de SEO/AEO/GEO
  const seoChecks = [
    {
      label: "Título atraente (entre 30 e 70 caracteres)",
      passed: title.length >= 30 && title.length <= 70,
      detail: `${title.length} caracteres`,
    },
    {
      label: "Resumo explicativo para o Google e WhatsApp (entre 80 e 160 caracteres)",
      passed: excerpt.length >= 80 && excerpt.length <= 160,
      detail: `${excerpt.length} caracteres`,
    },
    {
      label: "Imagem de capa adicionada",
      passed: !!coverImageUrl,
      detail: coverImageUrl ? (coverImageSizeKb ? `${coverImageSizeKb} KB` : "Adicionada") : "Pendente",
    },
    {
      label: "Conteúdo consistente (pelo menos 300 palavras)",
      passed: calculateReadTime(contentHtml) >= 1 && contentHtml.length > 500,
      detail: `~${calculateReadTime(contentHtml)} min de leitura`,
    },
    {
      label: "Perguntas e Respostas AEO para o Google",
      passed: faqItems.length > 0 && faqItems.some((f) => f.question.trim()),
      detail: `${faqItems.length} perguntas`,
    },
  ];

  const passedChecksCount = seoChecks.filter((c) => c.passed).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* Top Header com Ações */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Voltar para a lista"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {initialPost ? "Editando Artigo" : "Novo Artigo"}
              </span>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  status === "published"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                {status === "published" ? "Publicado no Ar" : "Rascunho"}
              </span>
            </div>
            <h1 className="text-base font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {title || "Sem título ainda"}
            </h1>
          </div>
        </div>

        {/* Mensagem de sucesso */}
        {saveSuccessMsg && (
          <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            {saveSuccessMsg}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* BOTÃO APAGAR ARTIGO (sempre visível se o artigo já foi salvo/criado) */}
          {initialPost && (
            <button
              type="button"
              onClick={handleDeletePost}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5 shadow-xs"
              title="Apagar este artigo definitivamente"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Apagar Artigo</span>
            </button>
          )}

          {/* Alternar Prévia */}
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-colors ${
              previewMode
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">
              {previewMode ? "Continuar Editando" : "Prévia"}
            </span>
          </button>

          {/* Salvar Rascunho */}
          <button
            onClick={() => handleSave("draft")}
            disabled={isSaving}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>Salvar Rascunho</span>
          </button>

          {/* Publicar / Atualizar no Ar */}
          <button
            onClick={() => handleSave("published")}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1C2B22] text-[#F7F5F0] hover:bg-[#2A3C31] shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-[#0f9f80]" />
            <span>{status === "published" ? "Atualizar no Ar" : "Publicar no Blog"}</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal do Editor */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {previewMode ? (
          /* MODO DE PRÉVIA */
          <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 md:p-12">
            <div className="text-center mb-8">
              <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-[#0f9f80] border border-emerald-200/60 mb-4">
                {category}
              </span>
              <h1 className="font-serif text-3xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
                {title || "Título do Artigo"}
              </h1>
              <p className="text-base md:text-lg text-slate-600 leading-relaxed font-sans max-w-2xl mx-auto mb-6">
                {excerpt || "Resumo do artigo aparecerá aqui..."}
              </p>
              <div className="flex items-center justify-center gap-3 text-xs text-slate-500 pt-4 border-t border-slate-100">
                <span>Por Ana Lima (CRP 04/60205)</span>
                <span>•</span>
                <span>{calculateReadTime(contentHtml)} min de leitura</span>
                <span>•</span>
                <span>{new Date().toLocaleDateString("pt-BR")}</span>
              </div>
            </div>

            {coverImageUrl && (
              <figure className="mb-10">
                <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-sm bg-slate-100">
                  <img
                    src={coverImageUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: coverImagePosition }}
                  />
                </div>
                {coverImageCaption && (
                  <figcaption className="text-xs text-center text-slate-400 mt-2 italic">
                    {coverImageCaption}
                  </figcaption>
                )}
              </figure>
            )}

            <div
              className="prose prose-slate max-w-none font-sans text-slate-700 leading-relaxed space-y-4 text-base md:text-lg"
              dangerouslySetInnerHTML={{ __html: contentHtml || "<p>Nenhum conteúdo inserido ainda.</p>" }}
            />

            {faqItems.length > 0 && (
              <div className="mt-12 pt-8 border-t border-slate-200">
                <h3 className="font-serif text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-[#0f9f80]" />
                  Perguntas Frequentes sobre o Tema
                </h3>
                <div className="space-y-4">
                  {faqItems.map((faq, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <h4 className="font-semibold text-slate-900 text-sm md:text-base mb-1">
                        {faq.question || "Pergunta..."}
                      </h4>
                      <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                        {faq.answer || "Resposta..."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* MODO DE EDIÇÃO */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Coluna Esquerda: Redação (8 colunas) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Título */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Título do Artigo
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Ex: Como a Terapia Histórico-Cultural Transforma a Ansiedade"
                  className="w-full font-serif text-2xl md:text-3xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none border-b border-transparent focus:border-[#0f9f80] pb-2 transition-colors"
                />

                {/* Slug / Link Amigável */}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-400">Link no site:</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-lg font-mono text-slate-700 break-all">
                    /blog/{slug || "link-do-artigo"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://analimapsicologia.com.br/blog/${slug}`);
                      setCopiedSlug(true);
                      setTimeout(() => setCopiedSlug(false), 2000);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700"
                    title="Copiar link completo"
                  >
                    {copiedSlug ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Resumo / Meta Description */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Resumo do Artigo (Aparece no Google e no WhatsApp)
                  </label>
                  <span
                    className={`text-xs font-medium ${
                      excerpt.length >= 80 && excerpt.length <= 160
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {excerpt.length}/160 caracteres
                  </span>
                </div>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={2}
                  placeholder="Um parágrafo acolhedor que resuma o texto e desperte o interesse do leitor em Poços de Caldas e online..."
                  className="w-full text-sm text-slate-700 rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-[#0f9f80]/20 focus:border-[#0f9f80] resize-none"
                />
              </div>

              {/* Editor de Texto Rico (WYSIWYG) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                {/* Barra de Ferramentas Fixa */}
                <div className="bg-slate-50/90 border-b border-slate-200 p-2.5 flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => executeCmd("formatBlock", "<h2>")}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Título H2"
                  >
                    <Heading2 className="w-4 h-4" />
                    <span>H2</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("formatBlock", "<h3>")}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Subtítulo H3"
                  >
                    <Heading3 className="w-4 h-4" />
                    <span>H3</span>
                  </button>

                  <div className="h-5 w-px bg-slate-300 mx-1" />

                  <button
                    type="button"
                    onClick={() => executeCmd("bold")}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                    title="Negrito"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("italic")}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                    title="Itálico"
                  >
                    <Italic className="w-4 h-4" />
                  </button>

                  <div className="h-5 w-px bg-slate-300 mx-1" />

                  <button
                    type="button"
                    onClick={insertQuote}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                    title="Citação reflexiva"
                  >
                    <Quote className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => executeCmd("insertUnorderedList")}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                    title="Lista com marcadores"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("insertOrderedList")}
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                    title="Lista numerada"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>

                  <div className="h-5 w-px bg-slate-300 mx-1" />

                  <button
                    type="button"
                    onClick={insertHighlightBox}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                    title="Inserir destaque reflexivo"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Destaque Clínico</span>
                  </button>
                </div>

                {/* Área de Digitação WYSIWYG */}
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={() => setContentHtml(editorRef.current?.innerHTML || "")}
                  data-placeholder="Escreva aqui seu artigo com calma..."
                  className="p-6 md:p-8 min-h-[420px] focus:outline-none font-sans text-slate-800 leading-relaxed text-base md:text-lg space-y-4"
                  style={{ minHeight: "450px" }}
                />
              </div>

              {/* Módulo de FAQ (AEO) */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-[#0f9f80]" />
                      Perguntas & Respostas Rápidas (AEO / Snippets do Google)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Adicione 1 a 3 perguntas que pessoas buscam no Google para gerar caixas de resposta no topo da pesquisa.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addFaqItem}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-[#0f9f80] hover:bg-emerald-100 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Pergunta</span>
                  </button>
                </div>

                {faqItems.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-xs text-slate-500">
                      Nenhuma pergunta adicionada ainda. Clique em "Adicionar Pergunta" acima para turbinar o alcance do post.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    {faqItems.map((item, index) => (
                      <div key={index} className="p-4 rounded-xl bg-slate-50 border border-slate-200 relative">
                        <button
                          type="button"
                          onClick={() => removeFaqItem(index)}
                          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remover pergunta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="space-y-2 pr-8">
                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Pergunta (ex: Como a terapia ajuda na ansiedade?)
                            </label>
                            <input
                              type="text"
                              value={item.question}
                              onChange={(e) => updateFaqItem(index, "question", e.target.value)}
                              placeholder="Digite a pergunta..."
                              className="w-full text-xs font-medium text-slate-800 rounded-lg border border-slate-300 p-2 mt-1 focus:outline-none focus:border-[#0f9f80]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                              Resposta Direta (cerca de 2 a 3 frases)
                            </label>
                            <textarea
                              value={item.answer}
                              onChange={(e) => updateFaqItem(index, "answer", e.target.value)}
                              rows={2}
                              placeholder="Digite a resposta direta..."
                              className="w-full text-xs text-slate-700 rounded-lg border border-slate-300 p-2 mt-1 focus:outline-none focus:border-[#0f9f80] resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ZONA DE EXCLUSÃO (Para apagar com total clareza e segurança) */}
              {initialPost && (
                <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      Apagar este Artigo do Blog
                    </h4>
                    <p className="text-xs text-rose-700/80 mt-1">
                      Esta ação removerá o artigo "{title || initialPost.title}" imediatamente do site e do seu painel de gestão.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeletePost}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Apagar Artigo Definitivamente</span>
                  </button>
                </div>
              )}
            </div>

            {/* Coluna Direita: Capa & Assistente SEO (4 colunas) */}
            <div className="lg:col-span-4 space-y-6">
              {/* IMAGEM DE CAPA COM CONTROLE TOTAL E ROBUSTO */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Imagem de Capa (Destaque)
                  </label>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Proporção 16:9
                  </span>
                </div>

                {/* Caixa Informativa de Tamanho e Peso Ideal */}
                <div className="p-3 mb-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Sparkles className="w-3.5 h-3.5 text-[#0f9f80]" />
                    <span>Especificações Ideais</span>
                  </div>
                  <p>• <strong>Resolução recomendada:</strong> 1200 &times; 675 pixels (proporção 16:9).</p>
                  <p>• <strong>Peso ideal:</strong> até 2 MB (JPG, PNG ou WebP).</p>
                  <p className="text-emerald-700 font-medium">💡 O sistema otimiza e converte automaticamente para WebP leve ao subir.</p>
                </div>

                {isUploadingCover ? (
                  <div className="w-full h-44 rounded-2xl border border-dashed border-[#0f9f80] bg-emerald-50/30 flex flex-col items-center justify-center gap-2 text-center p-4">
                    <RefreshCw className="w-6 h-6 text-[#0f9f80] animate-spin" />
                    <span className="text-xs font-semibold text-emerald-900">
                      Otimizando e comprimindo imagem...
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Convertendo para WebP 16:9 de alta definição
                    </span>
                  </div>
                ) : coverImageUrl ? (
                  <div className="space-y-4">
                    {/* Prévia da Imagem com o Enquadramento Atual */}
                    <div className="relative rounded-xl overflow-hidden group border border-slate-200 bg-slate-100 aspect-video shadow-sm">
                      <img
                        src={coverImageUrl}
                        alt="Capa do post"
                        className="w-full h-full object-cover transition-all duration-300"
                        style={{ objectPosition: coverImagePosition }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImageUrl("");
                          setCoverImageSizeKb(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/75 hover:bg-rose-600 text-white rounded-lg transition-colors shadow-sm"
                        title="Remover foto de capa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {coverImageSizeKb && (
                        <span className="absolute bottom-2 left-2 text-[10px] font-medium bg-black/70 text-white px-2 py-0.5 rounded-md backdrop-blur-md">
                          ✓ {coverImageSizeKb} KB (WebP otimizado)
                        </span>
                      )}
                    </div>

                    {/* Controle Interativo de Enquadramento */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Ajuste do Enquadramento (Evitar Cortar Rosto)
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
                        <button
                          type="button"
                          onClick={() => setCoverImagePosition("top")}
                          className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                            coverImagePosition === "top"
                              ? "bg-white text-slate-900 shadow-sm font-semibold"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Topo / Rosto
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoverImagePosition("center")}
                          className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                            coverImagePosition === "center"
                              ? "bg-white text-slate-900 shadow-sm font-semibold"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Centro
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoverImagePosition("bottom")}
                          className={`py-1.5 px-2 rounded-lg font-medium transition-colors ${
                            coverImagePosition === "bottom"
                              ? "bg-white text-slate-900 shadow-sm font-semibold"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Base
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Dica: use "Topo / Rosto" para retratos onde a cabeça fica na parte superior.
                      </p>
                    </div>

                    {/* Ações de Troca */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="flex-1 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Trocar Foto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImageUrl("");
                          setCoverImageSizeKb(null);
                        }}
                        className="py-1.5 px-3 rounded-lg border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-xs font-medium text-rose-700 transition-colors"
                      >
                        Remover
                      </button>
                    </div>

                    <input
                      type="text"
                      value={coverImageCaption}
                      onChange={(e) => setCoverImageCaption(e.target.value)}
                      placeholder="Legenda ou crédito da foto (opcional)"
                      className="w-full text-xs text-slate-600 rounded-lg border border-slate-200 p-2 focus:outline-none focus:border-[#0f9f80]"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Zona de Drop & Upload */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "copy";
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => coverInputRef.current?.click()}
                      className={`w-full h-36 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 p-4 text-center cursor-pointer transition-all ${
                        isDragging
                          ? "border-[#0f9f80] bg-emerald-50/50 scale-[1.01]"
                          : "border-slate-300 hover:border-[#0f9f80] bg-slate-50/50 hover:bg-emerald-50/20"
                      }`}
                    >
                      <Upload className="w-6 h-6 text-slate-400" />
                      <div>
                        <span className="text-xs font-semibold text-[#0f9f80]">
                          Subir Foto do Computador ou Celular
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Clique ou arraste a imagem aqui (1200 &times; 675 px)
                        </p>
                      </div>
                    </div>

                    {/* Presets Rápidos com Fotos Oficiais da Clínica */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Ou escolha uma foto oficial do consultório:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {PRESET_COVERS.map((preset) => (
                          <button
                            key={preset.url}
                            type="button"
                            onClick={() => {
                              setCoverImageUrl(preset.url);
                              setCoverImagePosition("top");
                              setCoverImageSizeKb(null);
                            }}
                            className="p-1.5 text-[11px] font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-lg transition-colors border border-slate-200 text-center truncate"
                            title={preset.label}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Inserir URL direta */}
                    <div>
                      {showUrlInput ? (
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={customUrl}
                            onChange={(e) => setCustomUrl(e.target.value)}
                            placeholder="https://exemplo.com/foto.jpg"
                            className="flex-1 text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:border-[#0f9f80]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customUrl.trim()) {
                                setCoverImageUrl(customUrl.trim());
                                setCoverImageSizeKb(null);
                                setShowUrlInput(false);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-[#1C2B22] text-white text-xs rounded-lg font-medium"
                          >
                            Usar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowUrlInput(true)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium mt-1"
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>Colar link de imagem da web</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </div>

              {/* Categoria e Tags */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Categoria Principal
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm font-medium text-slate-800 rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:border-[#0f9f80] bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Palavras-chave / Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="ansiedade, terapia online, poços de caldas"
                    className="w-full text-xs text-slate-700 rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:border-[#0f9f80]"
                  />
                </div>
              </div>

              {/* Assistente Visual de SEO, AEO e GEO */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0f9f80]" />
                    Potencial de Alcance (SEO & IA)
                  </h3>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      passedChecksCount >= 4
                        ? "bg-emerald-100 text-emerald-800"
                        : passedChecksCount >= 2
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {passedChecksCount} de {seoChecks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {seoChecks.map((chk, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs">
                      {chk.passed ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <span className={chk.passed ? "text-slate-700 font-medium" : "text-slate-400"}>
                          {chk.label}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                          {chk.detail}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                  💡 <strong>Dica da Ana:</strong> Textos reflexivos que respondem a dúvidas reais de pacientes têm a maior taxa de contato para agendamentos via WhatsApp.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
