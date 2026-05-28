"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Ошибка входа");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0C12]">
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-cyan-400 tracking-wider mb-1">
            CRYPTO PLATFORM
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest">
            Закрытый доступ
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-5"
        >
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
              Никнейм
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              autoComplete="username"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="your_nickname"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Нет доступа?{" "}
          <span className="text-zinc-500">Обратитесь к администратору.</span>
        </p>

        <p className="text-center text-[11px] text-zinc-700 mt-3">
          <Link href="/terms" className="hover:text-zinc-500 transition-colors">
            Пользовательское соглашение
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-zinc-500 transition-colors">
            Политика конфиденциальности
          </Link>
        </p>
      </div>
    </div>
  );
}
