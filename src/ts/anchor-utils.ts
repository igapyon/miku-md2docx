export function normalizeAnchor(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function extractText(node: any): string {
  if (!node) return "";
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map((child: any) => extractText(child)).join("");
}
