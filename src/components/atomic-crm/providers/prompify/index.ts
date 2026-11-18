/*
 * Connects Atomic CRM to Prompify's database.
 *
 * The CRM logic (counters, search, activity log, filters) runs on an in-browser FakeRest
 * database, exactly as in Atomic CRM's demo. On start-up that database is filled from the
 * Prompify tables listed in SYNCED_TABLES, and every create / update / delete is written to
 * Prompify first and then applied in the browser.
 *
 * Outside Prompify (no /env-config.js) it uses Atomic CRM's generated demo data instead, so the
 * template can be previewed locally.
 */
import type { DataProvider } from "ra-core";
import type { CrmDataProvider } from "../types";
import { createDataProvider } from "../fakerest/dataProvider";
import type { Db } from "../fakerest/dataGenerator/types";
import { defaultConfiguration } from "../../root/defaultConfiguration";
import { CURRENT_USER } from "./currentUser";
import { isConnected, prompifyTable } from "./api";

/** Tables stored in Prompify. Add a table here when you add a new resource. */
export const SYNCED_TABLES = [
  "companies",
  "contacts",
  "contact_notes",
  "deals",
  "deal_notes",
  "tasks",
  "tags",
  "sales",
] as const;

const isSynced = (resource: string) =>
  (SYNCED_TABLES as readonly string[]).includes(resource);

async function loadDb(): Promise<Db> {
  const tables = Object.fromEntries(
    await Promise.all(
      SYNCED_TABLES.map(async (name) => [name, await prompifyTable.list(name)] as const),
    ),
  ) as Record<(typeof SYNCED_TABLES)[number], Record<string, any>[]>;
  // The team: the first member (oldest row) is the signed-in user. With no rows, a built-in user.
  const sales = [...tables.sales]
    .sort((a, b) => String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")))
    .map((s) => ({ administrator: true, disabled: false, user_id: String(s.id), ...s }));
  const team: Record<string, any>[] = sales.length ? sales : [CURRENT_USER];
  return {
    ...(fillDerivedFields(tables, team[0].id) as unknown as Db),
    sales: team,
    // The app configuration is not stored in Prompify.
    configuration: [{ id: 1, config: defaultConfiguration }],
  } as Db;
}

const list = (value: unknown) => (Array.isArray(value) ? value : []);

/**
 * Fill the fields Atomic CRM keeps denormalised (counters, company names) and default empty
 * lists, so tables only need plain columns and sample rows stay simple.
 * Tags on contacts may be given by tag id or by tag name.
 */
function fillDerivedFields(
  t: Record<(typeof SYNCED_TABLES)[number], Record<string, any>[]>,
  defaultSalesId: unknown,
) {
  const companyById = new Map(t.companies.map((c) => [c.id, c]));
  const tagIdByName = new Map(t.tags.map((tag) => [tag.name, tag.id]));
  const count = (rows: Record<string, any>[], key: string, id: unknown) =>
    rows.filter((r) => r[key] === id).length;

  const contacts: Record<string, any>[] = t.contacts.map((c) => ({
    ...c,
    email_jsonb: list(c.email_jsonb),
    phone_jsonb: list(c.phone_jsonb),
    tags: list(c.tags).map((tag) => tagIdByName.get(tag) ?? tag),
    sales_id: c.sales_id ?? defaultSalesId,
    first_seen: c.first_seen ?? c.created_at,
    last_seen: c.last_seen ?? c.created_at,
    company_name: companyById.get(c.company_id)?.name ?? c.company_name,
    nb_tasks: t.tasks.filter((task) => task.contact_id === c.id && !task.done_date).length,
  }));

  return {
    tags: t.tags,
    companies: t.companies.map((c) => ({
      ...c,
      context_links: list(c.context_links),
      sales_id: c.sales_id ?? defaultSalesId,
      nb_contacts: count(contacts, "company_id", c.id),
      nb_deals: count(t.deals, "company_id", c.id),
    })),
    contacts,
    deals: t.deals.map((d) => ({
      ...d,
      categories: list(d.categories),
      // A deal without contacts shows the contacts of its company.
      contact_ids: list(d.contact_ids).length
        ? list(d.contact_ids)
        : contacts.filter((c) => c.company_id === d.company_id).slice(0, 2).map((c) => c.id),
      amount: Number(d.amount ?? 0),
      index: d.index ?? 0,
      sales_id: d.sales_id ?? defaultSalesId,
    })),
    tasks: t.tasks.map((task) => ({ ...task, sales_id: task.sales_id ?? defaultSalesId })),
    contact_notes: t.contact_notes.map((n) => ({
      ...n,
      attachments: list(n.attachments),
      date: n.date ?? n.created_at,
      sales_id: n.sales_id ?? defaultSalesId,
    })),
    deal_notes: t.deal_notes.map((n) => ({
      ...n,
      attachments: list(n.attachments),
      date: n.date ?? n.created_at,
      sales_id: n.sales_id ?? defaultSalesId,
    })),
  };
}

/** Mirror every write of the in-browser database to Prompify. */
function withPrompifySync(base: DataProvider): DataProvider {
  return {
    ...base,
    async create(resource, params) {
      if (!isSynced(resource)) return base.create(resource, params);
      const row = await prompifyTable.create(resource, params.data);
      return base.create(resource, {
        ...params,
        data: {
          ...params.data,
          id: row.id,
          created_at: params.data.created_at ?? row.created_at,
        },
      });
    },
    async update(resource, params) {
      if (isSynced(resource)) await prompifyTable.update(resource, params.id, params.data);
      return base.update(resource, params);
    },
    async updateMany(resource, params) {
      if (isSynced(resource)) {
        await Promise.all(
          params.ids.map((id) => prompifyTable.update(resource, id, params.data)),
        );
      }
      return base.updateMany(resource, params);
    },
    async delete(resource, params) {
      if (isSynced(resource)) await prompifyTable.remove(resource, params.id);
      return base.delete(resource, params);
    },
    async deleteMany(resource, params) {
      if (isSynced(resource)) {
        await Promise.all(params.ids.map((id) => prompifyTable.remove(resource, id)));
      }
      return base.deleteMany(resource, params);
    },
  };
}

async function build(): Promise<CrmDataProvider> {
  if (!isConnected()) {
    return createDataProvider({ silent: true });
  }
  return createDataProvider({
    db: await loadDb(),
    latency: 0,
    silent: true,
    wrapBase: withPrompifySync,
  });
}

/**
 * The provider must exist synchronously, but the data loads asynchronously:
 * every call waits for the initial load to finish.
 */
const ready = build();

export const dataProvider = new Proxy({} as CrmDataProvider, {
  get(_target, method: string) {
    if (method === "then") return undefined; // not a promise
    return (...args: unknown[]) =>
      ready.then((provider) => (provider as any)[method](...args));
  },
});
