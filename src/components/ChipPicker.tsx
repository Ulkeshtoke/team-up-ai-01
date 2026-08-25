import { useState } from "react";
import { Plus, X } from "lucide-react";

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
};

export function ChipPicker({
  label,
  options,
  value,
  onChange,
  normalize = (raw) => raw.trim(),
  placeholder = "Add your own…",
  helpText,
}: ChipPickerProps) {
  const [draft, setDraft] = useState("");
  const selected = new Set(value.map((v) => v.toLowerCase()));

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

  const extras = value.filter((v) => !options.some((o) => o.toLowerCase() === v.toLowerCase()));

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {helpText ? <p className="text-xs text-muted-foreground">{helpText}</p> : null}
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <Badge
              key={item}
              className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => toggle(item)}
              role="button"
            >
              {item}
              <X className="h-3 w-3" aria-hidden />
              <span className="sr-only">Remove {item}</span>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Nothing selected yet.</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {options
          .filter((o) => !selected.has(o.toLowerCase()))
          .map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={cn(
                "rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground",
                "transition-colors hover:border-primary hover:text-primary",
              )}
            >
              {option}
            </button>
          ))}
      </div>

      {extras.length > 0 ? (
        <p className="text-xs text-muted-foreground">Custom: {extras.join(", ")}</p>
      ) : null}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDraft();
            }
          }}
          placeholder={placeholder}
          className="max-w-xs"
        />
        <Button type="button" variant="outline" size="icon" onClick={addDraft} aria-label="Add">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
