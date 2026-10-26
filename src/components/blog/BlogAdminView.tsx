import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  Globe,
  FileText,
  AlertCircle,
  RefreshCw,
  Info,
} from "lucide-react";
import { BlogPost, BlogPostStatus } from "../../types";
import { listAllPosts, deletePost, savePost } from "../../services/blogService";
import { BlogPostEditor } from "./BlogPostEditor";

export const BlogAdminView: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const blogBaseUrl = isLocal ? "http://localhost:8000/blog" : "https://analimapsicologia.com.br/blog";

  const loadPosts = async () => {
    try {
      setIsLoading(true);
      const data = await listAllPosts();
      setPosts(data);
    } catch (err) {
      console.error("Erro ao carregar posts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleDelete = async (post: BlogPost) => {
    const confirm = window.confirm(
      `Deseja realmente apagar o artigo "${post.title}"?\n\nEsta ação removerá o artigo definitivamente do site e do seu painel.`
    );
    if (!confirm) return;

    try {
      await deletePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      showToast("Artigo apagado com sucesso.");
    } catch (err) {
      alert("Erro ao excluir artigo. Tente novamente.");
    }
  };

  const handleToggleStatus = async (post: BlogPost) => {
    const nextStatus: BlogPostStatus =
      post.status === "published" ? "draft" : "published";
    try {
      await savePost({
        ...post,
        status: nextStatus,
      });

      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: nextStatus } : p))
      );

      showToast(
        nextStatus === "published"
          ? "Artigo colocado no ar no site!"
          : "Artigo movido para rascunho."
      );
    } catch (err) {
      alert("Não foi possível alterar o status.");
    }
  };

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(""), 3500);
  };

  // Filtros
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ? true : post.status === statusFilter;

    const matchesCategory =
      categoryFilter === "all" ? true : post.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const publishedCount = posts.filter((p) => p.status === "published").length;
  const draftCount = posts.filter((p) => p.status === "draft").length;
  const categories = Array.from(new Set(posts.map((p) => p.category))).filter(Boolean);

  if (isCreatingNew || editingPost) {
    return (
      <BlogPostEditor
        initialPost={editingPost}
        onBack={() => {
          setIsCreatingNew(false);
          setEditingPost(null);
        }}
        onSaved={(saved) => {
          setIsCreatingNew(false);
          setEditingPost(null);
          loadPosts();
        }}
        onDelete={(deletedId) => {
          setIsCreatingNew(false);
          setEditingPost(null);
          setPosts((prev) => prev.filter((p) => p.id !== deletedId));
          showToast("Artigo apagado com sucesso.");
        }}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast flutuante de feedback */}
      {feedbackMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1C2B22] text-[#F7F5F0] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm border border-[#0f9f80]/40 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#0f9f80]" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <BookOpen className="w-4 h-4 text-[#0f9f80]" />
            <span>Gestão de Conteúdo Clínico</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
            Blog & Artigos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Publique reflexões sobre desenvolvimento humano e psicologia para fortalecer sua autoridade no Google e nas IAs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={blogBaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Globe className="w-4 h-4 text-slate-500" />
            <span>Ver Blog no Ar</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <button
            onClick={() => {
              setEditingPost(null);
              setIsCreatingNew(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-[#1C2B22] text-[#F7F5F0] hover:bg-[#2A3C31] text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#0f9f80]" />
            <span>Novo Artigo</span>
          </button>
        </div>
      </div>

      {/* Banner de Referência para a Ana */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#0f9f80] shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 leading-relaxed">
          <strong>Matéria de Referência no Ar:</strong> Já deixamos cadastrado um artigo autoral completo sobre ansiedade para você ter como referência estética e editorial. Você tem total liberdade para clicar em <strong>Editar Artigo</strong> para alterar qualquer texto ou imagem, ou em <strong>Apagar Artigo</strong> caso queira retirá-lo do ar.
        </div>
      </div>

      {/* Cartões de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total de Artigos
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{posts.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Publicados no Site
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{publishedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Rascunhos em Preparação
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{draftCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título ou tema..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#0f9f80]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Abas de Status */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Todos ({posts.length})
            </button>
            <button
              onClick={() => setStatusFilter("published")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "published"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Publicados ({publishedCount})
            </button>
            <button
              onClick={() => setStatusFilter("draft")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "draft"
                  ? "bg-white text-amber-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Rascunhos ({draftCount})
            </button>
          </div>

          {/* Filtro por Categoria */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#0f9f80]"
            >
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={loadPosts}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Lista de Artigos */}
      {isLoading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-[#0f9f80] animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Carregando artigos...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800">Nenhum artigo encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            {searchQuery || statusFilter !== "all"
              ? "Tente ajustar os filtros de busca para encontrar o texto desejado."
              : "Comece compartilhando seu primeiro texto clínico. Ele ajudará novos pacientes a conhecerem seu trabalho."}
          </p>
          <button
            onClick={() => {
              setEditingPost(null);
              setIsCreatingNew(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#1C2B22] text-[#F7F5F0] text-xs font-semibold hover:bg-[#2A3C31] transition-all inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#0f9f80]" />
            <span>Escrever Primeiro Artigo</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => {
            const isPub = post.status === "published";
            const postSiteUrl = `${blogBaseUrl}/${post.slug}`;

            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Imagem de Capa do Card */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    {post.coverImageUrl ? (
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        style={{ objectPosition: post.coverImagePosition || "top" }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
                        <BookOpen className="w-8 h-8 mb-1" />
                        <span className="text-[10px] font-medium">Sem imagem de capa</span>
                      </div>
                    )}

                    {/* Badge de Status */}
                    <span
                      className={`absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md ${
                        isPub
                          ? "bg-emerald-500 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {isPub ? "Publicado no Ar" : "Rascunho"}
                    </span>

                    {/* Badge de Categoria */}
                    <span className="absolute bottom-3 left-3 text-[11px] font-medium px-2 py-0.5 rounded-lg bg-black/70 text-white backdrop-blur-md">
                      {post.category}
                    </span>
                  </div>

                  {/* Conteúdo do Card */}
                  <div className="p-5 pb-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-2">
                      <span>{post.readTimeMinutes || 3} min de leitura</span>
                      <span>•</span>
                      <span>
                        {new Date(post.publishedAt || post.updatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-[#0f9f80] transition-colors">
                      {post.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                      {post.excerpt || "Sem descrição informada."}
                    </p>
                  </div>
                </div>

                {/* BARRA INFERIOR DE AÇÕES CLARAS E COMPLETAS */}
                <div className="p-4 pt-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Botão Principal: EDITAR ARTIGO */}
                    <button
                      onClick={() => setEditingPost(post)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#1C2B22] text-[#F7F5F0] hover:bg-[#2A3C31] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      title="Editar artigo completo"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#0f9f80]" />
                      <span>Editar Artigo</span>
                    </button>

                    {/* Botão Ver no Site */}
                    {isPub && (
                      <a
                        href={postSiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-medium flex items-center gap-1 transition-colors shadow-xs"
                        title="Abrir no site"
                      >
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        <span>Ver no Site</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {/* Alternar Status (Publicar / Rascunho) */}
                    <button
                      onClick={() => handleToggleStatus(post)}
                      className={`text-[11px] font-medium px-2 py-1 rounded-lg transition-colors ${
                        isPub
                          ? "text-slate-600 hover:text-amber-800 hover:bg-amber-50"
                          : "text-emerald-700 hover:bg-emerald-50 font-semibold"
                      }`}
                    >
                      {isPub ? "Mover para Rascunho" : "Colocar no Ar"}
                    </button>

                    {/* Botão APAGAR ARTIGO */}
                    <button
                      onClick={() => handleDelete(post)}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                      title="Apagar este artigo definitivamente"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Apagar Artigo</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
