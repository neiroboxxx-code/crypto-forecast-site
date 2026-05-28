"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [valid, setValid] = useState<boolean | null>(null);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Verify invite token on mount
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/invite/${token}`)
      .then((r) => setValid(r.ok))
      .catch(() => setValid(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== password2) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    if (!accepted) {
      setError("Примите условия использования");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_token: token,
          nickname,
          password,
          accept_terms: accepted,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Ошибка регистрации");
        return;
      }

      router.push("/lk");
      router.refresh();
    } catch {
      setError("Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }

  if (valid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0C12]">
        <div className="text-zinc-500 text-sm">Проверяем инвайт...</div>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0C12]">
        <div className="text-center space-y-3">
          <div className="text-red-400 font-semibold">Инвайт недействителен</div>
          <div className="text-zinc-500 text-sm">
            Ссылка уже использована или не существует.
          </div>
          <a href="/login" className="text-cyan-400 text-sm hover:underline">
            Войти
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0C12]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-cyan-400 tracking-wider mb-1">
            CRYPTO PLATFORM
          </div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest">
            Создать аккаунт
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
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="trader_name"
            />
            <p className="text-xs text-zinc-600 mt-1">3–24 символа, буквы/цифры/_/-</p>
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
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="Минимум 8 символов"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
              Повторите пароль
            </label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 accent-cyan-500"
            />
            <span className="text-xs text-zinc-400 leading-relaxed">
              Я принимаю{" "}
              <a
                href="/terms"
                target="_blank"
                className="text-cyan-400 hover:underline"
              >
                Условия использования
              </a>{" "}
              и{" "}
              <a
                href="/privacy"
                target="_blank"
                className="text-cyan-400 hover:underline"
              >
                Политику конфиденциальности
              </a>
            </span>
          </label>

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
            {loading ? "Создаём аккаунт..." : "Создать аккаунт"}
          </button>
        </form>
      </div>
    </div>
  );
}
