import type { GeneratedOutput, GenerationInput } from "../types";

export interface RenderCopy {
  headline: string;
  supporting_copy: string;
  cta: string;
}

export function buildRenderCopy(input: GenerationInput, output: GeneratedOutput): RenderCopy {
  return {
    headline: output.copy.headline.trim(),
    supporting_copy: chooseSupportingCopy(output),
    cta: chooseCta(input, output)
  };
}

export function isInternalRenderCopyLine(value: string): boolean {
  const normalized = normalize(value);
  return (
    normalized.startsWith("tone:") ||
    normalized.includes("can founder xac nhan") ||
    normalized.includes("can xac nhan") ||
    normalized.includes("founder confirmation") ||
    normalized.includes("founder_confirmation_needed")
  );
}

function chooseSupportingCopy(output: GeneratedOutput): string {
  const publicLine = output.copy.supportingCopy
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !isInternalRenderCopyLine(line));

  if (publicLine) return publicLine;

  const mainMessage = output.designBrief.mainMessage.trim();
  if (mainMessage.length > 0 && !isInternalRenderCopyLine(mainMessage)) return mainMessage;

  return "Một lựa chọn nhỏ để bắt đầu thói quen lành hơn.";
}

function chooseCta(input: GenerationInput, output: GeneratedOutput): string {
  const cta = output.salesCommunityCta.trim();
  if (cta.length > 0 && !isInternalRenderCopyLine(cta)) return cta;

  const inputCta = input.cta.trim();
  if (inputCta.length > 0 && !isInternalRenderCopyLine(inputCta)) return inputCta;

  return "Nhắn Bếp để được gợi ý.";
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
