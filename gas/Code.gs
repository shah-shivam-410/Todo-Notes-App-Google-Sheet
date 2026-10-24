const TODO_SHEET = "Todos";
const NOTE_SHEET = "Notes";
const TODO_HEADERS = ["id", "title", "details", "dueAt", "reminderAt", "completed", "createdAt", "updatedAt"];
const NOTE_HEADERS = ["id", "title", "content", "createdAt", "updatedAt"];

function doGet() {
  return json_({ ok: true, message: "Daybook Sheets API is ready." });
}

function doPost(event) {
  try {
    const input = JSON.parse(event.postData.contents);
    const result = handle_(input);
    return json_({ ok: true, data: result });
  } catch (error) {
    return json_({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function handle_(input) {
  if (!input || typeof input !== "object") throw new Error("Invalid request.");
  if (input.action === "list") {
    return {
      todos: readRows_(TODO_SHEET, TODO_HEADERS),
      notes: readRows_(NOTE_SHEET, NOTE_HEADERS)
    };
  }

  const config = {
    saveTodo: { sheet: TODO_SHEET, headers: TODO_HEADERS, item: input.item },
    saveNote: { sheet: NOTE_SHEET, headers: NOTE_HEADERS, item: input.item }
  };
  if (input.type === "saveTodo" || input.type === "saveNote") {
    const operation = config[input.type];
    validateItem_(operation.item, operation.headers);
    upsert_(operation.sheet, operation.headers, operation.item);
    return true;
  }
  if (input.type === "deleteTodo" || input.type === "deleteNote") {
    if (typeof input.id !== "string" || !input.id) throw new Error("A record ID is required.");
    const isTodo = input.type === "deleteTodo";
    remove_(isTodo ? TODO_SHEET : NOTE_SHEET, isTodo ? TODO_HEADERS : NOTE_HEADERS, input.id);
    return true;
  }
  throw new Error("Unsupported action.");
}

function getSheet_(name, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  const actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (actual.join("|") !== headers.join("|")) {
    throw new Error(name + " tab must have these columns in order: " + headers.join(", "));
  }
  return sheet;
}

function readRows_(name, headers) {
  const sheet = getSheet_(name, headers);
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues()
    .filter(function (row) { return row[0] !== ""; })
    .map(function (row) {
      const item = {};
      headers.forEach(function (header, index) { item[header] = row[index]; });
      if (name === TODO_SHEET) item.completed = item.completed === true || item.completed === "TRUE";
      return item;
    });
}

function validateItem_(item, headers) {
  if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id) {
    throw new Error("A record with an ID is required.");
  }
  if (typeof item.title !== "string" || !item.title.trim() || item.title.length > 120) {
    throw new Error("Title is required and must be 120 characters or fewer.");
  }
  if (headers === TODO_HEADERS && (typeof item.details !== "string" || item.details.length > 1000)) {
    throw new Error("Task details must be 1000 characters or fewer.");
  }
  if (headers === NOTE_HEADERS && (typeof item.content !== "string" || item.content.length > 10000)) {
    throw new Error("Note content must be 10000 characters or fewer.");
  }
}

function upsert_(name, headers, item) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_(name, headers);
    const rows = readRows_(name, headers);
    const found = rows.findIndex(function (row) { return row.id === item.id; });
    const values = headers.map(function (header) {
      const value = item[header];
      return value === undefined || value === null ? "" : value;
    });
    if (found < 0) sheet.appendRow(values);
    else sheet.getRange(found + 2, 1, 1, headers.length).setValues([values]);
  } finally {
    lock.releaseLock();
  }
}

function remove_(name, headers, id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_(name, headers);
    if (sheet.getLastRow() < 2) return;
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    for (let index = ids.length - 1; index >= 0; index--) {
      if (ids[index][0] === id) sheet.deleteRow(index + 2);
    }
  } finally {
    lock.releaseLock();
  }
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
