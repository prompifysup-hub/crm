import { useMemo } from "react";
import { useGetList } from "ra-core";
import { endOfDay, isAfter, isBefore, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import { Card } from "prompify-crm-kit/ui/card";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Contact, Deal } from "../types";

const DAYS = 30;

/** Count of items per day over the last 30 days, oldest first. */
const perDay = (dates: (string | undefined)[]) => {
  const today = startOfDay(new Date());
  const buckets = Array.from({ length: DAYS }, () => 0);
  for (const value of dates) {
    if (!value) continue;
    const day = startOfDay(new Date(value));
    const index = DAYS - 1 - Math.round((today.getTime() - day.getTime()) / 86400000);
    if (index >= 0 && index < DAYS) buckets[index] += 1;
  }
  return buckets;
};

const inRange = (value: string | undefined, from: Date, to: Date) => {
  if (!value) return false;
  const date = new Date(value);
  return !isBefore(date, from) && !isAfter(date, to);
};

/** Change between two periods, as "+12%" / "-5%" (or "new" when the previous period was empty). */
const change = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? "0%" : "new";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
};

/** Small trend line for a KPI card. */
const Sparkline = ({ values }: { values: number[] }) => {
  const max = Math.max(1, ...values);
  const width = 96;
  const height = 32;
  const step = width / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 2 - (v / max) * (height - 4)).toFixed(1)}`);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="text-orange-500" aria-hidden>
      <polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const KpiCard = ({ title, value, delta, trend }: { title: string; value: number | string; delta: string; trend: number[] }) => (
  <Card className="flex flex-row items-end justify-between gap-2 p-4">
    <div className="min-w-0">
      <p className="text-sm text-muted-foreground">{title}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-semibold">{value}</span>
        <span className={delta.startsWith("-") ? "text-xs font-medium text-red-600" : "text-xs font-medium text-green-600"}>{delta}</span>
      </div>
    </div>
    <Sparkline values={trend} />
  </Card>
);

/** New leads, qualified leads, hot leads and deals won: last 30 days compared with the 30 before. */
export const LeadKpiCards = () => {
  const { dealPipelineStatuses } = useConfigurationContext();
  const { data: contacts = [] } = useGetList<Contact>("contacts", {
    pagination: { page: 1, perPage: 5000 },
    sort: { field: "first_seen", order: "DESC" },
  });
  const { data: deals = [] } = useGetList<Deal>("deals", {
    pagination: { page: 1, perPage: 5000 },
    sort: { field: "updated_at", order: "DESC" },
  });

  const cards = useMemo(() => {
    const now = endOfDay(new Date());
    const from = startOfDay(subDays(now, DAYS - 1));
    const prevFrom = subDays(from, DAYS);
    const prevTo = subDays(now, DAYS);
    const recent = (c: Contact) => inRange(c.first_seen, from, now);
    const previous = (c: Contact) => inRange(c.first_seen, prevFrom, prevTo);

    const newLeads = contacts.filter(recent);
    const qualified = contacts.filter((c) => c.status === "warm" || c.status === "in-contract");
    const hot = contacts.filter((c) => c.status === "hot");
    const won = deals.filter((d) => dealPipelineStatuses.includes(d.stage));
    const wonThisMonth = won.filter((d) => inRange(d.updated_at, startOfMonth(now), now));
    const wonLastMonth = won.filter((d) => inRange(d.updated_at, startOfMonth(subMonths(now, 1)), startOfMonth(now)));

    return [
      { title: "New leads (30 days)", value: newLeads.length, delta: change(newLeads.length, contacts.filter(previous).length), trend: perDay(newLeads.map((c) => c.first_seen)) },
      { title: "Qualified leads", value: qualified.length, delta: change(qualified.filter(recent).length, qualified.filter(previous).length), trend: perDay(qualified.map((c) => c.last_seen)) },
      { title: "Hot leads", value: hot.length, delta: change(hot.filter(recent).length, hot.filter(previous).length), trend: perDay(hot.map((c) => c.last_seen)) },
      { title: "Deals won this month", value: wonThisMonth.length, delta: change(wonThisMonth.length, wonLastMonth.length), trend: perDay(won.map((d) => d.updated_at)) },
    ];
  }, [contacts, deals, dealPipelineStatuses]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} />
      ))}
    </div>
  );
};
