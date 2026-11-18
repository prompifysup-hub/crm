import type {
  CoreAdminProps,
  AuthProvider,
  DashboardComponent,
  LayoutComponent,
} from "ra-core";
import { localStorageStore, Resource } from "ra-core";
import { useEffect, useMemo } from "react";
import { Route } from "react-router";
import { QueryClient } from "@tanstack/react-query";
import { Admin } from "prompify-crm-kit/admin/admin";

import companies from "../companies";
import contacts from "../contacts";
import { Dashboard } from "../dashboard/Dashboard";
import deals from "../deals";
import { Layout } from "../layout/Layout";
import { MobileLayout } from "../layout/MobileLayout";
import { MobileDashboard } from "../dashboard/MobileDashboard";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import { MobileTasksList } from "../tasks/MobileTasksList.tsx";
import { ContactListMobile } from "../contacts/ContactList.tsx";
import { ContactShow } from "../contacts/ContactShow.tsx";
import { CompanyShow } from "../companies/CompanyShow.tsx";
import { NoteShowPage } from "../notes/NoteShowPage.tsx";
import { authProvider as defaultAuthProvider } from "../providers/prompify/authProvider";
import { dataProvider as defaultDataProvider } from "../providers/prompify";
import {
  CONFIGURATION_STORE_KEY,
  type ConfigurationContextValue,
} from "./ConfigurationContext";
import type { CrmDataProvider } from "../providers/types";
import {
  defaultCompanySectors,
  defaultCurrency,
  defaultDarkModeLogo,
  defaultDealCategories,
  defaultDealPipelineStatuses,
  defaultDealStages,
  defaultLightModeLogo,
  defaultNoteStatuses,
  defaultTaskTypes,
  defaultTitle,
} from "./defaultConfiguration";
import { i18nProvider as defaulti18nProvider } from "../providers/commons/i18nProvider";

const defaultStore = localStorageStore(undefined, "CRM");

export type CRMProps = {
  dataProvider?: CrmDataProvider;
  authProvider?: AuthProvider;
  i18nProvider?: CoreAdminProps["i18nProvider"];
  store?: CoreAdminProps["store"];
  dashboard?: DashboardComponent;
  layout?: LayoutComponent;
} & Partial<ConfigurationContextValue>;

/**
 * CRM Component
 *
 * Sets up the CRM with `ra-core`. The lists of sectors, deal stages, categories, note statuses,
 * task types, the currency, the title and the logos come from root/defaultConfiguration.ts.
 * Data comes from Prompify (see providers/prompify). There is no login screen.
 */
export const CRM = ({
  companySectors = defaultCompanySectors,
  currency = defaultCurrency,
  dealCategories = defaultDealCategories,
  dealPipelineStatuses = defaultDealPipelineStatuses,
  dealStages = defaultDealStages,
  darkModeLogo = defaultDarkModeLogo,
  lightModeLogo = defaultLightModeLogo,
  noteStatuses = defaultNoteStatuses,
  taskTypes = defaultTaskTypes,
  title = defaultTitle,
  dataProvider = defaultDataProvider,
  authProvider = defaultAuthProvider,
  i18nProvider = defaulti18nProvider,
  store = defaultStore,
  ...rest
}: CRMProps) => {
  // Seed the store with the configuration values
  useEffect(() => {
    store.setItem(CONFIGURATION_STORE_KEY, {
      companySectors,
      currency,
      dealCategories,
      dealPipelineStatuses,
      dealStages,
      noteStatuses,
      taskTypes,
      title,
      darkModeLogo,
      lightModeLogo,
    } satisfies ConfigurationContextValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  const isMobile = useIsMobile();
  const ResponsiveAdmin = isMobile ? MobileAdmin : DesktopAdmin;

  return (
    <ResponsiveAdmin
      dataProvider={dataProvider}
      authProvider={authProvider}
      i18nProvider={i18nProvider}
      store={store}
      disableTelemetry
      {...rest}
    />
  );
};

const DesktopAdmin = (
  props: CoreAdminProps & {
    dashboard?: DashboardComponent;
    layout?: LayoutComponent;
  },
) => {
  return (
    <Admin
      layout={props.layout ?? Layout}
      dashboard={props.dashboard ?? Dashboard}
      {...props}
    >
      <Resource name="deals" {...deals} />
      <Resource name="contacts" {...contacts} />
      <Resource name="companies" {...companies} />
      <Resource name="contact_notes" />
      <Resource name="deal_notes" />
      <Resource name="tasks" />
      <Resource name="sales" />
      <Resource name="tags" />
    </Admin>
  );
};

const MobileAdmin = (
  props: CoreAdminProps & {
    dashboard?: DashboardComponent;
    layout?: LayoutComponent;
  },
) => {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <Admin
      queryClient={queryClient}
      layout={props.layout ?? MobileLayout}
      dashboard={props.dashboard ?? MobileDashboard}
      {...props}
    >
      <Resource
        name="contacts"
        list={ContactListMobile}
        show={ContactShow}
        recordRepresentation={contacts.recordRepresentation}
      >
        <Route path=":id/notes/:noteId" element={<NoteShowPage />} />
      </Resource>
      <Resource name="companies" show={CompanyShow} />
      <Resource name="tasks" list={MobileTasksList} />
      <Resource name="sales" />
      <Resource name="tags" />
    </Admin>
  );
};
