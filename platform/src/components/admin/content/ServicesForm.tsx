"use client";

import type { FormEvent } from "react";
import { saveServicesAction } from "@/app/(admin)/admin/(signed-in)/content/actions";
import type { AdminService } from "@/modules/content/admin/content-admin.service";
import { SaveBar, useSave } from "./useSave";

// Every single service in one form: description, price and whether it's on the website
export function ServicesForm({ services }: { services: AdminService[] }) {
  const save = useSave();
  const ids = services.map((service) => service.id);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.run(() => saveServicesAction(ids, form));
  };

  return (
    <form className="panel-body" noValidate onSubmit={submit}>
      {save.error("form")}
      <div className="svc-grid">
        {services.map((service) => (
          <div key={service.id} className="svc-row">
            <div className="svc-name">
              <strong>{service.name}</strong>
              <input
                type="text"
                name={`note-${service.id}`}
                defaultValue={service.note}
                aria-label={`${service.name} description`}
              />
              {save.error(`note-${service.id}`)}
            </div>
            <label className="svc-price">
              KES{" "}
              <input
                type="text"
                inputMode="numeric"
                name={`price-${service.id}`}
                defaultValue={service.price}
                aria-label={`${service.name} price`}
              />
              {save.error(`price-${service.id}`)}
            </label>
            <label className="inline-check">
              <input type="checkbox" name={`visible-${service.id}`} defaultChecked={service.visible} /> Visible
            </label>
          </div>
        ))}
      </div>
      <SaveBar save={save} label="Save & publish services" />
    </form>
  );
}
