import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

type NotificationItem = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId?: string | null;
  createdAt: string;
};

type NotificationsBellProps = {
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
    throw new Error((data as { error?: string }).error || "Request failed");
  }

  return data as T;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function TypeBadge({ type }: { type: string }) {
  const normalized = type.toUpperCase();

  const style =
    normalized === "ASSIGNMENT"
      ? "bg-blue-100 text-blue-700"
      : normalized === "ANNOUNCEMENT"
      ? "bg-emerald-100 text-emerald-700"
      : normalized === "GRADE"
      ? "bg-amber-100 text-amber-700"
      : normalized === "BULLETIN"
      ? "bg-indigo-100 text-indigo-700"
      : "bg-slate-100 text-slate-700";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style}`}>
      {type}
    </span>
  );
}

export default function NotificationsBell({
  apiBaseUrl,
  token,
}: NotificationsBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchNotifications = async (showError = true) => {
    try {
      const data = await apiRequest<NotificationItem[]>(
        `${apiBaseUrl}/api/my-notifications`,
        token
      );
      setNotifications(data);
      setError("");
    } catch (err) {
      if (showError) {
        setError(
          err instanceof Error ? err.message : "Failed to load notifications"
        );
      }
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await fetchNotifications(true);
      } finally {
        setLoading(false);
      }
    };

    run();

    const intervalId = window.setInterval(() => {
      fetchNotifications(false);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [apiBaseUrl, token]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const latestNotifications = useMemo(
    () => notifications.slice(0, 5),
    [notifications]
  );

  const handleMarkRead = async (notificationId: string) => {
    try {
      setSavingId(notificationId);
      setError("");

      await apiRequest(
        `${apiBaseUrl}/api/notifications/${notificationId}/read`,
        token,
        {
          method: "PUT",
        }
      );

      await fetchNotifications(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update notification"
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-5 w-5 text-slate-700" />
            {unreadCount > 0 ? (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <p className="text-xs text-slate-500">
              {unreadCount} unread • {notifications.length} total
            </p>
          </div>
        </div>

        <span className="text-xs font-medium text-slate-500">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          {error ? (
            <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-slate-500">Loading notifications...</p>
          ) : latestNotifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {latestNotifications.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    item.isRead
                      ? "border-slate-200 bg-white"
                      : "border-blue-200 bg-blue-50/40"
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <TypeBadge type={item.type} />
                    {!item.isRead ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                        Unread
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        Read
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-5 text-slate-600">
                    {item.message}
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-slate-500">
                      {formatDateTime(item.createdAt)}
                    </p>

                    {!item.isRead ? (
                      <button
                        onClick={() => handleMarkRead(item.id)}
                        disabled={savingId === item.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        {savingId === item.id ? "Saving..." : "Mark read"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}