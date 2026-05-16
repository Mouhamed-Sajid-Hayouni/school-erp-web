import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  profileImage?: string | null;
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
  password: string;
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
  password: "",
};

const roleLabels: Record<Role, string> = {
  ADMIN: "مدير النظام",
  TEACHER: "معلّم",
  STUDENT: "تلميذ",
  PARENT: "ولي",
};

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("first name") || normalized.includes("last name")) {
    return "الاسم واللقب والبريد الإلكتروني مطلوبة.";
  }

  if (normalized.includes("password")) {
    return "يرجى التحقق من كلمة المرور.";
  }

  if (normalized.includes("class")) {
    return "يرجى اختيار القسم المناسب.";
  }

  if (normalized.includes("student")) {
    return "يرجى اختيار التلميذ المرتبط بهذا الولي.";
  }

  if (normalized.includes("profile image")) {
    return "تعذر رفع صورة المستخدم.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  return message || "حدث خطأ غير متوقع.";
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ar-TN");
}

function getInitials(user: UserRow) {
  const first = user.firstName?.trim()?.[0] ?? "";
  const last = user.lastName?.trim()?.[0] ?? "";
  const initials = `${first}${last}`.trim();

  return initials || user.email?.trim()?.[0]?.toUpperCase() || "؟";
}

function getProfileImageUrl(apiBaseUrl: string, profileImage: string | null) {
  if (!profileImage) return "";

  if (profileImage.startsWith("http://") || profileImage.startsWith("https://")) {
    return profileImage;
  }

  const normalizedPath = profileImage.startsWith("/")
    ? profileImage
    : `/${profileImage}`;

  return `${apiBaseUrl}${normalizedPath}`;
}

function UserAvatar({
  apiBaseUrl,
  user,
  size = "md",
}: {
  apiBaseUrl: string;
  user: UserRow;
  size?: "sm" | "md";
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const imageUrl = getProfileImageUrl(apiBaseUrl, user.profileImage);
  const sizeClass = size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";

  const imageUrlWithCacheBust = imageUrl
    ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(
        user.profileImage || ""
      )}`
    : "";

  if (imageUrlWithCacheBust && !imageFailed) {
    return (
      <img
        src={imageUrlWithCacheBust}
        alt={`${user.firstName} ${user.lastName}`}
        className={`${sizeClass} rounded-full border object-cover shadow-sm`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-slate-900 font-semibold text-white shadow-sm`}
      title={
        user.profileImage
          ? `الصورة موجودة ولكن تعذر عرضها: ${user.profileImage}`
          : "لا توجد صورة"
      }
    >
      {getInitials(user)}
    </div>
  );
}

export default function UsersPage({ apiBaseUrl, token }: UsersPageProps) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [createForm, setCreateForm] =
    useState<CreateUserPayload>(INITIAL_CREATE_FORM);
  const [editForm, setEditForm] = useState<UpdateUserPayload>(INITIAL_EDIT_FORM);

  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setError("");

      const json = await apiGet<UserRow[]>(`${apiBaseUrl}/api/users`, token);
      setUsers(Array.isArray(json) ? json : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setError(translateError(message));
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
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setError(translateError(message));
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
      ...(field === "role" && value === "STUDENT" ? { email: "", password: "" } : {}),
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
      (createForm.role !== "STUDENT" && !createForm.email.trim()) ||
      (createForm.role !== "STUDENT" && !createForm.password.trim())
    ) {
      setError(
        createForm.role === "STUDENT"
          ? "الاسم واللقب والبريد الإلكتروني مطلوبة."
          : "الاسم واللقب والبريد الإلكتروني وكلمة المرور مطلوبة."
      );
      return false;
    }

    if (createForm.role === "STUDENT" && !createForm.classId) {
      setError("يرجى اختيار قسم للتلميذ.");
      return false;
    }

    if (createForm.role === "PARENT" && !createForm.studentUserId) {
      setError("يرجى اختيار التلميذ المرتبط بهذا الولي.");
      return false;
    }

    return true;
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateCreateForm()) return;

    try {
      setCreating(true);
      setError("");

      await apiPost<{ message: string }, CreateUserPayload>(
        `${apiBaseUrl}/api/register`,
        token,
        {
          email: createForm.role === "STUDENT" ? "" : createForm.email.trim(),
          password: createForm.role === "STUDENT" ? "" : createForm.password.trim(),
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
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setError(translateError(message));
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
      email: user.role === "STUDENT" ? "" : user.email,
      password: "",
    });
    setShowCreateForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();

    if (!editingUserId) return;

    const trimmedPassword = editForm.password.trim();

    if (
      !editForm.firstName.trim() ||
      !editForm.lastName.trim() ||
      (!isEditingStudent && !editForm.email.trim())
    ) {
      setError(
        isEditingStudent
          ? "\u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0644\u0642\u0628 \u0645\u0637\u0644\u0648\u0628\u0627\u0646."
          : "\u0627\u0644\u0627\u0633\u0645 \u0648\u0627\u0644\u0644\u0642\u0628 \u0648\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0645\u0637\u0644\u0648\u0628\u0629."
      );
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 10) {
      setError("يجب أن تحتوي كلمة المرور الجديدة على 10 أحرف على الأقل.");
      return;
    }

    try {
      setUpdating(true);
      setError("");

      await apiPut<
        { message: string },
        Pick<UpdateUserPayload, "firstName" | "lastName" | "email">
      >(`${apiBaseUrl}/api/users/${editingUserId}`, token, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: isEditingStudent ? "" : editForm.email.trim(),
      });

      if (!isEditingStudent && trimmedPassword) {
        await apiPut<{ message: string }, { password: string }>(
          `${apiBaseUrl}/api/users/${editingUserId}/password`,
          token,
          {
            password: trimmedPassword,
          }
        );
      }

      await fetchUsers();
      resetEditForm();
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setError(translateError(message));
    } finally {
      setUpdating(false);
    }
  };

  const handleProfileImageUpload = async (userId: string, file: File | null) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("يرجى اختيار صورة بصيغة JPG أو PNG أو WEBP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("يجب أن يكون حجم صورة المستخدم أقل من 2MB.");
      return;
    }

    try {
      setUploadingImageId(userId);
      setError("");

      const formData = new FormData();
      formData.append("profileImage", file);

      const response = await fetch(`${apiBaseUrl}/api/users/${userId}/profile-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(json?.error || "تعذر رفع صورة المستخدم.");
      }

      const uploadedUser = json?.user;

      if (
        uploadedUser?.email &&
        uploadedUser.email === localStorage.getItem("userEmail")
      ) {
        localStorage.setItem("profileImage", uploadedUser.profileImage || "");
        window.dispatchEvent(new Event("profile-image-updated"));
      }

      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setError(translateError(message));
    } finally {
      setUploadingImageId(null);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("هل أنت متأكد من حذف هذا المستخدم؟");
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
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setError(translateError(message));
    } finally {
      setDeletingId(null);
    }
  };

  const editingUser = editingUserId
    ? users.find((user) => user.id === editingUserId)
    : null;
  const isEditingStudent = editingUser?.role === "STUDENT";


  return (
    <div className="space-y-6 text-right" dir="rtl">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">المستخدمون</h2>
          <p className="text-sm text-slate-500">
            إدارة حسابات المنصة والأدوار وصور المستخدمين.
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
          {showCreateForm ? "إغلاق" : "إضافة مستخدم"}
        </button>
      </header>

      {error ? <ErrorState message={error} /> : null}

      {showCreateForm ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">إنشاء مستخدم</h3>

          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الاسم</label>
              <input
                type="text"
                value={createForm.firstName}
                onChange={(e) => handleCreateChange("firstName", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">اللقب</label>
              <input
                type="text"
                value={createForm.lastName}
                onChange={(e) => handleCreateChange("lastName", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            {createForm.role !== "STUDENT" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                dir="ltr"
                value={createForm.email}
                onChange={(e) => handleCreateChange("email", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-400"
              />
            </div>
            ) : null}

            {createForm.role !== "STUDENT" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  كلمة المرور
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={createForm.password}
                  onChange={(e) => handleCreateChange("password", e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-400"
                />
                <p className="text-xs text-slate-500">
                  مطلوبة لحسابات المدير والمعلّم والولي.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                لا يحتاج سجل التلميذ إلى كلمة مرور. الولي هو من يستعمل النظام.
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الدور</label>
              <select
                value={createForm.role}
                onChange={(e) =>
                  handleCreateChange("role", e.target.value as Role)
                }
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              >
                <option value="ADMIN">مدير النظام</option>
                <option value="TEACHER">معلّم</option>
                <option value="STUDENT">تلميذ</option>
                <option value="PARENT">ولي</option>
              </select>
            </div>

            {createForm.role === "STUDENT" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">القسم</label>
                <select
                  value={createForm.classId}
                  onChange={(e) => handleCreateChange("classId", e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
                  disabled={loadingClasses}
                >
                  <option value="">اختر قسمًا</option>
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
                  ربط الولي بتلميذ
                </label>
                <select
                  value={createForm.studentUserId}
                  onChange={(e) =>
                    handleCreateChange("studentUserId", e.target.value)
                  }
                  className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
                >
                  <option value="">اختر تلميذًا</option>
                  {studentUsers.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="flex gap-3 md:col-span-2 xl:col-span-3">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {creating ? "جارٍ الإنشاء..." : "إنشاء المستخدم"}
              </button>

              <button
                type="button"
                onClick={resetCreateForm}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {editingUserId ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold">تعديل المستخدم</h3>

          <form onSubmit={handleUpdate} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">الاسم</label>
              <input
                type="text"
                value={editForm.firstName}
                onChange={(e) => handleEditChange("firstName", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">اللقب</label>
              <input
                type="text"
                value={editForm.lastName}
                onChange={(e) => handleEditChange("lastName", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:border-slate-400"
              />
            </div>

            {!isEditingStudent ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                dir="ltr"
                value={editForm.email}
                onChange={(e) => handleEditChange("email", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-400"
              />
            </div>
            ) : null}

            {!isEditingStudent ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                كلمة مرور جديدة
              </label>
              <input
                type="password"
                dir="ltr"
                value={editForm.password}
                onChange={(e) => handleEditChange("password", e.target.value)}
                placeholder="اتركها فارغة للحفاظ على كلمة المرور الحالية"
                className="w-full rounded-xl border px-3 py-2 text-left outline-none focus:border-slate-400"
              />
              <p className="text-xs text-slate-500">
                اختيارية. الحد الأدنى 10 أحرف.
              </p>
            </div>
            ) : null}

            <div className="flex gap-3 md:col-span-2 xl:col-span-3">
              <button
                type="submit"
                disabled={updating}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {updating ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </button>

              <button
                type="button"
                onClick={resetEditForm}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold">قائمة المستخدمين</h3>
          <button
            onClick={fetchUsers}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            تحديث
          </button>
        </div>

        {loadingUsers ? (
          <LoadingState message="جارٍ تحميل المستخدمين..." />
        ) : error ? (
          <ErrorState message={error} />
        ) : users.length === 0 ? (
          <EmptyState message="لا يوجد مستخدمون." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-right text-sm text-slate-500">
                  <th className="px-3 py-3 font-medium">المستخدم</th>
                  <th className="px-3 py-3 font-medium">البريد الإلكتروني</th>
                  <th className="px-3 py-3 font-medium">الدور</th>
                  <th className="px-3 py-3 font-medium">تاريخ الإنشاء</th>
                  <th className="px-3 py-3 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b last:border-b-0">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar apiBaseUrl={apiBaseUrl} user={user} />
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {user.profileImage
                              ? "تم رفع صورة المستخدم"
                              : "لا توجد صورة"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3 text-left text-sm text-slate-600" dir="ltr">
                      {user.role === "STUDENT" ? "\u0628\u062f\u0648\u0646 \u0628\u0631\u064a\u062f \u062f\u062e\u0648\u0644" : user.email}
                    </td>

                    <td className="px-3 py-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                        {roleLabels[user.role]}
                      </span>
                    </td>

                    <td className="px-3 py-3 text-sm text-slate-600">
                      {formatDate(user.createdAt)}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <label
                          className={`cursor-pointer rounded-lg border px-3 py-1 text-sm hover:bg-slate-50 ${
                            uploadingImageId === user.id
                              ? "pointer-events-none opacity-50"
                              : ""
                          }`}
                        >
                          {uploadingImageId === user.id
                            ? "جارٍ الرفع..."
                            : "رفع صورة"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={uploadingImageId === user.id}
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              handleProfileImageUpload(user.id, file);
                              event.currentTarget.value = "";
                            }}
                          />
                        </label>

                        <button
                          onClick={() => startEdit(user)}
                          className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
                        >
                          تعديل
                        </button>

                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deletingId === user.id}
                          className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === user.id ? "جارٍ الحذف..." : "حذف"}
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