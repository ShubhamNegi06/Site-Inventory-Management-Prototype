import { createClient } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export class ApiError extends Error {
  status: number;
  // Set when the backend's `detail` identifies a specific offending field
  // (e.g. { field: "sample_code", message: "..." }) so forms can show the
  // error next to the right input instead of only in a generic banner.
  field: string | null;
  constructor(status: number, message: string, field: string | null = null) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new ApiError(401, "Not authenticated");
  return { Authorization: `Bearer ${session.access_token}` };
}

async function handle(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    let field: string | null = null;
    try {
      const body = await res.json();
      const detail = body.detail;
      // detail can be a plain string (most errors) or a structured object
      // -- { field, message } -- for errors a form should attribute to a
      // specific input (e.g. a duplicate sample_code).
      if (detail && typeof detail === "object" && "message" in detail) {
        message = detail.message ?? message;
        field = detail.field ?? null;
      } else if (detail) {
        message = detail;
      }
    } catch {
      /* no-op */
    }
    throw new ApiError(res.status, message, field);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  async get(path: string) {
    const headers = await authHeader();
    const res = await fetch(`${API_BASE}${path}`, { headers, cache: "no-store" });
    return handle(res);
  },

  async post(path: string, body?: unknown) {
    const headers = await authHeader();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handle(res);
  },

  async patch(path: string, body: unknown) {
    const headers = await authHeader();
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return handle(res);
  },

  async delete(path: string) {
    const headers = await authHeader();
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE", headers });
    return handle(res);
  },

  async upload(path: string, files: File[]) {
    const headers = await authHeader();
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers, // no Content-Type -- browser sets the multipart boundary
      body: formData,
    });
    return handle(res);
  },
};
