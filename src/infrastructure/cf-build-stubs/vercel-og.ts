/** Stub @vercel/og so OpenNext/wrangler do not pull resvg/yoga WASM into the Worker. */
export class ImageResponse extends Response {
  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body, init);
  }
}

export default { ImageResponse };
