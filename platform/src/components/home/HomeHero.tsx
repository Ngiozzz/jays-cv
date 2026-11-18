import Link from "next/link";
import type { HomepageStat } from "@/modules/content/content.schema";

type Props = { headline: string; highlight: string; lead: string; draftTime: string; stats: HomepageStat[] };

// The homepage hero: Jay's headline on the left, the writer's desk on the right. The desk is the moment:
// a client's old CV with one red-pen note, the rewritten CV on top, and the order slip showing the draft
// arrived. It's an illustration, so the names on it are an example.
export function HomeHero({ headline, highlight, lead, stats }: Props) {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy rise">
            <h1>
              {headline} {highlight && <span className="highlight">{highlight}</span>}
            </h1>
            <p className="lead">{lead}</p>
            <div className="hero-ctas">
              <Link className="btn btn-primary" href="/pricing">
                Choose a package
              </Link>
              <Link className="btn btn-ghost" href="/samples">
                See CV samples
              </Link>
            </div>
          </div>
          <Desk />
        </div>
      </section>

      {stats.length > 0 && (
        <section className="facts" aria-label="Jay CVS at a glance">
          <div className="container facts-inner">
            {stats.map((stat) => (
              <div key={stat.label} className="fact">
                <b className="num">{stat.value}</b>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Desk() {
  return (
    <div
      className="desk rise d1"
      role="img"
      aria-label="An example: a client's old CV with a red-pen note, under the rewritten CV, and an order slip showing the draft was delivered 41 hours after payment"
    >
      <div className="sheet before" aria-hidden="true">
        <div className="t">CURRICULUM VITAE</div>
        <p>
          <b>Name:</b> Wanjiru Kamau
        </p>
        <p>
          <b>Tel:</b> 07•• ••• 318 &nbsp; <b>Email:</b> wanjiru.k@•••.com
        </p>
        <div className="rule" />
        <p>
          <b>CAREER OBJECTIVE</b>
        </p>
        <p>
          To work in a challenging and dynamic environment where I can utilise my skills and knowledge for the growth of
          the organisation.
        </p>
        <div className="rule" />
        <p>
          <b>WORK EXPERIENCE</b>
        </p>
        <p>Level 5 Hospital, Nakuru (2020 to date)</p>
        <p>
          <span className="ring">Duties: Responsible for patients</span> in the ward and other duties as assigned by the
          supervisor.
        </p>
        <p>Mission Hospital, Kiambu (2019 to 2020)</p>
        <p>Rotation in various departments.</p>
      </div>
      <div className="pen-note" aria-hidden="true">
        How many patients? What changed?
      </div>

      <div className="sheet after" aria-hidden="true">
        <div className="cv-head">
          <div className="cv-name">Wanjiru Kamau</div>
          <div className="cv-role">Registered Nurse</div>
          <div className="cv-contact">Nakuru, Kenya · NMC registered, UK 2025</div>
        </div>
        <div className="cv-body">
          <div>
            <h5>Profile</h5>
            <p>
              NMC-registered nurse with five years of acute care in medical and surgical wards. OSCE passed and ready to
              join an NHS trust.
            </p>
            <h5>Key achievements</h5>
            <ul className="ach">
              <li>Passed NMC OSCE on first attempt</li>
              <li>Cut ward medication errors by 30% with a double-check protocol</li>
              <li>Mentored 12 student nurses</li>
            </ul>
            <h5>Experience</h5>
            <div className="cv-job">Registered Nurse</div>
            <div className="when">Level 5 Hospital, Nakuru · 2020 to present</div>
            <ul className="bul">
              <li>Care for a 25-bed medical ward</li>
              <li>IV therapy and wound management</li>
              <li>Lead handovers for a team of 8 nurses</li>
            </ul>
          </div>
          <div className="cv-side">
            <h5>Core skills</h5>
            <div className="chips">
              <span>Acute care</span>
              <span>IV therapy</span>
              <span>Wound care</span>
              <span>Patient safety</span>
            </div>
            <h5>Education</h5>
            <div className="cv-job">BSc Nursing</div>
            <div className="when">Moi University, 2019</div>
            <h5>Languages</h5>
            <p>English, Kiswahili</p>
          </div>
        </div>
      </div>

      <div className="slip">
        <div className="top">
          <b>Professional package</b>
          <span className="mono muted">JC-1052</span>
        </div>
        <span className="track" aria-hidden="true">
          <i className="done" />
          <i className="done" />
          <i className="done" />
          <i className="now" />
          <i />
        </span>
        <div className="state">Draft delivered</div>
        <div className="meta num">41 hours after payment</div>
      </div>
    </div>
  );
}
