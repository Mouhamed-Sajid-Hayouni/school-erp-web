import { useEffect, useMemo, useState } from "react";

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

type NotificationsSectionProps = {
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

function translateError(message: string) {
  if (message.includes("Only parents")) {
    return "هذه الصفحة مخصصة للأولياء فقط.";
  }

  if (message.includes("Access denied") || message.includes("Invalid token")) {
    return "انتهت الجلسة أو لا تملك صلاحية الوصول.";
  }

  return "تعذر تحميل التنبيهات.";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("ar-TN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getTypeLabel(type: string) {
  const normalized = type.toUpperCase();

  if (normalized === "ASSIGNMENT") return "واجب";
  if (normalized === "ANNOUNCEMENT") return "إعلان";
  if (normalized === "GRADE") return "عدد";
  if (normalized === "BULLETIN") return "دفتر أعداد";
  if (normalized === "MESSAGE") return "رسالة";

  return "تنبيه";
}

function translateNotificationTitle(title: string) {
  const normalized = title.trim().toLowerCase();

  if (normalized.includes("new grade")) return "تم نشر عدد جديد";
  if (normalized.includes("new assignment")) return "تم نشر واجب جديد";
  if (normalized.includes("assignment")) return "تنبيه حول واجب";
  if (normalized.includes("announcement")) return "إعلان جديد";
  if (normalized.includes("bulletin")) return "دفتر الأعداد متاح";
  if (normalized.includes("message")) return "رسالة جديدة";

  return title;
}

function translateNotificationMessage(message: string) {
  return message
    .replace("A new", "تمت إضافة")
    .replace("grade", "عدد")
    .replace("subject", "مادة")
    .replace("was added for", "خلال")
    .replace("New grade published", "تم نشر عدد جديد")
    .replace("New assignment published", "تم نشر واجب جديد")
    .replace("is now available for", "متاح الآن لقسم")
    .replace("your class", "قسم ابنكم");
}

function NotificationTypeBadge({ type }: { type: string }) {
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
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {getTypeLabel(type)}
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

export default function NotificationsSection({
  apiBaseUrl,
  token,
}: NotificationsSectionProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    const data = await apiRequest<NotificationItem[]>(
      `${apiBaseUrl}/api/my-notifications`,
      token
    );

    setNotifications(data);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        await refresh();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load notifications";

        setError(translateError(errorMessage));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, token]);

  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((item) => !item.isRead).length;
    const read = notifications.filter((item) => item.isRead).length;
    const last7Days = notifications.filter((item) => {
      const createdAt = new Date(item.createdAt).getTime();
      return createdAt >= Date.now() - 7 * 24 * 60 * 60 * 1000;
    }).length;

    return { total, unread, read, last7Days };
  }, [notifications]);

  const handleMarkRead = async (notificationId: string) => {
    try {
      setSavingId(notificationId);
      setMessage("");
      setError("");

      await apiRequest(
        `${apiBaseUrl}/api/notifications/${notificationId}/read`,
        token,
        {
          method: "PUT",
        }
      );

      setMessage("تم تعليم التنبيه كمقروء.");
      await refresh();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update notification";

      setError(translateError(errorMessage));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="space-y-6 text-right" dir="rtl">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">التنبيهات</h3>
        <p className="mt-1 text-sm text-slate-500">
          تابعوا آخر التنبيهات المتعلقة بالواجبات، الإعلانات، الأعداد، ونشاط
          ابنكم المدرسي.
        </p>
      </div>

      {message ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="مجموع التنبيهات" value={stats.total} />
        <StatCard label="غير مقروءة" value={stats.unread} />
        <StatCard label="مقروءة" value={stats.read} />
        <StatCard label="آخر 7 أيام" value={stats.last7Days} />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h4 className="mb-4 text-lg font-semibold text-slate-900">
          قائمة التنبيهات
        </h4>

        {loading ? (
          <p className="text-sm text-slate-500">جارٍ تحميل التنبيهات...</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-slate-500">
            لا توجد تنبيهات متاحة حالياً.
          </p>
        ) : (
          <div className="space-y-4">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-5 shadow-sm ${
                  item.isRead
                    ? "border-slate-200 bg-white"
                    : "border-blue-200 bg-blue-50/40"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-lg font-semibold text-slate-900">
                        {translateNotificationTitle(item.title)}
                      </h5>

                      <NotificationTypeBadge type={item.type} />

                      {!item.isRead ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                          غير مقروء
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          مقروء
                        </span>
                      )}
                    </div>

                    <p className="text-sm leading-6 text-slate-600">
                      {translateNotificationMessage(item.message)}
                    </p>

                    <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                      <p>
                        <span className="font-medium text-slate-700">
                          تاريخ التنبيه:
                        </span>{" "}
                        {formatDateTime(item.createdAt)}
                      </p>

                      <p>
                        <span className="font-medium text-slate-700">
                          النوع:
                        </span>{" "}
                        {getTypeLabel(item.type)}
                      </p>
                    </div>
                  </div>

                  {!item.isRead ? (
                    <button
                      onClick={() => handleMarkRead(item.id)}
                      disabled={savingId === item.id}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                      {savingId === item.id
                        ? "جارٍ الحفظ..."
                        : "تعليم كمقروء"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}