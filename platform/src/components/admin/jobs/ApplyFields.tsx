import { APPLY_METHODS, ATTACH_OPTIONS, type ApplyDetails, type ApplyMethod } from "@/modules/jobs/jobs.schema";
import { FormField } from "./FormField";

const METHOD_LABEL: Record<ApplyMethod, string> = {
  email: "Email",
  link: "Online link",
  whatsapp: "WhatsApp",
  "in-person": "In person",
  other: "Other",
};

type Props = { initial: ApplyDetails; method: ApplyMethod; errors: Record<string, string> };

// "How to apply": every field stays in the form, but only the ones the chosen method needs are shown
export function ApplyFields({ initial, method, errors }: Props) {
  const hiddenUnless = (...methods: ApplyMethod[]) => !methods.includes(method);
  return (
    <>
      <div className="method-picker" role="radiogroup" aria-label="Application method">
        {APPLY_METHODS.map((value) => (
          <label key={value}>
            <input type="radio" name="applyMethod" value={value} defaultChecked={initial.method === value} />
            {METHOD_LABEL[value]}
          </label>
        ))}
      </div>
      <div className="fgrid">
        <FormField
          id="f-email"
          label="Send applications to"
          required
          hidden={hiddenUnless("email")}
          error={errors["apply.email"]}
        >
          <input
            type="email"
            id="f-email"
            name="applyEmail"
            defaultValue={initial.email}
            placeholder="recruitment@company.com"
          />
        </FormField>
        <FormField id="f-subject" label="Email subject line" hidden={hiddenUnless("email")}>
          <input
            type="text"
            id="f-subject"
            name="applySubject"
            defaultValue={initial.subject}
            placeholder="e.g. I.T SPECIALIST"
          />
        </FormField>
        <FormField
          id="f-link"
          label="Application link"
          required
          full
          hidden={hiddenUnless("link")}
          error={errors["apply.url"]}
        >
          <input type="url" id="f-link" name="applyUrl" defaultValue={initial.url} placeholder="https://" />
        </FormField>
        <FormField
          id="f-phone"
          label="WhatsApp / phone number"
          required
          hidden={hiddenUnless("whatsapp")}
          error={errors["apply.phone"]}
        >
          <input type="tel" id="f-phone" name="applyPhone" defaultValue={initial.phone} placeholder="07XX XXX XXX" />
        </FormField>
        <FormField
          id="f-address"
          label="Where to apply"
          required
          hidden={hiddenUnless("in-person")}
          error={errors["apply.address"]}
        >
          <input
            type="text"
            id="f-address"
            name="applyAddress"
            defaultValue={initial.address}
            placeholder="Address or building"
          />
        </FormField>
        <FormField id="f-when" label="When" hidden={hiddenUnless("in-person")}>
          <input
            type="text"
            id="f-when"
            name="applyWhen"
            defaultValue={initial.when}
            placeholder="e.g. Monday 6 Oct, 9am–1pm"
          />
        </FormField>
        <div className="f full" hidden={hiddenUnless("email", "in-person")}>
          <span className="label">What to send or bring</span>
          <div className="chip-checks">
            {ATTACH_OPTIONS.map((option) => (
              <label key={option}>
                <input
                  type="checkbox"
                  name="applyAttach"
                  value={option}
                  defaultChecked={initial.attach.includes(option)}
                />{" "}
                {option}
              </label>
            ))}
          </div>
        </div>
        <FormField
          id="f-notes"
          label={method === "other" ? "How to apply" : "Special instructions"}
          required={method === "other"}
          full
          error={errors["apply.notes"]}
        >
          <textarea
            id="f-notes"
            name="applyNotes"
            rows={2}
            defaultValue={initial.notes}
            placeholder="e.g. State your current and expected salary. Only shortlisted candidates will be contacted."
          />
        </FormField>
      </div>
    </>
  );
}
