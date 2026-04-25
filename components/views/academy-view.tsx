import { Card } from "@/components/ui/card";
import { AcademyMaterials } from "@/components/sections/academy/academy-materials";
import { AcademyReportArchive } from "@/components/sections/academy/academy-report-archive";
import { academyMaterials, academyReports } from "@/lib/mock/academy";

export function AcademyView() {
    return (
        <div className="flex flex-col gap-3">
            <Card
                title="Академия"
                subtitle="Обучающие материалы и архив транскриптов разворотов — пока только UI-заглушки"
                padded
            >
                <p className="text-[12px] leading-relaxed text-white/55">
                    Здесь позже появятся реальные данные Phase 1/2 из пайплайна. Сейчас отображаются статические примеры
                    карточек и списка отчётов для проверки сетки и читаемости на мобильных экранах.
                </p>
            </Card>

            <div className="grid gap-3 xl:grid-cols-[1fr_420px] xl:items-start">
                <AcademyReportArchive reports={academyReports} />
                <AcademyMaterials items={academyMaterials} />
            </div>
        </div>
    );
}
