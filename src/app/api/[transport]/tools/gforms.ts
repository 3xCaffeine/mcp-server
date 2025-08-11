import { z } from "zod";
import {
  CreateFormSchema,
  GetFormSchema,
  SetPublishSettingsSchema,
  GetFormResponseSchema,
  ListFormResponsesSchema,
  createForm,
  getForm,
  setPublishSettings,
  getFormResponse,
  listFormResponses,
} from "@/lib/toolset/google/gforms";

export const formsToolsCapabilities = {
  create_form: {
    description: "Create a new Google Form",
  },
  get_form: {
    description: "Get details of a Google Form including questions and settings",
  },
  set_publish_settings: {
    description: "Update the publish settings of a Google Form",
  },
  get_form_response: {
    description: "Get a single response from a Google Form",
  },
  list_form_responses: {
    description: "List all responses from a Google Form with pagination",
  },
};

type CreateFormInput = z.infer<typeof CreateFormSchema>;
type GetFormInput = z.infer<typeof GetFormSchema>;
type SetPublishSettingsInput = z.infer<typeof SetPublishSettingsSchema>;
type GetFormResponseInput = z.infer<typeof GetFormResponseSchema>;
type ListFormResponsesInput = z.infer<typeof ListFormResponsesSchema>;

export function registerFormsTools(server: any, session: { userId: string; scopes?: string }) {
  server.tool(
    "create_form",
    "Create a new Google Form",
    CreateFormSchema.shape,
    async (input: CreateFormInput) => {
      return {
        content: [{ type: "text", text: await createForm(session.userId, input) }],
      };
    },
  );

  server.tool(
    "get_form",
    "Get details of a Google Form including questions and settings",
    GetFormSchema.shape,
    async (input: GetFormInput) => {
      return {
        content: [{ type: "text", text: await getForm(session.userId, input) }],
      };
    },
  );

  server.tool(
    "set_publish_settings",
    "Update the publish settings of a Google Form",
    SetPublishSettingsSchema.shape,
    async (input: SetPublishSettingsInput) => {
      return {
        content: [{ type: "text", text: await setPublishSettings(session.userId, input) }],
      };
    },
  );

  server.tool(
    "get_form_response",
    "Get a single response from a Google Form",
    GetFormResponseSchema.shape,
    async (input: GetFormResponseInput) => {
      return {
        content: [{ type: "text", text: await getFormResponse(session.userId, input) }],
      };
    },
  );

  server.tool(
    "list_form_responses",
    "List all responses from a Google Form with pagination",
    ListFormResponsesSchema.shape,
    async (input: ListFormResponsesInput) => {
      return {
        content: [{ type: "text", text: await listFormResponses(session.userId, input) }],
      };
    },
  );
}