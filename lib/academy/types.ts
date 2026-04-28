export type AcademyCategoryId =
    | "neophiles"
    | "technical"
    | "psychology"
    | "anatomy"
    | "local"
    | "zones"
    | "infographic";

export type AcademyCoursePayload = {
    folder: string;
    title: string;
    slidePaths: string[];
};

export type AcademyCategoryPayload = {
    id: AcademyCategoryId;
    label: string;
    hint: string;
    courses: AcademyCoursePayload[];
};
