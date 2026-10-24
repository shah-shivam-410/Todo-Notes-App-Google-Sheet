import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { storage } from "./storage";
import type { AppData, Note, Todo } from "./types";

type ActiveTab = "todos" | "notes";
type EditorState = { kind: "todo"; item?: Todo } | { kind: "note"; item?: Note };

const emptyData: AppData = { todos: [], notes: [] };

const dateValue = (date: string) => {
  if (!date) return "";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 16);
};

const shortDate = (date: string) => {
  if (!date || Number.isNaN(new Date(date).getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
};

function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [activeTab, setActiveTab] = useState<ActiveTab>("todos");
  const [searchText, setSearchText] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastIsError, setToastIsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const notified = useRef(new Set<string>());
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((message: string, isError = false) => {
    setToastMessage(message);
    setToastIsError(isError);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMessage(""), 3200);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setData(await storage.list());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkReminders = useCallback(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const now = Date.now();
    data.todos.forEach((todo) => {
      if (!todo.completed && todo.reminderAt && new Date(todo.reminderAt).getTime() <= now && !notified.current.has(todo.id)) {
        notified.current.add(todo.id);
        new Notification(todo.title, { body: todo.details || "Your task reminder is due." });
      }
    });
  }, [data.todos]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    checkReminders();
    const interval = window.setInterval(checkReminders, 30_000);
    return () => window.clearInterval(interval);
  }, [checkReminders]);

  useEffect(
    () => () => {
      window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const saveEditor = async (form: FormData) => {
    const title = String(form.get("title") ?? "").trim();
    if (!title || !editor) return;

    const now = new Date().toISOString();
    try {
      if (editor.kind === "todo") {
        const dueAt = String(form.get("dueAt") ?? "");
        const reminderAt = String(form.get("reminderAt") ?? "");
        if (dueAt && reminderAt && new Date(reminderAt) > new Date(dueAt)) {
          showToast("Reminder must be set before the due date.", true);
          return;
        }
        const oldTodo = editor.item;
        const item: Todo = {
          id: oldTodo?.id ?? crypto.randomUUID(),
          title,
          details: String(form.get("details") ?? "").trim(),
          dueAt: dueAt ? new Date(dueAt).toISOString() : "",
          reminderAt: reminderAt ? new Date(reminderAt).toISOString() : "",
          completed: oldTodo?.completed ?? false,
          createdAt: oldTodo?.createdAt ?? now,
          updatedAt: now,
        };
        await storage.saveTodo(item);
        setData((current) => ({
          ...current,
          todos: [item, ...current.todos.filter((todo) => todo.id !== item.id)],
        }));
      } else {
        const oldNote = editor.item;
        const item: Note = {
          id: oldNote?.id ?? crypto.randomUUID(),
          title,
          content: String(form.get("content") ?? "").trim(),
          createdAt: oldNote?.createdAt ?? now,
          updatedAt: now,
        };
        await storage.saveNote(item);
        setData((current) => ({
          ...current,
          notes: [item, ...current.notes.filter((note) => note.id !== item.id)],
        }));
      }
      setEditor(null);
      showToast(`${editor.kind === "todo" ? "Task" : "Note"} saved.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not save item.", true);
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = data.todos.find((item) => item.id === id);
    if (!todo) return;
    const updated = { ...todo, completed: !todo.completed, updatedAt: new Date().toISOString() };
    try {
      await storage.saveTodo(updated);
      setData((current) => ({
        ...current,
        todos: current.todos.map((item) => (item.id === id ? updated : item)),
      }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not update task.", true);
    }
  };

  const deleteItem = async (kind: "todo" | "note", id: string) => {
    if (!window.confirm(`Delete this ${kind}? This cannot be undone.`)) return;
    try {
      if (kind === "todo") {
        await storage.deleteTodo(id);
        setData((current) => ({ ...current, todos: current.todos.filter((todo) => todo.id !== id) }));
      } else {
        await storage.deleteNote(id);
        setData((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }));
      }
      showToast(`${kind === "todo" ? "Task" : "Note"} deleted.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not delete item.", true);
    }
  };

  const enableNotifications = async () => {
    if (typeof Notification === "undefined") {
      showToast("This browser does not support notifications.", true);
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        showToast("Reminders are enabled while Daybook is open.");
        checkReminders();
      } else {
        showToast("Notification permission was not granted.", true);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Could not enable notifications.", true);
    }
  };

  if (loading) return <div className="loading">Opening your daybook…</div>;
  if (loadError) {
    return (
      <div className="load-error">
        <span>!</span>
        <h1>Couldn’t load your daybook</h1>
        <p>{loadError}</p>
        <button className="primary-button" onClick={() => void loadData()}>Try again</button>
      </div>
    );
  }

  const isTodos = activeTab === "todos";
  const query = searchText.toLocaleLowerCase();
  const todos = data.todos.filter((todo) => `${todo.title} ${todo.details}`.toLocaleLowerCase().includes(query));
  const notes = data.notes.filter((note) => `${note.title} ${note.content}`.toLocaleLowerCase().includes(query));
  const completedCount = data.todos.filter((todo) => todo.completed).length;

  return (
    <>
      <div className="layout">
        <aside className="sidebar">
          <a className="brand" href="#" aria-label="Daybook home">
            <span className="brand-mark">d</span><span>daybook</span>
          </a>
          <p className="side-label">WORKSPACE</p>
          <nav className="nav-tabs" aria-label="Workspace">
            <button className={`nav-item ${isTodos ? "active" : ""}`} onClick={() => setActiveTab("todos")}>
              <span className="nav-icon">✓</span> Todos <span className="nav-count">{data.todos.length}</span>
            </button>
            <button className={`nav-item ${!isTodos ? "active" : ""}`} onClick={() => setActiveTab("notes")}>
              <span className="nav-icon">▤</span> Notes <span className="nav-count">{data.notes.length}</span>
            </button>
          </nav>
          <div className="sidebar-bottom">
            <div className="sync-status">
              <span className={`status-dot ${storage.isConfigured ? "online" : ""}`} />
              <div>
                <strong>{storage.isConfigured ? "Google Sheets" : "This browser"}</strong>
                <small>{storage.isConfigured ? "Connected storage" : "Local storage mode"}</small>
              </div>
            </div>
            {!storage.isConfigured && <p className="storage-hint">Add your Apps Script URL to connect a shared Google Sheet.</p>}
          </div>
        </aside>
        <main className="main">
          <header className="topbar">
            <div className="breadcrumb">Workspace <span>/</span> <strong>{isTodos ? "Todos" : "Notes"}</strong></div>
            <div className="top-actions">
              <label className="search">
                <span>⌕</span>
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchText}
                  aria-label={`Search ${isTodos ? "todos" : "notes"}`}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </label>
              <button className="avatar" title="Daybook" type="button">D</button>
            </div>
          </header>
          <section className="content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">{isTodos ? "YOUR PERSONAL WORKSPACE" : "THOUGHTS & IDEAS"}</p>
                <h1>{isTodos ? "Todos" : "Notes"}<span className="heading-count">{isTodos ? todos.length : notes.length}</span></h1>
                <p className="subheading">{isTodos ? "Keep your day moving, one task at a time." : "A quiet place for everything on your mind."}</p>
              </div>
              <button className="primary-button" onClick={() => setEditor(activeTab === "todos" ? { kind: "todo" } : { kind: "note" })}>
                <span>＋</span> {isTodos ? "New task" : "New note"}
              </button>
            </div>
            {isTodos ? (
              <>
                <div className="summary-row">
                  <SummaryCard icon="◷" color="purple" label="All tasks" value={data.todos.length} />
                  <SummaryCard icon="✓" color="green" label="Completed" value={completedCount} />
                  <SummaryCard icon="◷" color="amber" label="Remaining" value={data.todos.length - completedCount} />
                </div>
                <div className="section-heading">
                  <div><h2>My tasks</h2><p>A little progress adds up.</p></div>
                  <button className="text-button" onClick={() => void enableNotifications()}>
                    ◉ {notificationPermission === "granted" ? "Notifications on" : "Enable reminders"}
                  </button>
                </div>
                <div className="task-list">
                  {todos.length ? todos.map((todo) => (
                    <TodoCard
                      key={todo.id}
                      todo={todo}
                      onToggle={() => void toggleTodo(todo.id)}
                      onEdit={() => setEditor({ kind: "todo", item: todo })}
                      onDelete={() => void deleteItem("todo", todo.id)}
                    />
                  )) : (
                    <EmptyState
                      title="No tasks yet"
                      description={query ? "Try a different search." : "Add your first task and make today count."}
                      button="＋ New task"
                      isTodo
                      hasSearch={Boolean(query)}
                      onAdd={() => setEditor({ kind: "todo" })}
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="section-heading notes-heading">
                  <div><h2>All notes</h2><p>Saved thoughts, ready when you are.</p></div>
                  <span className="quiet-label">MOST RECENT</span>
                </div>
                <div className="notes-grid">
                  {notes.length ? notes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={() => setEditor({ kind: "note", item: note })}
                      onDelete={() => void deleteItem("note", note.id)}
                    />
                  )) : (
                    <EmptyState
                      title="No notes yet"
                      description={query ? "Try a different search." : "Capture an idea before it gets away."}
                      button="＋ New note"
                      hasSearch={Boolean(query)}
                      onAdd={() => setEditor({ kind: "note" })}
                    />
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
      <div role="status" aria-live="polite" className={`toast ${toastMessage ? "visible" : ""} ${toastIsError ? "error" : ""}`}>
        {toastMessage}
      </div>
      {editor && <ItemDialog editor={editor} onSave={saveEditor} onClose={() => setEditor(null)} />}
    </>
  );
}

function SummaryCard({ icon, color, label, value }: { icon: string; color: string; label: string; value: number }) {
  return (
    <div className="summary-card">
      <span className={`summary-icon ${color}`}>{icon}</span>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

function TodoCard({
  todo,
  onToggle,
  onEdit,
  onDelete,
}: {
  todo: Todo;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const overdue = !todo.completed && Boolean(todo.dueAt) && new Date(todo.dueAt).getTime() < Date.now();
  return (
    <article className={`task-card ${todo.completed ? "is-complete" : ""}`}>
      <button className={`check-button ${todo.completed ? "checked" : ""}`} onClick={onToggle} aria-label={todo.completed ? "Mark incomplete" : "Complete task"}>
        {todo.completed ? "✓" : ""}
      </button>
      <div className="task-copy">
        <button className="task-title" onClick={onEdit}>{todo.title}</button>
        {todo.details && <p>{todo.details}</p>}
        <div className="task-meta">
          {todo.dueAt
            ? <span className={`due-label ${overdue ? "overdue" : ""}`}>◷ {overdue ? "Overdue · " : ""}{shortDate(todo.dueAt)}</span>
            : <span className="no-date">No due date</span>}
          {todo.reminderAt && <span className="reminder-label">◉ Reminder set</span>}
        </div>
      </div>
      <div className="task-actions">
        <button onClick={onEdit} aria-label="Edit task">✎</button>
        <button onClick={onDelete} aria-label="Delete task">×</button>
      </div>
    </article>
  );
}

function NoteCard({ note, onEdit, onDelete }: { note: Note; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="note-card">
      <div className="note-top">
        <span className="note-symbol">▤</span>
        <div className="note-actions">
          <button onClick={onEdit} aria-label="Edit note">✎</button>
          <button onClick={onDelete} aria-label="Delete note">×</button>
        </div>
      </div>
      <button className="note-title" onClick={onEdit}>{note.title}</button>
      <p className="note-content">{note.content}</p>
      <div className="note-date">UPDATED {shortDate(note.updatedAt).toUpperCase()}</div>
    </article>
  );
}

function EmptyState({
  title,
  description,
  button,
  isTodo = false,
  hasSearch,
  onAdd,
}: {
  title: string;
  description: string;
  button: string;
  isTodo?: boolean;
  hasSearch: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{isTodo ? "✓" : "▤"}</span>
      <strong>{title}</strong>
      <p>{description}</p>
      {!hasSearch && <button className="text-button" onClick={onAdd}>{button}</button>}
    </div>
  );
}

function ItemDialog({
  editor,
  onSave,
  onClose,
}: {
  editor: EditorState;
  onSave: (form: FormData) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isTodo = editor.kind === "todo";
  const item = editor.item;
  const todo = editor.kind === "todo" ? editor.item : undefined;
  const note = editor.kind === "note" ? editor.item : undefined;

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(new FormData(event.currentTarget));
  };

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <form className="editor-form" onSubmit={handleSubmit}>
        <div className="modal-top">
          <div>
            <p className="eyebrow">{item ? "MAKE IT JUST RIGHT" : "A FRESH START"}</p>
            <h2>{item ? "Edit" : "New"} {isTodo ? "task" : "note"}</h2>
          </div>
          <button className="close-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <label className="field-label">
          Title
          <input
            name="title"
            required
            maxLength={120}
            autoFocus
            defaultValue={item?.title ?? ""}
            placeholder={isTodo ? "What needs to get done?" : "Give your note a title"}
          />
        </label>
        {isTodo ? (
          <>
            <label className="field-label">
              Details <span className="optional">OPTIONAL</span>
              <textarea name="details" rows={3} maxLength={1000} defaultValue={todo?.details ?? ""} placeholder="Add a little more context..." />
            </label>
            <div className="field-pair">
              <label className="field-label">
                Due date <span className="optional">OPTIONAL</span>
                <input name="dueAt" type="datetime-local" defaultValue={dateValue(todo?.dueAt ?? "")} />
              </label>
              <label className="field-label">
                Remind me <span className="optional">OPTIONAL</span>
                <input name="reminderAt" type="datetime-local" defaultValue={dateValue(todo?.reminderAt ?? "")} />
              </label>
            </div>
          </>
        ) : (
          <label className="field-label">
            Note
            <textarea name="content" rows={9} maxLength={10000} defaultValue={note?.content ?? ""} placeholder="Start writing..." />
          </label>
        )}
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="submit">{item ? "Save changes" : `Create ${isTodo ? "task" : "note"}`}</button>
        </div>
      </form>
    </dialog>
  );
}

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("App root element is missing.");

createRoot(root).render(<App />);
