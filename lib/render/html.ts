export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function cssUrl(path: string): string {
  return `url("${path.replace(/"/g, "%22")}")`;
}

export function wrapHtmlDocument(input: { title: string; body: string; css: string }): string {
  return [
    "<!doctype html>",
    '<html lang="vi">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${escapeHtml(input.title)}</title>`,
    "<style>",
    input.css,
    "</style>",
    "</head>",
    "<body>",
    input.body,
    "</body>",
    "</html>"
  ].join("\n");
}
