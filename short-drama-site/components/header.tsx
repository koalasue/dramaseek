"use client";

import Link from "next/link";
import { useState } from "react";
import { List, MagnifyingGlass, X } from "@phosphor-icons/react";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b line bg-[color:var(--bg)]/90 backdrop-blur-xl">
      <div className="page-shell flex h-16 items-center justify-between gap-6">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl font-semibold tracking-tight">
          <span className="accent-bg grid size-9 place-items-center rounded-xl"><MagnifyingGlass size={19} weight="bold" /></span>
          <span>短剧寻址</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm md:flex" aria-label="主导航">
          <Link className="focus-ring rounded-md text-muted hover:text-[color:var(--ink)]" href="/">搜索</Link>
          <Link className="focus-ring rounded-md text-muted hover:text-[color:var(--ink)]" href="/rankings">排行榜</Link>
          <Link className="focus-ring rounded-md text-muted hover:text-[color:var(--ink)]" href="/submit">提交资源</Link>
          <Link className="focus-ring rounded-md text-muted hover:text-[color:var(--ink)]" href="/downloads">授权下载</Link>
          <Link className="focus-ring rounded-md text-muted hover:text-[color:var(--ink)]" href="/about">收录原则</Link>
        </nav>
        <button className="focus-ring pressable rounded-xl border line p-2 md:hidden" onClick={() => setOpen(!open)} aria-label={open ? "关闭菜单" : "打开菜单"} aria-expanded={open}>
          {open ? <X size={22} /> : <List size={22} />}
        </button>
      </div>
      {open && <nav className="page-shell grid gap-1 border-t line py-3 md:hidden" aria-label="移动导航">
        {[['/','搜索'],['/rankings','排行榜'],['/submit','提交资源'],['/downloads','授权下载'],['/about','收录原则']].map(([href,label]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 hover:bg-[color:var(--surface)]">{label}</Link>)}
      </nav>}
    </header>
  );
}
