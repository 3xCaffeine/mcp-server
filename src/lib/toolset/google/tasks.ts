import { z } from "zod";
import { google, tasks_v1 } from "googleapis";
import { getGoogleOAuthClient } from "../googleoauth-client";

// Zod Schema definitions for Google Tasks tools
export const ListTaskListsSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    maxResults: z.number().optional().describe("Maximum number of task lists to return (default: 1000, max: 1000)"),
    pageToken: z.string().optional().describe("Token for pagination"),
});

export const GetTaskListSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    taskListId: z.string().describe("The ID of the task list to retrieve"),
});

export const CreateTaskListSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    title: z.string().describe("The title of the new task list"),
});

export const UpdateTaskListSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    taskListId: z.string().describe("The ID of the task list to update"),
    title: z.string().describe("The new title for the task list"),
});

export const DeleteTaskListSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    taskListId: z.string().describe("The ID of the task list to delete"),
});

export const ListTasksSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    taskListId: z.string().describe("The ID of the task list to retrieve tasks from"),
    maxResults: z.number().optional().describe("Maximum number of tasks to return (default: 20, max: 100)"),
    pageToken: z.string().optional().describe("Token for pagination"),
    showCompleted: z.boolean().optional().describe("Whether to include completed tasks (default: True)"),
    showDeleted: z.boolean().optional().describe("Whether to include deleted tasks (default: False)"),
    showHidden: z.boolean().optional().describe("Whether to include hidden tasks (default: False)"),
    showAssigned: z.boolean().optional().describe("Whether to include assigned tasks (default: False)"),
    completedMax: z.string().optional().describe("Upper bound for completion date (RFC 3339 timestamp)"),
    completedMin: z.string().optional().describe("Lower bound for completion date (RFC 3339 timestamp)"),
    dueMax: z.string().optional().describe("Upper bound for due date (RFC 3339 timestamp)"),
    dueMin: z.string().optional().describe("Lower bound for due date (RFC 3339 timestamp)"),
    updatedMin: z.string().optional().describe("Lower bound for last modification time (RFC 3339 timestamp)"),
});

export const GetTaskSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    taskListId: z.string().describe("The ID of the task list containing the task"),
    taskId: z.string().describe("The ID of the task to retrieve"),
});

export const CreateTaskSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    taskListId: z.string().describe("The ID of the task list to create the task in"),
    title: z.string().describe("The title of the task"),
    notes: z.string().optional().describe("Notes/description for the task"),
    due: z.string().optional().describe("Due date in RFC 3339 format (e.g., \"2024-12-31T23:59:59Z\")"),
    parent: z.string().optional().describe("Parent task ID (for subtasks)"),
    previous: z.string().optional().describe("Previous sibling task ID (for positioning)"),
});

export const UpdateTaskSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    taskListId: z.string().describe("The ID of the task list containing the task"),
    taskId: z.string().describe("The ID of the task to update"),
    title: z.string().optional().describe("New title for the task"),
    notes: z.string().optional().describe("New notes/description for the task"),
    status: z.enum(["needsAction", "completed"]).optional().describe("New status"),
    due: z.string().optional().describe("New due date in RFC 3339 format"),
});

export const DeleteTaskSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    taskListId: z.string().describe("The ID of the task list containing the task"),
    taskId: z.string().describe("The ID of the task to delete"),
});

export const MoveTaskSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    taskListId: z.string().describe("The ID of the current task list containing the task"),
    taskId: z.string().describe("The ID of the task to move"),
    parent: z.string().optional().describe("New parent task ID (for making it a subtask)"),
    previous: z.string().optional().describe("Previous sibling task ID (for positioning)"),
    destinationTaskList: z.string().optional().describe("Destination task list ID (for moving between lists)"),
});

export const ClearCompletedTasksSchema = z.object({
    userGoogleEmail: z.string().email().describe("The user's Google email address"),
    taskListId: z.string().describe("The ID of the task list to clear completed tasks from"),
});

/**
 * List all task lists for the user
 */
export async function listTaskLists(userId: string, userGoogleEmail: string, maxResults?: number, pageToken?: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    const params: tasks_v1.Params$Resource$Tasklists$List = {};
    if (maxResults !== undefined) {
        params.maxResults = maxResults;
    }
    if (pageToken) {
        params.pageToken = pageToken;
    }

    const response = await tasks.tasklists.list(params);
    const taskLists = response.data.items || [];
    const nextPageToken = response.data.nextPageToken;

    return {
        taskLists: taskLists.map(list => ({
            id: list.id,
            title: list.title,
            updated: list.updated,
            selfLink: list.selfLink,
        })),
        nextPageToken,
    };
}

/**
 * Get details of a specific task list
 */
export async function getTaskList(userId: string, userGoogleEmail: string, taskListId: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    const response = await tasks.tasklists.get({
        tasklist: taskListId,
    });

    const taskList = response.data;
    return {
        id: taskList.id,
        title: taskList.title,
        updated: taskList.updated,
        selfLink: taskList.selfLink,
    };
}

/**
 * Create a new task list
 */
export async function createTaskList(userId: string, userGoogleEmail: string, title: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    const response = await tasks.tasklists.insert({
        requestBody: {
            title: title,
        },
    });

    const taskList = response.data;
    return {
        id: taskList.id,
        title: taskList.title,
        updated: taskList.updated,
        selfLink: taskList.selfLink,
    };
}

/**
 * Update an existing task list
 */
export async function updateTaskList(userId: string, userGoogleEmail: string, taskListId: string, title: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    const response = await tasks.tasklists.update({
        tasklist: taskListId,
        requestBody: {
            id: taskListId,
            title: title,
        },
    });

    const taskList = response.data;
    return {
        id: taskList.id,
        title: taskList.title,
        updated: taskList.updated,
    };
}

/**
 * Delete a task list
 */
export async function deleteTaskList(userId: string, userGoogleEmail: string, taskListId: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    await tasks.tasklists.delete({
        tasklist: taskListId,
    });

    return { success: true, taskListId };
}

/**
 * List all tasks in a specific task list
 */
export async function listTasks(
    userId: string,
    userGoogleEmail: string,
    taskListId: string,
    options: {
        maxResults?: number;
        pageToken?: string;
        showCompleted?: boolean;
        showDeleted?: boolean;
        showHidden?: boolean;
        showAssigned?: boolean;
        completedMax?: string;
        completedMin?: string;
        dueMax?: string;
        dueMin?: string;
        updatedMin?: string;
    } = {}
) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    const params: tasks_v1.Params$Resource$Tasks$List = { tasklist: taskListId };

    if (options.maxResults !== undefined) params.maxResults = options.maxResults;
    if (options.pageToken) params.pageToken = options.pageToken;
    if (options.showCompleted !== undefined) params.showCompleted = options.showCompleted;
    if (options.showDeleted !== undefined) params.showDeleted = options.showDeleted;
    if (options.showHidden !== undefined) params.showHidden = options.showHidden;
    if (options.showAssigned !== undefined) params.showAssigned = options.showAssigned;
    if (options.completedMax) params.completedMax = options.completedMax;
    if (options.completedMin) params.completedMin = options.completedMin;
    if (options.dueMax) params.dueMax = options.dueMax;
    if (options.dueMin) params.dueMin = options.dueMin;
    if (options.updatedMin) params.updatedMin = options.updatedMin;

    const response = await tasks.tasks.list(params);
    const tasksList = response.data.items || [];
    const nextPageToken = response.data.nextPageToken;

    return {
        tasks: tasksList.map(task => ({
            id: task.id,
            title: task.title,
            status: task.status,
            due: task.due,
            notes: task.notes,
            completed: task.completed,
            updated: task.updated,
            parent: task.parent,
            position: task.position,
            selfLink: task.selfLink,
            webViewLink: task.webViewLink,
        })),
        nextPageToken,
    };
}

/**
 * Get details of a specific task
 */
export async function getTask(userId: string, userGoogleEmail: string, taskListId: string, taskId: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    const response = await tasks.tasks.get({
        tasklist: taskListId,
        task: taskId,
    });

    const task = response.data;
    return {
        id: task.id,
        title: task.title,
        status: task.status,
        due: task.due,
        notes: task.notes,
        completed: task.completed,
        updated: task.updated,
        parent: task.parent,
        position: task.position,
        selfLink: task.selfLink,
        webViewLink: task.webViewLink,
    };
}

/**
 * Create a new task in a task list
 */
export async function createTask(
    userId: string,
    userGoogleEmail: string,
    taskListId: string,
    title: string,
    options: {
        notes?: string;
        due?: string;
        parent?: string;
        previous?: string;
    } = {}
) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    const body: tasks_v1.Schema$Task = { title };
    if (options.notes) body.notes = options.notes;
    if (options.due) body.due = options.due;


    const params: tasks_v1.Params$Resource$Tasks$Insert = {
        tasklist: taskListId,
        requestBody: body,
    };
    if (options.parent) params.parent = options.parent;
    if (options.previous) params.previous = options.previous;

    const response = await tasks.tasks.insert(params);
    const task = response.data;

    return {
        id: task.id,
        title: task.title,
        status: task.status,
        due: task.due,
        notes: task.notes,
        updated: task.updated,
        webViewLink: task.webViewLink,
    };
}

/**
 * Update an existing task
 */
export async function updateTask(
    userId: string,
    userGoogleEmail: string,
    taskListId: string,
    taskId: string,
    updates: {
        title?: string;
        notes?: string;
        status?: string;
        due?: string;
    }
) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    // First get the current task to build the update body
    const currentTaskResponse = await tasks.tasks.get({
        tasklist: taskListId,
        task: taskId,
    });
    const currentTask = currentTaskResponse.data;


    const body: tasks_v1.Schema$Task = {
        id: taskId,
        title: updates.title !== undefined ? updates.title : currentTask.title || "",
        status: updates.status !== undefined ? updates.status : currentTask.status || "needsAction",
        notes: updates.notes !== undefined ? updates.notes : currentTask.notes,
        due: updates.due !== undefined ? updates.due : currentTask.due,
    };

    const response = await tasks.tasks.update({
        tasklist: taskListId,
        task: taskId,
        requestBody: body,
    });

    const task = response.data;
    return {
        id: task.id,
        title: task.title,
        status: task.status,
        due: task.due,
        notes: task.notes,
        completed: task.completed,
        updated: task.updated,
    };
}

/**
 * Delete a task from a task list
 */
export async function deleteTask(userId: string, userGoogleEmail: string, taskListId: string, taskId: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    await tasks.tasks.delete({
        tasklist: taskListId,
        task: taskId,
    });

    return { success: true, taskId };
}

/**
 * Move a task to a different position or parent
 */
export async function moveTask(
    userId: string,
    userGoogleEmail: string,
    taskListId: string,
    taskId: string,
    options: {
        parent?: string;
        previous?: string;
        destinationTaskList?: string;
    } = {}
) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });


    const params: tasks_v1.Params$Resource$Tasks$Move = {
        tasklist: taskListId,
        task: taskId,
    };
    if (options.parent) params.parent = options.parent;
    if (options.previous) params.previous = options.previous;
    if (options.destinationTaskList) (params as any).destinationTasklist = options.destinationTaskList;

    const response = await tasks.tasks.move(params);
    const task = response.data;

    return {
        id: task.id,
        title: task.title,
        status: task.status,
        updated: task.updated,
        parent: task.parent,
        position: task.position,
        moveDetails: {
            destinationTaskList: options.destinationTaskList,
            parent: options.parent,
            previous: options.previous,
        },
    };
}

/**
 * Clear all completed tasks from a task list
 */
export async function clearCompletedTasks(userId: string, userGoogleEmail: string, taskListId: string) {
    const oauth2Client = await getGoogleOAuthClient(userId);
    const tasks = google.tasks({ version: 'v1', auth: oauth2Client });

    await tasks.tasks.clear({
        tasklist: taskListId,
    });

    return { success: true, taskListId };
}
