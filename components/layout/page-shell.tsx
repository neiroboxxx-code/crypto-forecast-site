import { ReactNode } from "react";
import { SupportChat } from "@/components/ui/support-chat";

type PageShellProps = {
    children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
    return (
        <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
            <section className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-6 py-16 md:px-10 lg:px-16">
                {children}
            </section>

            <SupportChat />
        </main>
    );
}