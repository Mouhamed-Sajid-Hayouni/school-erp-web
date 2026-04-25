import { useEffect, useMemo, useState } from "react";

type AnnouncementAudience =
  | "ALL"
  | "STUDENTS"
  | "PARENTS"
  | "TEACHERS"
  | "CLASS";

type PortalAnnouncement = {
  id: string;
  title: string;
  content: string;
  audience: AnnouncementAudience;
  classId: string | null;
  createdAt: string;
  updatedAt: string;
  class?: {
    id: string;
    name: string;
    academicYear: string;
  } | null;
  createdBy?: {
    firstName?: string;
    lastName?: string;
    role?: string;
  } | null;
};

type AnnouncementsSectionProps = {
  apiBaseUrl: string;
  token: string;
};

async function apiRequest<T>(
  url: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function AudienceBadge({ audience }: { audience: AnnouncementAudience }) {
  const styles: Record<AnnouncementAudience, string> = {
    ALL: "bg-slate-100 text-slate-700",
    STUDENTS: "bg-blue-100 text-blue-700",
    PARENTS: "bg-emerald-100 text-emerald-700",
    TEACHERS: "bg-amber-100 text-amber-700",
    CLASS: "bg-indigo-100 text-indigo-700",
  };

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[audience]}`}>
      {audience}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function AnnouncementsSection({
  apiBaseUrl,
  token,
}: AnnouncementsSectionProps) {
  const [announcements, setAnnouncements] = useState<PortalAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await apiRequest<PortalAnnouncement[]>(
          `${apiBaseUrl}/api/my-announcements`,
          token
        );

        setAnnouncements(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load announcements"
        );
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, token]);

  const stats = useMemo(() => {
    const total = announcements.length;
    const classSpecific = announcements.filter((item) => item.audience === "CLASS").length;
    const global = announcements.filter((item) => item.audience === "ALL").length;

    const last7Days = announcements.filter((item) => {
      const createdAt = new Date(item.createdAt).getTime();
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return createdAt >= sevenDaysAgo;
    }).length;

    return { total, classSpecific, global, last7Days };
  }, [announcements]);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Announcements</h3>
        <p className="mt-1 text-sm text-slate-500">
          Important school updates and targeted class announcements.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total announcements" value={stats.total} />
        <StatCard label="Global announcements" value={stats.global} />
        <StatCard label="Class-specific" value={stats.classSpecific} />
        <StatCard label="Last 7 days" value={stats.last7Days} />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h4 className="mb-4 text-lg font-semibold text-slate-900">
          Announcement List
        </h4>

        {loading ? (
          <p className="text-sm text-slate-500">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements available.</p>
        ) : (
          <div className="space-y-4">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 p-5"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h5 className="text-lg font-semibold text-slate-900">
                      {item.title}
                    </h5>

                    <AudienceBadge audience={item.audience} />

                    {item.class ? (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        {item.class.name}
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm leading-6 text-slate-600">
                    {item.content}
                  </p>

                  <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                    <p>
                      <span className="font-medium text-slate-700">Published:</span>{" "}
                      {formatDateTime(item.createdAt)}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">Author:</span>{" "}
                      {item.createdBy?.firstName} {item.createdBy?.lastName}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">Audience:</span>{" "}
                      {item.audience}
                    </p>
                    <p>
                      <span className="font-medium text-slate-700">Class:</span>{" "}
                      {item.class?.name || "-"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}