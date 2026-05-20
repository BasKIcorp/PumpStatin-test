import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ComponentDef {
  id: string; type: string;
  position: { x: number; y: number; w: number; h: number };
  props: Record<string, any>;
}

interface LayoutData {
  grid?: { columns?: number; gap?: number };
  components?: ComponentDef[];
  theme?: Record<string, any>;
}

/** Renders a page layout from JSON definition.
 *  Falls back to children (default layout) when no layout or empty. */
export function DynamicPageRenderer({ layout, searchParams, onSearch, onSelectPump, children }: {
  layout: LayoutData | null;
  searchParams: Record<string, any>;
  onSearch?: (values: any) => void;
  onSelectPump?: (id: number) => void;
  children: React.ReactNode;
}) {
  if (!layout?.components?.length) {
    return <>{children}</>;
  }

  const cols = layout.grid?.columns || 12;

  return (
    <div className="space-y-4" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {layout.theme?.title && (
        <h1 className="text-xl font-bold" style={{ color: layout.theme.primaryColor || "#000" }}>
          {layout.theme.title}
        </h1>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {layout.components.map(comp => (
          <ComponentRenderer
            key={comp.id}
            comp={comp}
            searchParams={searchParams}
            onSearch={onSearch}
            onSelectPump={onSelectPump}
          />
        ))}
      </div>
    </div>
  );
}

function ComponentRenderer({ comp, searchParams, onSearch, onSelectPump }: {
  comp: ComponentDef;
  searchParams: Record<string, any>;
  onSearch?: (values: any) => void;
  onSelectPump?: (id: number) => void;
}) {
  const style: React.CSSProperties = {};
  if (comp.position.w) style.gridColumn = `span ${Math.min(comp.position.w, 12)}`;

  switch (comp.type) {
    case "input_field":
      return (
        <div style={style} className="space-y-1">
          <Label>{comp.props.label || comp.props.fieldKey}</Label>
          <Input
            placeholder={comp.props.placeholder || "0"}
            defaultValue={searchParams[comp.props.fieldKey] || ""}
            onChange={e => { if (onSearch) searchParams[comp.props.fieldKey] = e.target.value; }}
          />
        </div>
      );

    case "select_dropdown":
      return (
        <div style={style} className="space-y-1">
          <Label>{comp.props.label}</Label>
          <Select defaultValue={searchParams[comp.props.fieldKey] as string || ""}>
            <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
            <SelectContent>
              {(comp.props.options as string[] || []).map((opt: string) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "checkbox_group":
      return (
        <div style={style} className="space-y-1">
          <Label>{comp.props.label}</Label>
          <div className="flex items-center gap-2">
            <Checkbox />
            <span className="text-sm">{comp.props.checkboxLabel || comp.props.label}</span>
          </div>
        </div>
      );

    case "action_button":
      return (
        <div style={style}>
          <Button onClick={() => onSearch?.(searchParams)} className="w-full">
            {comp.props.label || "Применить"}
          </Button>
        </div>
      );

    case "section_header":
      return (
        <div style={{ ...style, gridColumn: style.gridColumn || "1 / -1" }} className="font-bold text-lg border-b pb-1">
          {comp.props.label || "Раздел"}
        </div>
      );

    case "separator":
      return <div style={style} className="border-t my-2" />;

    case "html_block":
      return <div style={style} dangerouslySetInnerHTML={{ __html: comp.props.content || "" }} />;

    default:
      return <div style={style} className="text-xs text-muted-foreground p-2 border rounded">[{comp.type}] {comp.props.label}</div>;
  }
}
