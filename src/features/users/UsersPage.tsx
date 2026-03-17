import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "../../lib/api";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt?: string;
};

type ClassOption = {
  id: string;
  name: string;
  academicYear?: string;
};

type UsersPageProps = {
  apiBaseUrl: string;
  token: string;
};

type CreateUserPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  classId?: string;
  studentUserId?: string;
};

type UpdateUserPayload = {
  firstName: string;
  lastName: string;
  email: string;
};

const INITIAL_CREATE_FORM: CreateUserPayload = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "STUDENT",
  classId: "",
  studentUserId: "",
};

const INITIAL_EDIT_FORM: UpdateUserPayload = {
  firstName: "",
  lastName: "",
  email: "",
};

export default function UsersPage({ apiBaseUrl, token }: UsersPageProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateUserPayload>(INITIAL_CREATE_FORM);
  const [editForm, setEditForm] = useState<UpdateUserPayload>(INITIAL_EDIT_FORM);

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setError("");

      const json = await apiGet<UserRow[]>(`${apiBaseUrl}/api/users`, token);
      setUsers(Array.isArray(json) ? json : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      setError("");

      const json = await apiGet<ClassOption[]>(`${apiBaseUrl}/api/classes`, token);
      setClasses(Array.isArray(json) ? json : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchClasses();
  }, []);

  const studentUsers = useMemo(
    () => users.filter((user) => user.role === "STUDENT"),
    [users]
  );

  const resetCreateForm = () => {
    setCreateForm(INITIAL_CREATE_FORM);
    setShowCreateForm(false);
  };

  const resetEditForm = () => {
    setEditForm(INITIAL_EDIT_FORM);
    setEditingUserId(null);
  };

  const handleCreateChange = (field: keyof CreateUserPayload, value: string) => {
    setCreateForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "role" && value !== "STUDENT" ? { classId: "" } : {}),
      ...(field === "role" && value !== "PARENT" ? { studentUserId: "" } : {}),
    }));
  };

  const handleEditChange = (field: keyof UpdateUserPayload, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateCreateForm = () => {
    if (
      !createForm.firstName.trim() ||
      !createForm.lastName.trim() ||
      !createForm.email.trim() ||
      !createForm.password.trim()
    ) {
      setError("First name, last name, email, and password are required.");
      return false;
    }

    if (createForm.role === "STUDENT" && !createForm.classId) {
      setError("Please select a class for the student.");
      return false;
    }

    if (createForm.role === "PARENT" && !createForm.studentUserId) {
      setError("Please select a student to link to this parent.");
      return false;
    }

    return true;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCreateForm()) return;

    try {
      setCreating(true);
      setError("");

      await apiPost<{ message: string }, CreateUserPayload>(
        `${apiBaseUrl}/api/register`,
        token,
        {
          email: createForm.email.trim(),
          password: createForm.password.trim(),
          firstName: createForm.firstName.trim(),
          lastName: createForm.lastName.trim(),
          role: createForm.role,
          classId: createForm.role === "STUDENT" ? createForm.classId : undefined,
          studentUserId:
            createForm.role === "PARENT" ? createForm.studentUserId : undefined,
        }
      );

      await fetchUsers();
      resetCreateForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (user: UserRow) => {
    setError("");
    setEditingUserId(user.id);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });
    setShowCreateForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUserId) return;

    if (
      !editForm.firstName.trim() ||
      !editForm.lastName.trim() ||
      !editForm.email.trim()
    ) {
      setError("First name, last name, and email are required.");
      return;
    }

    try {
      setUpdating(true);
      setError("");

      await apiPut<{ message: string }, UpdateUserPayload>(
        `${apiBaseUrl}/api/users/${editingUserId}`,
        token,
        {
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          email: editForm.email.trim(),
        }
      );

      await fetchUsers();
      resetEditForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");

      await apiDelete(`${apiBaseUrl}/api/users/${id}`, token);
      setUsers((prev) => prev.filter((user) => user.id !== id));

      if (editingUserId === id) {
        resetEditForm();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">System Users</h2>
          <p className="text-sm text-slate-500">
            Manage platform accounts and roles.
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateForm((prev) => !prev);
            setEditingUserId(null);
            setEditForm(INITIAL_EDIT_FORM);
            setError("");
          }}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showCreateForm ? "Close" : "Add User"}
        </button>
      </header>

      {error ? <ErrorState message={error} /> : null}

      {showCreateForm ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Create User</h3>

          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">First Name</label>
              <input
                type="text"
                value={createForm.firstName}
                onChange={(e) => handleCreateChange("firstName", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Last Name</label>
              <input
                type="text"
                value={createForm.lastName}
                onChange={(e) => handleCreateChange("lastName", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => handleCreateChange("email", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => handleCreateChange("password", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Role</label>
              <select
                value={createForm.role}
                onChange={(e) =>
                  handleCreateChange("role", e.target.value as Role)
                }
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="TEACHER">TEACHER</option>
                <option value="STUDENT">STUDENT</option>
                <option value="PARENT">PARENT</option>
              </select>
            </div>

            {createForm.role === "STUDENT" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Class</label>
                <select
                  value={createForm.classId}
                  onChange={(e) => handleCreateChange("classId", e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
                  disabled={loadingClasses}
                >
                  <option value="">Select a class</option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.academicYear ? ` (${item.academicYear})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {createForm.role === "PARENT" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Link to Student
                </label>
                <select
                  value={createForm.studentUserId}
                  onChange={(e) =>
                    handleCreateChange("studentUserId", e.target.value)
                  }
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
                >
                  <option value="">Select a student</option>
                  {studentUsers.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} — {student.email}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="md:col-span-2 xl:col-span-3 flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create User"}
              </button>

              <button
                type="button"
                onClick={resetCreateForm}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {editingUserId ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">Edit User</h3>

          <form onSubmit={handleUpdate} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">First Name</label>
              <input
                type="text"
                value={editForm.firstName}
                onChange={(e) => handleEditChange("firstName", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Last Name</label>
              <input
                type="text"
                value={editForm.lastName}
                onChange={(e) => handleEditChange("lastName", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => handleEditChange("email", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2 xl:col-span-3 flex gap-3">
              <button
                type="submit"
                disabled={updating}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {updating ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={resetEditForm}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">User List</h3>
          <button
            onClick={fetchUsers}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loadingUsers ? (
          <LoadingState message="Loading users..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : users.length === 0 ? (
          <EmptyState message="No users found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">Name</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">Created</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-b-0">
                    <td className="px-3 py-3 font-medium">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">{user.email}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(user)}
                          className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deletingId === user.id}
                          className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === user.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}