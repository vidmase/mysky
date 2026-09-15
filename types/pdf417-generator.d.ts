/**
 * The encoder ships no types of its own. Only the one call the boarding pass
 * makes is declared, rather than a guess at the rest of its surface.
 */
declare module "pdf417-generator" {
  export const PDF417: {
    /** Draws the symbol for `code` into `canvas`, sizing it to the given aspect ratio. */
    draw(
      code: string,
      canvas: HTMLCanvasElement,
      aspectRatio?: number,
      errorCorrectionLevel?: number,
      devicePixelRatio?: number,
      lineColor?: string
    ): void
  }
}
