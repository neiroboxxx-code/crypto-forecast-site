import { ACADEMY_FOLDER_GROUPS, CATEGORY_META } from "./catalog";
import { formatFolderTitle } from "./format";
import type { AcademyCategoryPayload, AcademyCoursePayload } from "./types";

// Manifest is generated at build time by scripts/generate-academy-manifest.mjs
import manifest from "./manifest.json";

const slideMap = manifest as Record<string, string[]>;

export function getAcademyCourses(): AcademyCategoryPayload[] {
    return CATEGORY_META.map((meta) => {
        const folders = ACADEMY_FOLDER_GROUPS[meta.id];
        const courses: AcademyCoursePayload[] = folders.map((folder) => ({
            folder,
            title: formatFolderTitle(folder),
            slidePaths: slideMap[folder] ?? [],
        }));
        return { ...meta, courses };
    });
}
