import { visit } from 'unist-util-visit';

/**
 * Wrap each build-time Mermaid SVG in a scrollable <figure>.
 *
 * rehype-mermaid emits the SVG as a bare sibling in the prose flow, and Mermaid
 * writes an inline `max-width: <natural width>px` on it. An inline style beats a
 * stylesheet rule, so a wide diagram either overflows the column or, with
 * width="100%", shrinks until the labels are unreadable -- badly so on a phone.
 *
 * Wrapping gives a container that can scroll, so diagrams stay at legible size
 * and narrow screens pan instead of squinting. Runs after rehype-mermaid.
 */
export default function rehypeWrapMermaid() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'svg' || index === undefined || !parent) return;

      const id = node.properties?.id;
      if (typeof id !== 'string' || !id.startsWith('mermaid')) return;

      // Idempotent: don't re-wrap on a second pass.
      const parentClass = parent.properties?.className;
      if (Array.isArray(parentClass) && parentClass.includes('diagram')) return;

      parent.children[index] = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['diagram'] },
        children: [node],
      };
    });
  };
}
