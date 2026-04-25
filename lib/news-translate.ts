import type { NewsData, NewsItem } from "@/lib/api";

/** Доля кириллицы среди букв; ниже порога считаем, что нужен перевод с EN */
function cyrillicLetterRatio(s: string): number {
    const letters = s.replace(/[^\p{L}]/gu, "");
    if (!letters.length) return 1;
    let cyr = 0;
    for (const ch of letters) {
        if (/\p{Script=Cyrillic}/u.test(ch)) cyr += 1;
    }
    return cyr / letters.length;
}

function needsRussian(s: string | undefined | null): s is string {
    const t = (s ?? "").trim();
    return t.length > 0 && cyrillicLetterRatio(t) < 0.32;
}

/** Достаёт JSON `{"out":[...]}` из ответа модели (в т.ч. с markdown-обёрткой). */
function parseTranslationJson(raw: string | null | undefined, expectedLen: number): string[] | null {
    if (!raw) return null;
    let s = raw.trim();
    const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
    if (fence) s = fence[1].trim();
    try {
        const parsed = JSON.parse(s) as { out?: string[] };
        const out = parsed.out;
        if (!Array.isArray(out) || out.length !== expectedLen) return null;
        return out;
    } catch {
        return null;
    }
}

async function translateDeepLBatch(texts: string[], authKey: string): Promise<string[] | null> {
    const pro = process.env.DEEPL_PRO === "1";
    const base = pro ? "https://api.deepl.com" : "https://api-free.deepl.com";
    const res = await fetch(`${base}/v2/translate`, {
        method: "POST",
        headers: {
            Authorization: `DeepL-Auth-Key ${authKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text: texts,
            target_lang: "RU",
            preserve_formatting: true,
        }),
    });
    if (!res.ok) {
        const err = await res.text().catch(() => "");
        console.warn("[news-translate] DeepL HTTP", res.status, err.slice(0, 200));
        return null;
    }
    const data = (await res.json()) as { translations?: { text: string }[] };
    const out = data.translations?.map((t) => t.text);
    if (!out || out.length !== texts.length) return null;
    return out;
}

/** Ответ модели-отказа (Yandex safety) — не подставляем как перевод. */
function isYandexRefusalText(s: string): boolean {
    const t = s.trim().toLowerCase();
    return t.startsWith("я не могу") || t.includes("не могу обсуждать") || t.includes("давайте поговорим");
}

/** OpenAI-совместимый эндпоинт Yandex AI Studio (см. quickstart в доке AI Studio). */
async function translateYandexAIBatch(
    texts: string[],
    apiKey: string,
    folderId: string,
    modelSlug: string,
): Promise<string[] | null> {
    const base = (process.env.YANDEX_LLM_BASE_URL ?? "https://llm.api.cloud.yandex.net/v1").replace(/\/$/, "");
    const modelUri = modelSlug.startsWith("gpt://") ? modelSlug : `gpt://${folderId}/${modelSlug}`;
    const payload = texts.map((t, i) => ({ i, t }));

    const systemOneLine =
        texts.length === 1
            ? 'Переведи на русский для финансового терминала. Верни строго JSON {"out":["..."]} — один элемент в out, без пояснений.'
            : "Переведи каждую фразу из items[].t на русский для финансового терминала. Верни строго JSON {\"out\":[\"...\"]} той же длины, что items. Сохраняй цифры, %, даты, тикеры.";

    const body = {
        model: modelUri,
        temperature: 0.12,
        response_format: { type: "json_object" as const },
        messages: [
            {
                role: "system" as const,
                content: systemOneLine,
            },
            {
                role: "user" as const,
                content: JSON.stringify({ items: payload }),
            },
        ],
    };

    const parseBody = async (resp: Response): Promise<string[] | null> => {
        if (!resp.ok) {
            const err = await resp.text().catch(() => "");
            console.warn("[news-translate] Yandex AI HTTP", resp.status, err.slice(0, 280));
            return null;
        }
        const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
        const raw = data.choices?.[0]?.message?.content;
        if (raw && isYandexRefusalText(raw)) return null;
        return parseTranslationJson(raw, texts.length);
    };

    let r = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
            Authorization: `Api-Key ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (r.status === 400) {
        const errText = await r.clone().text().catch(() => "");
        if (/response_format|json_object|unknown/i.test(errText)) {
            const fallbackBody = {
                model: body.model,
                temperature: body.temperature,
                messages: body.messages,
            };
            r = await fetch(`${base}/chat/completions`, {
                method: "POST",
                headers: {
                    Authorization: `Api-Key ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(fallbackBody),
            });
        }
    }

    return parseBody(r);
}

async function translateOpenAIBatch(texts: string[], apiKey: string): Promise<string[] | null> {
    const payload = texts.map((t, i) => ({ i, t }));
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-4o-mini",
            temperature: 0.15,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content:
                        "Ты редактор финансовых новостей. Переводишь с английского на русский: деловой нейтральный стиль. Сохраняй числа, тикеры, %, даты, названия банков и персон в латинице где уместно. Ответ только JSON: {\"out\":[\"...\"] } — массив строк в том же порядке, что массив `items` во входе.",
                },
                {
                    role: "user",
                    content: JSON.stringify({ items: payload }),
                },
            ],
        }),
    });
    if (!res.ok) {
        const err = await res.text().catch(() => "");
        console.warn("[news-translate] OpenAI HTTP", res.status, err.slice(0, 200));
        return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content;
    return parseTranslationJson(raw, texts.length);
}

/** Дозаполняет слоты, где после Yandex текст всё ещё выглядит как EN (safety / отказ). */
async function openAiFillStillEnglish(merged: string[], segments: string[], apiKey: string): Promise<void> {
    const stillIdx: number[] = [];
    for (let j = 0; j < merged.length; j++) {
        if (needsRussian(merged[j]!)) stillIdx.push(j);
    }
    if (stillIdx.length === 0) return;

    const OAI_BATCH = 12;
    for (let off = 0; off < stillIdx.length; off += OAI_BATCH) {
        const batchIdx = stillIdx.slice(off, off + OAI_BATCH);
        const slice = batchIdx.map((i) => segments[i]!);
        const r = await translateOpenAIBatch(slice, apiKey);
        if (!r) {
            console.warn("[news-translate] OpenAI fallback batch failed, leaving prior text for", batchIdx.length, "segments");
            return;
        }
        for (let k = 0; k < r.length; k++) {
            merged[batchIdx[k]!] = r[k]!;
        }
    }
}

/** Перевод всех сегментов с сохранением порядка (несколько батчей при длинной ленте). */
async function translateAllSegments(segments: string[]): Promise<string[] | null> {
    if (segments.length === 0) return [];

    const deepl = process.env.DEEPL_AUTH_KEY?.trim() || process.env.DEEPL_API_KEY?.trim();
    if (deepl) {
        const DEEPL_BATCH = 40;
        const merged: string[] = [];
        let ok = true;
        for (let off = 0; off < segments.length; off += DEEPL_BATCH) {
            const slice = segments.slice(off, off + DEEPL_BATCH);
            const r = await translateDeepLBatch(slice, deepl);
            if (!r) {
                ok = false;
                break;
            }
            merged.push(...r);
        }
        if (ok && merged.length === segments.length) return merged;
        console.warn("[news-translate] DeepL incomplete or failed, trying Yandex AI / OpenAI if configured");
    }

    const yandexKey =
        process.env.YANDEX_CLOUD_API_KEY?.trim() ||
        process.env.YANDEX_API_KEY?.trim() ||
        process.env.YANDEX_AI_STUDIO_API_KEY?.trim();
    const yandexFolder = process.env.YANDEX_FOLDER_ID?.trim();
    const yandexModel = process.env.YANDEX_GPT_MODEL?.trim() || "yandexgpt/latest";

    if (yandexKey && yandexFolder) {
        /** По одной строке: батчи из нескольких фраз Yandex часто режет safety-фильтром на геополитике. */
        const merged: string[] = [];
        for (let i = 0; i < segments.length; i++) {
            const slice = [segments[i]!];
            const r = await translateYandexAIBatch(slice, yandexKey, yandexFolder, yandexModel);
            if (r?.[0] && !isYandexRefusalText(r[0])) merged.push(r[0]);
            else {
                if (!r) console.warn("[news-translate] Yandex segment", i, "parse/API failed, keeping EN");
                else console.warn("[news-translate] Yandex segment", i, "refusal, keeping EN");
                merged.push(segments[i]!);
            }
        }
        const openai = process.env.OPENAI_API_KEY?.trim();
        if (openai) await openAiFillStillEnglish(merged, segments, openai);
        return merged;
    }

    const openai = process.env.OPENAI_API_KEY?.trim();
    if (openai) {
        const OAI_BATCH = 12;
        const merged: string[] = [];
        for (let off = 0; off < segments.length; off += OAI_BATCH) {
            const slice = segments.slice(off, off + OAI_BATCH);
            const r = await translateOpenAIBatch(slice, openai);
            if (!r) return null;
            merged.push(...r);
        }
        return merged;
    }

    return null;
}

function cloneNews(data: NewsData): NewsData {
    return JSON.parse(JSON.stringify(data)) as NewsData;
}

/**
 * Переводит title/summary новостей и при необходимости signal_context.summary на русский.
 *
 * Цепочка провайдеров: DeepL → Yandex AI Studio → OpenAI (дозаполнение строк, где Yandex отказал/safety).
 * — DeepL: `DEEPL_AUTH_KEY` или `DEEPL_API_KEY`
 * — Yandex (OpenAI-совместимый LLM API): `YANDEX_FOLDER_ID` + один из ключей
 *   `YANDEX_CLOUD_API_KEY` | `YANDEX_API_KEY` | `YANDEX_AI_STUDIO_API_KEY`, опционально `YANDEX_GPT_MODEL`
 *   (по умолчанию `yandexgpt/latest`; можно полный URI `gpt://<folder>/<model>`).
 * — OpenAI: `OPENAI_API_KEY`, опционально `OPENAI_TRANSLATE_MODEL` — батчами только по оставшимся EN после Yandex
 *
 * Чтобы использовался только Яндекс, не задавайте ключ DeepL.
 * Без ключей возвращает копию без изменений (англ. оригинал).
 */
export async function translateNewsForRu(data: NewsData): Promise<NewsData> {
    const out = cloneNews(data);
    const segments: string[] = [];
    type Ref =
        | { kind: "ctx" }
        | { kind: "item"; index: number; field: "title" | "summary" };

    const refs: Ref[] = [];

    if (needsRussian(out.signal_context?.summary)) {
        refs.push({ kind: "ctx" });
        segments.push(out.signal_context!.summary!);
    }

    out.items.forEach((item: NewsItem, index: number) => {
        if (needsRussian(item.title)) {
            refs.push({ kind: "item", index, field: "title" });
            segments.push(item.title);
        }
        if (needsRussian(item.summary)) {
            refs.push({ kind: "item", index, field: "summary" });
            segments.push(item.summary);
        }
    });

    if (segments.length === 0) return out;

    const translated = await translateAllSegments(segments);
    if (!translated) return out;

    translated.forEach((text, i) => {
        const ref = refs[i];
        if (!ref) return;
        if (ref.kind === "ctx" && out.signal_context) {
            out.signal_context.summary = text;
        } else if (ref.kind === "item") {
            const it = out.items[ref.index];
            if (it) it[ref.field] = text;
        }
    });

    return out;
}

/** Увеличьте при смене логики перевода — сбросит серверный кэш. */
const NEWS_TRANSLATE_CACHE_VER = 4;

function translateProvidersFingerprint(): string {
    const deepl = !!(process.env.DEEPL_AUTH_KEY?.trim() || process.env.DEEPL_API_KEY?.trim());
    const yKey = !!(
        process.env.YANDEX_CLOUD_API_KEY?.trim() ||
        process.env.YANDEX_API_KEY?.trim() ||
        process.env.YANDEX_AI_STUDIO_API_KEY?.trim()
    );
    const yFolder = !!process.env.YANDEX_FOLDER_ID?.trim();
    const openai = !!process.env.OPENAI_API_KEY?.trim();
    return `v${NEWS_TRANSLATE_CACHE_VER}:${deepl ? "d" : "-"}${yKey && yFolder ? "y" : "-"}${openai ? "o" : "-"}`;
}

let cache: { key: string; payload: NewsData; at: number } | null = null;
const CACHE_MS = 15 * 60 * 1000;

export async function translateNewsCached(data: NewsData): Promise<NewsData> {
    const key = `${data.updated_at ?? ""}:${translateProvidersFingerprint()}`;
    const now = Date.now();
    if (cache && cache.key === key && now - cache.at < CACHE_MS) {
        return cache.payload;
    }
    const payload = await translateNewsForRu(data);
    cache = { key, payload, at: now };
    return payload;
}
