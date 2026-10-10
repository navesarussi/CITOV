/** Cloudflare Workers bundle diet — DOCX parsing disabled (use Vercel for full CV upload). */
const mammoth = {
  async extractRawText(): Promise<{ value: string }> {
    return { value: "" };
  },
};

export default mammoth;
