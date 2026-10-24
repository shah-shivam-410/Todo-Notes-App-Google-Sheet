export type Todo = {
  id: string;
  title: string;
  details: string;
  dueAt: string;
  reminderAt: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type AppData = {
  todos: Todo[];
  notes: Note[];
};

export type DataAction =
  | { type: "saveTodo"; item: Todo }
  | { type: "deleteTodo"; id: string }
  | { type: "saveNote"; item: Note }
  | { type: "deleteNote"; id: string };
