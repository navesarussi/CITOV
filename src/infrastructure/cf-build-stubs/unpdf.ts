/** Cloudflare Workers bundle diet — PDF parsing disabled (use Vercel for full CV upload). */
export async function getDocumentProxy(_data: Uint8Array): Promise<unknown> {
  throw new Error("PDF extraction is not available on Cloudflare Workers build");
}

export async function extractText(): Promise<{ text: string | string[] }> {
  throw new Error("PDF extraction is not available on Cloudflare Workers build");
}
