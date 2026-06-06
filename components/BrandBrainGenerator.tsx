"use client";

import { useMemo, useState } from "react";
import {
  generateBrandOutput,
  getFormOptions,
  getInitialInput,
  riskBadgeClasses,
  riskSensitivityLabel
} from "../lib/generator";
import type {
  BrandDataBundle,
  GenerationInput,
  OutputType,
  RiskSensitivity,
  SelectOption
} from "../lib/types";

interface BrandBrainGeneratorProps {
  data: BrandDataBundle;
}

type TextFieldName =
  | "goal"
  | "offer"
  | "cta"
  | "tone"
  | "notes";

function FieldLabel({
  children,
  htmlFor
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-byt-ink">
      {children}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  const fieldId = `select-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <select
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-byt-line bg-white px-3 text-sm text-byt-ink outline-none transition focus:border-byt-leaf focus:ring-2 focus:ring-byt-leaf/15"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const fieldId = `textarea-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="space-y-1.5">
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <textarea
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-md border border-byt-line bg-white px-3 py-2 text-sm leading-6 text-byt-ink outline-none transition placeholder:text-byt-muted/70 focus:border-byt-leaf focus:ring-2 focus:ring-byt-leaf/15"
      />
    </div>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-byt-line pt-5 first:border-t-0 first:pt-0">
      <h2 className="text-sm font-bold uppercase text-byt-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ScoreRow({
  label,
  value
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-byt-line/70 py-2 text-sm last:border-b-0">
      <span className="text-byt-muted">{label}</span>
      <span className="font-semibold text-byt-ink">{value}</span>
    </div>
  );
}

export function BrandBrainGenerator({ data }: BrandBrainGeneratorProps) {
  const options = useMemo(() => getFormOptions(data), [data]);
  const [input, setInput] = useState<GenerationInput>(() => getInitialInput(data));
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const output = useMemo(() => generateBrandOutput(input, data), [input, data]);
  const templateCount = Object.keys(data.templates).length;

  function updateField<K extends keyof GenerationInput>(field: K, value: GenerationInput[K]) {
    setInput((current) => ({ ...current, [field]: value }));
    setCopyState("idle");
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(output.markdown);
    setCopyState("copied");
  }

  function downloadMarkdown() {
    const blob = new Blob([output.markdown], {
      type: "text/markdown;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "byt-brand-brain-output.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen px-4 py-5 text-byt-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-md border border-byt-line bg-white/90 p-5 shadow-soft lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-sm font-semibold uppercase text-byt-leaf">
              Bếp Yêu Thương
            </p>
            <h1 className="text-2xl font-bold text-byt-ink sm:text-3xl">
              BYT Brand Brain & Design Agent System
            </h1>
            <p className="text-sm leading-6 text-byt-muted">
              App nội bộ đọc dữ liệu từ <span className="font-semibold">brand-data</span> và template markdown để tạo brief, nội dung, script và báo cáo kiểm tra thương hiệu.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:items-center">
            <span className="rounded-md border border-byt-line bg-[#f8faf8] px-3 py-2 font-medium text-byt-muted">
              {templateCount} templates
            </span>
            <span className="rounded-md border border-byt-line bg-[#f8faf8] px-3 py-2 font-medium text-byt-muted">
              Local JSON only
            </span>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="rounded-md border border-byt-line bg-white p-5 shadow-soft">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Yêu cầu tạo nội dung</h2>
                <p className="text-sm text-byt-muted">Điền brief đầu vào, output tự cập nhật bên phải.</p>
              </div>
              <span className={`rounded-md border px-2.5 py-1 text-xs font-bold ${riskBadgeClasses(output.complianceCheck.riskLevel)}`}>
                {output.complianceCheck.riskLevel}
              </span>
            </div>

            <div className="space-y-4">
              <SelectField
                label="Loại output"
                value={input.outputType}
                options={options.outputTypes}
                onChange={(value) => updateField("outputType", value as OutputType)}
              />
              <TextField
                label="Goal"
                value={input.goal}
                onChange={(value) => updateField("goal", value)}
                rows={3}
              />
              <SelectField
                label="Audience"
                value={input.audience}
                options={options.audiences}
                onChange={(value) => updateField("audience", value)}
              />
              <SelectField
                label="Product / membership"
                value={input.productMembership}
                options={options.productMemberships}
                onChange={(value) => updateField("productMembership", value)}
              />
              <SelectField
                label="Campaign"
                value={input.campaign}
                options={options.campaigns}
                onChange={(value) => updateField("campaign", value)}
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <SelectField
                  label="Channel"
                  value={input.channel}
                  options={options.channels}
                  onChange={(value) => updateField("channel", value)}
                />
                <SelectField
                  label="Format"
                  value={input.format}
                  options={options.formats}
                  onChange={(value) => updateField("format", value)}
                />
              </div>
              <TextField
                label="Offer"
                value={input.offer}
                onChange={(value) => updateField("offer", value)}
                placeholder="VD: ưu đãi nháp, giá, điều kiện áp dụng nếu có"
                rows={2}
              />
              <TextField
                label="CTA"
                value={input.cta}
                onChange={(value) => updateField("cta", value)}
                rows={2}
              />
              <SelectField
                label="Tone"
                value={input.tone}
                options={options.tones}
                onChange={(value) => updateField("tone", value)}
              />
              <TextField
                label="Notes"
                value={input.notes}
                onChange={(value) => updateField("notes", value)}
                placeholder="Visual reference, deadline, nội dung cần kiểm, giả định..."
                rows={4}
              />
              <div className="space-y-2">
                <FieldLabel>Risk sensitivity</FieldLabel>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  {options.riskSensitivities.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        updateField("riskSensitivity", item.value as RiskSensitivity)
                      }
                      className={`rounded-md border px-3 py-2 text-left text-sm font-semibold transition ${
                        input.riskSensitivity === item.value
                          ? "border-byt-leaf bg-byt-leaf text-white"
                          : "border-byt-line bg-white text-byt-muted hover:border-byt-leaf/60"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <section className="rounded-md border border-byt-line bg-white p-5 shadow-soft">
            <div className="mb-5 flex flex-col gap-3 border-b border-byt-line pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Output có thể xuất Markdown</h2>
                <p className="text-sm text-byt-muted">
                  Compliance luôn hiển thị; thông tin thiếu được đánh dấu Cần founder xác nhận.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyMarkdown}
                  className="rounded-md border border-byt-leaf bg-white px-3 py-2 text-sm font-semibold text-byt-leaf transition hover:bg-byt-leaf/10"
                >
                  {copyState === "copied" ? "Đã copy Markdown" : "Copy Markdown"}
                </button>
                <button
                  type="button"
                  onClick={downloadMarkdown}
                  className="rounded-md bg-byt-ink px-3 py-2 text-sm font-semibold text-white transition hover:bg-byt-leaf"
                >
                  Export as Markdown
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-6">
                <Section title="Strategic angle">
                  <ul className="space-y-2 text-sm leading-6 text-byt-ink">
                    {output.strategicAngle.map((item) => (
                      <li key={item} className="rounded-md bg-[#f8faf8] px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title="Copy">
                  <div className="space-y-3">
                    <div className="rounded-md border border-byt-line bg-[#fffdf9] p-4">
                        <p className="text-xs font-bold uppercase text-byt-muted">
                        Headline
                      </p>
                      <p className="mt-1 text-xl font-bold leading-tight text-byt-ink">
                        {output.copy.headline}
                      </p>
                    </div>
                    <div className="rounded-md border border-byt-line p-4">
                      <p className="text-xs font-bold uppercase text-byt-muted">
                        Body
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-byt-ink">
                        {output.copy.body}
                      </p>
                    </div>
                    <ul className="space-y-2 text-sm leading-6 text-byt-muted">
                      {output.copy.supportingCopy.map((item) => (
                        <li key={item} className="rounded-md bg-[#f8faf8] px-3 py-2">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Section>

                <Section title="Design brief">
                  <div className="grid gap-3 text-sm leading-6 text-byt-ink">
                    <p><span className="font-semibold">Campaign angle:</span> {output.designBrief.campaignAngle}</p>
                    <p><span className="font-semibold">Audience insight:</span> {output.designBrief.audienceInsight}</p>
                    <p><span className="font-semibold">Main message:</span> {output.designBrief.mainMessage}</p>
                    <p><span className="font-semibold">Visual concept:</span> {output.designBrief.visualConcept}</p>
                    <div>
                      <p className="font-semibold">Layout structure:</p>
                      <ul className="mt-2 space-y-1">
                        {output.designBrief.layoutStructure.map((item) => (
                          <li key={item}>- {item}</li>
                        ))}
                      </ul>
                    </div>
                    <p><span className="font-semibold">Color direction:</span> {output.designBrief.colorDirection}</p>
                    <p><span className="font-semibold">Typography direction:</span> {output.designBrief.typographyDirection}</p>
                    <p><span className="font-semibold">Image direction:</span> {output.designBrief.imageDirection}</p>
                    <p><span className="font-semibold">Icon/illustration direction:</span> {output.designBrief.iconIllustrationDirection}</p>
                  </div>
                </Section>
              </div>

              <aside className="space-y-5">
                <Section title="Sales / community CTA">
                  <p className="rounded-md border border-byt-line bg-[#fffdf9] p-3 text-sm font-semibold leading-6 text-byt-ink">
                    {output.salesCommunityCta}
                  </p>
                </Section>

                <Section title="Compliance check">
                  <div className={`rounded-md border p-3 ${riskBadgeClasses(output.complianceCheck.riskLevel)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">
                        Risk: {output.complianceCheck.riskLevel}
                      </span>
                      <span className="text-xs font-bold">
                        {output.complianceCheck.recommendation}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5">
                      Human approval: {output.complianceCheck.humanApprovalRequired ? "Có" : "Không"}
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm leading-6 text-byt-ink">
                    {output.complianceCheck.detectedRisks.map((item) => (
                      <li key={item} className="rounded-md bg-[#f8faf8] px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="rounded-md border border-byt-line p-3 text-sm leading-6 text-byt-muted">
                    {output.complianceCheck.saferRewrite}
                  </p>
                </Section>

                <Section title="Brand Checker score">
                  <div className="rounded-md border border-byt-line px-3">
                    <ScoreRow label="Brand fit" value={`${output.brandCheckerScore.brandFit}/10`} />
                    <ScoreRow label="Visual fit" value={`${output.brandCheckerScore.visualFit}/10`} />
                    <ScoreRow label="Voice fit" value={`${output.brandCheckerScore.voiceFit}/10`} />
                    <ScoreRow label="Business model fit" value={`${output.brandCheckerScore.businessModelFit}/10`} />
                    <ScoreRow label="Product accuracy" value={`${output.brandCheckerScore.productAccuracy}/10`} />
                    <ScoreRow label="Membership accuracy" value={`${output.brandCheckerScore.membershipAccuracy}/10`} />
                    <ScoreRow label="Community fit" value={`${output.brandCheckerScore.communityFit}/10`} />
                    <ScoreRow label="Conversion clarity" value={`${output.brandCheckerScore.conversionClarity}/10`} />
                    <ScoreRow label="Channel fit" value={`${output.brandCheckerScore.channelFit}/10`} />
                    <ScoreRow label="Compliance risk" value={output.brandCheckerScore.complianceRisk} />
                  </div>
                </Section>

                <Section title="Cần founder xác nhận">
                  <ul className="space-y-2 text-sm leading-6 text-byt-ink">
                    {output.founderConfirmationNeeded.map((item) => (
                      <li key={item} className="rounded-md border border-byt-line bg-white px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                </Section>

                <Section title="Nguồn local">
                  <p className="text-sm leading-6 text-byt-muted">
                    Risk sensitivity: {riskSensitivityLabel(input.riskSensitivity)}. Không gọi API ngoài, không tạo ảnh cuối.
                  </p>
                </Section>
              </aside>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
