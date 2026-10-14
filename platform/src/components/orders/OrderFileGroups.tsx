import { Icon } from "@/components/icons/Icon";
import type { OrderFileView } from "@/modules/orders/order-files";

type Group = {
  title: string;
  hint: string;
  files: OrderFileView[];
  empty: string;
  // false: listed, but locked (the client's own files on another writer's order)
  canOpen: boolean;
  lockedNote?: string;
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short" });

// An order's files in two groups (the client's, and ours), each file with its message and both
// "View" and "Download". Shared by the team's order page and the client's tracking page.
export function OrderFileGroups({ groups }: { groups: Group[] }) {
  return (
    <div className="file-groups">
      {groups.map((group) => (
        <section key={group.title} className="file-group">
          <h3>
            {group.title} <span className="file-count">{group.files.length}</span>
          </h3>
          <p className="file-group-hint">{group.hint}</p>
          <ul className="file-list">
            {group.files.map((file) => (
              <li key={file.id}>
                <Icon name="doc" />
                <div>
                  <strong title={file.name}>{file.name}</strong>
                  <small>
                    {file.label} · {file.size} · {day(file.at)}
                  </small>
                  {file.note && <p className="file-note">&ldquo;{file.note}&rdquo;</p>}
                </div>
                {group.canOpen ? (
                  <span className="file-actions">
                    <a
                      className="btn btn-ghost btn-sm file-view"
                      href={file.url}
                      target="_blank"
                      rel="noopener"
                      aria-label={`View ${file.name}`}
                    >
                      <Icon name="eye" />
                      View
                    </a>
                    <a
                      className="btn btn-ghost btn-sm file-view"
                      href={`${file.url}?download`}
                      aria-label={`Download ${file.name}`}
                    >
                      <Icon name="download" />
                      Download
                    </a>
                  </span>
                ) : (
                  <span className="file-locked" title={group.lockedNote}>
                    <Icon name="lock" />
                  </span>
                )}
              </li>
            ))}
            {group.files.length === 0 && <li className="empty-note">{group.empty}</li>}
          </ul>
        </section>
      ))}
    </div>
  );
}
