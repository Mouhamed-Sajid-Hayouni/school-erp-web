import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";

type AuditActor = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type AuditLog = {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
  actor?: AuditActor | null;
};

type AuditLogsResponse = {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type AuditLogsPageProps = {
  apiBaseUrl: string;
  token: string;
};

const ACTION_OPTIONS = [
  "CREATE_USER",
  "UPDATE_USER",
  "DELETE_USER",

  "CREATE_CLASS",
  "DELETE_CLASS",

  "CREATE_SUBJECT",
  "DELETE_SUBJECT",

  "CREATE_GRADE",
  "UPDATE_GRADE",

  "CREATE_ATTENDANCE",
  "UPDATE_ATTENDANCE",

  "CREATE_SCHEDULE",
  "UPDATE_SCHEDULE",
  "DELETE_SCHEDULE",

  "CREATE_ASSIGNMENT",
  "UPDATE_ASSIGNMENT",
  "DELETE_ASSIGNMENT",

  "CREATE_ANNOUNCEMENT",
  "UPDATE_ANNOUNCEMENT",
  "DELETE_ANNOUNCEMENT",

  "UPDATE_SCHOOL_SETTINGS",

  "NOTIFY_BULLETIN",
];

const ENTITY_OPTIONS = [
  "User",
  "Class",
  "Subject",
  "Grade",
  "Attendance",
  "Schedule",
  "Assignment",
  "Announcement",
  "SchoolSettings",
  "Student",
  "Bulletin",
];

const ROLE_OPTIONS = ["ADMIN", "TEACHER", "STUDENT", "PARENT"];

function formatAction(action: string) {
  return action.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatDetails(details: unknown) {
  if (!details) return "-";

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

export default function AuditLogsPage({ apiBaseUrl, token }: AuditLogsPageProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [actorRole, setActorRole] = useState("");

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    params.set("limit", "100");

    if (action) params.set("action", action);
    if (entity) params.set("entity", entity);
    if (actorRole) params.set("actorRole", actorRole);

    return params.toString();
  }, [action, entity, actorRole]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiGet<AuditLogsResponse>(
        `${apiBaseUrl}/api/audit-logs?${queryString}`,
        token
      );

      setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [queryString]);

  const totalLogs = logs.length;
  const latestLog = logs[0];

  const exportAuditLogsCsv = () => {
  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const formatDetailsForExcel = (details: AuditLog["details"]) => {
    if (!details) return "-";

    try {
      if (typeof details === "string") {
        return details;
      }

      return JSON.stringify(details);
    } catch {
      return String(details);
    }
  };

  const rows = logs.map((log) => {
    const actorName =
      log.actorName ||
      `${log.actor?.firstName ?? ""} ${log.actor?.lastName ?? ""}`.trim() ||
      "System";

    return {
      date: formatDate(log.createdAt),
      actor: actorName,
      role: log.actorRole ?? "",
      action: formatAction(log.action),
      entity: log.entity,
      entityId: log.entityId ?? "",
      details: formatDetailsForExcel(log.details),
    };
  });

  const html = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table {
            border-collapse: collapse;
            font-family: Calibri, Arial, sans-serif;
            font-size: 11pt;
          }

          th {
            font-weight: bold;
            background: #f1f5f9;
          }

          th, td {
            border: 1px solid #94a3b8;
            padding: 6px 8px;
            vertical-align: top;
          }

          .date-col {
            width: 170px;
            white-space: nowrap;
            mso-number-format: "\\@";
          }

          .actor-col {
            width: 190px;
            direction: rtl;
            unicode-bidi: plaintext;
            white-space: nowrap;
          }

          .role-col {
            width: 70px;
            white-space: nowrap;
          }

          .action-col {
            width: 190px;
            white-space: nowrap;
          }

          .entity-col {
            width: 120px;
            white-space: nowrap;
          }

          .entity-id-col {
            width: 280px;
            white-space: nowrap;
          }

          .details-col {
            width: 650px;
            white-space: normal;
          }
        </style>
      </head>

      <body>
        <table>
          <thead>
            <tr>
              <th class="date-col">Date</th>
              <th class="actor-col">Actor</th>
              <th class="role-col">Role</th>
              <th class="action-col">Action</th>
              <th class="entity-col">Entity</th>
              <th class="entity-id-col">Entity ID</th>
              <th class="details-col">Details</th>
            </tr>
          </thead>

          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td class="date-col">${escapeHtml(row.date)}</td>
                    <td class="actor-col">${escapeHtml(row.actor)}</td>
                    <td class="role-col">${escapeHtml(row.role)}</td>
                    <td class="action-col">${escapeHtml(row.action)}</td>
                    <td class="entity-col">${escapeHtml(row.entity)}</td>
                    <td class="entity-id-col">${escapeHtml(row.entityId)}</td>
                    <td class="details-col">${escapeHtml(row.details)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF" + html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track important actions performed inside the ERP.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Loaded Logs</p>
          <p className="mt-2 text-2xl font-bold">{totalLogs}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Latest Action</p>
          <p className="mt-2 text-lg font-semibold">
            {latestLog ? formatAction(latestLog.action) : "-"}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Latest Actor</p>
          <p className="mt-2 text-lg font-semibold">
            {latestLog?.actorName ||
              `${latestLog?.actor?.firstName ?? ""} ${latestLog?.actor?.lastName ?? ""}`.trim() ||
              "-"}
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Action
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All actions</option>
              {ACTION_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {formatAction(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Entity
            </label>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All entities</option>
              {ENTITY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Role
            </label>
            <select
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchLogs}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={exportAuditLogsCsv}
              disabled={logs.length === 0}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Export Excel
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <LoadingState message="Loading audit logs..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : logs.length === 0 ? (
        <EmptyState message="No audit logs found." />
      ) : (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {logs.map((log) => {
                  const actorName =
                    log.actorName ||
                    `${log.actor?.firstName ?? ""} ${log.actor?.lastName ?? ""}`.trim() ||
                    "System";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatDate(log.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{actorName}</div>
                        <div className="text-xs text-slate-500">
                          {log.actor?.email ?? ""}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                          {log.actorRole ?? "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          {formatAction(log.action)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium">{log.entity}</div>
                        <div className="max-w-[180px] truncate text-xs text-slate-500">
                          {log.entityId ?? ""}
                        </div>
                      </td>

                      <td className="max-w-[420px] px-4 py-3 text-slate-600">
  {log.details ? (
    <button
      type="button"
      onClick={() => setSelectedLog(log)}
      className="max-w-[420px] truncate rounded-lg bg-slate-50 px-3 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
      title={formatDetails(log.details)}
    >
      {formatDetails(log.details)}
    </button>
  ) : (
    "-"
  )}
</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Audit Log Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatAction(selectedLog.action)} • {selectedLog.entity}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg px-3 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-slate-500">Date</p>
                <p className="font-medium">{formatDate(selectedLog.createdAt)}</p>
              </div>

              <div>
                <p className="text-slate-500">Actor</p>
                <p className="font-medium">
                  {selectedLog.actorName ||
                    `${selectedLog.actor?.firstName ?? ""} ${selectedLog.actor?.lastName ?? ""}`.trim() ||
                    "System"}
                </p>
              </div>

              <div>
                <p className="text-slate-500">Role</p>
                <p className="font-medium">{selectedLog.actorRole ?? "-"}</p>
              </div>

              <div>
                <p className="text-slate-500">Entity ID</p>
                <p className="break-all font-medium">
                  {selectedLog.entityId ?? "-"}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm text-slate-500">Details</p>
              <pre className="max-h-[360px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                {formatDetails(selectedLog.details)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}