export const siteBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

export function sitePath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (siteBasePath && (path === siteBasePath || path.startsWith(`${siteBasePath}/`))) return path;
  return `${siteBasePath}${path}`;
}
