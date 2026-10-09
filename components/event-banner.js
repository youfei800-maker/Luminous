import Link from "next/link";
import Icon from "@/components/icon";
export default function EventBanner({ events = [] }) {
  const upcoming = events
    .filter((event) => event.registrationStatus !== "closed")
    .sort((a, b) => a.date.localeCompare(b.date));
  const event = upcoming[0] || events[0];
  if (!event) return null;
  return (
    <section className="event-banner">
      <div className="page-width event-banner-inner">
        <div>
          <p className="eyebrow">
            LET’S MEET · {event.date.replaceAll("-", ".")}
          </p>
          <h2>
            次の一歩を、
            <br />
            一緒に見つけよう。
          </h2>
          <p className="event-script">{event.title}</p>
          <p className="event-description">
            {event.summary}
            <br />
            {event.organizer}
          </p>
          <Link href={`/events/${event.slug}`} className="outline-button">
            イベントの詳細を見る <Icon name="diagonal" size={17} />
          </Link>
          <Link href="/events" className="text-link">
            すべてのイベントを見る <Icon name="arrow" size={16} />
          </Link>
        </div>
        <div className="event-date" aria-hidden="true">
          <span>{event.date.slice(0, 7).replace("-", " / ")}</span>
          <strong>{event.date.slice(8)}</strong>
          <span>LUMINOUS EVENT</span>
        </div>
      </div>
    </section>
  );
}
