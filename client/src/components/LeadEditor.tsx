import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "@/components/leadloom-types";
import { Button, TextArea, TextInput } from "@/components/LeadloomUI";

export type LeadEditorValues = {
  companyName: string;
  website: string;
  contactName: string;
  email: string;
  title: string;
  linkedinUrl: string;
  xUrl: string;
  icpId: number | null;
  notes: string;
};

export const emptyLeadEditorValues: LeadEditorValues = {
  companyName: "",
  website: "",
  contactName: "",
  email: "",
  title: "",
  linkedinUrl: "",
  xUrl: "",
  icpId: null,
  notes: "",
};

type LeadEditorProps = {
  initialValues: LeadEditorValues;
  submitLabel: string;
  pending?: boolean;
  error?: string;
  onSubmit: (values: LeadEditorValues) => Promise<void>;
  onCancel?: () => void;
};

export function LeadEditor({
  initialValues,
  submitLabel,
  pending = false,
  error,
  onSubmit,
  onCancel,
}: LeadEditorProps) {
  const icps = api.icps.list.useQuery(undefined, { retry: false });
  const [values, setValues] = useState<LeadEditorValues>(() => ({
    ...initialValues,
  }));
  const [submitError, setSubmitError] = useState<string | null>(null);

  const set = <K extends keyof LeadEditorValues>(
    key: K,
    value: LeadEditorValues[K]
  ) => {
    setValues(current => ({ ...current, [key]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    try {
      await onSubmit(values);
    } catch (caught) {
      setSubmitError(
        caught instanceof Error
          ? caught.message
          : "The lead could not be saved."
      );
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          label="Company name"
          required
          value={values.companyName}
          onChange={event => set("companyName", event.target.value)}
        />
        <TextInput
          label="Public HTTPS website"
          type="url"
          required
          value={values.website}
          onChange={event => set("website", event.target.value)}
          placeholder="https://example.com"
          hint="Use the public company site, not a private or local address."
        />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-ink">
          ICP profile
        </span>
        <select
          value={values.icpId ?? ""}
          onChange={event =>
            set("icpId", event.target.value ? Number(event.target.value) : null)
          }
          className="w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/10"
        >
          <option value="">Unassigned</option>
          {icps.data?.map(icp => (
            <option value={icp.id} key={icp.id}>
              {icp.criteria.name}
            </option>
          ))}
        </select>
        {icps.isLoading && (
          <span className="mt-1 block text-[11px] text-ink-muted">
            Loading profiles…
          </span>
        )}
        {icps.error && (
          <span className="mt-1 block text-xs text-red-700">
            Profiles could not load: {icps.error.message}
          </span>
        )}
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          label="Contact name"
          value={values.contactName}
          onChange={event => set("contactName", event.target.value)}
        />
        <TextInput
          label="Title"
          value={values.title}
          onChange={event => set("title", event.target.value)}
        />
        <TextInput
          label="Email"
          type="email"
          value={values.email}
          onChange={event => set("email", event.target.value)}
        />
        <TextInput
          label="LinkedIn URL"
          type="url"
          value={values.linkedinUrl}
          onChange={event => set("linkedinUrl", event.target.value)}
          placeholder="https://www.linkedin.com/..."
        />
        <TextInput
          label="X URL"
          type="url"
          value={values.xUrl}
          onChange={event => set("xUrl", event.target.value)}
          placeholder="https://x.com/..."
        />
      </div>
      <TextArea
        label="Notes"
        value={values.notes}
        onChange={event => set("notes", event.target.value)}
        hint="Keep source context or human notes here. Do not treat discovery snippets as verified fit."
      />
      {(submitError || error) && (
        <div
          role="alert"
          className="border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800"
        >
          {submitError || error}
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={pending} className="sm:min-w-40">
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
