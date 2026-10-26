import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, UserPlus, Check, User, Phone, Sparkles, X } from 'lucide-react';
import { Patient } from '../../types';
import { useApp } from '../../context/AppContext';

interface PatientAutocompleteProps {
  selectedPatientId: string;
  onSelectPatient: (patient: Patient) => void;
  placeholder?: string;
}

const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const PatientAutocomplete: React.FC<PatientAutocompleteProps> = ({
  selectedPatientId,
  onSelectPatient,
  placeholder = 'Digite o nome, iniciais ou clique para ver todos os pacientes...',
}) => {
  const { patients, savePatient } = useApp();

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId) || null,
    [patients, selectedPatientId]
  );

  const [query, setQuery] = useState(selectedPatient ? selectedPatient.name : '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Quick inline creation state when typing a name not yet registered
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickPhone, setQuickPhone] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input display text when selectedPatientId changes externally
  useEffect(() => {
    if (selectedPatient) {
      setQuery(selectedPatient.name);
    } else if (!isOpen) {
      setQuery('');
    }
  }, [selectedPatient, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsQuickCreateOpen(false);
        // Restore selected patient's name if user clicked away without choosing
        if (selectedPatient) {
          setQuery(selectedPatient.name);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedPatient]);

  // Filter patients by initials, full/partial name, social name, CPF, or phone
  const filteredPatients = useMemo(() => {
    const cleanQuery = normalizeText(query);
    // If query exactly matches currently selected patient name while just opening dropdown, show full list
    if (!cleanQuery || (selectedPatient && cleanQuery === normalizeText(selectedPatient.name))) {
      return patients;
    }

    return patients.filter((p) => {
      const normName = normalizeText(p.name);
      // Check initials (e.g. "ms" matches "Maria Silva")
      const initials = normName
        .split(/\s+/)
        .map((w) => w[0] || '')
        .join('');
      const cleanDigits = query.replace(/\D/g, '');
      const phoneDigits = (p.phone || '').replace(/\D/g, '');
      const cpfDigits = (p.cpf || '').replace(/\D/g, '');

      return (
        normName.includes(cleanQuery) ||
        initials.startsWith(cleanQuery) ||
        (cleanDigits.length >= 2 &&
          (phoneDigits.includes(cleanDigits) || cpfDigits.includes(cleanDigits)))
      );
    });
  }, [patients, query, selectedPatient]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredPatients.length, isOpen]);

  const handleChoose = (patient: Patient) => {
    setQuery(patient.name);
    setIsOpen(false);
    setIsQuickCreateOpen(false);
    onSelectPatient(patient);
  };

  const handleQuickCreatePatient = () => {
    const cleanName = query.trim();
    if (!cleanName) return;

    const nowIso = new Date().toISOString();
    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      name: cleanName,
      cpf: '',
      birthDate: '',
      phone: quickPhone.trim() || '(35) 99999-9999',
      email: '',
      status: 'active',
      preferredModality: 'presencial',
      agreedPrice: 200,
      startDate: nowIso.slice(0, 10),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    savePatient(newPatient);
    setQuickPhone('');
    setIsQuickCreateOpen(false);
    setIsOpen(false);
    setQuery(newPatient.name);
    onSelectPatient(newPatient);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      e.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredPatients.length > 0 ? (prev + 1) % filteredPatients.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredPatients.length > 0
          ? (prev - 1 + filteredPatients.length) % filteredPatients.length
          : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPatients[highlightedIndex]) {
        handleChoose(filteredPatients[highlightedIndex]);
      } else if (query.trim().length >= 2) {
        handleQuickCreatePatient();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const formatPhoneMask = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  };

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => {
            setIsOpen(true);
            // Select text on focus so typing immediately searches from scratch
            inputRef.current?.select();
          }}
          onClick={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-10 pr-16 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-brand-500 focus:border-brand-500 focus:outline-none transition-all"
        />

        <div className="absolute right-2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery('');
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              title="Limpar busca e ver lista completa"
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen((prev) => !prev);
              if (!isOpen) {
                inputRef.current?.focus();
              }
            }}
            title="Abrir lista completa de pacientes"
            className="p-1 text-slate-500 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180 text-brand-600' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Selected Patient Confirmation Pill below input when closed */}
      {selectedPatient && !isOpen && (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-[11px] text-emerald-900">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              Selecionado: <strong>{selectedPatient.name}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-emerald-700 shrink-0">
            <span>{selectedPatient.phone}</span>
            <span>•</span>
            <span className="capitalize">{selectedPatient.preferredModality}</span>
            <span>•</span>
            <span>R$ {selectedPatient.agreedPrice || 200}</span>
          </div>
        </div>
      )}

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header count */}
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>
              {patients.length === 0
                ? 'Nenhum paciente cadastrado ainda'
                : query.trim() && filteredPatients.length !== patients.length
                ? `${filteredPatients.length} paciente(s) encontrado(s)`
                : `Lista completa (${patients.length} paciente${patients.length === 1 ? '' : 's'})`}
            </span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              Use ↑↓ e Enter para selecionar
            </span>
          </div>

          {/* Patient List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((p, idx) => {
                const isSelected = p.id === selectedPatientId;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => handleChoose(p)}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors ${
                      isHighlighted
                        ? 'bg-emerald-50/90'
                        : isSelected
                        ? 'bg-slate-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected || isHighlighted
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {getInitials(p.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                            {p.name}
                          </span>
                          {p.isPreRegistration && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold shrink-0">
                              <Sparkles className="w-2.5 h-2.5" /> Pré-Cadastro
                            </span>
                          )}
                          {p.status === 'waiting_list' && !p.isPreRegistration && (
                            <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-semibold shrink-0">
                              Espera
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
                          <span>{p.phone || 'Sem telefone'}</span>
                          <span>•</span>
                          <span className="capitalize">{p.preferredModality}</span>
                          <span>•</span>
                          <span>R$ {p.agreedPrice || 200}</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-brand-600 shrink-0" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  {query.trim()
                    ? `Nenhum paciente encontrado com "${query.trim()}"`
                    : 'Você ainda não tem pacientes cadastrados.'}
                </p>
                <p className="text-[11px] text-slate-500">
                  Você pode cadastrar rapidamente abaixo sem sair deste agendamento:
                </p>
              </div>
            )}
          </div>

          {/* Footer: Quick Inline Patient Registration */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200/80">
            {!isQuickCreateOpen ? (
              <button
                type="button"
                onClick={() => setIsQuickCreateOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-brand-600" />
                <span>
                  {query.trim() && filteredPatients.length === 0
                    ? `Cadastrar e selecionar "${query.trim()}" agora`
                    : '+ Cadastrar novo paciente rápido'}
                </span>
              </button>
            ) : (
              <div className="space-y-2 p-2 bg-white rounded-xl border border-emerald-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Cadastro Rápido de Paciente
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsQuickCreateOpen(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    Cancelar
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nome completo do paciente *"
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="relative flex items-center">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                    <input
                      type="tel"
                      value={quickPhone}
                      onChange={(e) => setQuickPhone(formatPhoneMask(e.target.value))}
                      placeholder="WhatsApp (35) 99999-9999"
                      className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!query.trim()}
                  onClick={handleQuickCreatePatient}
                  className="w-full py-2 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Paciente e Selecionar no Agendamento</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
