import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AcademyDashboard } from "@/components/sections/academy/academy-dashboard";
import { AcademyPageBackdrop } from "@/components/sections/academy/academy-page-backdrop";
import { getAcademyCourses } from "@/lib/academy/get-academy-courses";

export const dynamic = "force-dynamic";

export default function AcademyPage() {
    const categories = getAcademyCourses();

    return (
        <DashboardShell ornament={<AcademyPageBackdrop />}>
            <AcademyDashboard categories={categories} />
        </DashboardShell>
    );
}
