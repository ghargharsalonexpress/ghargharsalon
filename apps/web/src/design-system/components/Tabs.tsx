import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import MuiTab from "@mui/material/Tab";
import MuiTabs from "@mui/material/Tabs";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional count shown after the label (e.g. "Current 2"). */
  count?: number;
}

export interface TabsProps<T extends string> {
  /** Prefix for tab/panel ids so each tab controls its panel (aria-controls). */
  idPrefix: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  items: ReadonlyArray<TabItem<T>>;
}

/** Peer views inside one page (never page navigation). Scrolls horizontally on small screens. */
export function Tabs<T extends string>({ idPrefix, label, value, onChange, items }: TabsProps<T>) {
  return (
    <MuiTabs
      aria-label={label}
      value={value}
      onChange={(_, next: T) => onChange(next)}
      variant="scrollable"
      scrollButtons={false}
    >
      {items.map((item) => (
        <MuiTab
          key={item.value}
          value={item.value}
          id={`${idPrefix}-tab-${item.value}`}
          aria-controls={`${idPrefix}-panel-${item.value}`}
          label={
            <Box component="span" sx={{ display: "inline-flex", gap: 1.5, alignItems: "baseline" }}>
              {item.label}
              {item.count !== undefined && (
                <Box component="span" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                  {item.count}
                </Box>
              )}
            </Box>
          }
        />
      ))}
    </MuiTabs>
  );
}

export function TabPanel<T extends string>({ idPrefix, value, current, children }: { idPrefix: string; value: T; current: T; children: ReactNode }) {
  const active = value === current;
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${value}`} aria-labelledby={`${idPrefix}-tab-${value}`} hidden={!active}>
      {active && children}
    </div>
  );
}
