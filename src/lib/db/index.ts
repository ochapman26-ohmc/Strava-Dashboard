import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { Database, User, Activity, Goal, CoachMessage, DashboardWidget } from "./schema";

// On Vercel the project filesystem is read-only; use /tmp for writable storage.
// Note: /tmp is ephemeral per instance — use a real database for production persistence.
const DATA_DIR = process.env.VERCEL
  ? join("/tmp", "stride-coach-data")
  : join(process.cwd(), "data");
const DB_PATH = join(DATA_DIR, "db.json");

const EMPTY_DB: Database = {
  users: [],
  activities: [],
  goals: [],
  coachMessages: [],
  dashboardWidgets: [],
  nextIds: { users: 1, goals: 1, coachMessages: 1, dashboardWidgets: 1 },
};

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function migrateDb(data: Database): Database {
  if (!data.dashboardWidgets) data.dashboardWidgets = [];
  if (!data.nextIds.dashboardWidgets) data.nextIds.dashboardWidgets = 1;
  for (const widget of data.dashboardWidgets) {
    if (widget.gridX == null) widget.gridX = 0;
    if (widget.gridY == null) widget.gridY = widget.order * 3;
    if (widget.gridW == null) widget.gridW = widget.width || 1;
    if (widget.gridH == null) widget.gridH = 2;
  }
  return data;
}

function readDb(): Database {
  ensureDataDir();
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, JSON.stringify(EMPTY_DB, null, 2));
    return structuredClone(EMPTY_DB);
  }
  return migrateDb(JSON.parse(readFileSync(DB_PATH, "utf-8")) as Database);
}

function writeDb(db: Database) {
  ensureDataDir();
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function initDb() {
  readDb();
}

export const db = {
  users: {
    findFirst(where: { garminEmail?: string; id?: number }): User | undefined {
      const data = readDb();
      if (where.id !== undefined) return data.users.find((u) => u.id === where.id);
      if (where.garminEmail !== undefined)
        return data.users.find((u) => u.garminEmail === where.garminEmail);
      return undefined;
    },
    insert(values: Omit<User, "id" | "createdAt">): User {
      const data = readDb();
      const user: User = {
        ...values,
        id: data.nextIds.users++,
        createdAt: new Date().toISOString(),
      };
      data.users.push(user);
      writeDb(data);
      return user;
    },
    update(id: number, values: Partial<User>): User | undefined {
      const data = readDb();
      const idx = data.users.findIndex((u) => u.id === id);
      if (idx === -1) return undefined;
      data.users[idx] = { ...data.users[idx], ...values };
      writeDb(data);
      return data.users[idx];
    },
  },

  activities: {
    findFirst(where: { id: number }): Activity | undefined {
      const data = readDb();
      return data.activities.find((a) => a.id === where.id);
    },
    findMany(where: { userId: number }, orderBy?: "startDate" | "syncedAt"): Activity[] {
      const data = readDb();
      const results = data.activities.filter((a) => a.userId === where.userId);
      if (orderBy === "startDate") {
        results.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
      }
      return results;
    },
    upsert(activity: Activity) {
      const data = readDb();
      const idx = data.activities.findIndex((a) => a.id === activity.id);
      if (idx >= 0) {
        data.activities[idx] = activity;
      } else {
        data.activities.push(activity);
      }
      writeDb(data);
      return activity;
    },
  },

  goals: {
    findMany(where: { userId: number }): Goal[] {
      const data = readDb();
      return data.goals
        .filter((g) => g.userId === where.userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    insert(values: Omit<Goal, "id" | "createdAt" | "currentValue" | "status">): Goal {
      const data = readDb();
      const goal: Goal = {
        ...values,
        id: data.nextIds.goals++,
        currentValue: 0,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      data.goals.push(goal);
      writeDb(data);
      return goal;
    },
    update(id: number, values: Partial<Goal>) {
      const data = readDb();
      const idx = data.goals.findIndex((g) => g.id === id);
      if (idx >= 0) {
        data.goals[idx] = { ...data.goals[idx], ...values };
        writeDb(data);
      }
    },
    delete(id: number, userId: number) {
      const data = readDb();
      data.goals = data.goals.filter((g) => !(g.id === id && g.userId === userId));
      writeDb(data);
    },
  },

  coachMessages: {
    findMany(where: { userId: number }, limit?: number): CoachMessage[] {
      const data = readDb();
      let results = data.coachMessages
        .filter((m) => m.userId === where.userId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      if (limit) results = results.slice(-limit);
      return results;
    },
    insert(values: Omit<CoachMessage, "id" | "createdAt">): CoachMessage {
      const data = readDb();
      const message: CoachMessage = {
        ...values,
        id: data.nextIds.coachMessages++,
        createdAt: new Date().toISOString(),
      };
      data.coachMessages.push(message);
      writeDb(data);
      return message;
    },
  },

  dashboardWidgets: {
    findMany(where: { userId: number }): DashboardWidget[] {
      const data = readDb();
      return data.dashboardWidgets
        .filter((w) => w.userId === where.userId)
        .sort((a, b) => a.order - b.order);
    },
    insert(values: Omit<DashboardWidget, "id" | "createdAt">): DashboardWidget {
      const data = readDb();
      const widget: DashboardWidget = {
        ...values,
        id: data.nextIds.dashboardWidgets++,
        createdAt: new Date().toISOString(),
      };
      data.dashboardWidgets.push(widget);
      writeDb(data);
      return widget;
    },
    update(id: number, userId: number, values: Partial<DashboardWidget>) {
      const data = readDb();
      const idx = data.dashboardWidgets.findIndex(
        (w) => w.id === id && w.userId === userId
      );
      if (idx >= 0) {
        data.dashboardWidgets[idx] = { ...data.dashboardWidgets[idx], ...values };
        writeDb(data);
        return data.dashboardWidgets[idx];
      }
      return undefined;
    },
    delete(id: number, userId: number) {
      const data = readDb();
      data.dashboardWidgets = data.dashboardWidgets.filter(
        (w) => !(w.id === id && w.userId === userId)
      );
      writeDb(data);
    },
    replaceAll(userId: number, widgets: Omit<DashboardWidget, "id" | "createdAt">[]) {
      const data = readDb();
      data.dashboardWidgets = data.dashboardWidgets.filter((w) => w.userId !== userId);
      for (const values of widgets) {
        data.dashboardWidgets.push({
          ...values,
          id: data.nextIds.dashboardWidgets++,
          createdAt: new Date().toISOString(),
        });
      }
      writeDb(data);
    },
    updateLayout(
      userId: number,
      updates: Array<{
        id: number;
        gridX: number;
        gridY: number;
        gridW: number;
        gridH: number;
        width: number;
        order: number;
      }>
    ) {
      const data = readDb();
      for (const update of updates) {
        const idx = data.dashboardWidgets.findIndex(
          (w) => w.id === update.id && w.userId === userId
        );
        if (idx >= 0) {
          data.dashboardWidgets[idx] = {
            ...data.dashboardWidgets[idx],
            ...update,
          };
        }
      }
      writeDb(data);
    },
  },
};
