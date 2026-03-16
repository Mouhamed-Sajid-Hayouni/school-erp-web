export type ApiErrorPayload = {
  error?: string;
  message?: string;
};

export function getAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function getJsonHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiErrorPayload;
    return data.error || data.message || `Request failed with status ${response.status}`;
  } catch {
    try {
      const text = await response.text();
      return text || `Request failed with status ${response.status}`;
    } catch {
      return `Request failed with status ${response.status}`;
    }
  }
}

export async function apiGet<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function apiPost<TResponse, TBody>(
  url: string,
  token: string,
  body: TBody
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: getJsonHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function apiPut<TResponse, TBody>(
  url: string,
  token: string,
  body: TBody
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "PUT",
    headers: getJsonHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json();
}

export async function apiDelete<TResponse = { message: string }>(
  url: string,
  token: string
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  try {
    return await response.json();
  } catch {
    return { message: "Deleted successfully." } as TResponse;
  }
}