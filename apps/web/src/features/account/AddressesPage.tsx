import { useState } from "react";
import type { AddressDto } from "@brand/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ActionBar, Badge, Button, ConfirmDialog, EmptyState, InlineAlert, PageHeader, useToast } from "@/design-system";
import { AddressDialog } from "@/features/booking/AddressDialog";
import { addressesQuery, useDeleteAddress } from "@/features/booking/api";
import { addressLine } from "@/features/booking/text";
import { usePageMeta } from "@/features/public/usePageMeta";
import { errorText } from "@/lib/errors";

const MAX_ADDRESSES = 10;

/** Saved addresses (plan A7 /account/addresses): up to ten, one default for checkout. */
export function AddressesPage() {
  const { t } = useTranslation("account");
  const { tokens } = useTheme();
  const toast = useToast();
  const addresses = useQuery(addressesQuery);
  const remove = useDeleteAddress();
  const [editing, setEditing] = useState<AddressDto | "new" | null>(null);
  const [deleting, setDeleting] = useState<AddressDto | null>(null);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  usePageMeta(t("addresses.title"));

  const list = addresses.data ?? [];
  const canAdd = list.length < MAX_ADDRESSES;
  const addButton = (
    <Button startIcon={<AddOutlined />} onClick={() => setEditing("new")} disabled={!canAdd}>
      {t("addresses.add")}
    </Button>
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteError(null);
    try {
      await remove.mutateAsync(deleting.id);
      toast(t("addresses.deleted"));
      setDeleting(null);
    } catch (error) {
      setDeleteError(error);
    }
  };

  return (
    <Box>
      <PageHeader title={t("addresses.title")} description={t("addresses.description")} actions={list.length > 0 ? addButton : undefined} />
      {addresses.isPending ? (
        <Box aria-busy sx={{ display: "grid", gap: 3 }}>
          <Skeleton variant="rounded" height={112} />
          <Skeleton variant="rounded" height={112} />
        </Box>
      ) : addresses.isError ? (
        <InlineAlert
          tone="danger"
          action={
            <Button variant="tertiary" size="sm" onClick={() => void addresses.refetch()}>
              {t("common:action.retry")}
            </Button>
          }
        >
          {errorText(t, addresses.error)}
        </InlineAlert>
      ) : list.length === 0 ? (
        <EmptyState icon={<PlaceOutlined />} title={t("addresses.emptyTitle")} description={t("addresses.emptyBody")} action={addButton} />
      ) : (
        <Box sx={{ display: "grid", gap: 4 }}>
          <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 3 }}>
            {list.map((address) => (
              <Box
                component="li"
                key={address.id}
                sx={{ p: 5, border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, bgcolor: tokens.neutral[0], display: "grid", gap: 3 }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Typography component="h2" sx={{ fontWeight: 600, typography: "body1" }}>
                    {t(`booking:address.labels.${address.label}`)}
                  </Typography>
                  {address.isDefault && <Badge tone="accent">{t("addresses.default")}</Badge>}
                </Box>
                <Box>
                  <Typography sx={{ color: "text.secondary" }}>{addressLine(address)}</Typography>
                  {address.landmark && <Typography sx={{ color: "text.secondary" }}>{t("booking:address.near", { landmark: address.landmark })}</Typography>}
                </Box>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  <Button variant="secondary" size="sm" onClick={() => setEditing(address)}>
                    {t("addresses.edit")}
                  </Button>
                  <Button
                    variant="tertiary"
                    size="sm"
                    onClick={() => {
                      setDeleteError(null);
                      setDeleting(address);
                    }}
                  >
                    {t("addresses.delete")}
                  </Button>
                </Box>
              </Box>
            ))}
          </Box>
          {!canAdd && <InlineAlert tone="info">{t("addresses.limit", { count: MAX_ADDRESSES })}</InlineAlert>}
        </Box>
      )}

      {list.length > 0 && <ActionBar>{addButton}</ActionBar>}

      {editing !== null && (
        <AddressDialog
          address={editing === "new" ? null : editing}
          first={list.length === 0}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast(t("addresses.saved"));
            setEditing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
        title={t("addresses.deleteTitle")}
        consequence={deleting ? t("addresses.deleteBody", { address: addressLine(deleting) }) : ""}
        confirmLabel={t("addresses.deleteConfirm")}
        loading={remove.isPending}
      >
        {deleteError ? <InlineAlert tone="danger">{errorText(t, deleteError)}</InlineAlert> : null}
      </ConfirmDialog>
    </Box>
  );
}
