import React from 'react';
import { RequirementStatus } from '../../../shared/types/atlas.types.ts';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle, MinusCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: RequirementStatus;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showIcon = true }) => {
  switch (status) {
    case 'VERIFICADO':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 font-mono tracking-tight">
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
          VERIFICADO
        </span>
      );
    case 'FALLIDO':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-950/60 text-rose-300 border border-rose-800/80 font-mono tracking-tight">
          {showIcon && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
          FALLIDO
        </span>
      );
    case 'INCOMPLETO':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/60 text-amber-300 border border-amber-800/80 font-mono tracking-tight">
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          INCOMPLETO
        </span>
      );
    case 'NO_VERIFICABLE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-950/60 text-sky-300 border border-sky-800/80 font-mono tracking-tight">
          {showIcon && <HelpCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
          NO VERIFICABLE
        </span>
      );
    case 'NO_IMPLEMENTADO':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-900 text-slate-400 border border-slate-700 font-mono tracking-tight">
          {showIcon && <MinusCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          NO IMPLEMENTADO
        </span>
      );
  }
};
