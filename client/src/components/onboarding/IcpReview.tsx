import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, Target, Trash2, Undo2 } from "lucide-react";
import { Link } from "wouter";
import type { IcpCriteria } from "@shared/domain";
import {
  ICP_REVIEW_LIMIT,
  addReviewEntry,
  removeReviewEntry,
  restoreReviewEntry,
  updateReviewEntry,
  type IcpReviewEntry,
  type IcpReviewErrors,
} from "@shared/icpReview";
import { Button, MonoLabel } from "@/components/LeadloomUI";
import "./icp-review.css";
type Props = {
  entries: IcpReviewEntry[];
  onChange: (entries: IcpReviewEntry[]) => void;
  errors?: IcpReviewErrors;
  readOnly?: boolean;
  applied?: boolean;
  children?: React.ReactNode;
};
const fields = [
  {
    key: "name",
    label: "ICP name",
    placeholder: "e.g. Series A developer-tool teams",
    max: 120,
    required: true,
  },
  {
    key: "industries",
    label: "Industries",
    placeholder: "B2B SaaS, developer tools",
    max: 2000,
  },
  {
    key: "companySize",
    label: "Company size",
    placeholder: "20–500 employees",
    max: 500,
  },
  {
    key: "geography",
    label: "Geography",
    placeholder: "North America and Europe",
    max: 1000,
  },
  {
    key: "roles",
    label: "Decision-maker roles",
    placeholder: "CTO, VP Engineering",
    max: 1000,
  },
] as const;
const textFields = [
  {
    key: "keywords",
    label: "Targeting keywords",
    placeholder: "AI coding agents, code review, production codebase",
    required: true,
    hint: "Search terms your agents can use to discover relevant companies.",
  },
  {
    key: "signals",
    label: "Buying signals",
    placeholder: "What observable change makes this company a good prospect?",
    hint: "Public evidence of need or timing—not a claim that the prospect is ready to buy.",
  },
  {
    key: "exclusions",
    label: "Who to exclude",
    placeholder: "Solo hobby projects, companies without a production codebase",
    hint: "Rules that stop your agents from pursuing the wrong companies.",
  },
] as const;
export function IcpReview({
  entries,
  onChange,
  errors = {},
  readOnly = false,
  applied = false,
  children,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [removed, setRemoved] = useState<
    { entry: IcpReviewEntry; index: number }[]
  >([]);
  const [announcement, setAnnouncement] = useState("");
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const previousCollection = useRef(entries.map(entry => entry.id).join("|"));
  useEffect(() => {
    const id = Object.keys(errors)[0];
    if (!id) return;
    const field = Object.keys(errors[id])[0];
    setExpanded(id);
    setFocusTarget(`${id}-${field}`);
  }, [errors]);
  useEffect(() => {
    if (!focusTarget) return;
    const field = document.getElementById(focusTarget);
    if (field) {
      field.focus();
      setFocusTarget(null);
    }
  }, [focusTarget, expanded, entries]);
  useEffect(() => {
    const next = entries.map(entry => entry.id).join("|");
    // A different analysis load should not retain undo records from the old review.
    if (
      entries.length &&
      previousCollection.current &&
      entries.every(
        entry => !previousCollection.current.split("|").includes(entry.id)
      )
    )
      setRemoved([]);
    previousCollection.current = next;
    // Reopening the same draft restores its original rows; discard obsolete undo records.
    setRemoved(previous =>
      previous.some(item => entries.some(entry => entry.id === item.entry.id))
        ? previous.filter(
            item => !entries.some(entry => entry.id === item.entry.id)
          )
        : previous
    );
  }, [entries]);
  const selectedCount = entries.filter(entry => entry.selected).length;
  const add = () => {
    if (readOnly || entries.length >= ICP_REVIEW_LIMIT) return;
    const id = `manual-${crypto.randomUUID()}`;
    onChange(addReviewEntry(entries, id));
    setExpanded(id);
    setFocusTarget(`${id}-name`);
    setAnnouncement(
      "New ICP added to this review. Give it a name and targeting keywords."
    );
  };
  const remove = (entry: IcpReviewEntry, index: number) => {
    if (readOnly) return;
    setRemoved(previous => [...previous, { entry, index }]);
    onChange(removeReviewEntry(entries, entry.id));
    if (expanded === entry.id) setExpanded(null);
    setAnnouncement(
      `${entry.criteria.name || "Untitled ICP"} removed from this draft. Your saved ICPs are unchanged.`
    );
  };
  const undo = () => {
    if (readOnly || entries.length >= ICP_REVIEW_LIMIT || !removed.length)
      return;
    const last = removed.at(-1)!;
    onChange(restoreReviewEntry(entries, last.entry, last.index));
    setRemoved(previous => previous.slice(0, -1));
    setAnnouncement(`${last.entry.criteria.name || "Untitled ICP"} restored.`);
  };
  const edit = <K extends keyof IcpCriteria>(
    entry: IcpReviewEntry,
    key: K,
    value: IcpCriteria[K]
  ) =>
    onChange(
      updateReviewEntry(entries, entry.id, {
        criteria: { ...entry.criteria, [key]: value },
      })
    );
  return (
    <section
      className="icp-review"
      aria-labelledby="onboarding-icps-heading"
      data-testid="icp-review"
    >
      <div className="icp-review__header">
        <div>
          <MonoLabel>03 / ideal customer profiles</MonoLabel>
          <h2 id="onboarding-icps-heading">
            Ideal customer profiles <span>(ICPs)</span>
          </h2>
        </div>
        <Button
          type="button"
          onClick={add}
          disabled={readOnly || entries.length >= ICP_REVIEW_LIMIT}
          className="icp-review__add"
        >
          <Plus size={16} aria-hidden="true" />
          Add ICP
        </Button>
      </div>
      <p className="icp-review__intro">
        An ICP describes the{" "}
        <strong>companies and decision-makers you want to reach.</strong> Your
        agents use these rules to find and qualify leads.
      </p>
      <div className="icp-review__toolbar">
        <span>
          <strong>{entries.length}</strong>{" "}
          {entries.length === 1 ? "draft ICP" : "draft ICPs"}{" "}
          <span aria-hidden="true">/</span> <strong>{selectedCount}</strong>{" "}
          selected to apply
        </span>
        <Link href="/app/icps">Manage saved ICPs ↗</Link>
      </div>
      {applied && (
        <p className="icp-review__notice">
          This company review has already been applied. Add or edit saved ICPs
          in <Link href="/app/icps">ICPs</Link>.
        </p>
      )}
      {Object.keys(errors).length > 0 && (
        <p className="icp-review__error" role="alert">
          Review the highlighted ICP fields before applying.
        </p>
      )}
      {removed.length > 0 && !readOnly && (
        <div className="icp-review__undo" role="status">
          <span>
            <strong>
              {removed.at(-1)?.entry.criteria.name || "Untitled ICP"}
            </strong>{" "}
            removed from this draft.
          </span>
          <button
            type="button"
            onClick={undo}
            disabled={entries.length >= ICP_REVIEW_LIMIT}
          >
            <Undo2 size={14} aria-hidden="true" />
            Undo removal
          </button>
        </div>
      )}
      {entries.length === 0 ? (
        <div className="icp-review__empty">
          <Target size={28} aria-hidden="true" />
          <h3>No ICPs in this review.</h3>
          <p>
            Add your first ideal customer profile, or apply just your company
            brand now and define ICPs later.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={add}
            disabled={readOnly}
          >
            <Plus size={15} />
            Add your first ICP
          </Button>
        </div>
      ) : (
        <div className="icp-review__list">
          {entries.map((entry, index) => {
            const criteria = entry.criteria;
            const open = expanded === entry.id;
            const rowErrors = errors[entry.id] ?? {};
            const invalid = Object.keys(rowErrors).length > 0;
            return (
              <article
                key={entry.id}
                className={`icp-review__card${open ? " is-open" : ""}${entry.selected ? " is-included" : " is-excluded"}${invalid ? " is-invalid" : ""}`}
                data-icp-id={entry.id}
                aria-label={`ICP ${index + 1}: ${criteria.name || "Untitled ICP"}`}
              >
                <div className="icp-review__card-top">
                  <span className="icp-review__index">
                    ICP {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="icp-review__origin">
                    {entry.origin === "manual"
                      ? "Added by you"
                      : entry.origin === "reviewed"
                        ? "Saved in this review"
                        : "Website suggestion"}
                  </span>
                  <button
                    type="button"
                    className="icp-review__remove"
                    disabled={readOnly}
                    onClick={() => remove(entry, index)}
                    aria-label={`Remove ICP ${index + 1}: ${criteria.name || "Untitled ICP"}`}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    Remove
                  </button>
                </div>
                <h3>{criteria.name || "Untitled ICP"}</h3>
                <p className="icp-review__summary">
                  {criteria.industries || "Set your target industries"}
                  {criteria.companySize ? ` · ${criteria.companySize}` : ""}
                  {criteria.geography ? ` · ${criteria.geography}` : ""}
                </p>
                <p className="icp-review__roles">
                  Decision-makers{" "}
                  <span>{criteria.roles || "Add the roles you sell to"}</span>
                </p>
                <div className="icp-review__card-actions">
                  <label className="icp-review__include">
                    <input
                      type="checkbox"
                      checked={entry.selected}
                      disabled={readOnly}
                      onChange={event =>
                        onChange(
                          updateReviewEntry(entries, entry.id, {
                            selected: event.target.checked,
                          })
                        )
                      }
                    />
                    Include this ICP
                  </label>
                  <button
                    type="button"
                    className="icp-review__edit"
                    onClick={() => setExpanded(open ? null : entry.id)}
                    aria-expanded={open}
                    aria-controls={`${entry.id}-criteria`}
                  >
                    {open
                      ? "Collapse criteria"
                      : readOnly
                        ? "View criteria"
                        : "Edit criteria"}
                    <ChevronDown
                      size={14}
                      className={open ? "rotate-180" : ""}
                      aria-hidden="true"
                    />
                  </button>
                </div>
                {invalid && !open && (
                  <p className="icp-review__row-error">
                    This selected ICP needs attention. Open its criteria to
                    review.
                  </p>
                )}
                {open && (
                  <div
                    id={`${entry.id}-criteria`}
                    className="icp-review__criteria"
                  >
                    <fieldset disabled={readOnly}>
                      <legend>
                        Targeting rules for {criteria.name || "this ICP"}
                      </legend>
                      <div className="icp-review__field-grid">
                        {fields.map(field => (
                          <div
                            key={field.key}
                            className={
                              field.key === "name"
                                ? "icp-review__full-field"
                                : ""
                            }
                          >
                            <label htmlFor={`${entry.id}-${field.key}`}>
                              {field.label}
                              {"required" in field && field.required ? (
                                <span> · required</span>
                              ) : null}
                            </label>
                            <input
                              id={`${entry.id}-${field.key}`}
                              value={criteria[field.key]}
                              maxLength={field.max}
                              placeholder={field.placeholder}
                              onChange={event =>
                                edit(entry, field.key, event.target.value)
                              }
                              aria-invalid={Boolean(rowErrors[field.key])}
                              aria-describedby={
                                rowErrors[field.key]
                                  ? `${entry.id}-${field.key}-error`
                                  : undefined
                              }
                            />
                            {rowErrors[field.key] && (
                              <p
                                id={`${entry.id}-${field.key}-error`}
                                className="icp-review__field-error"
                              >
                                {rowErrors[field.key]}
                              </p>
                            )}
                          </div>
                        ))}
                        <div>
                          <label htmlFor={`${entry.id}-minScore`}>
                            Minimum fit score <span> · 0–100</span>
                          </label>
                          <input
                            id={`${entry.id}-minScore`}
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={
                              Number.isFinite(criteria.minScore)
                                ? criteria.minScore
                                : ""
                            }
                            onChange={event =>
                              edit(
                                entry,
                                "minScore",
                                Number(event.target.value)
                              )
                            }
                            aria-invalid={Boolean(rowErrors.minScore)}
                            aria-describedby={
                              rowErrors.minScore
                                ? `${entry.id}-minScore-error`
                                : undefined
                            }
                          />
                          {rowErrors.minScore && (
                            <p
                              id={`${entry.id}-minScore-error`}
                              className="icp-review__field-error"
                            >
                              {rowErrors.minScore}
                            </p>
                          )}
                        </div>
                      </div>
                      {textFields.map(field => (
                        <div className="icp-review__text-field" key={field.key}>
                          <label htmlFor={`${entry.id}-${field.key}`}>
                            {field.label}
                            {"required" in field && field.required ? (
                              <span> · required</span>
                            ) : null}
                          </label>
                          <textarea
                            id={`${entry.id}-${field.key}`}
                            rows={3}
                            value={criteria[field.key]}
                            maxLength={2000}
                            placeholder={field.placeholder}
                            onChange={event =>
                              edit(entry, field.key, event.target.value)
                            }
                            aria-invalid={Boolean(rowErrors[field.key])}
                            aria-describedby={`${entry.id}-${field.key}-hint${rowErrors[field.key] ? ` ${entry.id}-${field.key}-error` : ""}`}
                          />
                          <p
                            id={`${entry.id}-${field.key}-hint`}
                            className="icp-review__hint"
                          >
                            {field.hint}
                          </p>
                          {rowErrors[field.key] && (
                            <p
                              id={`${entry.id}-${field.key}-error`}
                              className="icp-review__field-error"
                            >
                              {rowErrors[field.key]}
                            </p>
                          )}
                        </div>
                      ))}
                    </fieldset>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <div className="icp-review__footer">
        <p>
          Suggestions are starting points, not verified market facts.{" "}
          <strong>
            Removing here only removes a draft ICP—it never deletes a saved ICP.
          </strong>
        </p>
        <p className="icp-review__limit">
          {entries.length >= ICP_REVIEW_LIMIT
            ? "This review has reached its 20-ICP limit. You can add more later in ICPs."
            : "Add your own profiles or refine the suggestions before applying."}
        </p>
        {children}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
