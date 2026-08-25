import { useMemo, useState } from "react";
import { Check, Plus, Search, Tag, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChipPickerProps = {
  label: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  normalize?: (raw: string) => string;
  placeholder?: string;
  helpText?: string;
  maxDisplaySuggestions?: number;
};

export function ChipPicker({
  label,
  options,
  value,
  onChange,
  normalize = (raw) => raw.trim(),
  placeholder = "Type to search or add custom…",
  helpText,
  maxDisplaySuggestions = 24,
}: ChipPickerProps) {
  const [draft, setDraft] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const selected = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value]);

  const toggle = (raw: string) => {
    const item = normalize(raw);
    if (!item) return;
    if (selected.has(item.toLowerCase())) {
      onChange(value.filter((v) => v.toLowerCase() !== item.toLowerCase()));
    } else {
      onChange([...value, item]);
    }
  };

  const addDraft = () => {
    if (!draft.trim()) return;
    toggle(draft);
    setDraft("");
  };

  const filteredOptions = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    const list = options.filter((o) => !selected.has(o.toLowerCase()));
    if (!q) return list.slice(0, maxDisplaySuggestions);
    return list.filter((o) => o.toLowerCase().includes(q)).slice(0, maxDisplaySuggestions);
  }, [options, selected, filterQuery, maxDisplaySuggestions]);

  const extras = value.filter((v) => !options.some((o) => o.toLowerCase() === v.toLowerCase()));

  return (
    <div className="space-y-3.5 rounded-xl border border-border/80 bg-card/60 p-4 transition-all focus-within:border-primary/50 focus-within:bg-card">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <p className="text-sm font-semibold text-foreground tracking-tight">{label}</p>
            {value.length > 0 && (
              <Badge variant="secondary" className="px-2 py-0 text-[11px] font-medium h-5">
                {value.length} selected
              </Badge>
            )}
          </div>
          {helpText && <p className="mt-0.5 text-xs text-muted-foreground">{helpText}</p>}
        </div>
      </div>

      {/* Selected chips container */}
      <div className="min-h-[42px] rounded-lg border border-border/60 bg-muted/30 p-2.5">
        {value.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {value.map((item) => (
              <Badge
                key={item}
                className="group inline-flex items-center gap-1.5 bg-teal-700/90 text-white dark:bg-teal-600 hover:bg-teal-800 transition-colors pl-2.5 pr-1.5 py-1 text-xs font-medium cursor-pointer shadow-2xs"
                onClick={() => toggle(item)}
                role="button"
              >
                <span>{item}</span>
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
                  <X className="h-2.5 w-2.5" aria-hidden />
                </span>
                <span className="sr-only">Remove {item}</span>
              </Badge>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-2 text-xs text-muted-foreground/80 italic">
            No items selected yet. Click popular suggestions below or type a custom tag.
          </div>
        )}
      </div>

      {/* Search & Custom Input Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setFilterQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDraft();
              }
            }}
            placeholder={placeholder}
            className="pl-8 text-xs sm:text-sm h-9 bg-background"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addDraft}
          disabled={!draft.trim()}
          className="gap-1 px-3 text-xs font-medium h-9"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Tag
        </Button>
      </div>

      {/* Suggested Options Pill Grid */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Suggested Options
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 py-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={cn(
                  "group inline-flex items-center gap-1 rounded-md border border-border/80 bg-background px-2.5 py-1 text-xs text-muted-foreground",
                  "transition-all hover:border-teal-500/50 hover:bg-teal-50/50 hover:text-teal-900 dark:hover:bg-teal-950/40 dark:hover:text-teal-200 cursor-pointer shadow-2xs",
                )}
              >
                <Plus className="h-3 w-3 text-muted-foreground/60 group-hover:text-teal-600 transition-colors" />
                <span>{option}</span>
              </button>
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-1">
              No matching suggestions. Press "Add Tag" or hit Enter to add "<strong>{draft}</strong>
              " as a custom tag.
            </p>
          )}
        </div>
      </div>

      {extras.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border/40 pt-2">
          <span className="font-medium text-foreground">Custom items:</span>
          <span>{extras.join(", ")}</span>
        </div>
      )}
    </div>
  );
}
