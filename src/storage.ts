import type { AppData, DataAction, Note, Todo } from "./types";

const LOCAL_KEY = "daybook-data-v1";
const apiUrl = import.meta.env.VITE_APPS_SCRIPT_URL?.trim();

function loadLocal(): AppData {
  try {
    const saved = localStorage.getItem(LOCAL_KEY);
    return saved ? (JSON.parse(saved) as AppData) : { todos: [], notes: [] };
  } catch (error) {
    console.error("Could not read saved app data.", error);
    return { todos: [], notes: [] };
  }
}

function saveLocal(data: AppData): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

async function request<T>(payload: { action: "list" } | DataAction): Promise<T> {
  if (!apiUrl) {
    throw new Error("Google Sheets is not configured. Set VITE_APPS_SCRIPT_URL and rebuild the app.");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Google Sheets request failed (${response.status}).`);
  }

  const result = (await response.json()) as { ok: boolean; data?: T; error?: string };
  if (!result.ok || result.data === undefined) {
    throw new Error(result.error || "Google Sheets returned an invalid response.");
  }
  return result.data;
}

export const storage = {
  isConfigured: Boolean(apiUrl),

  async list(): Promise<AppData> {
    if (!apiUrl) return loadLocal();
    return request<AppData>({ action: "list" });
  },

  async saveTodo(item: Todo): Promise<void> {
    if (!apiUrl) {
      const data = loadLocal();
      data.todos = [item, ...data.todos.filter((todo) => todo.id !== item.id)];
      saveLocal(data);
      return;
    }
    await request<void>({ type: "saveTodo", item });
  },

  async deleteTodo(id: string): Promise<void> {
    if (!apiUrl) {
      const data = loadLocal();
      data.todos = data.todos.filter((todo) => todo.id !== id);
      saveLocal(data);
      return;
    }
    await request<void>({ type: "deleteTodo", id });
  },

  async saveNote(item: Note): Promise<void> {
    if (!apiUrl) {
      const data = loadLocal();
      data.notes = [item, ...data.notes.filter((note) => note.id !== item.id)];
      saveLocal(data);
      return;
    }
    await request<void>({ type: "saveNote", item });
  },

  async deleteNote(id: string): Promise<void> {
    if (!apiUrl) {
      const data = loadLocal();
      data.notes = data.notes.filter((note) => note.id !== id);
      saveLocal(data);
      return;
    }
    await request<void>({ type: "deleteNote", id });
  },
};
