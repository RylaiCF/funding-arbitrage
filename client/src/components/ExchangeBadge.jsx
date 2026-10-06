import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { getExchangeLinkInfo } from '../utils/exchangeUrls';

const iconExtensions = {
  hyperliquid: 'svg',
};

export default function ExchangeBadge({
  exchangeId,
  displayName,
  symbol,
  className = '',
  isLong = false,
  isShort = false,
}) {
  const [hasError, setHasError] = useState(false);
  const ext = iconExtensions[exchangeId] || 'png';
  const iconSrc = `/images/exchanges/${exchangeId}.${ext}`;

  let colorStyle = 'bg-slate-800 text-slate-200 border-slate-700';
  if (isLong) {
    colorStyle = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
  } else if (isShort) {
    colorStyle = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  }

  const name = displayName || exchangeId;
  const linkInfo = getExchangeLinkInfo(exchangeId, symbol);

  const inner = (
    <>
      {!hasError ? (
        <img
          src={iconSrc}
          alt={name}
          onError={() => setHasError(true)}
          className="w-3.5 h-3.5 rounded-sm object-contain shrink-0"
        />
      ) : (
        <span className="w-3.5 h-3.5 rounded-sm bg-slate-700 flex items-center justify-center text-[9px] font-bold text-slate-300">
          {name.substring(0, 1).toUpperCase()}
        </span>
      )}
      <span className="capitalize">{name}</span>
      {linkInfo?.isDirectInstrument && (
        <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity shrink-0 ml-0.5" />
      )}
    </>
  );

  if (linkInfo) {
    return (
      <a
        href={linkInfo.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`group inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-medium select-none shadow-sm transition-all hover:scale-[1.03] cursor-pointer hover:bg-slate-700/60 ${colorStyle} ${className}`}
      >
        {inner}
      </a>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-medium select-none shadow-sm cursor-default ${colorStyle} ${className}`}
    >
      {inner}
    </span>
  );
}
