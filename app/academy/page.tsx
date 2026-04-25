import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AcademyDashboard } from "@/components/sections/academy/academy-dashboard";
import { getAcademyCourses } from "@/lib/academy/get-academy-courses";

export const dynamic = "force-dynamic";

export default function AcademyPage() {
    const categories = getAcademyCourses();

    return (
        <DashboardShell>
            <AcademyDashboard categories={categories} />
        </DashboardShell>
    );
}
