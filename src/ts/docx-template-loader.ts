import { readZipPackage, type ZipEntry } from "../vendor/miku-ms-office-core-0.5.1.mjs";

export interface LoadedDocxTemplatePackage {
  entries: ZipEntry[];
  files: Map<string, Uint8Array>;
  documentXmlBytes: Uint8Array;
  relationshipsBytes?: Uint8Array;
  stylesBytes?: Uint8Array;
  numberingBytes?: Uint8Array;
  contentTypesBytes?: Uint8Array;
}

export function loadDocxTemplatePackage(data: Uint8Array): LoadedDocxTemplatePackage {
  const result = readZipPackage(data);
  const files = new Map(result.entries.map((entry) => [entry.path, entry.data]));
  const documentXmlBytes = files.get("word/document.xml");
  if (documentXmlBytes === undefined) {
    throw new Error("word/document.xml was not found in template DOCX.");
  }
  return {
    entries: result.entries,
    files,
    documentXmlBytes,
    relationshipsBytes: files.get("word/_rels/document.xml.rels"),
    stylesBytes: files.get("word/styles.xml"),
    numberingBytes: files.get("word/numbering.xml"),
    contentTypesBytes: files.get("[Content_Types].xml")
  };
}
