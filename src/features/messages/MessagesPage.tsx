import { useEffect, useMemo, useState } from "react";

import { API_BASE_URL } from "../../lib/config";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";

type UserSummary = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: UserSummary;
};

type ConversationParticipant = {
  id: string;
  conversationId: string;
  userId: string;
  lastReadAt: string | null;
  user: UserSummary;
};

type ConversationListItem = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  lastMessage: Message | null;
  unreadCount: number;
};

type ConversationDetails = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  messages: Message[];
};

type MessagesPageProps = {
  initialConversationId?: string | null;
  onInitialConversationOpened?: () => void;
};

const roleLabels: Record<Role, string> = {
  ADMIN: "مدير النظام",
  TEACHER: "معلّم",
  STUDENT: "تلميذ",
  PARENT: "ولي",
};

const getToken = () => localStorage.getItem("token");

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

const formatUserName = (user: UserSummary) => {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
};

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString("ar-TN");
};

function translateError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("recipients")) {
    return "تعذر تحميل قائمة المستلمين.";
  }

  if (normalized.includes("conversations")) {
    return "تعذر تحميل المحادثات.";
  }

  if (normalized.includes("conversation")) {
    return "تعذر تحميل المحادثة.";
  }

  if (normalized.includes("recipient")) {
    return "يرجى اختيار مستلم.";
  }

  if (normalized.includes("message")) {
    return "يرجى كتابة رسالة.";
  }

  if (normalized.includes("send")) {
    return "تعذر إرسال الرسالة.";
  }

  if (normalized.includes("unauthorized") || normalized.includes("invalid token")) {
    return "انتهت الجلسة أو أن رمز الدخول غير صالح. يرجى تسجيل الدخول من جديد.";
  }

  return message || "حدث خطأ غير متوقع.";
}

export default function MessagesPage({
  initialConversationId,
  onInitialConversationOpened,
}: MessagesPageProps) {
  const [recipients, setRecipients] = useState<UserSummary[]>([]);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationDetails | null>(null);

  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [newConversationMessage, setNewConversationMessage] = useState("");
  const [replyBody, setReplyBody] = useState("");

  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [error, setError] = useState("");

  const selectedRecipient = useMemo(() => {
    return (
      recipients.find((recipient) => recipient.id === selectedRecipientId) ||
      null
    );
  }, [recipients, selectedRecipientId]);

  const fetchRecipients = async () => {
    const response = await fetch(`${API_BASE_URL}/api/messages/recipients`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch recipients.");
    }

    const data = await response.json();
    setRecipients(Array.isArray(data) ? data : []);
  };

  const fetchConversations = async () => {
    setIsLoadingConversations(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/messages/conversations`,
        {
          headers: authHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch conversations.");
      }

      const data = await response.json();
      setConversations(Array.isArray(data) ? data : []);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const fetchConversationDetails = async (conversationId: string) => {
    setIsLoadingConversation(true);
    setSelectedConversationId(conversationId);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/messages/conversations/${conversationId}`,
        {
          headers: authHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch conversation.");
      }

      const data = await response.json();
      setSelectedConversation(data);
      await fetchConversations();
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const createConversation = async () => {
    setError("");

    if (!selectedRecipientId) {
      setError("يرجى اختيار مستلم.");
      return;
    }

    if (!newConversationMessage.trim()) {
      setError("يرجى كتابة رسالة.");
      return;
    }

    setIsCreatingConversation(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/messages/conversations`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            participantIds: [selectedRecipientId],
            message: newConversationMessage.trim(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to create conversation.");
      }

      const data = await response.json();

      setSelectedRecipientId("");
      setNewConversationMessage("");

      await fetchConversations();

      if (data?.conversation?.id) {
        await fetchConversationDetails(data.conversation.id);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذر إنشاء المحادثة.";
      setError(translateError(message));
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const sendReply = async () => {
    setError("");

    if (!selectedConversationId) return;

    if (!replyBody.trim()) {
      setError("يرجى كتابة رسالة.");
      return;
    }

    setIsSendingReply(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/messages/conversations/${selectedConversationId}/messages`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            body: replyBody.trim(),
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to send message.");
      }

      setReplyBody("");
      await fetchConversationDetails(selectedConversationId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذر إرسال الرسالة.";
      setError(translateError(message));
    } finally {
      setIsSendingReply(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setError("");

      try {
        await Promise.all([fetchRecipients(), fetchConversations()]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "تعذر تحميل الرسائل.";
        setError(translateError(message));
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!initialConversationId) return;

    const openInitialConversation = async () => {
      try {
        setError("");
        await fetchConversationDetails(initialConversationId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "تعذر فتح المحادثة.";
        setError(translateError(message));
      } finally {
        onInitialConversationOpened?.();
      }
    };

    openInitialConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId]);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">الرسائل</h1>
        <p className="text-sm text-slate-500">
          إرسال رسائل خاصة بين المديرين والمعلّمين والتلاميذ والأولياء.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              محادثة جديدة
            </h2>

            <div className="space-y-3">
              <select
                value={selectedRecipientId}
                onChange={(event) => setSelectedRecipientId(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">اختر المستلم</option>
                {recipients.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {formatUserName(recipient)} — {roleLabels[recipient.role]}
                  </option>
                ))}
              </select>

              {selectedRecipient && (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  سيتم الإرسال إلى{" "}
                  <span className="font-semibold">
                    {formatUserName(selectedRecipient)}
                  </span>
                </div>
              )}

              <textarea
                value={newConversationMessage}
                onChange={(event) =>
                  setNewConversationMessage(event.target.value)
                }
                rows={4}
                placeholder="اكتب رسالتك الأولى..."
                className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              <button
                type="button"
                onClick={createConversation}
                disabled={isCreatingConversation}
                className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreatingConversation ? "جارٍ البدء..." : "بدء المحادثة"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-900">
                المحادثات
              </h2>
            </div>

            {isLoadingConversations ? (
              <div className="p-4 text-sm text-slate-500">
                جارٍ تحميل المحادثات...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">
                لا توجد محادثات بعد.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {conversations.map((conversation) => {
                  const title =
                    conversation.title ||
                    conversation.participants
                      .map((participant) => participant.user)
                      .filter(Boolean)
                      .map(formatUserName)
                      .join("، ");

                  const isSelected = conversation.id === selectedConversationId;

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => fetchConversationDetails(conversation.id)}
                      className={`w-full px-4 py-3 text-right hover:bg-slate-50 ${
                        isSelected ? "bg-blue-50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {title || "محادثة"}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">
                            {conversation.lastMessage
                              ? conversation.lastMessage.body
                              : "لا توجد رسائل بعد"}
                          </div>
                        </div>

                        {conversation.unreadCount > 0 && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          {!selectedConversationId ? (
            <div className="flex min-h-[520px] items-center justify-center p-8 text-center">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  اختر محادثة
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  اختر محادثة موجودة أو ابدأ محادثة جديدة.
                </p>
              </div>
            </div>
          ) : isLoadingConversation ? (
            <div className="p-6 text-sm text-slate-500">
              جارٍ تحميل المحادثة...
            </div>
          ) : selectedConversation ? (
            <div className="flex min-h-[520px] flex-col">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedConversation.title ||
                    selectedConversation.participants
                      .map((participant) => formatUserName(participant.user))
                      .join("، ")}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedConversation.participants.length} مشارك
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {selectedConversation.messages.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    لا توجد رسائل بعد.
                  </div>
                ) : (
                  selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-900">
                          {formatUserName(message.sender)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatDateTime(message.createdAt)}
                        </div>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {message.body}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 p-4">
                <div className="flex gap-3">
                  <textarea
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    rows={2}
                    placeholder="اكتب ردًا..."
                    className="flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={isSendingReply}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSendingReply ? "جارٍ الإرسال..." : "إرسال"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-slate-500">
              لم يتم العثور على المحادثة.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}