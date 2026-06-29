// Universal prompts. 사용자 입력 verbatim 삽입. 의미 변환/번역/확장 금지.

export function buildStyleSheetPrompt(userPrompt: string): string {
  return `Create a Minecraft pixel-art item texture style reference sheet.

User prompt:
"""
${userPrompt}
"""

Use the user prompt directly as the source of theme, materials, colors, mood, motifs, and style direction.

Create an organized reference sheet for making multiple consistent Minecraft-style item textures from this concept.

Style: TRUE pixel art. Hard pixel edges, flat colors, no anti-aliasing, no gradients, no soft shading. Each pixel should be clearly visible and deliberately placed. Blocky retro game sprite look.

Use a clean white background.
Arrange content clearly in separated sections or panels.
Include visual examples that naturally fit the user prompt.
Include reusable shapes, parts, materials, color swatches, outline examples, highlight examples, and shadow examples when useful.

Keep forms crisp and readable at small game-icon sizes.
Avoid photorealistic rendering.
Avoid cluttered backgrounds.
Do not create transparent background.
Do not add unrelated themes or items.
Do not reinterpret or translate the user prompt.`
}

export function buildItemPrompt(
  userPrompt: string,
  resolution: number,
): string {
  return `Create a ${resolution}x${resolution} pixel-art Minecraft item icon.

CRITICAL PIXEL ART RULES — YOU MUST FOLLOW ALL:
- This is TRUE pixel art for a ${resolution}x${resolution} pixel grid.
- Every pixel must be square, clearly visible, and deliberately placed.
- HARD pixel edges only — absolutely NO anti-aliasing, NO blur, NO soft edges.
- FLAT colors only — absolutely NO gradients, NO smooth shading, NO airbrush.
- Limited color palette (6-16 distinct flat colors total).
- Blocky, sharp, retro 16-bit game sprite style. Think Minecraft vanilla textures.
- Each color block should look like it was placed pixel by pixel on a tiny grid.

User item prompt:
"""
${userPrompt}
"""

Use the attached style reference sheet as the primary visual reference.
Follow its palette, material language, shape language, outline behavior, lighting, and motifs.

Target output is one isolated item icon on a flat pure magenta (#FF00FF) background.
Center the item.
Keep the item fully separated from all image edges.
Do NOT use magenta (#FF00FF) anywhere in the item itself.
Keep the silhouette clear and readable at small game-icon sizes.

FORBIDDEN:
- Smooth curves, photorealistic shading, gradient fills, glow effects
- Fine details that need more than ${resolution} pixels to render clearly
- Anti-aliased edges or soft transitions between colors
- Transparent or semi-transparent pixels
- Cluttered backgrounds, extra items, or unrelated themes
- Reinterpreting or translating the user prompt`
}