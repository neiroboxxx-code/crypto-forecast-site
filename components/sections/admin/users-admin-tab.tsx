"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, UserX, UserCheck, Plus, RefreshCw } from "lucide-react";

interface Invite {
  token: string;
  created_at: string;
  used_at: string | null;
  used_by_nickname: string | null;
}

interface User {
  id: string;
  nickname: string;
  role: string;
  is_active: number;
  created_at: string;
  last_login_at: string | null;
  last_login_ip: string | null;
}

const SITE_URL = "https://crypto-forecast-site.vercel.app";

function useCopy(timeout = 2000) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), timeout);
    });
  }, [timeout]);
  return { copied, copy };
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Invites section ───────────────────────────────────────────────────────────

function InvitesSection() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { copied, copy } = useCopy();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invites");
      const data = await res.json();
      setInvites(data.invites ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createInvite() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/invites", { method: "POST" });
      if (res.ok) await load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Инвайт-ссылки
        </h3>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/40 hover:text-white/60 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button
            onClick={createInvite}
            disabled={creating}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {creating ? "Создаём..." : "Создать инвайт"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-white/30 py-4 text-center">Загрузка...</div>
      ) : invites.length === 0 ? (
        <div className="text-xs text-white/30 py-4 text-center">
          Нет инвайтов. Создайте первый.
        </div>
      ) : (
        <div className="space-y-2">
          {invites.map((inv) => {
            const url = `${SITE_URL}/invite/${inv.token}`;
            const used = !!inv.used_by_nickname;
            return (
              <div
                key={inv.token}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                  used
                    ? "border-white/5 bg-white/[0.01] opacity-50"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-2 w-2 flex-shrink-0 rounded-full ${
                      used ? "bg-zinc-600" : "bg-emerald-400"
                    }`}
                  />
                  <span className="font-mono text-[11px] text-white/50 truncate max-w-[220px]">
                    {url}
                  </span>
                  {used && (
                    <span className="text-[10px] text-zinc-500 flex-shrink-0">
                      → {inv.used_by_nickname}
                    </span>
                  )}
                </div>
                {!used && (
                  <button
                    onClick={() => copy(url, inv.token)}
                    className="ml-3 flex-shrink-0 flex items-center gap-1 text-[11px] text-white/40 hover:text-cyan-400 transition-colors"
                  >
                    {copied === inv.token ? (
                      <><Check className="h-3.5 w-3.5 text-emerald-400" /> Скопировано</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Копировать</>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Users section ─────────────────────────────────────────────────────────────

function UsersSection() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleUser(id: string, currentlyActive: boolean) {
    setActing(id);
    try {
      const action = currentlyActive ? "block" : "unblock";
      await fetch(`/api/admin/users/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Зарегистрированные пользователи
        </h3>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-white/40 hover:text-white/60 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {loading ? (
        <div className="text-xs text-white/30 py-4 text-center">Загрузка...</div>
      ) : users.length === 0 ? (
        <div className="text-xs text-white/30 py-4 text-center">
          Пользователей пока нет.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-white/5 text-left text-[10px] uppercase tracking-wider text-white/25">
                <th className="pb-2 pr-4">Никнейм</th>
                <th className="pb-2 pr-4">Роль</th>
                <th className="pb-2 pr-4">Регистрация</th>
                <th className="pb-2 pr-4">Последний вход</th>
                <th className="pb-2 pr-4">IP</th>
                <th className="pb-2">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {users.map((u) => (
                <tr key={u.id} className={u.is_active ? "" : "opacity-40"}>
                  <td className="py-2.5 pr-4 font-medium text-white/80">
                    {u.nickname}
                    {!u.is_active && (
                      <span className="ml-2 text-[10px] text-red-400">[заблокирован]</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                      u.role === "admin"
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-white/5 text-white/35"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-white/35">{fmtDate(u.created_at)}</td>
                  <td className="py-2.5 pr-4 text-white/35">{fmtDate(u.last_login_at)}</td>
                  <td className="py-2.5 pr-4 font-mono text-[10px] text-white/25">
                    {u.last_login_ip ?? "—"}
                  </td>
                  <td className="py-2.5">
                    {u.role !== "admin" && (
                      <button
                        onClick={() => toggleUser(u.id, !!u.is_active)}
                        disabled={acting === u.id}
                        className={`flex items-center gap-1 rounded px-2 py-1 text-[10px] transition-colors disabled:opacity-50 ${
                          u.is_active
                            ? "border border-red-900/40 text-red-400 hover:bg-red-950/30"
                            : "border border-emerald-900/40 text-emerald-400 hover:bg-emerald-950/30"
                        }`}
                      >
                        {u.is_active ? (
                          <><UserX className="h-3 w-3" /> Заблокировать</>
                        ) : (
                          <><UserCheck className="h-3 w-3" /> Разблокировать</>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function UsersAdminTab() {
  return (
    <div className="space-y-8">
      <InvitesSection />
      <div className="border-t border-white/5" />
      <UsersSection />
    </div>
  );
}
