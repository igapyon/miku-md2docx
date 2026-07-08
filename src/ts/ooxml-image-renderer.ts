import type { RenderContext, RenderedInline } from "./types.ts";
import { displaySizeForImage, safeMediaName } from "./image-assets.ts";
import { drawingXml, runXml } from "./ooxml-primitives.ts";
import { addRelationship, REL_IMAGE } from "./relationships.ts";

export function renderImage(node: any, context: RenderContext): RenderedInline {
  const url = String(node.url ?? "");
  const alt = String(node.alt ?? "");
  context.summary.images += 1;
  if (isRemoteImageUrl(url)) {
    context.summary.missingImages += 1;
    context.summary.remoteImages += 1;
    context.summary.remoteImageDetails.push({ url, alt });
    const fallback = `[Missing image: ${alt || url}]`;
    return { xml: runXml(fallback), text: fallback };
  }

  const asset = context.options.imageLoader?.(url);
  if (!asset) {
    context.summary.missingImages += 1;
    context.summary.missingImageDetails.push({ path: url, alt });
    const fallback = `[Missing image: ${alt || url}]`;
    return { xml: runXml(fallback), text: fallback };
  }

  const mediaPath = `word/media/${safeMediaName(context.summary.embeddedImages + 1, asset.path)}`;
  const relId = addRelationship(context, REL_IMAGE, mediaPath.replace(/^word\//, ""));
  const displaySize = displaySizeForImage(asset);
  if (displaySize.resized) {
    context.summary.resizedImages += 1;
  }
  context.summary.embeddedImages += 1;
  context.imageMedia.push({ path: mediaPath, data: asset.data });
  return {
    xml: drawingXml(relId, alt, displaySize.width, displaySize.height, context.nextDocPrId++),
    text: alt
  };
}

function isRemoteImageUrl(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url);
}
