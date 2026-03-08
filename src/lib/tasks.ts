import type { Task } from "@/types/chat";

export type TaskFilter = "active" | "archived" | "all";

export function isTaskArchived(task: Pick<Task, "archivedAt">) {
  return Boolean(task.archivedAt);
}

export function getVisibleTasks(args: { tasks: Task[]; filter: TaskFilter }) {
  if (args.filter === "all") {
    return args.tasks;
  }
  return args.tasks.filter((task) =>
    args.filter === "archived" ? isTaskArchived(task) : !isTaskArchived(task)
  );
}

export function getTaskCounts(args: { tasks: Array<Pick<Task, "archivedAt">> }) {
  const archived = args.tasks.filter((task) => isTaskArchived(task)).length;
  return {
    active: args.tasks.length - archived,
    archived,
    all: args.tasks.length,
  };
}

export function getArchiveFallbackTaskId(args: { tasks: Task[]; archivedTaskId: string }) {
  const activeFallback = args.tasks.find((task) => task.id !== args.archivedTaskId && !isTaskArchived(task));
  if (activeFallback) {
    return activeFallback.id;
  }
  return args.tasks.find((task) => task.id !== args.archivedTaskId)?.id ?? "";
}
