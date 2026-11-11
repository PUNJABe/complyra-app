export function formatChatAnswer(content: string) {
  return content
    .replace(/[ \t]+(?=\d+[.)]\s)/g, "\n")
    .replace(
      /\s+(?=(?:total spend|average transaction|largest transactions|top merchants|top categories|category breakdown|department split|risk scan|monthly trend)\s*[:—-])/gi,
      "\n",
    )
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
