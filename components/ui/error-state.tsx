export function ErrorState({ message }: { message: string }) {
    return (
        <div className="rounded-lg border border-rose-400/20 bg-rose-400/5 px-3 py-2 text-xs text-rose-300/80">
            API недоступен: {message}
        </div>
    );
}
