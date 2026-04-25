import { useEffect, useMemo, useState } from "react";

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
    throw new Error(data.error || "Request failed");
  }

  return data as T;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              {submission.status}
            </span>

            {overdue ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                Overdue
              </span>
            ) : null}
          </div>

          <p className="text-sm text-slate-600">
            {submission.assignment.description || "No description"}
          </p>

          <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
            <p>
              <span className="font-medium text-slate-700">Subject:</span>{" "}
              {submission.assignment.subject?.name || "-"}
            </p>
            <p>
              <span className="font-medium text-slate-700">Class:</span>{" "}
              {submission.assignment.class?.name || "-"}
            </p>
            <p>
              <span className="font-medium text-slate-700">Teacher:</span>{" "}
              {submission.assignment.teacher?.user?.firstName || ""}{" "}
              {submission.assignment.teacher?.user?.lastName || ""}
            </p>
            <p>
              <span className="font-medium text-slate-700">Due:</span>{" "}
              {formatDateTime(submission.assignment.dueDate)}
            </p>
            <p>
              <span className="font-medium text-slate-700">Submitted at:</span>{" "}
              {submission.submittedAt ? formatDateTime(submission.submittedAt) : "-"}
            </p>
            <p>
              <span className="font-medium text-slate-700">Notes:</span>{" "}
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
            {savingId === submission.id ? "Saving..." : "Mark as done"}
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
  const role = localStorage.getItem("role") || "";

  const [studentAssignments, setStudentAssignments] = useState<Submission[]>([]);
  const [parentChildren, setParentChildren] = useState<ParentChildAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    const data = await apiRequest<Submission[] | ParentChildAssignments[]>(
      `${apiBaseUrl}/api/my-assignments`,
      token
    );

    if (role === "PARENT") {
      setParentChildren(data as ParentChildAssignments[]);
      setStudentAssignments([]);
    } else {
      setStudentAssignments(data as Submission[]);
      setParentChildren([]);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load assignments");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [apiBaseUrl, token, role]);

  const allParentSubmissions = useMemo(
    () => parentChildren.flatMap((child) => child.submissions || []),
    [parentChildren]
  );

  const allSubmissions = role === "PARENT" ? allParentSubmissions : studentAssignments;

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
          notes: "Marked as done from portal",
        }),
      });

      setMessage("Assignment updated successfully.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignment");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-900">Assignments</h3>
        <p className="mt-1 text-sm text-slate-500">
          Track homework, due dates, and completion status.
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
        <StatCard label="Total assignments" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} />
        <StatCard label="Done" value={stats.done} />
        <StatCard label="Overdue" value={stats.overdue} />
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Loading assignments...</p>
        </div>
      ) : role === "PARENT" ? (
        parentChildren.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">No child assignments found.</p>
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
                    {child.submissions.length} assignment(s)
                  </p>
                </div>

                {child.submissions.length === 0 ? (
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-500">No assignments for this child.</p>
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
        )
      ) : studentAssignments.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">No assignments found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {studentAssignments.map((submission) => (
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
    </section>
  );
}