"use client";

import { useEffect, useState } from "react";

type Cell = {
    value: "0" | "1";
    glow: boolean;
    bright: boolean;
};

const ROWS = 28;
const COLS = 44;

function createFrame(): Cell[][] {
    const frame: Cell[][] = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => ({
            value: Math.random() > 0.5 ? "1" : "0",
            glow: false,
            bright: Math.random() > 0.75,
        }))
    );

    const burstCount = 16;

    for (let i = 0; i < burstCount; i += 1) {
        const rowIndex = Math.floor(Math.random() * ROWS);
        const startIndex = Math.floor(Math.random() * (COLS - 4));
        const length = Math.random() > 0.5 ? 4 : 3;

        for (let j = 0; j < length; j += 1) {
            frame[rowIndex][startIndex + j] = {
                value: Math.random() > 0.5 ? "1" : "0",
                glow: true,
                bright: true,
            };
        }
    }

    return frame;
}

export function LiveCodeWindow() {
    const [frame, setFrame] = useState<Cell[][]>(() => createFrame());

    useEffect(() => {
        const interval = window.setInterval(() => {
            setFrame(createFrame());
        }, 170);

        return () => window.clearInterval(interval);
    }, []);

    const rows = [...frame, ...frame];

    return (
        <div className="relative h-[320px] overflow-hidden rounded-[24px] border border-white/8 bg-[#04060b]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.10),transparent_36%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.06),transparent_30%)]" />

            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.03] to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

            <div className="binary-flow absolute inset-0 px-4 py-4 font-mono text-[10px] leading-[1.28] tracking-[0.22em]">
                {rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex whitespace-nowrap">
                        {row.map((cell, cellIndex) => (
                            <span
                                key={`${rowIndex}-${cellIndex}`}
                                className={
                                    cell.glow
                                        ? "text-cyan-200"
                                        : cell.bright
                                            ? "text-white/32"
                                            : "text-white/14"
                                }
                                style={
                                    cell.glow
                                        ? {
                                            textShadow:
                                                "0 0 10px rgba(34,211,238,0.95), 0 0 22px rgba(34,211,238,0.55)",
                                        }
                                        : undefined
                                }
                            >
                                {cell.value}
                            </span>
                        ))}
                    </div>
                ))}
            </div>

            <div className="scanner pointer-events-none absolute inset-x-6 top-0 h-14 rounded-full bg-cyan-300/10 blur-2xl" />
            <div className="absolute inset-0 rounded-[24px] ring-1 ring-inset ring-cyan-300/10" />

            <style jsx>{`
                .binary-flow {
                    animation: binaryFlow 18s linear infinite;
                }

                .scanner {
                    animation: scan 4.8s linear infinite;
                }

                @keyframes binaryFlow {
                    0% {
                        transform: translateY(0);
                    }
                    100% {
                        transform: translateY(-50%);
                    }
                }

                @keyframes scan {
                    0% {
                        transform: translateY(-26px);
                        opacity: 0;
                    }
                    15% {
                        opacity: 0.65;
                    }
                    50% {
                        opacity: 0.35;
                    }
                    100% {
                        transform: translateY(320px);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}