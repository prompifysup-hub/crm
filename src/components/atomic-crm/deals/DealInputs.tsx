import { required, useTranslate } from "ra-core";
import { AutocompleteArrayInput } from "prompify-crm-kit/admin/autocomplete-array-input";
import { ReferenceArrayInput } from "prompify-crm-kit/admin/reference-array-input";
import { ReferenceInput } from "prompify-crm-kit/admin/reference-input";
import { TextInput } from "prompify-crm-kit/admin/text-input";
import { NumberInput } from "prompify-crm-kit/admin/number-input";
import { DateInput } from "prompify-crm-kit/admin/date-input";
import { SelectInput } from "prompify-crm-kit/admin/select-input";
import { Separator } from "prompify-crm-kit/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { AutocompleteCompanyInput } from "../companies/AutocompleteCompanyInput.tsx";
import { AutocompleteContactInput } from "../contacts/AutocompleteContactInput.tsx";
import { validateClosingDate } from "./dealUtils";

export const DealInputs = () => {
  const isMobile = useIsMobile();
  return (
    <div className="flex flex-col gap-10 p-1">
      <DealInfoInputs />

      <div className={`flex gap-6 ${isMobile ? "flex-col" : "flex-row"}`}>
        <DealLinkedToInputs />
        <Separator orientation={isMobile ? "horizontal" : "vertical"} />
        <DealMiscInputs />
      </div>
    </div>
  );
};

const DealInfoInputs = () => {
  return (
    <div className="flex flex-col gap-4 flex-1">
      <TextInput source="name" validate={required()} helperText={false} />
      <TextInput source="description" multiline rows={3} helperText={false} />
    </div>
  );
};

const DealLinkedToInputs = () => {
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4 flex-1">
      <h6 className="text-lg font-semibold">
        {translate("resources.deals.inputs.linked_to")}
      </h6>
      <ReferenceInput source="company_id" reference="companies">
        <AutocompleteCompanyInput
          label="resources.deals.fields.company_id"
          validate={required()}
          modal
        />
      </ReferenceInput>

      <ReferenceArrayInput source="contact_ids" reference="contacts_summary">
        <AutocompleteContactInput label="resources.deals.fields.contact_ids" />
      </ReferenceArrayInput>
    </div>
  );
};

const DealMiscInputs = () => {
  const { dealStages, dealCategories } = useConfigurationContext();
  const translate = useTranslate();
  return (
    <div className="flex flex-col gap-4 flex-1">
      <h6 className="text-lg font-semibold">
        {translate("resources.deals.field_categories.misc")}
      </h6>

      <AutocompleteArrayInput
        source="categories"
        choices={dealCategories}
        optionText="label"
        optionValue="value"
        helperText={false}
      />
      <NumberInput
        source="amount"
        defaultValue={0}
        helperText={false}
        validate={required()}
      />
      <DateInput
        validate={validateClosingDate}
        source="expected_closing_date"
        helperText={false}
      />
      <SelectInput
        source="stage"
        choices={dealStages}
        optionText="label"
        optionValue="value"
        defaultValue="opportunity"
        helperText={false}
        validate={required()}
      />
    </div>
  );
};
