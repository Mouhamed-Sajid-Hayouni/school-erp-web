import { useCallback, useEffect, useMemo, useState } from "react";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  class?: {
    id: string;
    name: string;
    academicYear: string;
  };
  subject?: {
    id: string;
    name: string;
    coefficient: number;
  };
  teacher?: {
    id: string;
    user?: {
      firstName?: string;
      lastName?: string;
    };
  } | null;
};

type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  status: string;
  submittedAt: string | null;
  notes: string | null;
  assignment: Assignment;
};

type ParentChildAssignments = {
  id: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  submissions: Submission[];
};

type AssignmentsSectionProps = {
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
    throw new Error((data as { error?: string }).error || "تعذر تنفيذ الطلب.");
  }

  return data as T;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ar-TN");
}

function translateStatus(status: string) {
  if (status === "DONE") return "مُنجز";
  if (status === "PENDING") return "في الانتظار";
  if (status === "SUBMITTED") return "تم التسليم";

  return status;
}

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("load") || normalized.includes("assignments")) {
    return "تعذر تحميل الواجبات.";
  }

  if (normalized.includes("update")) {
    return "تعذر تحديث الواجب.";
  }

  if (normalized.includes("request")) {
    return "تعذر تنفيذ الطلب.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  return message || "حدث خطأ غير متوقع.";
}

function isOverdue(submission: Submission) {
  return (
    submission.status !== "DONE" &&
    new Date(submission.assignment.dueDate).getTime() < Date.now()
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm" dir="rtl">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function SubmissionCard({
  submission,
  onMarkDone,
  savingId,
  canMarkDone,
}: {
  submission: Submission;
  onMarkDone: (submissionId: string) => Promise<void>;
  savingId: string | null;
  canMarkDone: boolean;
}) {
  const overdue = isOverdue(submission);

  const teacherName = `${submission.assignment.teacher?.user?.firstName || ""} ${
    submission.assignment.teacher?.user?.lastName || ""
  }`.trim();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-sm" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-semibold text-slate-900">
              {submission.assignment.title}
            </h4>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                submission.status === "DONE"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {translateStatus(submission.status)}
            </span>

            {overdue ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                متأخر
              </span>
            ) : null}
          </div>

          <p className="text-sm text-slate-600">
            {submission.assignment.description || "لا يوجد وصف."}
          </p>

          <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
            <p>
              <span className="font-medium text-slate-700">المادة:</span>{" "}
              {submission.assignment.subject?.name || "-"}
            </p>
            <p>
              <span className="font-medium text-slate-700">القسم:</span>{" "}
              {submission.assignment.class?.name || "-"}
            </p>
            <p>
              <span className="font-medium text-slate-700">المعلّم:</span>{" "}
              {teacherName || "-"}
            </p>
            <p>
              <span className="font-medium text-slate-700">الأجل:</span>{" "}
              {formatDateTime(submission.assignment.dueDate)}
            </p>
            <p>
              <span className="font-medium text-slate-700">تاريخ التسليم:</span>{" "}
              {submission.submittedAt ? formatDateTime(submission.submittedAt) : "-"}
            </p>
            <p>
              <span className="font-medium text-slate-700">الملاحظات:</span>{" "}
              {submission.notes || "-"}
            </p>
          </div>
        </div>

        {canMarkDone && submission.status !== "DONE" ? (
          <button
            onClick={() => onMarkDone(submission.id)}
            disabled={savingId === submission.id}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {savingId === submission.id ? "جارٍ الحفظ..." : "تحديده كمُنجز"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function AssignmentsSection({
  apiBaseUrl,
  token,
}: AssignmentsSectionProps) {
  const [parentChildren, setParentChildren] = useState<ParentChildAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const data = await apiRequest<ParentChildAssignments[]>(
      `${apiBaseUrl}/api/my-assignments`,
      token
    );

    setParentChildren(Array.isArray(data) ? data : []);

  }, [apiBaseUrl, token]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        await refresh();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "تعذر تحميل الواجبات.";
        setError(translateError(message));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [refresh]);

  const allSubmissions = useMemo(
    () => parentChildren.flatMap((child) => child.submissions || []),
    [parentChildren]
);

  const stats = useMemo(() => {
    const total = allSubmissions.length;
    const done = allSubmissions.filter((item) => item.status === "DONE").length;
    const pending = allSubmissions.filter((item) => item.status !== "DONE").length;
    const overdue = allSubmissions.filter((item) => isOverdue(item)).length;

    return { total, done, pending, overdue };
  }, [allSubmissions]);

  const handleMarkDone = async (submissionId: string) => {
    try {
      setSavingId(submissionId);
      setMessage("");
      setError("");

      await apiRequest(`${apiBaseUrl}/api/assignment-submissions/${submissionId}`, token, {
        method: "PUT",
        body: JSON.stringify({
          status: "DONE",
          notes: "تم تحديد الواجب كمُنجز من فضاء الولي",
        }),
      });

      setMessage("تم تحديث الواجب بنجاح.");
      await refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذر تحديث الواجب.";
      setError(translateError(message));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="space-y-6 text-right" dir="rtl">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">الواجبات</h3>
        <p className="mt-1 text-sm text-slate-500">
          متابعة واجبات الأبناء والآجال وحالة الإنجاز من فضاء الولي.
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
        <StatCard label="مجموع الواجبات" value={stats.total} />
        <StatCard label="في الانتظار" value={stats.pending} />
        <StatCard label="مُنجزة" value={stats.done} />
        <StatCard label="متأخرة" value={stats.overdue} />
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">جارٍ تحميل الواجبات...</p>
        </div>
      ) : parentChildren.length === 0 ? (
  <div className="rounded-2xl bg-white p-6 shadow-sm">
    <p className="text-sm text-slate-500">
      لا توجد واجبات لأبناء هذا الولي.
    </p>
  </div>
) : (
  <div className="space-y-6">
    {parentChildren.map((child) => (
      <div key={child.id} className="space-y-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h4 className="text-lg font-semibold text-slate-900">
            {child.user?.firstName} {child.user?.lastName}
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            {child.submissions.length} واجب
          </p>
        </div>

        {child.submissions.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              لا توجد واجبات لهذا الابن.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {child.submissions.map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onMarkDone={handleMarkDone}
                savingId={savingId}
                canMarkDone={true}
              />
            ))}
          </div>
        )}
      </div>
    ))}
  </div>
)}
    </section>
  );
}