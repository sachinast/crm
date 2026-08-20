"use client";

import { useState } from "react";

export default function FlagIcon({
  code,
  className = "h-3.5 w-5 shrink-0 rounded-[2px] object-cover shadow-xs border border-white/10",
}: {
  code: string;
  className?: string;
}) {
  const [error, setError] = useState(false);
  const lower = code.toLowerCase();

  if (error || !code) {
    return (
      <span className="inline-flex h-3.5 w-5 items-center justify-center rounded-[2px] bg-slate-800 font-mono text-[9px] font-bold text-slate-300 border border-white/10">
        {code.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/w40/${lower}.png`}
      srcSet={`https://flagcdn.com/w80/${lower}.png 2x`}
      alt={code}
      width="20"
      height="14"
      onError={() => setError(true)}
      className={className}
      loading="lazy"
    />
  );
}
