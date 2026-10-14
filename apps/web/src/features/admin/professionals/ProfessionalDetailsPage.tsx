import { type ReactNode, useState } from "react";
import { formatIndianMobile, SKILL_LABELS } from "@brand/shared";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Avatar, Badge, Button, ConfirmDialog, EmptyState, InlineAlert, Link, PageHeader, TextField, useToast } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { formatRelativeFromNow } from "@/lib/format";
import { adminProfessionalQuery, useAdminTestAlert, useProfessionalStatus } from "./api";
import { PerformanceSection } from "./PerformanceSection";
import { PresenceBadge } from "./PresenceBadge";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography component="dd" sx={{ m: 0, mt: 0.5 }}>
        {children}
      </Typography>
    </Box>
  );
}

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null);

/** /admin/professionals/:id (plan Phase 4, W15): presence, alerts, account and the actions on them. */
export function ProfessionalDetailsPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  const toast = useToast();
  const professional = useQuery({ ...adminProfessionalQuery(id), refetchInterval: 15_000 });
  const status = useProfessionalStatus(id);
  const testAlert = useAdminTestAlert(id);
  const [confirm, setConfirm] = useState<"suspend" | "reactivate" | null>(null);
  const [reason, setReason] = useState("");
  usePageMeta(professional.data?.name ?? t("professionals.title"));

  if (professional.isError) {
    return <EmptyState headingLevel="h1" title={t("proEditor.notFoundTitle")} description={errorText(t, professional.error)} action={<Button to="/admin/professionals">{t("proEditor.backToList")}</Button>} />;
  }
  const p = professional.data;
  if (!p) {
    return (
      <Box aria-busy sx={{ display: "grid", gap: 4 }}>
        <Skeleton width={280} height={40} />
        <Skeleton variant="rounded" height={200} />
      </Box>
    );
  }

  const card = { bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, p: { xs: 4, md: 6 } } as const;

  const suspended = p.status === "suspended";
  return (
    <>
      <PageHeader
        breadcrumb={
          <Link to="/admin/professionals" standalone>
            {t("proEditor.backToList")}
          </Link>
        }
        title={
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <Avatar name={p.name} />
            {p.name}
          </Box>
        }
        description={
          <Box component="span" sx={{ display: "inline-flex", gap: 1, flexWrap: "wrap" }}>
            <PresenceBadge presence={p.presence} />
            {suspended ? <Badge tone="danger">{t("professionals.suspended")}</Badge> : p.verifiedAt ? <Badge tone="success">{t("professionals.verified")}</Badge> : <Badge tone="warning">{t("professionals.unverified")}</Badge>}
          </Box>
        }
        actions={
          <>
            <Button variant="secondary" to={`/admin/professionals/${p.id}/edit`}>
              {t("details.edit")}
            </Button>
            <Button variant={suspended ? "secondary" : "danger"} onClick={() => setConfirm(suspended ? "reactivate" : "suspend")}>
              {suspended ? t("details.reactivate") : t("details.suspend")}
            </Button>
          </>
        }
      />
      <Box sx={{ display: { xs: "flex", md: "none" }, gap: 2, mb: 6, flexWrap: "wrap" }}>
        <Button variant="secondary" to={`/admin/professionals/${p.id}/edit`}>
          {t("details.edit")}
        </Button>
        <Button variant={suspended ? "secondary" : "danger"} onClick={() => setConfirm(suspended ? "reactivate" : "suspend")}>
          {suspended ? t("details.reactivate") : t("details.suspend")}
        </Button>
      </Box>

      <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, alignItems: "start" }}>
        <Box component="section" aria-labelledby="presence-title" sx={card}>
          <Typography id="presence-title" variant="h2" sx={{ typography: "h3", mb: 4 }}>
            {t("details.presence")}
          </Typography>
          <Box component="dl" sx={{ m: 0, display: "grid", gap: 3 }}>
            <Field label={t("details.state")}>
              <PresenceBadge presence={p.presence} />
            </Field>
            <Field label={t("details.lastSeen")}>{p.presence.lastHeartbeatAt ? `${formatRelativeFromNow(new Date(p.presence.lastHeartbeatAt), "en")} · ${when(p.presence.lastHeartbeatAt) ?? ""}` : t("details.never")}</Field>
            <Field label={t("details.locationAt")}>{when(p.presence.locationAt) ?? t("details.never")}</Field>
          </Box>
        </Box>

        <Box component="section" aria-labelledby="alerts-title" sx={card}>
          <Typography id="alerts-title" variant="h2" sx={{ typography: "h3", mb: 4 }}>
            {t("details.alerts")}
          </Typography>
          <Box component="dl" sx={{ m: 0, display: "grid", gap: 3 }}>
            <Field label={t("details.devices")}>{p.devices === 0 ? t("details.noDevices") : t("details.deviceCount", { count: p.devices })}</Field>
            <Field label={t("details.lastAlert")}>{when(p.lastAlertAt) ?? t("details.never")}</Field>
          </Box>
          {testAlert.isError && (
            <Box sx={{ mt: 4 }}>
              <InlineAlert tone="danger">{errorText(t, testAlert.error)}</InlineAlert>
            </Box>
          )}
          <Button
            variant="secondary"
            sx={{ mt: 5 }}
            disabled={p.devices === 0}
            loading={testAlert.isPending}
            onClick={() =>
              testAlert.mutate(undefined, {
                onSuccess: (result) => toast(result.sent > 0 ? t("details.testSent", { count: result.sent }) : t("details.testNone")),
              })
            }
          >
            {t("details.sendTest")}
          </Button>
        </Box>

        <Box component="section" aria-labelledby="profile-title" sx={card}>
          <Typography id="profile-title" variant="h2" sx={{ typography: "h3", mb: 4 }}>
            {t("details.profile")}
          </Typography>
          <Box component="dl" sx={{ m: 0, display: "grid", gap: 3 }}>
            <Field label={t("proEditor.phone")}>
              <Link href={`tel:+91${p.phone}`}>+91 {formatIndianMobile(p.phone)}</Link>
            </Field>
            <Field label={t("proEditor.email")}>{p.email ? <Link href={`mailto:${p.email}`}>{p.email}</Link> : "—"}</Field>
            <Field label={t("proEditor.skills")}>{p.skills.map((skill) => SKILL_LABELS[skill].en).join("; ")}</Field>
            <Field label={t("proEditor.baseArea")}>{t("details.areaValue", { area: p.baseArea, count: p.travelRadiusKm })}</Field>
            <Field label={t("proEditor.verification")}>{p.verifiedAt ? t("proEditor.verifiedBy", { name: p.verifiedBy ?? "", date: when(p.verifiedAt) ?? "" }) : t("professionals.unverified")}</Field>
            {p.verificationNote && <Field label={t("proEditor.note")}>{p.verificationNote}</Field>}
          </Box>
        </Box>

        <Box component="section" aria-labelledby="account-title" sx={card}>
          <Typography id="account-title" variant="h2" sx={{ typography: "h3", mb: 4 }}>
            {t("details.account")}
          </Typography>
          <Box component="dl" sx={{ m: 0, display: "grid", gap: 3 }}>
            <Field label={t("details.login")}>{t("details.loginHow", { phone: formatIndianMobile(p.phone) })}</Field>
            <Field label={t("details.lastLogin")}>{when(p.lastLoginAt) ?? t("details.neverLoggedIn")}</Field>
            <Field label={t("details.added")}>{when(p.createdAt)}</Field>
          </Box>
        </Box>
        <PerformanceSection professionalId={p.id} name={p.name} />
      </Box>

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          status.mutate(
            { status: confirm === "suspend" ? "suspended" : "active", reason },
            {
              onSuccess: () => {
                toast(confirm === "suspend" ? t("details.suspended", { name: p.name }) : t("details.reactivated", { name: p.name }));
                setConfirm(null);
                setReason("");
              },
            },
          )
        }
        loading={status.isPending}
        tone={confirm === "suspend" ? "danger" : "primary"}
        title={confirm === "suspend" ? t("details.suspendTitle", { name: p.name }) : t("details.reactivateTitle", { name: p.name })}
        consequence={confirm === "suspend" ? t("details.suspendBody") : t("details.reactivateBody")}
        confirmLabel={confirm === "suspend" ? t("details.suspend") : t("details.reactivate")}
      >
        {status.isError && (
          <Box sx={{ mb: 4 }}>
            <InlineAlert tone="danger">{errorText(t, status.error)}</InlineAlert>
          </Box>
        )}
        {confirm === "suspend" && <TextField label={t("details.reason")} optional value={reason} onChange={(event) => setReason(event.target.value)} />}
      </ConfirmDialog>
    </>
  );
}
