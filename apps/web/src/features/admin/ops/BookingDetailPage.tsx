import { useState } from "react";
import { type AdminBookingDetailDto, type AdminEligibleProDto, formatIndianMobile, pick } from "@brand/shared";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Badge, Button, ConfirmDialog, EmptyState, InlineAlert, Link, PageHeader, PriceSummary, RadioCards, StatusPill, TextField, useToast } from "@/design-system";
import { addressLine } from "@/features/booking/text";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";
import { formatDistance } from "@/lib/format";
import { adminBookingQuery, eligibleQuery, useBookingActions, useResolveAlert, useRetryRefund } from "./api";
import { clock, rupees, rupeesExact, when } from "./format";
import { AlertList, Field, Section } from "./parts";

type Dialog = null | "offer" | "reassign" | "cancel" | "refund" | "unlock";

const FINAL = new Set(["completed", "cancelled", "no_professional_found", "expired"]);
const toPaise = (value: string) => {
  const amount = Number(value.replace(/[,₹\s]/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : Number.NaN;
};

/**
 * /admin/bookings/:id (plan Phase 8, W14): the booking's whole story (timeline, offers,
 * payments, refunds, notes) and what the team can do about it. Every action is audited.
 */
export function BookingDetailPage() {
  const { id = "" } = useParams();
  const { t } = useTranslation("admin");
  const toast = useToast();
  const detail = useQuery(adminBookingQuery(id));
  const actions = useBookingActions(id);
  const resolve = useResolveAlert();
  const retry = useRetryRefund();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [note, setNote] = useState("");
  usePageMeta(detail.data ? detail.data.booking.number : t("bookings.title"));

  if (detail.isError && !detail.data) {
    return <EmptyState headingLevel="h1" title={t("booking.notFoundTitle")} description={errorText(t, detail.error)} action={<Button to="/admin/bookings">{t("booking.backToList")}</Button>} />;
  }
  const d = detail.data;
  if (!d) {
    return (
      <Box aria-busy sx={{ display: "grid", gap: 4 }}>
        <Skeleton width={280} height={40} />
        <Skeleton variant="rounded" height={240} />
      </Box>
    );
  }

  const b = d.booking;
  const status = b.status;
  const openAlerts = d.alerts.filter((alert) => !alert.resolvedAt);
  const canOffer = status === "searching";
  const canReassign = status === "accepted" || status === "arrived";
  const canCancel = !FINAL.has(status);
  const canRefund = FINAL.has(status) && d.refundablePaise > 0;
  const codeLocked = status === "arrived" && d.otp?.locked === true;

  const buttons = (
    <>
      {canOffer && <Button onClick={() => setDialog("offer")}>{t("booking.offer")}</Button>}
      {codeLocked && <Button onClick={() => setDialog("unlock")}>{t("booking.unlockCode")}</Button>}
      {canReassign && (
        <Button variant="secondary" onClick={() => setDialog("reassign")}>
          {t("booking.reassign")}
        </Button>
      )}
      {canRefund && (
        <Button variant="secondary" onClick={() => setDialog("refund")}>
          {t("booking.refund")}
        </Button>
      )}
      {canCancel && (
        <Button variant="danger" onClick={() => setDialog("cancel")}>
          {t("booking.cancel")}
        </Button>
      )}
    </>
  );

  const addNote = () => {
    const text = note.trim();
    if (text.length < 2) return;
    actions.note.mutate(text, {
      onSuccess: () => {
        setNote("");
        toast(t("booking.noteSaved"));
      },
    });
  };

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link to="/admin/bookings" standalone>
            {t("booking.backToList")}
          </Link>
        }
        title={
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
            {b.number}
            <StatusPill status={status} />
          </Box>
        }
        description={t("booking.created", { time: when(b.createdAt) })}
        actions={buttons}
      />
      <Box sx={{ display: { xs: "flex", md: "none" }, gap: 2, mb: 6, flexWrap: "wrap" }}>{buttons}</Box>

      {openAlerts.length > 0 && (
        <Box sx={{ mb: 6 }}>
          <Section id="booking-alerts" title={t("booking.alerts")}>
            <AlertList alerts={openAlerts} resolvingId={resolve.isPending ? resolve.variables : null} onResolve={(alert) => resolve.mutate(alert.id, { onSuccess: () => toast(t("alerts.resolvedToast")) })} />
          </Section>
        </Box>
      )}

      <Box sx={{ display: "grid", gap: 6, gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 3fr) minmax(0, 2fr)" }, alignItems: "start" }}>
        <Box sx={{ display: "grid", gap: 6, minWidth: 0 }}>
          <Section id="summary-title" title={t("booking.summary")}>
            <Box component="dl" sx={{ m: 0, display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
              <Field label={t("booking.customer")}>
                <Link to={`/admin/customers/${d.customer.id}`}>{d.customer.name}</Link>
                <Box component="span" sx={{ display: "block", color: "text.secondary" }}>
                  <Link href={`tel:+91${d.customer.phone}`}>+91 {formatIndianMobile(d.customer.phone)}</Link>
                  {d.customer.email ? ` · ${d.customer.email}` : null}
                </Box>
                {d.customer.status === "blocked" && <Badge tone="danger">{t("customers.blocked")}</Badge>}
              </Field>
              <Field label={t("booking.professional")}>
                {b.professional ? (
                  <>
                    <Link to={`/admin/professionals/${b.professional.id}`}>{b.professional.name}</Link>
                    {b.professional.phone && (
                      <Box component="span" sx={{ display: "block" }}>
                        <Link href={`tel:+91${b.professional.phone}`}>+91 {formatIndianMobile(b.professional.phone)}</Link>
                      </Box>
                    )}
                  </>
                ) : (
                  t("booking.noProfessional")
                )}
              </Field>
              <Field label={t("booking.address")}>
                {addressLine(b.address)}
                {b.address.landmark ? ` · ${t("booking.near", { landmark: b.address.landmark })}` : ""}
              </Field>
              <Field label={t("booking.preference")}>{t(`booking.preferences.${b.preference}`)}</Field>
              {b.note && <Field label={t("booking.note")}>{b.note}</Field>}
              {b.eta && <Field label={t("booking.eta")}>{t("booking.etaValue", { min: b.eta.minMinutes, max: b.eta.maxMinutes, time: when(b.eta.at) })}</Field>}
              {b.cancellation && (
                <Field label={t("booking.cancellation")}>
                  {t("booking.cancellationValue", { by: b.cancellation.by, reason: b.cancellation.reason, fee: rupees(b.cancellation.feePaise) })}
                </Field>
              )}
              {b.review && (
                <Field label={t("booking.review")}>
                  {t("booking.reviewValue", { rating: b.review.rating, count: b.review.rating })} {b.review.comment && `· “${b.review.comment}”`}
                </Field>
              )}
            </Box>
            <Box sx={{ mt: 6 }}>
              <PriceSummary
                lines={b.items.map((item) => ({ id: `${item.serviceSlug}:${item.tierId}`, label: item.tierCount > 1 ? `${pick(item.name, "en")} · ${pick(item.tierLabel, "en")}` : pick(item.name, "en"), amountPaise: item.linePaise, quantity: item.quantity }))}
                platformFeePaise={b.pricing.platformFeePaise}
                totalPaise={b.pricing.totalPaise}
                note={t("booking.gstNote", { gst: rupeesExact(b.pricing.gstPaise) })}
              />
            </Box>
            {b.invoiceNumber && (
              <Box sx={{ mt: 4 }}>
                <Link to={`/bookings/${b.id}/invoice`}>{t("booking.invoice", { number: b.invoiceNumber })}</Link>
              </Box>
            )}
          </Section>

          <Section id="timeline-title" title={t("booking.timeline")}>
            <Timeline detail={d} />
          </Section>

          <Section id="offers-title" title={t("booking.offers", { count: d.offers.length })}>
            {d.offers.length === 0 ? (
              <Typography sx={{ color: "text.secondary" }}>{t("booking.noOffers")}</Typography>
            ) : (
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 3 }}>
                {d.offers.map((offer) => (
                  <Box component="li" key={offer.id} sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 3, alignItems: "center" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Link to={`/admin/professionals/${offer.professionalId}`}>{offer.professionalName}</Link>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {[offer.round === 0 ? t("booking.directRound") : t("booking.round", { round: offer.round }), formatDistance(offer.distanceMeters, "en"), clock(offer.sentAt), offer.pushSent > 0 ? t("booking.pushSent") : t("booking.noPush")].join(" · ")}
                        {offer.declineReason ? ` · ${t(`booking.declineReasons.${offer.declineReason}`, { defaultValue: offer.declineReason })}` : ""}
                      </Typography>
                    </Box>
                    <Badge tone={offer.status === "accepted" ? "success" : offer.status === "pending" ? "info" : "neutral"}>{t(`booking.offerStatus.${offer.status}`)}</Badge>
                  </Box>
                ))}
              </Box>
            )}
          </Section>
        </Box>

        <Box sx={{ display: "grid", gap: 6, minWidth: 0 }}>
          <Section id="money-title" title={t("booking.money")}>
            <Box sx={{ display: "grid", gap: 4 }}>
              {d.payments.length === 0 && <Typography sx={{ color: "text.secondary" }}>{t("booking.noPayments")}</Typography>}
              {d.payments.map((payment) => (
                <Box key={payment.orderId}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 600 }}>{t("booking.payment", { amount: rupeesExact(payment.amountPaise) })}</Typography>
                    <Badge tone={payment.status === "captured" ? "success" : payment.status === "failed" ? "danger" : payment.status === "refunded" ? "warning" : "neutral"}>{t(`money.paymentStatus.${payment.status}`, { defaultValue: payment.status })}</Badge>
                  </Box>
                  <Typography variant="body2" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>
                    {[payment.method?.toUpperCase(), payment.paymentId ?? payment.orderId, when(payment.capturedAt ?? payment.createdAt)].filter(Boolean).join(" · ")}
                  </Typography>
                </Box>
              ))}
              {d.refunds.map((refund) => (
                <Box key={refund.id}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
                    <Typography sx={{ fontWeight: 600 }}>{t("booking.refundLine", { amount: rupeesExact(refund.amountPaise) })}</Typography>
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <Badge tone={refund.status === "processed" ? "success" : refund.status === "failed" ? "danger" : "warning"}>{t(`money.refundStatus.${refund.status}`)}</Badge>
                      {refund.status === "failed" && (
                        <Button variant="secondary" size="sm" loading={retry.isPending && retry.variables === refund.id} onClick={() => retry.mutate(refund.id, { onSuccess: () => toast(t("money.retried")) })}>
                          {t("money.retry")}
                        </Button>
                      )}
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ color: "text.secondary", overflowWrap: "anywhere" }}>
                    {[refund.reason.replace(/^admin:\d+:/, ""), t(`money.by.${refund.initiatedBy}`, { defaultValue: refund.initiatedBy }), when(refund.processedAt ?? refund.createdAt), refund.lastError].filter(Boolean).join(" · ")}
                  </Typography>
                </Box>
              ))}
              {retry.isError && <InlineAlert tone="danger">{errorText(t, retry.error)}</InlineAlert>}
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("booking.refundable", { amount: rupeesExact(d.refundablePaise) })}
              </Typography>
            </Box>
          </Section>

          <Section id="notes-title" title={t("booking.notes")}>
            <Box sx={{ display: "grid", gap: 4 }}>
              {d.notes.length === 0 ? (
                <Typography sx={{ color: "text.secondary" }}>{t("booking.noNotes")}</Typography>
              ) : (
                <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 3 }}>
                  {[...d.notes].reverse().map((item, index) => (
                    <li key={`${item.at}-${index}`}>
                      <Typography sx={{ whiteSpace: "pre-line" }}>{item.text}</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {item.byName} · {when(item.at)}
                      </Typography>
                    </li>
                  ))}
                </Box>
              )}
              <TextField label={t("booking.addNote")} hint={t("booking.noteHint")} multiline minRows={2} value={note} onChange={(event) => setNote(event.target.value.slice(0, 1000))} name="note" />
              {actions.note.isError && <InlineAlert tone="danger">{errorText(t, actions.note.error)}</InlineAlert>}
              <Box>
                <Button variant="secondary" onClick={addNote} loading={actions.note.isPending} disabled={note.trim().length < 2}>
                  {t("booking.saveNote")}
                </Button>
              </Box>
            </Box>
          </Section>
        </Box>
      </Box>

      {dialog === "offer" && <DirectOfferDialog bookingId={id} onClose={() => setDialog(null)} />}
      {dialog === "reassign" && (
        <ConfirmDialog
          open
          onClose={() => setDialog(null)}
          onConfirm={() =>
            actions.reassign.mutate(undefined, {
              onSuccess: () => {
                toast(t("booking.reassigned"));
                setDialog(null);
              },
            })
          }
          title={t("booking.reassignTitle")}
          consequence={t("booking.reassignBody", { name: b.professional?.name ?? t("booking.theProfessional") })}
          confirmLabel={t("booking.reassign")}
          tone="primary"
          loading={actions.reassign.isPending}
        >
          {actions.reassign.isError ? <InlineAlert tone="danger">{errorText(t, actions.reassign.error)}</InlineAlert> : null}
        </ConfirmDialog>
      )}
      {dialog === "unlock" && (
        <ConfirmDialog
          open
          onClose={() => setDialog(null)}
          onConfirm={() =>
            actions.unlockCode.mutate(undefined, {
              onSuccess: () => {
                toast(t("booking.unlocked"));
                setDialog(null);
              },
            })
          }
          title={t("booking.unlockTitle")}
          consequence={t("booking.unlockBody", { name: b.professional?.name ?? t("booking.theProfessional") })}
          confirmLabel={t("booking.unlockCode")}
          tone="primary"
          loading={actions.unlockCode.isPending}
        >
          {actions.unlockCode.isError ? <InlineAlert tone="danger">{errorText(t, actions.unlockCode.error)}</InlineAlert> : null}
        </ConfirmDialog>
      )}
      {dialog === "cancel" && <CancelDialog detail={d} onClose={() => setDialog(null)} />}
      {dialog === "refund" && <RefundDialog detail={d} onClose={() => setDialog(null)} />}
    </>
  );
}

/** Every state change with when and by whom. */
function Timeline({ detail }: { detail: AdminBookingDetailDto }) {
  const { t } = useTranslation("admin");
  const { tokens } = useTheme();
  return (
    <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
      {detail.history.map((entry, index) => (
        <Box component="li" key={`${entry.status}-${entry.at}-${index}`} sx={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)", gap: 3, py: 2, borderTop: index === 0 ? 0 : `1px solid ${tokens.neutral[100]}` }}>
          <Typography variant="body2" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums", minWidth: 96 }}>
            {clock(entry.at)}
          </Typography>
          <Box>
            <StatusPill status={entry.status} />
            <Typography variant="caption" component="span" sx={{ ml: 2, color: "text.secondary" }}>
              {t(`booking.by.${entry.by}`, { defaultValue: entry.by })}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

/** Plan W14: the nearest eligible professionals, then one direct offer. */
function DirectOfferDialog({ bookingId, onClose }: { bookingId: string; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const eligible = useQuery(eligibleQuery(bookingId, true));
  const actions = useBookingActions(bookingId);
  const [chosen, setChosen] = useState<string | null>(null);
  const rows: AdminEligibleProDto[] = eligible.data ?? [];

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={() => {
        if (!chosen) return;
        const name = rows.find((row) => row.id === chosen)?.name ?? "";
        actions.offer.mutate(chosen, {
          onSuccess: () => {
            toast(t("booking.offerSent", { name }));
            onClose();
          },
        });
      }}
      title={t("booking.offerTitle")}
      consequence={t("booking.offerBody")}
      confirmLabel={t("booking.sendOffer")}
      tone="primary"
      loading={actions.offer.isPending}
    >
      {eligible.isPending ? (
        <Skeleton variant="rounded" height={120} />
      ) : rows.length === 0 ? (
        <InlineAlert tone="warning">{t("booking.noneEligible")}</InlineAlert>
      ) : (
        <RadioCards<string>
          legend={t("booking.chooseProfessional")}
          name="direct-offer"
          value={chosen}
          onChange={setChosen}
          options={rows.map((row) => ({
            value: row.id,
            label: row.name,
            description: t("booking.eligibleLine", { rating: row.rating ?? "—", count: row.jobsToday }),
            aside: formatDistance(row.distanceMeters, "en"),
          }))}
        />
      )}
      {actions.offer.isError ? (
        <Box sx={{ mt: 3 }}>
          <InlineAlert tone="danger">{errorText(t, actions.offer.error)}</InlineAlert>
        </Box>
      ) : null}
    </ConfirmDialog>
  );
}

/** Cancel with the refund the team chooses (plan W14); the consequence is spelled out first. */
function CancelDialog({ detail, onClose }: { detail: AdminBookingDetailDto; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const actions = useBookingActions(detail.booking.id);
  const [reason, setReason] = useState("");
  const [fee, setFee] = useState("0");
  const [problem, setProblem] = useState<string | null>(null);
  const paid = detail.refundablePaise;
  const feePaise = toPaise(fee);
  const refundPaise = Number.isNaN(feePaise) ? paid : Math.max(0, paid - Math.min(feePaise, paid));

  const confirm = () => {
    if (reason.trim().length < 3) return setProblem(t("booking.reasonNeeded"));
    if (Number.isNaN(feePaise) || feePaise > paid) return setProblem(t("booking.feeInvalid", { max: rupeesExact(paid) }));
    setProblem(null);
    actions.cancel.mutate(
      { reason: reason.trim(), feePaise },
      {
        onSuccess: () => {
          toast(t("booking.cancelled"));
          onClose();
        },
      },
    );
  };

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={confirm}
      title={t("booking.cancelTitle", { number: detail.booking.number })}
      consequence={paid > 0 ? t("booking.cancelBody", { refund: rupeesExact(refundPaise) }) : t("booking.cancelBodyUnpaid")}
      confirmLabel={t("booking.cancel")}
      cancelLabel={t("booking.keep")}
      loading={actions.cancel.isPending}
    >
      <Box sx={{ display: "grid", gap: 4 }}>
        <TextField label={t("booking.reason")} hint={t("booking.reasonHint")} value={reason} onChange={(event) => setReason(event.target.value.slice(0, 300))} name="reason" />
        {paid > 0 && <TextField label={t("booking.fee")} hint={t("booking.feeHint", { paid: rupeesExact(paid) })} inputMode="decimal" value={fee} onChange={(event) => setFee(event.target.value)} name="fee" />}
        {problem && <InlineAlert tone="danger">{problem}</InlineAlert>}
        {actions.cancel.isError ? <InlineAlert tone="danger">{errorText(t, actions.cancel.error)}</InlineAlert> : null}
      </Box>
    </ConfirmDialog>
  );
}

/** A manual refund up to what's left (plan Phase 8). */
function RefundDialog({ detail, onClose }: { detail: AdminBookingDetailDto; onClose: () => void }) {
  const { t } = useTranslation("admin");
  const toast = useToast();
  const actions = useBookingActions(detail.booking.id);
  const [amount, setAmount] = useState(String(detail.refundablePaise / 100));
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const amountPaise = toPaise(amount);

  const confirm = () => {
    if (Number.isNaN(amountPaise) || amountPaise < 100 || amountPaise > detail.refundablePaise) return setProblem(t("booking.amountInvalid", { max: rupeesExact(detail.refundablePaise) }));
    if (reason.trim().length < 3) return setProblem(t("booking.reasonNeeded"));
    setProblem(null);
    actions.refund.mutate(
      { amountPaise, reason: reason.trim() },
      {
        onSuccess: () => {
          toast(t("booking.refundStarted"));
          onClose();
        },
      },
    );
  };

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={confirm}
      title={t("booking.refundTitle", { number: detail.booking.number })}
      consequence={t("booking.refundBody", { amount: Number.isNaN(amountPaise) ? "—" : rupeesExact(amountPaise) })}
      confirmLabel={t("booking.refund")}
      cancelLabel={t("booking.keep")}
      loading={actions.refund.isPending}
    >
      <Box sx={{ display: "grid", gap: 4 }}>
        <TextField label={t("booking.amount")} hint={t("booking.amountHint", { max: rupeesExact(detail.refundablePaise) })} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} name="amount" />
        <TextField label={t("booking.reason")} hint={t("booking.reasonHint")} value={reason} onChange={(event) => setReason(event.target.value.slice(0, 300))} name="reason" />
        {problem && <InlineAlert tone="danger">{problem}</InlineAlert>}
        {actions.refund.isError ? <InlineAlert tone="danger">{errorText(t, actions.refund.error)}</InlineAlert> : null}
      </Box>
    </ConfirmDialog>
  );
}
