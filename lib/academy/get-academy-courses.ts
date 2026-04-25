import fs from "node:fs";
import path from "node:path";
import { ACADEMY_FOLDER_GROUPS, CATEGORY_META } from "./catalog";
import { formatFolderTitle } from "./format";
import type { AcademyCategoryPayload, AcademyCoursePayload } from "./types";

const SLIDE_RE = /^slide-(\d+)\.(jpe?g|png)$/i;

function listSlidePaths(folder: string): string[] {
    const abs = path.join(process.cwd(), "public", folder);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
        return [];
    }
    const names = fs.readdirSync(abs);
    const slides = names.filter((n) => SLIDE_RE.test(n));
    slides.sort((a, b) => {
        const na = Number(a.match(SLIDE_RE)?.[1] ?? 0);
        const nb = Number(b.match(SLIDE_RE)?.[1] ?? 0);
        return na - nb;
    });
    return slides.map((n) => `/${folder}/${n}`);
}

/** Только для серверных компонентов / RSC (читает `public/` через fs). */
export function getAcademyCourses(): AcademyCategoryPayload[] {
    return CATEGORY_META.map((meta) => {
        const folders = ACADEMY_FOLDER_GROUPS[meta.id];
        const courses: AcademyCoursePayload[] = folders.map((folder) => ({
            folder,
            title: formatFolderTitle(folder),
            slidePaths: listSlidePaths(folder),
        }));
        return { ...meta, courses };
    });
}
