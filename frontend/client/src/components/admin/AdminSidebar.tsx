import React from "react";
import {
  Database,
  FileText,
  Globe,
  LayoutDashboard,
  Palette,
  Users,
  Workflow,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getVisibleAdminSections, type AdminSectionId } from "@/config/adminNav";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Workflow,
  Database,
  Palette,
  Globe,
  FileText,
};

interface AdminSidebarProps {
  activeLeaf: string;
  activeTable?: string;
  onNavigate: (leafId: string, tableLink?: string) => void;
  collapsed?: boolean;
}

export function AdminSidebar({ activeLeaf, activeTable, onNavigate, collapsed = false }: AdminSidebarProps) {
  const visibleSections = getVisibleAdminSections();

  const [expandedSections, setExpandedSections] = React.useState<Set<AdminSectionId>>(() => {
    const initial = new Set<AdminSectionId>();
    for (const section of visibleSections) {
      if (section.leaves.some(l => l.id === activeLeaf)) {
        initial.add(section.id);
      }
    }
    if (initial.size === 0) initial.add(visibleSections[0]?.id ?? "dashboard");
    return initial;
  });

  const toggleSection = (sectionId: AdminSectionId) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-background",
        collapsed ? "w-12" : "w-56",
      )}
    >
      <nav className="flex-1 overflow-y-auto py-2">
        {visibleSections.map(section => {
          const Icon = ICON_MAP[section.icon] ?? FileText;
          const isExpanded = expandedSections.has(section.id);
          const hasActive = section.leaves.some(l =>
            l.id === activeLeaf && (!l.tableLink || l.tableLink === activeTable),
          );

          return (
            <div key={section.id}>
              <button
                onClick={() => toggleSection(section.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  hasActive && "text-primary",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{section.label}</span>
                    <ChevronRight
                      className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isExpanded && "rotate-90")}
                    />
                  </>
                )}
              </button>

              {!collapsed && isExpanded && (
                <div className="pb-1">
                  {section.leaves.map((leaf, idx) => {
                    const isActive =
                      leaf.id === activeLeaf &&
                      (!leaf.tableLink || leaf.tableLink === activeTable);
                    return (
                      <button
                        key={`${leaf.id}-${idx}`}
                        onClick={() => onNavigate(leaf.id, leaf.tableLink)}
                        className={cn(
                          "flex w-full items-center pl-9 pr-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                          isActive
                            ? "bg-accent text-accent-foreground font-medium"
                            : "text-muted-foreground",
                        )}
                      >
                        {leaf.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
