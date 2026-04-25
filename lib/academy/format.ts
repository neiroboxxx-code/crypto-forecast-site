/** Имя папки → заголовок: убираем хвостовую точку у `Candlestick_Mastery.`, `_` → пробел. Для `zone/Name` берётся только `Name`. */
export function formatFolderTitle(folder: string): string {
    const base = folder.includes("/") ? (folder.split("/").pop() ?? folder) : folder;
    return base.replace(/\.$/, "").replace(/_/g, " ");
}
