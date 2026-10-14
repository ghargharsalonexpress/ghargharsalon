import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import {
  Avatar,
  Badge,
  type BookingStatus,
  type Column,
  DataTable,
  EmptyState,
  FaqList,
  FilterBar,
  Pagination,
  Picture,
  StatusPill,
  TabPanel,
  Tabs,
} from "@/design-system";
import { HERO_IMAGE, SITE_IMAGE_BASE } from "@/features/public/siteImages";
import { formatMoney } from "@/lib/format";
import { Grid, Row, Section, Specimen } from "../parts";

interface BookingRow {
  id: string;
  customer: string;
  service: string;
  area: string;
  status: BookingStatus;
  totalPaise: number;
  minutesAgo: number;
}

const ROWS: BookingRow[] = [
  { id: "BK-26100-0042", customer: "Neha Kapoor", service: "Korean glow facial", area: "Sector 15", status: "searching", totalPaise: 104_900, minutesAgo: 1 },
  { id: "BK-26100-0041", customer: "Ritu Malhotra", service: "Full arms wax", area: "Sector 21C", status: "accepted", totalPaise: 66_000, minutesAgo: 6 },
  { id: "BK-26100-0040", customer: "Aman Verma", service: "Haircut & beard", area: "NIT 3", status: "in_progress", totalPaise: 52_000, minutesAgo: 24 },
  { id: "BK-26100-0039", customer: "Sana Qureshi", service: "Swedish massage", area: "Sector 9", status: "completed", totalPaise: 98_100, minutesAgo: 75 },
  { id: "BK-26100-0038", customer: "Kavita Rao", service: "Party makeup", area: "Sector 31", status: "no_professional_found", totalPaise: 241_100, minutesAgo: 92 },
  { id: "BK-26100-0037", customer: "Pooja Bansal", service: "Manicure & pedicure", area: "Sector 16A", status: "cancelled", totalPaise: 89_900, minutesAgo: 130 },
];

type TabValue = "current" | "past";

export function DataDisplay() {
  const { t, i18n } = useTranslation("styleguide");
  const [tab, setTab] = useState<TabValue>("current");
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return ROWS.filter((row) => {
      const matches = !term || row.id.toLowerCase().includes(term) || row.customer.toLowerCase().includes(term);
      const active = ["searching", "accepted", "arrived", "in_progress"].includes(row.status);
      return matches && (!activeOnly || active);
    });
  }, [search, activeOnly]);

  const columns: Column<BookingRow>[] = [
    { id: "id", header: "Booking", priority: "primary", nowrap: true, cell: (row) => row.id, sortValue: (row) => row.id },
    { id: "customer", header: "Customer", priority: "secondary", cell: (row) => row.customer, sortValue: (row) => row.customer },
    { id: "service", header: "Service", priority: "secondary", cell: (row) => row.service },
    { id: "area", header: "Area", priority: "tertiary", cell: (row) => row.area },
    { id: "status", header: "Status", priority: "tertiary", cell: (row) => <StatusPill status={row.status} /> },
    {
      id: "total",
      header: "Total",
      priority: "secondary",
      align: "right",
      nowrap: true,
      cell: (row) => formatMoney(row.totalPaise, i18n.language),
      sortValue: (row) => row.totalPaise,
    },
  ];

  return (
    <Section
      id="data"
      title="Data display"
      description="Tabs for peer views, badges for status, and one table pattern that becomes a card list below 900px so nothing scrolls sideways."
      rules={[
        "Admin tables: sticky header, sortable columns, the whole row opens details, and a separate open button for keyboards.",
        "Admin lists use numbered pages; customer and professional history use a 'Load more' button (no infinite scroll).",
        "Filters live in the URL so a filtered view can be shared and survives a refresh.",
      ]}
    >
      <Grid min={300}>
        <Specimen label="Tabs">
          <Tabs<TabValue>
            idPrefix="bookings"
            label={t("data.bookings")}
            value={tab}
            onChange={setTab}
            items={[
              { value: "current", label: t("data.current"), count: 1 },
              { value: "past", label: t("data.past"), count: 12 },
            ]}
          />
          <TabPanel idPrefix="bookings" value="current" current={tab}>
            <Typography sx={{ mt: 4 }}>{t("data.currentBody")}</Typography>
          </TabPanel>
          <TabPanel idPrefix="bookings" value="past" current={tab}>
            <Typography sx={{ mt: 4 }}>{t("data.pastBody")}</Typography>
          </TabPanel>
        </Specimen>
        <Specimen label="Badges and avatars">
          <Box sx={{ display: "grid", gap: 4 }}>
            <Row>
              <Badge>Neutral</Badge>
              <Badge tone="info">Info</Badge>
              <Badge tone="accent">Accent</Badge>
              <Badge tone="success">Verified</Badge>
              <Badge tone="warning">Missing Hindi</Badge>
              <Badge tone="danger">Suspended</Badge>
            </Row>
            <Row>
              <Avatar name="Priya Sharma" size="lg" />
              <Avatar name="Aman Verma" />
              <Avatar name="Neha" size="sm" />
            </Row>
          </Box>
        </Specimen>
        <Specimen label="Photo (AVIF/WebP sizes) and the tile shown when there is none">
          <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: "1fr 1fr" }}>
            {/* Eager, so screenshots of this long page always include the photo. */}
            <Picture image={HERO_IMAGE} baseUrl={SITE_IMAGE_BASE} alt={t("data.pictureAlt")} sizes={240} ratio="4 / 3" priority />
            <Picture image={null} alt="" sizes={240} ratio="4 / 3" placeholder={t("data.pictureMissing")} />
          </Box>
        </Specimen>
        <Specimen label="Questions (accordion)">
          <FaqList
            items={[
              { question: t("data.faqQ1"), answer: t("data.faqA1") },
              { question: t("data.faqQ2"), answer: t("data.faqA2") },
            ]}
          />
        </Specimen>
      </Grid>

      <Specimen label="Filters, table and pagination (resize below 900px to see cards)">
        <Box sx={{ display: "grid", gap: 6 }}>
          <FilterBar
            searchLabel="Search booking ID or customer"
            search={search}
            onSearchChange={setSearch}
            chips={[{ id: "active", label: "Active only", selected: activeOnly }]}
            onToggleChip={() => setActiveOnly((value) => !value)}
            onClearAll={() => {
              setSearch("");
              setActiveOnly(false);
            }}
          />
          <DataTable<BookingRow>
            caption="Recent bookings"
            columns={columns}
            rows={rows}
            getRowId={(row) => row.id}
            rowLabel={(row) => `Open booking ${row.id}`}
            onRowClick={() => undefined}
            mobileAside={(row) => <StatusPill status={row.status} />}
            empty={
              <EmptyState
                headingLevel="h3"
                title={`No bookings match "${search}"`}
                description="Check the booking ID or clear the filters."
              />
            }
          />
          <Pagination page={page} pageSize={20} total={134} onChange={setPage} />
        </Box>
      </Specimen>
    </Section>
  );
}
