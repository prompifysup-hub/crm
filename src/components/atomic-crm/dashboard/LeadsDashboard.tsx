import { useEffect, useMemo, useState } from "react";
import {
  ListBase,
  RecordContextProvider,
  useCreatePath,
  useGetIdentity,
  useGetList,
  useListContext,
  useRecordContext,
} from "ra-core";
import { Link, useNavigate } from "react-router";
import { format, startOfDay, subDays } from "date-fns";
import { EllipsisVertical, Plus } from "lucide-react";
import { BulkDeleteButton } from "prompify-crm-kit/admin/bulk-delete-button";
import { DataTable } from "prompify-crm-kit/admin/data-table";
import { ExportButton } from "prompify-crm-kit/admin/export-button";
import { ListPagination } from "prompify-crm-kit/admin/list-pagination";
import { ReferenceField } from "prompify-crm-kit/admin/reference-field";
import { SearchInput } from "prompify-crm-kit/admin/search-input";
import { FilterLiveForm } from "ra-core";
import { Badge } from "prompify-crm-kit/ui/badge";
import { Button, buttonVariants } from "prompify-crm-kit/ui/button";
import { Card } from "prompify-crm-kit/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "prompify-crm-kit/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "prompify-crm-kit/ui/tabs";

import { Avatar } from "../contacts/Avatar";
import { BulkTagButton } from "../contacts/BulkTagButton";
import { useConfigurationContext } from "../root/ConfigurationContext";
import { defaultLeadSources } from "../root/defaultConfiguration";
import type { Contact, Sale, Task } from "../types";
import { LeadKpiCards } from "./LeadKpiCards";
import { BulkAssignButton, BulkStatusButton } from "./LeadBulkActions";

/**
 * Home page: a leads overview. KPI cards, tabs (All / New / Hot / Assigned to me / Overdue),
 * a table of leads (contacts) with bulk actions, search and paging.
 */
export const LeadsDashboard = () => (
  <ListBase
    resource="contacts"
    perPage={25}
    sort={{ field: "first_seen", order: "DESC" }}
    disableSyncWithLocation
    storeKey="leads.dashboard"
  >
    <LeadsView />
  </ListBase>
);

const TABS = ["all", "new", "hot", "mine", "overdue"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  all: "All",
  new: "New",
  hot: "Hot",
  mine: "Assigned to me",
  overdue: "Overdue",
};

/** The list filter for a tab. Overdue = leads with an unfinished task past its due date. */
const useTabFilters = () => {
  const { identity } = useGetIdentity();
  const { data: tasks = [] } = useGetList<Task>("tasks", {
    pagination: { page: 1, perPage: 5000 },
    sort: { field: "due_date", order: "ASC" },
  });
  return useMemo(() => {
    const now = Date.now();
    const overdueIds = Array.from(
      new Set(tasks.filter((t) => !t.done_date && t.due_date && new Date(t.due_date).getTime() < now).map((t) => t.contact_id)),
    );
    return {
      all: {},
      new: { "first_seen@gte": startOfDay(subDays(new Date(), 7)).toISOString() },
      hot: { status: "hot" },
      mine: identity ? { sales_id: identity.id } : {},
      // A plain list filter: FakeRest keeps rows whose id is in the list (none when empty).
      overdue: { id: overdueIds },
    } as Record<Tab, Record<string, unknown>>;
  }, [tasks, identity]);
};

const LeadsView = () => {
  const { total, filterValues, setFilters } = useListContext<Contact>();
  const tabFilters = useTabFilters();
  const createPath = useCreatePath();

  const { q, ...rest } = filterValues || {};
  const [currentTab, setCurrentTab] = useState<Tab>(
    () => (TABS.find((tab) => JSON.stringify(tabFilters[tab]) === JSON.stringify(rest)) as Tab | undefined) ?? "all",
  );

  // Re-apply the tab's filter when its data changes (e.g. "Overdue" once the tasks have loaded).
  useEffect(() => {
    const wanted = tabFilters[currentTab];
    if (JSON.stringify(wanted) !== JSON.stringify(rest)) setFilters({ ...wanted, ...(q ? { q } : {}) }, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, tabFilters]);

  const selectTab = (tab: string) => setCurrentTab(tab as Tab);

  return (
    <div className="flex flex-col gap-6 mt-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Leads</h1>
          {total !== undefined && <Badge variant="secondary">{total}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <ExportButton />
          <Link to={createPath({ resource: "contacts", type: "create" })} className={buttonVariants({ size: "sm" })}>
            <Plus className="size-4" />
            Add lead
          </Link>
        </div>
      </div>

      <LeadKpiCards />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={currentTab} onValueChange={(value) => selectTab(String(value))}>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {TAB_LABELS[tab]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <FilterLiveForm>
          <SearchInput source="q" placeholder="Search leads" className="w-64" />
        </FilterLiveForm>
      </div>

      <Card className="py-0 overflow-hidden">
        <DataTable<Contact>
          rowClick="show"
          bulkActionButtons={
            <>
              <BulkStatusButton />
              <BulkAssignButton />
              <BulkTagButton />
              <BulkDeleteButton />
            </>
          }
        >
          <DataTable.Col label="Customer" source="last_name" render={(record) => <CustomerCell record={record as Contact} />} />
          <DataTable.Col label="Company" source="company_name" className="hidden md:table-cell" />
          <DataTable.Col
            label="Email"
            disableSort
            className="hidden lg:table-cell"
            render={(record) => <span className="text-muted-foreground">{record.email_jsonb?.[0]?.email ?? ""}</span>}
          />
          <DataTable.Col label="Status" source="status" render={(record) => <StatusPill status={record.status} />} />
          <DataTable.Col label="Manager" source="sales_id" className="hidden md:table-cell">
            <ReferenceField<Contact, Sale> source="sales_id" reference="sales" link={false} render={({ referenceRecord }) => referenceRecord ? `${referenceRecord.first_name} ${referenceRecord.last_name}` : ""} />
          </DataTable.Col>
          <DataTable.Col
            label="Source"
            source="source"
            className="hidden lg:table-cell"
            render={(record) => defaultLeadSources.find((s) => s.value === record.source)?.label ?? record.source ?? ""}
          />
          <DataTable.Col
            label="Created"
            source="first_seen"
            render={(record) => (record.first_seen ? format(new Date(record.first_seen), "MMM d, yyyy") : "")}
          />
          <DataTable.Col label="" disableSort render={(record) => <RowActions record={record as Contact} />} />
        </DataTable>
      </Card>
      <ListPagination />
    </div>
  );
};

/** Status as a small labelled pill in the status colour. */
const StatusPill = ({ status }: { status?: string }) => {
  const { noteStatuses } = useConfigurationContext();
  const item = noteStatuses.find((s) => s.value === status);
  if (!item) return null;
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: `${item.color}26`, borderColor: `${item.color}80`, color: "inherit" }}
    >
      {item.label}
    </span>
  );
};

const CustomerCell = ({ record }: { record: Contact }) => (
  <RecordContextProvider value={record}>
    <div className="flex items-center gap-2">
      <Avatar width={25} height={25} />
      <span className="font-medium">
        {record.first_name} {record.last_name}
      </span>
    </div>
  </RecordContextProvider>
);

/** "…" menu on each row. */
const RowActions = ({ record }: { record: Contact }) => {
  const navigate = useNavigate();
  const createPath = useCreatePath();
  const context = useRecordContext<Contact>({ record });
  if (!context) return null;
  return (
    <div onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" aria-label="Lead actions" />}>
          <EllipsisVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate(createPath({ resource: "contacts", id: record.id, type: "show" }))}>Open</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(createPath({ resource: "contacts", id: record.id, type: "edit" }))}>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
