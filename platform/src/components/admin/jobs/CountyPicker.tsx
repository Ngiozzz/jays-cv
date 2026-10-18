"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ALL_COUNTIES,
  NO_LOCATION,
  OUTSIDE_KENYA,
  PLACE_CHOICES,
  cleanCounties,
  isCounty,
  locationText,
  matchPlace,
  type JobPlace,
} from "@/modules/jobs/counties";

type Props = {
  value: JobPlace;
  onChange: (place: JobPlace) => void;
  // "f" on Post a job, "q" on Bulk post: the inputs' ids start with it
  idPrefix: string;
  // On Post a job the parts go into the form as counties / town / country, and picking a county
  // tells the form so its live preview follows
  formNames?: boolean;
  unsure?: boolean;
  errors?: { location?: string; country?: string };
  // Shown under the county, e.g. Bulk post's "AI wasn't sure" note
  note?: ReactNode;
};

const chipLabel = (place: string) => (isCounty(place) ? `${place} County` : place);

// Where the job is: one or more of the 47 counties (typed and picked from the list), or one of
// "All counties" / "Outside Kenya" / "Not specified", plus the town or area and, abroad, the country
export function CountyPicker({ value, onChange, idPrefix, formNames, unsure, errors = {}, note }: Props) {
  const [typed, setTyped] = useState("");
  const [notFound, setNotFound] = useState(false);
  const marker = useRef<HTMLInputElement>(null);
  const first = useRef(true);
  const { counties, town, country } = value;
  const standAlone = counties[0] === ALL_COUNTIES || counties[0] === NO_LOCATION;
  const abroad = counties[0] === OUTSIDE_KENYA;
  const id = (part: string) => `${idPrefix}-${part}`;

  // Hidden inputs don't fire input events, so the form is told when the counties change
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (formNames) marker.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [counties.join("|"), formNames]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCounties = (next: string[]) => {
    const cleaned = cleanCounties(next);
    const nextStandAlone = cleaned[0] === ALL_COUNTIES || cleaned[0] === NO_LOCATION;
    onChange({
      counties: cleaned,
      town: nextStandAlone ? "" : town,
      country: cleaned[0] === OUTSIDE_KENYA ? country : "",
    });
  };

  // A county joins the others; a stand-alone choice replaces them
  const add = (text: string) => {
    const place = matchPlace(text);
    if (!place) return false;
    setCounties(isCounty(place) ? [...counties.filter(isCounty), place] : [place]);
    setTyped("");
    setNotFound(false);
    return true;
  };

  const invalid = Boolean(errors.location);
  return (
    <>
      <div className={["f", "full", "county-field", unsure ? "unsure" : "", invalid ? "invalid" : ""].join(" ")}>
        <label htmlFor={id("county")}>
          County <em>*</em>
        </label>
        <div className={unsure ? "county-picker ai-unsure" : "county-picker"}>
          {counties.map((place) => (
            <span key={place} className="county-chip">
              {chipLabel(place)}
              <button
                type="button"
                aria-label={`Remove ${chipLabel(place)}`}
                onClick={() => setCounties(counties.filter((c) => c !== place))}
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            id={id("county")}
            list={id("county-list")}
            value={typed}
            autoComplete="off"
            placeholder={
              !counties.length
                ? "Type a county, e.g. Machakos"
                : isCounty(counties[0])
                  ? "Add another county"
                  : "Type a county to change it"
            }
            onChange={(event) => {
              const text = event.target.value;
              setTyped(text);
              setNotFound(false);
              // Picked from the list: added straight away (typed text waits for Enter)
              if ((PLACE_CHOICES as readonly string[]).includes(text)) add(text);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (typed.trim() && !add(typed)) setNotFound(true);
              }
              if (event.key === "Backspace" && !typed && counties.length) {
                setCounties(counties.slice(0, -1));
              }
            }}
            onBlur={() => {
              if (typed.trim() && !add(typed)) setNotFound(true);
            }}
          />
        </div>
        <datalist id={id("county-list")}>
          {PLACE_CHOICES.map((place) => (
            <option key={place} value={place} />
          ))}
        </datalist>
        {formNames && (
          <>
            <input ref={marker} type="hidden" name="countiesChanged" value={counties.join("|")} />
            {counties.map((place) => (
              <input key={place} type="hidden" name="counties" value={place} />
            ))}
          </>
        )}
        {notFound ? (
          <small className="field-error" role="alert">
            &quot;{typed}&quot; isn&apos;t a Kenyan county. Pick one from the list, or choose &quot;{OUTSIDE_KENYA}
            &quot;.
          </small>
        ) : (
          <small>
            {counties.length ? (
              <>
                Shown as: <strong>{locationText(value)}</strong>
              </>
            ) : (
              <>
                Add more than one if the job is in several places. Also: &quot;{ALL_COUNTIES}&quot;, &quot;
                {OUTSIDE_KENYA}&quot;, &quot;{NO_LOCATION}&quot;.
              </>
            )}
          </small>
        )}
        {note}
        {errors.location && (
          <small className="field-error" role="alert">
            {errors.location}
          </small>
        )}
      </div>
      {!standAlone && (
        <div className="f">
          <label htmlFor={id("town")}>{abroad ? "City or town" : "Town or area"}</label>
          <input
            type="text"
            id={id("town")}
            name={formNames ? "town" : undefined}
            value={town}
            maxLength={120}
            placeholder={abroad ? "e.g. Dubai" : "e.g. Tala"}
            onChange={(event) => onChange({ ...value, town: event.target.value })}
          />
          <small>Optional.</small>
        </div>
      )}
      {abroad && (
        <div className={errors.country ? "f invalid" : "f"}>
          <label htmlFor={id("country")}>
            Country <em>*</em>
          </label>
          <input
            type="text"
            id={id("country")}
            name={formNames ? "country" : undefined}
            value={country}
            maxLength={80}
            placeholder="e.g. United Arab Emirates"
            onChange={(event) => onChange({ ...value, country: event.target.value })}
          />
          {errors.country && (
            <small className="field-error" role="alert">
              {errors.country}
            </small>
          )}
        </div>
      )}
    </>
  );
}
