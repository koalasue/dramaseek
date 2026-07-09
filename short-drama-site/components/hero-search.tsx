"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MagnifyingGlass } from "@phosphor-icons/react";

export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : "/");
  }
  return <form onSubmit={submit} className="surface flex items-center gap-3 rounded-2xl border line p-3 shadow-[0_20px_50px_rgba(40,32,25,0.06)]">
    <MagnifyingGlass size={23} className="ml-1 shrink-0 text-muted" />
    <label htmlFor="hero-query" className="sr-only">输入剧名、英文名或别名</label>
    <input id="hero-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入剧名、英文名或别名" className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-[color:var(--muted)]" />
    <button className="focus-ring accent-bg pressable inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 font-semibold"><span className="hidden sm:inline">开始搜索</span><ArrowRight size={18} /></button>
  </form>;
}
