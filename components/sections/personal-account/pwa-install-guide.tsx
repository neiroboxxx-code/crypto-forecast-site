"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Smartphone } from "lucide-react";

const EXPO_DEEP_LINK = "exp://u.expo.dev/d3b25081-f2e3-4e14-82bc-e74fff6b180c?channel-name=production";
const EXPO_WEB_LINK = "https://expo.dev/@kirillboxxx/crypto-analytics";

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={copy}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/50 transition hover:bg-white/[0.07] hover:text-white/80"
        >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? "Скопировано" : "Копировать"}
        </button>
    );
}

function ExpoSection() {
    return (
        <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10">
                    <Smartphone className="h-5 w-5 text-cyan-400/70" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-white/85">Expo Go</p>
                        <span className="rounded-md bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80 border border-emerald-400/20">
                            Android
                        </span>
                    </div>
                    <p className="text-[11px] text-white/40">Без магазина приложений</p>
                </div>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-2.5">
                {[
                    { n: "1", text: "Скачай приложение Expo Go из Google Play" },
                    { n: "2", text: "Открой камеру и отсканируй QR-код ниже, или вставь ссылку вручную" },
                    { n: "3", text: "Нажми на ссылку — приложение откроется в Expo Go" },
                ].map((step) => (
                    <div key={step.n} className="flex items-start gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold text-white/50">
                            {step.n}
                        </span>
                        <p className="text-[12px] leading-relaxed text-white/55">{step.text}</p>
                    </div>
                ))}
            </div>

            {/* QR code */}
            <div className="flex flex-col items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] py-5">
                <div className="rounded-xl bg-white p-3">
                    <QRCodeSVG
                        value={EXPO_DEEP_LINK}
                        size={160}
                        bgColor="#ffffff"
                        fgColor="#0A0C12"
                        level="M"
                    />
                </div>
                <p className="text-[10px] text-white/30">Сканируй камерой iPhone</p>
            </div>

            {/* Manual link */}
            <div className="flex flex-col gap-2 rounded-xl border border-white/8 bg-[#0E1117]/80 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
                    Ссылка для Expo Go
                </p>
                <div className="flex items-center justify-between gap-2">
                    <p className="break-all text-[11px] text-cyan-400/70">{EXPO_DEEP_LINK}</p>
                    <CopyButton text={EXPO_DEEP_LINK} />
                </div>
            </div>

            {/* Web fallback */}
            <div className="flex items-start gap-2 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
                <p className="text-[11px] leading-relaxed text-white/35">
                    Или открой проект на{" "}
                    <a
                        href={EXPO_WEB_LINK}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400/60 underline underline-offset-2 hover:text-cyan-400/90"
                    >
                        expo.dev
                    </a>{" "}
                    и нажми «Open in Expo Go»
                </p>
            </div>
        </div>
    );
}

export function PwaInstallGuide() {
    return (
        <div className="flex flex-col gap-6">
            <ExpoSection />

            {/* Telegram Mini App */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10">
                        <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-400/70" fill="currentColor">
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.026 9.547c-.148.658-.543.818-1.101.508l-3.037-2.238-1.465 1.41c-.162.162-.298.298-.61.298l.218-3.088 5.623-5.08c.244-.218-.054-.338-.379-.12L7.08 14.49l-2.985-.933c-.648-.203-.662-.648.135-.96l11.652-4.494c.54-.195 1.012.12.68.145z"/>
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold text-white/85">Telegram Mini App</p>
                            <span className="rounded-md border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-400/80">
                                iOS + Android
                            </span>
                        </div>
                        <p className="text-[11px] text-white/40">Открывается прямо в Telegram</p>
                    </div>
                </div>

                <div className="flex flex-col gap-2.5">
                    {[
                        { n: "1", text: "Найди бота @Cryanalytic_bot в Telegram" },
                        { n: "2", text: 'Нажми кнопку "Открыть" внизу чата — приложение запустится прямо в Telegram' },
                        { n: "3", text: "Или нажми /start — бот пришлёт кнопку для запуска" },
                    ].map((step) => (
                        <div key={step.n} className="flex items-start gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold text-white/50">
                                {step.n}
                            </span>
                            <p className="text-[12px] leading-relaxed text-white/55">{step.text}</p>
                        </div>
                    ))}
                </div>

                <div className="flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-950/20 px-4 py-3">
                    <p className="text-[11px] leading-relaxed text-amber-200/50">
                        В России Telegram может работать нестабильно без VPN.
                    </p>
                </div>
            </div>
        </div>
    );
}
