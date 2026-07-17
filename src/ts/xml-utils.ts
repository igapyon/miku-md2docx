export function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeAttr(value: string): string {
  return escapeXml(value).replace(/"/g, "&quot;");
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}
