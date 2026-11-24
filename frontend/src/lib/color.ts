/** Blend a semantic CSS color with transparency without a theme object. */
export function colorMix(color: string, opacity: number): string {
    const percentage = Math.round(Math.max(0, Math.min(1, opacity)) * 100);
    return `color-mix(in srgb, ${color} ${percentage}%, transparent)`;
}
