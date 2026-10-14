import ErrorOutlineOutlined from "@mui/icons-material/ErrorOutlineOutlined";
import ScheduleOutlined from "@mui/icons-material/ScheduleOutlined";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { AdminShell, type BookingStatus, Button, type Column, DataTable, PageHeader, StatusPill } from "@/design-system";
import { formatMoney } from "@/lib/format";
import { useAdminNav } from "./navigation";

interface Row {
  id: string;
  customer: string;
  service: string;
  status: BookingStatus;
  totalPaise: number;
}

const ROWS: Row[] = [
  { id: "BK-26100-0042", customer: "Neha Kapoor", service: "Korean glow facial", status: "searching", totalPaise: 104_900 },
  { id: "BK-26100-0041", customer: "Ritu Malhotra", service: "Full arms wax", status: "accepted", totalPaise: 66_000 },
  { id: "BK-26100-0040", customer: "Aman Verma", service: "Haircut & beard", status: "in_progress", totalPaise: 52_000 },
  { id: "BK-26100-0039", customer: "Sana Qureshi", service: "Swedish massage", status: "completed", totalPaise: 98_100 },
  { id: "BK-26100-0038", customer: "Kavita Rao", service: "Party makeup", status: "no_professional_found", totalPaise: 241_100 },
];

const KPIS = [
  { label: "Bookings today", value: "42", note: "8 more than last Monday" },
  { label: "Revenue today", value: formatMoney(4_821_000, "en"), note: "Taxes included" },
  { label: "Searching now", value: "2", note: "Oldest: 90 seconds" },
  { label: "Professionals online", value: "18", note: "6 on a job" },
] as const;

/** Admin is English-only (plan A3), so this sample uses plain strings rather than the samples namespace. */
export function AdminSample() {
  const { tokens } = useTheme();
  const nav = useAdminNav();
  const n = tokens.neutral;

  const columns: Column<Row>[] = [
    { id: "id", header: "Booking", priority: "primary", nowrap: true, cell: (row) => row.id, sortValue: (row) => row.id },
    { id: "customer", header: "Customer", priority: "secondary", cell: (row) => row.customer },
    { id: "service", header: "Service", priority: "tertiary", cell: (row) => row.service },
    { id: "status", header: "Status", priority: "tertiary", cell: (row) => <StatusPill status={row.status} /> },
    { id: "total", header: "Total", priority: "secondary", align: "right", nowrap: true, cell: (row) => formatMoney(row.totalPaise, "en"), sortValue: (row) => row.totalPaise },
  ];

  const alerts = [
    { icon: <ScheduleOutlined fontSize="small" />, tone: tokens.semantic.warning, title: "BK-26100-0042 searching for 90 s", body: "No one has accepted yet. Send a direct offer?" },
    { icon: <ErrorOutlineOutlined fontSize="small" />, tone: tokens.semantic.danger, title: "Refund failed for BK-26100-0031", body: "Razorpay returned an error. Retry the refund." },
  ];

  return (
    <AdminShell nav={nav} title="Dashboard" alerts={2} adminName="Rahul Mehta">
      <PageHeader title="Today" description="Monday, 5 October 2026 · Faridabad" actions={<Button variant="secondary">Export CSV</Button>} />

      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 4, gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" } }}>
        {KPIS.map((kpi) => (
          <Box component="li" key={kpi.label} sx={{ p: 5, bgcolor: n[0], border: `1px solid ${n[200]}`, borderRadius: `${tokens.radius.md}px` }}>
            <Typography variant="label" component="p" sx={{ m: 0, color: "text.secondary" }}>
              {kpi.label}
            </Typography>
            <Typography variant="numericXl" component="p" sx={{ m: 0, mt: 2 }}>
              {kpi.value}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
              {kpi.note}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Alerts sit above the table at every width, so the table always gets the full row. */}
      <Box component="section" aria-labelledby="alerts-title" sx={{ mt: 10 }}>
        <Typography id="alerts-title" variant="h2" sx={{ mb: 4 }}>
          Needs attention
        </Typography>
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          {alerts.map((alert) => (
            <Box component="li" key={alert.title} sx={{ display: "flex", gap: 3, p: 4, bgcolor: n[0], border: `1px solid ${n[200]}`, borderRadius: `${tokens.radius.md}px` }}>
              <Box aria-hidden sx={{ color: alert.tone.strong, pt: 0.5, display: "inline-flex" }}>
                {alert.icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>{alert.title}</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
                  {alert.body}
                </Typography>
                <Button variant="tertiary" size="sm" sx={{ mt: 2, ml: -3 }}>
                  Open booking
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <Box component="section" aria-labelledby="recent-title" sx={{ mt: 10 }}>
        <Typography id="recent-title" variant="h2" sx={{ mb: 4 }}>
          Recent bookings
        </Typography>
        <DataTable<Row>
          caption="Recent bookings"
          columns={columns}
          rows={ROWS}
          getRowId={(row) => row.id}
          rowLabel={(row) => `Open booking ${row.id}`}
          onRowClick={() => undefined}
          mobileAside={(row) => <StatusPill status={row.status} />}
        />
      </Box>
    </AdminShell>
  );
}
