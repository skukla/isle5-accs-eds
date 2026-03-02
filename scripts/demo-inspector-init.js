/**
 * Demo Inspector Initialization
 *
 * Tags EDS blocks with their primary API Mesh data source for the
 * Demo Inspector Chrome extension. The extension handles all UI —
 * this script only sets data attributes.
 *
 * Level 1: Maps EDS block names to their primary API Mesh data source.
 * Level 2: Per-block sub-container tagging is done in individual block decorators.
 */

// eslint-disable-next-line import/no-unresolved, import/no-absolute-path -- AEM runtime path
import { tagMeshSource } from '/scripts/demo-inspector-sdk/mesh.js';

// Block name → primary API Mesh data source
const SOURCE_MAP = {
  'product-details': 'catalog',
  'product-recommendations': 'catalog',
  'product-list-page': 'search',
  'search-bar': 'search',
  header: 'commerce',
  footer: 'commerce',
};

/**
 * Tags block containers with their primary data source (Level 1).
 * Skips blocks that already have data-inspector-source set (Level 2 takes precedence).
 */
function tagBlockSources() {
  document.querySelectorAll('[data-block-name]').forEach((block) => {
    if (block.hasAttribute('data-inspector-source')) return;
    // Skip Level 1 if any descendant already has Level 2 sub-container tags
    if (block.querySelector('[data-inspector-source]')) return;
    const name = block.getAttribute('data-block-name');
    const source = SOURCE_MAP[name] || (name.startsWith('commerce-') ? 'commerce' : null);
    if (source) {
      tagMeshSource(block, source);
    }
  });
}

/**
 * Applies Level 1 source tagging for the Chrome extension.
 * Fails silently if the SDK is not installed.
 */
export function initInspector() {
  tagBlockSources();
}
