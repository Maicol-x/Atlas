import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  Tag,
  CheckCircle2,
  FileText,
  Loader2,
  Filter,
} from 'lucide-react';
import { SavedKnowledgeItem } from '../../shared/types/atlas.types.ts';
import { AtlasClient } from '../services/api.ts';

export const KnowledgeBasePage: React.FC = () => {
  const [items, setItems] = useState<SavedKnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // New item form
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('decision_architectonica');
  const [newTags, setNewTags] = useState('arquitectura, seguridad');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  useEffect(() => {
    loadKnowledge();
  }, []);

  const loadKnowledge = async () => {
    setLoading(true);
    try {
      const data = await AtlasClient.getKnowledge();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const item: SavedKnowledgeItem = {
        id: `know-${Date.now()}`,
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
        sourceUrl: newSourceUrl.trim() || undefined,
        verifiedConclusion: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AtlasClient.saveKnowledge(item);
      setIsNewModalOpen(false);
      setNewTitle('');
      setNewContent('');
      await loadKnowledge();
    } catch (err: any) {
      alert(`Error al guardar: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta entrada de la base de conocimiento?')) return;
    try {
      await AtlasClient.deleteKnowledge(id);
      await loadKnowledge();
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
            Base de Conocimiento Personal
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registro persistente en SQLite de decisiones arquitectónicas, tecnologías y conclusiones técnicas verificadas.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Entrada Técnica</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#0d121a] border border-slate-800 rounded-lg flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, contenido o etiqueta técnica..."
            className="w-full bg-[#090d13] border border-slate-700/80 rounded pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#090d13] border border-slate-700 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas las categorías ({items.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Knowledge Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Cargando base de conocimiento...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs">
          No hay registros en la base de conocimiento que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-5 bg-[#0d121a] border border-slate-800 rounded-lg flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400">
                      {item.category.replace('_', ' ')}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-100 mt-0.5">
                      {item.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap bg-[#090d13] p-3 rounded border border-slate-800/80">
                  {item.content}
                </p>

                {item.sourceUrl && (
                  <div className="flex items-center gap-1.5 text-[11px] text-sky-400">
                    <ExternalLink className="w-3 h-3" />
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline truncate max-w-sm"
                    >
                      {item.sourceUrl}
                    </a>
                  </div>
                )}
              </div>

              {/* Tags & Metadata */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-3 h-3 text-slate-500" />
                  {item.tags.map((t) => (
                    <span key={t} className="text-slate-400">
                      #{t}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Verificado</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Knowledge Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f141c] border border-slate-700/80 rounded-lg max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100">
              Registrar Nueva Decisión o Conocimiento Técnico
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Elección de SQLite en modo WAL para persistencia local"
                  className="w-full bg-[#090d13] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Categoría</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#090d13] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="decision_architectonica">Decisión Arquitectónica (ADR)</option>
                  <option value="evaluacion_tecnologica">Evaluación Tecnológica</option>
                  <option value="patron_diseno">Patrón de Diseño</option>
                  <option value="seguridad_auditoria">Seguridad y Auditoría</option>
                  <option value="nota_tecnica">Nota Técnica</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Contenido Técnico</label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Describe la justificación técnica, límites observados y conclusiones..."
                  className="w-full bg-[#090d13] border border-slate-700 rounded p-3 text-slate-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Etiquetas (separadas por coma)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="sqlite, persistencia, rendimiento"
                  className="w-full bg-[#090d13] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Enlace a Documentación Oficial (opcional)</label>
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://docs.ejemplo.org/..."
                  className="w-full bg-[#090d13] border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
                >
                  Guardar en SQLite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
