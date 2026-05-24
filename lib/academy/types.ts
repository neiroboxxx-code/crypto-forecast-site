export type AcademyCategoryId =
    | "neophiles"
    | "technical"
    | "psychology"
    | "anatomy"
    | "local"
    | "zones"
    | "infographic"
    | "price_action_trader";

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
