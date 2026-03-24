type StatusPillProps = {
    label: string;
    accent?: boolean;
};

export function StatusPill({
    label,
    accent = false,
}: StatusPillProps) {
    return (
        <div
            className={
                accent
                    ? "rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-200"
                    : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/72"
            }
        >
            {label}
        </div>
    );
}