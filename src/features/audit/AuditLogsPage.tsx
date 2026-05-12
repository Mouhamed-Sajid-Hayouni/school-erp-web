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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const actionLabels: Record<string, string> = {
  CREATE_USER: "Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø³ØªØ®Ø¯Ù…",
  UPDATE_USER: "ØªØ¹Ø¯ÙŠÙ„ Ù…Ø³ØªØ®Ø¯Ù…",
  DELETE_USER: "Ø­Ø°Ù Ù…Ø³ØªØ®Ø¯Ù…",

  CREATE_CLASS: "Ø¥Ù†Ø´Ø§Ø¡ Ù‚Ø³Ù…",
  DELETE_CLASS: "Ø­Ø°Ù Ù‚Ø³Ù…",

  CREATE_SUBJECT: "Ø¥Ù†Ø´Ø§Ø¡ Ù…Ø§Ø¯Ø©",
  DELETE_SUBJECT: "Ø­Ø°Ù Ù…Ø§Ø¯Ø©",

  CREATE_GRADE: "ØªØ³Ø¬ÙŠÙ„ Ø¹Ø¯Ø¯",
  UPDATE_GRADE: "ØªØ¹Ø¯ÙŠÙ„ Ø¹Ø¯Ø¯",

  CREATE_ATTENDANCE: "ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ± ÙˆØºÙŠØ§Ø¨",
  UPDATE_ATTENDANCE: "ØªØ¹Ø¯ÙŠÙ„ Ø­Ø¶ÙˆØ± ÙˆØºÙŠØ§Ø¨",

  CREATE_SCHEDULE: "Ø¥Ù†Ø´Ø§Ø¡ Ø­ØµØ©",
  UPDATE_SCHEDULE: "ØªØ¹Ø¯ÙŠÙ„ Ø­ØµØ©",
  DELETE_SCHEDULE: "Ø­Ø°Ù Ø­ØµØ©",

  CREATE_ASSIGNMENT: "Ø¥Ù†Ø´Ø§Ø¡ ÙˆØ§Ø¬Ø¨",
  UPDATE_ASSIGNMENT: "ØªØ¹Ø¯ÙŠÙ„ ÙˆØ§Ø¬Ø¨",
  DELETE_ASSIGNMENT: "Ø­Ø°Ù ÙˆØ§Ø¬Ø¨",

  CREATE_ANNOUNCEMENT: "Ø¥Ù†Ø´Ø§Ø¡ Ø¥Ø¹Ù„Ø§Ù†",
  UPDATE_ANNOUNCEMENT: "ØªØ¹Ø¯ÙŠÙ„ Ø¥Ø¹Ù„Ø§Ù†",
  DELETE_ANNOUNCEMENT: "Ø­Ø°Ù Ø¥Ø¹Ù„Ø§Ù†",

  UPDATE_SCHOOL_SETTINGS: "ØªØ¹Ø¯ÙŠÙ„ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø¯Ø±Ø³Ø©",

  NOTIFY_BULLETIN: "Ø¥Ø±Ø³Ø§Ù„ Ø¥Ø´Ø¹Ø§Ø± Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„Ø£Ø¹Ø¯Ø§Ø¯",
};

const entityLabels: Record<string, string> = {
  User: "Ù…Ø³ØªØ®Ø¯Ù…",
  Class: "Ù‚Ø³Ù…",
  Subject: "Ù…Ø§Ø¯Ø©",
  Grade: "Ø¹Ø¯Ø¯",
  Attendance: "Ø­Ø¶ÙˆØ± ÙˆØºÙŠØ§Ø¨",
  Schedule: "Ø¬Ø¯ÙˆÙ„ Ø£ÙˆÙ‚Ø§Øª",
  Assignment: "ÙˆØ§Ø¬Ø¨",
  Announcement: "Ø¥Ø¹Ù„Ø§Ù†",
  SchoolSettings: "Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ø¯Ø±Ø³Ø©",
  Student: "ØªÙ„Ù…ÙŠØ°",
  Bulletin: "Ø¨Ø·Ø§Ù‚Ø© Ø£Ø¹Ø¯Ø§Ø¯",
};

const roleLabels: Record<string, string> = {
  ADMIN: "Ù…Ø¯ÙŠØ± Ø§Ù„Ù†Ø¸Ø§Ù…",
  TEACHER: "Ù…Ø¹Ù„Ù‘Ù…",
  STUDENT: "ØªÙ„Ù…ÙŠØ°",
  PARENT: "ÙˆÙ„ÙŠ",
};

function formatAction(action: string) {
  return actionLabels[action] ?? action.replaceAll("_", " ");
}

function formatEntity(entity: string) {
  return entityLabels[entity] ?? entity;
}

function formatRole(role?: string | null) {
  if (!role) return "-";
  return roleLabels[role] ?? role;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ar-TN");
}

function formatDetails(details: unknown, pretty = false) {
  if (!details) return "-";

  try {
    return JSON.stringify(details, null, pretty ? 2 : 0);
  } catch {
    return String(details);
  }
}

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("audit")) {
    return "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø³Ø¬Ù„Ù‘ Ø§Ù„Ù†Ø´Ø§Ø·.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "Ø§Ù†ØªÙ‡Øª Ø§Ù„Ø¬Ù„Ø³Ø© Ø£Ùˆ Ø£Ù† Ø±Ù…Ø² Ø§Ù„Ø¯Ø®ÙˆÙ„ ØºÙŠØ± ØµØ§Ù„Ø­. ÙŠØ±Ø¬Ù‰ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ù…Ù† Ø¬Ø¯ÙŠØ¯.";
  }

  return message || "Ø­Ø¯Ø« Ø®Ø·Ø£ ØºÙŠØ± Ù…ØªÙˆÙ‚Ø¹.";
}

function getActorName(log: AuditLog) {
  return (
    log.actorName ||
    `${log.actor?.firstName ?? ""} ${log.actor?.lastName ?? ""}`.trim() ||
    "Ø§Ù„Ù†Ø¸Ø§Ù…"
  );
}

export default function AuditLogsPage({ apiBaseUrl, token }: AuditLogsPageProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [actorRole, setActorRole] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("limit", String(limit));

    if (action) params.set("action", action);
    if (entity) params.set("entity", entity);
    if (actorRole) params.set("actorRole", actorRole);

    return params.toString();
  }, [action, entity, actorRole, page, limit]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiGet<AuditLogsResponse>(
        `${apiBaseUrl}/api/audit-logs?${queryString}`,
        token
      );

      setLogs(Array.isArray(response.data) ? response.data : []);
      setTotal(Number(response.total) || 0);
      setTotalPages(Math.max(Number(response.totalPages) || 1, 1));

      if (response.page && response.page !== page) {
        setPage(response.page);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø³Ø¬Ù„Ù‘ Ø§Ù„Ù†Ø´Ø§Ø·.";
      setError(translateError(message));
      setLogs([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [queryString]);

  const resetToFirstPage = () => {
    setPage(1);
  };

  const handleActionChange = (value: string) => {
    setAction(value);
    resetToFirstPage();
  };

  const handleEntityChange = (value: string) => {
    setEntity(value);
    resetToFirstPage();
  };

  const handleRoleChange = (value: string) => {
    setActorRole(value);
    resetToFirstPage();
  };

  const handleLimitChange = (value: string) => {
    setLimit(Number(value));
    resetToFirstPage();
  };

  const exportAuditLogsExcel = () => {
    const escapeHtml = (value: unknown) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const rows = logs.map((log) => ({
      date: formatDate(log.createdAt),
      actor: getActorName(log),
      role: formatRole(log.actorRole),
      action: formatAction(log.action),
      entity: formatEntity(log.entity),
      entityId: log.entityId ?? "",
      ipAddress: log.ipAddress ?? "",
      details: formatDetails(log.details),
    }));

    const html = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8" />
          <style>
            table {
              border-collapse: collapse;
              font-family: Calibri, Arial, sans-serif;
              font-size: 11pt;
              direction: rtl;
            }

            th {
              font-weight: bold;
              background: #f1f5f9;
            }

            th, td {
              border: 1px solid #94a3b8;
              padding: 6px 8px;
              vertical-align: top;
              text-align: right;
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
              width: 120px;
              white-space: nowrap;
            }

            .action-col {
              width: 210px;
              white-space: nowrap;
            }

            .entity-col {
              width: 130px;
              white-space: nowrap;
            }

            .entity-id-col {
              width: 280px;
              direction: ltr;
              text-align: left;
              white-space: nowrap;
            }

            .ip-col {
              width: 130px;
              direction: ltr;
              text-align: left;
              white-space: nowrap;
            }

            .details-col {
              width: 650px;
              direction: ltr;
              text-align: left;
              white-space: normal;
            }
          </style>
        </head>

        <body>
          <table>
            <thead>
              <tr>
                <th class="date-col">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                <th class="actor-col">Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…</th>
                <th class="role-col">Ø§Ù„Ø¯ÙˆØ±</th>
                <th class="action-col">Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</th>
                <th class="entity-col">Ø§Ù„Ø¹Ù†ØµØ±</th>
                <th class="entity-id-col">Ù…Ø¹Ø±Ù‘Ù Ø§Ù„Ø¹Ù†ØµØ±</th>
                <th class="ip-col">Ø¹Ù†ÙˆØ§Ù† IP</th>
                <th class="details-col">Ø§Ù„ØªÙØ§ØµÙŠÙ„</th>
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
                      <td class="ip-col">${escapeHtml(row.ipAddress)}</td>
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
    link.download = `audit-logs-page-${page}-${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const totalLogs = total;
  const latestLog = logs[0];

  const firstVisibleLog = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastVisibleLog = Math.min(page * limit, total);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <section>
        <h1 className="text-2xl font-bold text-slate-900">Ø³Ø¬Ù„Ù‘ Ø§Ù„Ù†Ø´Ø§Ø·</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ù…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª Ø§Ù„Ù…Ù‡Ù…Ù‘Ø© Ø§Ù„ØªÙŠ ØªØªÙ… Ø¯Ø§Ø®Ù„ Ù…Ù†Ø¸ÙˆÙ…Ø© Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ø¯Ø±Ø³Ø©.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø³Ø¬Ù„Ø§Øª</p>
          <p className="mt-2 text-2xl font-bold">{totalLogs}</p>
          <p className="mt-1 text-xs text-slate-400">
            ÙŠØªÙ… Ø¹Ø±Ø¶ {logs.length} Ø³Ø¬Ù„ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„ØµÙØ­Ø©
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ø¢Ø®Ø± Ø¥Ø¬Ø±Ø§Ø¡</p>
          <p className="mt-2 truncate text-lg font-semibold">
            {latestLog ? formatAction(latestLog.action) : "-"}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ø¢Ø®Ø± Ù…Ø³ØªØ®Ø¯Ù…</p>
          <p className="mt-2 truncate text-lg font-semibold">
            {latestLog ? getActorName(latestLog) : "-"}
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡
            </label>
            <select
              value={action}
              onChange={(e) => handleActionChange(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">ÙƒÙ„ Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</option>
              {ACTION_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {formatAction(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ø§Ù„Ø¹Ù†ØµØ±
            </label>
            <select
              value={entity}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">ÙƒÙ„ Ø§Ù„Ø¹Ù†Ø§ØµØ±</option>
              {ENTITY_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {formatEntity(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ø§Ù„Ø¯ÙˆØ±
            </label>
            <select
              value={actorRole}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              <option value="">ÙƒÙ„ Ø§Ù„Ø£Ø¯ÙˆØ§Ø±</option>
              {ROLE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {formatRole(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Ø­Ø¬Ù… Ø§Ù„ØµÙØ­Ø©
            </label>
            <select
              value={limit}
              onChange={(e) => handleLimitChange(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-slate-400"
            >
              {PAGE_SIZE_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item} / ØµÙØ­Ø©
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={fetchLogs}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              ØªØ­Ø¯ÙŠØ«
            </button>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={exportAuditLogsExcel}
              disabled={logs.length === 0}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ØªØµØ¯ÙŠØ± Excel
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <LoadingState message="Ø¬Ø§Ø±Ù ØªØ­Ù…ÙŠÙ„ Ø³Ø¬Ù„Ù‘ Ø§Ù„Ù†Ø´Ø§Ø·..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : logs.length === 0 ? (
        <EmptyState message="Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø¬Ù„Ø§Øª Ù†Ø´Ø§Ø·." />
      ) : (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b bg-slate-50 text-right text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ø§Ù„ØªØ§Ø±ÙŠØ®</th>
                  <th className="px-4 py-3">Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…</th>
                  <th className="px-4 py-3">Ø§Ù„Ø¯ÙˆØ±</th>
                  <th className="px-4 py-3">Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡</th>
                  <th className="px-4 py-3">Ø§Ù„Ø¹Ù†ØµØ±</th>
                  <th className="px-4 py-3">Ø§Ù„ØªÙØ§ØµÙŠÙ„</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {logs.map((log) => {
                  const actorName = getActorName(log);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        {formatDate(log.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {actorName}
                        </div>
                        <div className="text-left text-xs text-slate-500" dir="ltr">
                          {log.actor?.email ?? ""}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                          {formatRole(log.actorRole)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          {formatAction(log.action)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium">{formatEntity(log.entity)}</div>
                        <div className="max-w-[180px] truncate text-left text-xs text-slate-500" dir="ltr">
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
                            dir="ltr"
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

          <div className="flex flex-col gap-3 border-t px-4 py-4 text-sm md:flex-row md:items-center md:justify-between">
            <p className="text-slate-500">
              Ø¹Ø±Ø¶{" "}
              <span className="font-medium text-slate-700">
                {firstVisibleLog}
              </span>{" "}
              Ø¥Ù„Ù‰{" "}
              <span className="font-medium text-slate-700">
                {lastVisibleLog}
              </span>{" "}
              Ù…Ù†{" "}
              <span className="font-medium text-slate-700">{total}</span> Ø³Ø¬Ù„
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!canGoPrevious}
                className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ø§Ù„Ø³Ø§Ø¨Ù‚
              </button>

              <span className="rounded-xl bg-slate-100 px-4 py-2 font-medium text-slate-700">
                Ø§Ù„ØµÙØ­Ø© {page} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={!canGoNext}
                className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ø§Ù„ØªØ§Ù„ÙŠ
              </button>
            </div>
          </div>
        </section>
      )}

      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white p-6 text-right shadow-xl"
            dir="rtl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  ØªÙØ§ØµÙŠÙ„ Ø³Ø¬Ù„Ù‘ Ø§Ù„Ù†Ø´Ø§Ø·
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatAction(selectedLog.action)} â€¢ {formatEntity(selectedLog.entity)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-lg px-3 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Ø¥ØºÙ„Ø§Ù‚
              </button>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-slate-500">Ø§Ù„ØªØ§Ø±ÙŠØ®</p>
                <p className="font-medium">
                  {formatDate(selectedLog.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-slate-500">Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…</p>
                <p className="font-medium">{getActorName(selectedLog)}</p>
              </div>

              <div>
                <p className="text-slate-500">Ø§Ù„Ø¯ÙˆØ±</p>
                <p className="font-medium">{formatRole(selectedLog.actorRole)}</p>
              </div>

              <div>
                <p className="text-slate-500">Ø¹Ù†ÙˆØ§Ù† IP</p>
                <p className="text-left font-medium" dir="ltr">
                  {selectedLog.ipAddress ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-slate-500">Ø§Ù„Ø¹Ù†ØµØ±</p>
                <p className="font-medium">{formatEntity(selectedLog.entity)}</p>
              </div>

              <div>
                <p className="text-slate-500">Ù…Ø¹Ø±Ù‘Ù Ø§Ù„Ø¹Ù†ØµØ±</p>
                <p className="break-all text-left font-medium" dir="ltr">
                  {selectedLog.entityId ?? "-"}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm text-slate-500">Ø§Ù„ØªÙØ§ØµÙŠÙ„</p>
              <pre className="max-h-[360px] overflow-auto rounded-xl bg-slate-950 p-4 text-left text-xs text-slate-100" dir="ltr">
                {formatDetails(selectedLog.details, true)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
