import { z } from "zod";
import {
    ListTaskListsSchema,
    GetTaskListSchema,
    CreateTaskListSchema,
    UpdateTaskListSchema,
    DeleteTaskListSchema,
    ListTasksSchema,
    GetTaskSchema,
    CreateTaskSchema,
    UpdateTaskSchema,
    DeleteTaskSchema,
    MoveTaskSchema,
    ClearCompletedTasksSchema,
    listTaskLists,
    getTaskList,
    createTaskList,
    updateTaskList,
    deleteTaskList,
    listTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    clearCompletedTasks,
} from "@/lib/toolset/google/tasks";

export const tasksToolsCapabilities = {
    list_task_lists: {
        description: "List all task lists for the user",
    },
    get_task_list: {
        description: "Get details of a specific task list",
    },
    create_task_list: {
        description: "Create a new task list",
    },
    update_task_list: {
        description: "Update an existing task list",
    },
    delete_task_list: {
        description: "Delete a task list. Note: This will also delete all tasks in the list",
    },
    list_tasks: {
        description: "List all tasks in a specific task list",
    },
    get_task: {
        description: "Get details of a specific task",
    },
    create_task: {
        description: "Create a new task in a task list",
    },
    update_task: {
        description: "Update an existing task",
    },
    delete_task: {
        description: "Delete a task from a task list",
    },
    move_task: {
        description: "Move a task to a different position or parent within the same list, or to a different list",
    },
    clear_completed_tasks: {
        description: "Clear all completed tasks from a task list. The tasks will be marked as hidden",
    },
};

// Type inference from Zod schemas
type ListTaskListsInput = z.infer<typeof ListTaskListsSchema>;
type GetTaskListInput = z.infer<typeof GetTaskListSchema>;
type CreateTaskListInput = z.infer<typeof CreateTaskListSchema>;
type UpdateTaskListInput = z.infer<typeof UpdateTaskListSchema>;
type DeleteTaskListInput = z.infer<typeof DeleteTaskListSchema>;
type ListTasksInput = z.infer<typeof ListTasksSchema>;
type GetTaskInput = z.infer<typeof GetTaskSchema>;
type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
type DeleteTaskInput = z.infer<typeof DeleteTaskSchema>;
type MoveTaskInput = z.infer<typeof MoveTaskSchema>;
type ClearCompletedTasksInput = z.infer<typeof ClearCompletedTasksSchema>;

export function registerTasksTools(server: any, session: { userId: string; scopes?: string }) {
    // List task lists
    server.tool(
        "list_task_lists",
        "List all task lists for the user",
        ListTaskListsSchema.shape,
        async ({ userGoogleEmail, maxResults, pageToken }: ListTaskListsInput) => {
            try {
                const result = await listTaskLists(session.userId, userGoogleEmail, maxResults, pageToken);

                if (result.taskLists.length === 0) {
                    return {
                        content: [{ type: "text", text: `No task lists found for ${userGoogleEmail}.` }],
                    };
                }

                let response = `Task Lists for ${userGoogleEmail}:\n`;
                result.taskLists.forEach(taskList => {
                    response += `- ${taskList.title} (ID: ${taskList.id})\n`;
                    response += `  Updated: ${taskList.updated || 'N/A'}\n`;
                });

                if (result.nextPageToken) {
                    response += `\nNext page token: ${result.nextPageToken}`;
                }

                return {
                    content: [{ type: "text", text: response }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error listing task lists: ${error.message}` }],
                };
            }
        },
    );

    // Get task list
    server.tool(
        "get_task_list",
        "Get details of a specific task list",
        GetTaskListSchema.shape,
        async ({ userGoogleEmail, taskListId }: GetTaskListInput) => {
            try {
                const taskList = await getTaskList(session.userId, userGoogleEmail, taskListId);

                return {
                    content: [{
                        type: "text",
                        text: `Task List Details for ${userGoogleEmail}:\n` +
                            `- Title: ${taskList.title}\n` +
                            `- ID: ${taskList.id}\n` +
                            `- Updated: ${taskList.updated || 'N/A'}\n` +
                            `- Self Link: ${taskList.selfLink || 'N/A'}`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error getting task list: ${error.message}` }],
                };
            }
        },
    );

    // Create task list
    server.tool(
        "create_task_list",
        "Create a new task list",
        CreateTaskListSchema.shape,
        async ({ userGoogleEmail, title }: CreateTaskListInput) => {
            try {
                const taskList = await createTaskList(session.userId, userGoogleEmail, title);

                return {
                    content: [{
                        type: "text",
                        text: `Task List Created for ${userGoogleEmail}:\n` +
                            `- Title: ${taskList.title}\n` +
                            `- ID: ${taskList.id}\n` +
                            `- Created: ${taskList.updated || 'N/A'}\n` +
                            `- Self Link: ${taskList.selfLink || 'N/A'}`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error creating task list: ${error.message}` }],
                };
            }
        },
    );

    // Update task list
    server.tool(
        "update_task_list",
        "Update an existing task list",
        UpdateTaskListSchema.shape,
        async ({ userGoogleEmail, taskListId, title }: UpdateTaskListInput) => {
            try {
                const taskList = await updateTaskList(session.userId, userGoogleEmail, taskListId, title);

                return {
                    content: [{
                        type: "text",
                        text: `Task List Updated for ${userGoogleEmail}:\n` +
                            `- Title: ${taskList.title}\n` +
                            `- ID: ${taskList.id}\n` +
                            `- Updated: ${taskList.updated || 'N/A'}`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error updating task list: ${error.message}` }],
                };
            }
        },
    );

    // Delete task list
    server.tool(
        "delete_task_list",
        "Delete a task list. Note: This will also delete all tasks in the list",
        DeleteTaskListSchema.shape,
        async ({ userGoogleEmail, taskListId }: DeleteTaskListInput) => {
            try {
                await deleteTaskList(session.userId, userGoogleEmail, taskListId);

                return {
                    content: [{
                        type: "text",
                        text: `Task list ${taskListId} has been deleted for ${userGoogleEmail}. All tasks in this list have also been deleted.`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error deleting task list: ${error.message}` }],
                };
            }
        },
    );

    // List tasks
    server.tool(
        "list_tasks",
        "List all tasks in a specific task list",
        ListTasksSchema.shape,
        async ({
            userGoogleEmail,
            taskListId,
            maxResults,
            pageToken,
            showCompleted,
            showDeleted,
            showHidden,
            showAssigned,
            completedMax,
            completedMin,
            dueMax,
            dueMin,
            updatedMin
        }: ListTasksInput) => {
            try {
                const options = {
                    maxResults,
                    pageToken,
                    showCompleted,
                    showDeleted,
                    showHidden,
                    showAssigned,
                    completedMax,
                    completedMin,
                    dueMax,
                    dueMin,
                    updatedMin,
                };

                const result = await listTasks(session.userId, userGoogleEmail, taskListId, options);

                if (result.tasks.length === 0) {
                    return {
                        content: [{ type: "text", text: `No tasks found in task list ${taskListId} for ${userGoogleEmail}.` }],
                    };
                }

                let response = `Tasks in list ${taskListId} for ${userGoogleEmail}:\n`;
                result.tasks.forEach(task => {
                    response += `- ${task.title || 'Untitled'} (ID: ${task.id})\n`;
                    response += `  Status: ${task.status || 'N/A'}\n`;
                    if (task.due) response += `  Due: ${task.due}\n`;
                    if (task.notes) {
                        const truncatedNotes = task.notes.length > 100 ? task.notes.substring(0, 100) + '...' : task.notes;
                        response += `  Notes: ${truncatedNotes}\n`;
                    }
                    if (task.completed) response += `  Completed: ${task.completed}\n`;
                    response += `  Updated: ${task.updated || 'N/A'}\n\n`;
                });

                if (result.nextPageToken) {
                    response += `Next page token: ${result.nextPageToken}`;
                }

                return {
                    content: [{ type: "text", text: response }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error listing tasks: ${error.message}` }],
                };
            }
        },
    );

    // Get task
    server.tool(
        "get_task",
        "Get details of a specific task",
        GetTaskSchema.shape,
        async ({ userGoogleEmail, taskListId, taskId }: GetTaskInput) => {
            try {
                const task = await getTask(session.userId, userGoogleEmail, taskListId, taskId);

                let response = `Task Details for ${userGoogleEmail}:\n` +
                    `- Title: ${task.title || 'Untitled'}\n` +
                    `- ID: ${task.id}\n` +
                    `- Status: ${task.status || 'N/A'}\n` +
                    `- Updated: ${task.updated || 'N/A'}`;

                if (task.due) response += `\n- Due Date: ${task.due}`;
                if (task.completed) response += `\n- Completed: ${task.completed}`;
                if (task.notes) response += `\n- Notes: ${task.notes}`;
                if (task.parent) response += `\n- Parent Task ID: ${task.parent}`;
                if (task.position) response += `\n- Position: ${task.position}`;
                if (task.selfLink) response += `\n- Self Link: ${task.selfLink}`;
                if (task.webViewLink) response += `\n- Web View Link: ${task.webViewLink}`;

                return {
                    content: [{ type: "text", text: response }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error getting task: ${error.message}` }],
                };
            }
        },
    );

    // Create task
    server.tool(
        "create_task",
        "Create a new task in a task list",
        CreateTaskSchema.shape,
        async ({ userGoogleEmail, taskListId, title, notes, due, parent, previous }: CreateTaskInput) => {
            try {
                const options = { notes, due, parent, previous };
                const task = await createTask(session.userId, userGoogleEmail, taskListId, title, options);

                let response = `Task Created for ${userGoogleEmail}:\n` +
                    `- Title: ${task.title}\n` +
                    `- ID: ${task.id}\n` +
                    `- Status: ${task.status || 'N/A'}\n` +
                    `- Updated: ${task.updated || 'N/A'}`;

                if (task.due) response += `\n- Due Date: ${task.due}`;
                if (task.notes) response += `\n- Notes: ${task.notes}`;
                if (task.webViewLink) response += `\n- Web View Link: ${task.webViewLink}`;

                return {
                    content: [{ type: "text", text: response }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error creating task: ${error.message}` }],
                };
            }
        },
    );

    // Update task
    server.tool(
        "update_task",
        "Update an existing task",
        UpdateTaskSchema.shape,
        async ({ userGoogleEmail, taskListId, taskId, title, notes, status, due }: UpdateTaskInput) => {
            try {
                const updates = { title, notes, status, due };
                const task = await updateTask(session.userId, userGoogleEmail, taskListId, taskId, updates);

                let response = `Task Updated for ${userGoogleEmail}:\n` +
                    `- Title: ${task.title}\n` +
                    `- ID: ${task.id}\n` +
                    `- Status: ${task.status || 'N/A'}\n` +
                    `- Updated: ${task.updated || 'N/A'}`;

                if (task.due) response += `\n- Due Date: ${task.due}`;
                if (task.notes) response += `\n- Notes: ${task.notes}`;
                if (task.completed) response += `\n- Completed: ${task.completed}`;

                return {
                    content: [{ type: "text", text: response }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error updating task: ${error.message}` }],
                };
            }
        },
    );

    // Delete task
    server.tool(
        "delete_task",
        "Delete a task from a task list",
        DeleteTaskSchema.shape,
        async ({ userGoogleEmail, taskListId, taskId }: DeleteTaskInput) => {
            try {
                await deleteTask(session.userId, userGoogleEmail, taskListId, taskId);

                return {
                    content: [{
                        type: "text",
                        text: `Task ${taskId} has been deleted from task list ${taskListId} for ${userGoogleEmail}.`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error deleting task: ${error.message}` }],
                };
            }
        },
    );

    // Move task
    server.tool(
        "move_task",
        "Move a task to a different position or parent within the same list, or to a different list",
        MoveTaskSchema.shape,
        async ({ userGoogleEmail, taskListId, taskId, parent, previous, destinationTaskList }: MoveTaskInput) => {
            try {
                const options = { parent, previous, destinationTaskList };
                const result = await moveTask(session.userId, userGoogleEmail, taskListId, taskId, options);

                let response = `Task Moved for ${userGoogleEmail}:\n` +
                    `- Title: ${result.title}\n` +
                    `- ID: ${result.id}\n` +
                    `- Status: ${result.status || 'N/A'}\n` +
                    `- Updated: ${result.updated || 'N/A'}`;

                if (result.parent) response += `\n- Parent Task ID: ${result.parent}`;
                if (result.position) response += `\n- Position: ${result.position}`;

                const moveDetails = [];
                if (destinationTaskList) moveDetails.push(`moved to task list ${destinationTaskList}`);
                if (parent) moveDetails.push(`made a subtask of ${parent}`);
                if (previous) moveDetails.push(`positioned after ${previous}`);

                if (moveDetails.length > 0) {
                    response += `\n- Move Details: ${moveDetails.join(', ')}`;
                }

                return {
                    content: [{ type: "text", text: response }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error moving task: ${error.message}` }],
                };
            }
        },
    );

    // Clear completed tasks
    server.tool(
        "clear_completed_tasks",
        "Clear all completed tasks from a task list. The tasks will be marked as hidden",
        ClearCompletedTasksSchema.shape,
        async ({ userGoogleEmail, taskListId }: ClearCompletedTasksInput) => {
            try {
                await clearCompletedTasks(session.userId, userGoogleEmail, taskListId);

                return {
                    content: [{
                        type: "text",
                        text: `All completed tasks have been cleared from task list ${taskListId} for ${userGoogleEmail}. The tasks are now hidden and won't appear in default task list views.`
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{ type: "text", text: `Error clearing completed tasks: ${error.message}` }],
                };
            }
        },
    );
}
