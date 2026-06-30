/**
 * Extract plain text from an uploaded file.
 *
 * Supported: PDF (pdf-parse), Word .docx (mammoth), and any UTF-8 text
 * (.txt/.md/.csv/…). Heavy parsers are imported dynamically so they only load
 * on the server at runtime. No network calls — only the uploaded bytes.
 */

interface PdfParseModule {
  PDFParse: new (opts: { data: Uint8Array }) => {
    getText: () => Promise<{ text: string }>;
    destroy?: () => Promise<void>;
  };
}

interface MammothModule {
  extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>;
  default?: { extractRawText: MammothModule["extractRawText"] };
}

export interface ExtractResult {
  text: string;
  fileName: string;
}

export async function extractTextFromFile(file: File): Promise<ExtractResult> {
  const fileName = file.name;
  const lower = fileName.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (lower.endsWith(".pdf")) {
    const mod = (await import("pdf-parse")) as unknown as PdfParseModule;
    const parser = new mod.PDFParse({ data: new Uint8Array(buffer) });
    try {
      const res = await parser.getText();
      return { text: (res.text ?? "").trim(), fileName };
    } finally {
      await parser.destroy?.();
    }
  }

  if (lower.endsWith(".docx")) {
    const mod = (await import("mammoth")) as unknown as MammothModule;
    const extract = mod.extractRawText ?? mod.default?.extractRawText;
    if (!extract) throw new Error("Word-Konverter nicht verfügbar.");
    const res = await extract({ buffer });
    return { text: (res.value ?? "").trim(), fileName };
  }

  if (lower.endsWith(".doc")) {
    throw new Error(
      "Altes .doc-Format wird nicht unterstützt. Bitte als .docx oder als Text speichern.",
    );
  }

  // Everything else: treat as UTF-8 text (.txt, .md, .csv, …).
  return { text: buffer.toString("utf-8").trim(), fileName };
}
