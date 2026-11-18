import { useState } from "react";
import { useGetList, useListContext, useNotify, useRefresh, useUpdateMany } from "ra-core";
import { UserCheck, CircleDot } from "lucide-react";
import { Button } from "prompify-crm-kit/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "prompify-crm-kit/ui/dialog";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Contact, Sale } from "../types";

/** Shared dialog for "pick one value, apply it to all selected leads". */
const BulkPickDialog = ({
  open,
  onClose,
  title,
  options,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: { value: string | number; label: string; color?: string }[];
  onPick: (value: string | number) => void;
}) => (
  <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-1">
        {options.map((option) => (
          <Button key={option.value} variant="ghost" className="justify-start gap-2" onClick={() => onPick(option.value)}>
            {option.color && <span className="size-2.5 rounded-full" style={{ backgroundColor: option.color }} />}
            {option.label}
          </Button>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

const useBulkUpdate = () => {
  const { selectedIds = [], onUnselectItems } = useListContext<Contact>();
  const [updateMany, { isPending }] = useUpdateMany<Contact>();
  const notify = useNotify();
  const refresh = useRefresh();
  const apply = (data: Partial<Contact>, message: string) =>
    updateMany(
      "contacts",
      { ids: selectedIds, data },
      {
        mutationMode: "pessimistic",
        onSuccess: () => {
          notify(message, { type: "success" });
          onUnselectItems();
          refresh();
        },
        onError: (error: unknown) => notify(error instanceof Error ? error.message : String(error), { type: "error" }),
      },
    );
  return { apply, isPending, count: selectedIds.length };
};

/** "Assign to": set the account manager of the selected leads. */
export const BulkAssignButton = () => {
  const [open, setOpen] = useState(false);
  const { apply, isPending, count } = useBulkUpdate();
  const { data: team = [] } = useGetList<Sale>("sales", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "last_name", order: "ASC" },
  }, { enabled: open });
  return (
    <>
      <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setOpen(true)}>
        <UserCheck className="size-4" />
        Assign to
      </Button>
      <BulkPickDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Assign ${count} lead${count === 1 ? "" : "s"} to`}
        options={team.filter((s) => !s.disabled).map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name}` }))}
        onPick={(value) => {
          setOpen(false);
          apply({ sales_id: value }, "Leads assigned");
        }}
      />
    </>
  );
};

/** "Set status": change the status (cold / warm / hot…) of the selected leads. */
export const BulkStatusButton = () => {
  const [open, setOpen] = useState(false);
  const { noteStatuses } = useConfigurationContext();
  const { apply, isPending, count } = useBulkUpdate();
  return (
    <>
      <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setOpen(true)}>
        <CircleDot className="size-4" />
        Set status
      </Button>
      <BulkPickDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Status for ${count} lead${count === 1 ? "" : "s"}`}
        options={noteStatuses.map((s) => ({ value: s.value, label: s.label, color: s.color }))}
        onPick={(value) => {
          setOpen(false);
          apply({ status: String(value) }, "Status updated");
        }}
      />
    </>
  );
};
