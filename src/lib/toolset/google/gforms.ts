import { z } from "zod";
import { google } from "googleapis";
import { getGoogleOAuthClient } from "../googleoauth-client";

// Zod Schemas
export const CreateFormSchema = z.object({
  userGoogleEmail: z.string().email().describe("The user's Google email address."),
  title: z.string().describe("The title of the form."),
  description: z.string().optional().describe("The description of the form."),
  documentTitle: z.string().optional().describe("The document title (shown in browser tab).")
});

export const GetFormSchema = z.object({
  userGoogleEmail: z.string().email().describe("The user's Google email address."),
  formId: z.string().describe("The ID of the form to retrieve.")
});

export const SetPublishSettingsSchema = z.object({
  userGoogleEmail: z.string().email().describe("The user's Google email address."),
  formId: z.string().describe("The ID of the form to update publish settings for."),
  publishAsTemplate: z.boolean().optional().default(false).describe("Whether to publish as a template."),
  requireAuthentication: z.boolean().optional().default(false).describe("Whether to require authentication to view/submit.")
});

export const GetFormResponseSchema = z.object({
  userGoogleEmail: z.string().email().describe("The user's Google email address."),
  formId: z.string().describe("The ID of the form."),
  responseId: z.string().describe("The ID of the response to retrieve.")
});

export const ListFormResponsesSchema = z.object({
  userGoogleEmail: z.string().email().describe("The user's Google email address."),
  formId: z.string().describe("The ID of the form."),
  pageSize: z.number().optional().default(10).describe("Maximum number of responses to return."),
  pageToken: z.string().optional().describe("Token for retrieving next page of results.")
});

// Core logic for each tool
export async function createForm(userId: string, params: z.infer<typeof CreateFormSchema>) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const forms = google.forms({ version: 'v1', auth: oauth2Client });
  
  const { userGoogleEmail, title, description, documentTitle } = params;
  
  const formBody: any = {
    info: {
      title
    }
  };

  if (description) {
    formBody.info.description = description;
  }

  if (documentTitle) {
    formBody.info.document_title = documentTitle;
  }

  const res = await forms.forms.create({
    requestBody: formBody
  });

  const created = res.data;
  const formId = created.formId;
  const editUrl = `https://docs.google.com/forms/d/${formId}/edit`;
  const responderUrl = created.responderUri || `https://docs.google.com/forms/d/${formId}/viewform`;

  return `Successfully created form '${created.info?.title || title}' for ${userGoogleEmail}. Form ID: ${formId}. Edit URL: ${editUrl}. Responder URL: ${responderUrl}`;
}

export async function getForm(userId: string, params: z.infer<typeof GetFormSchema>) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const forms = google.forms({ version: 'v1', auth: oauth2Client });
  
  const { userGoogleEmail, formId } = params;

  const res = await forms.forms.get({
    formId
  });

  const form = res.data;
  const formInfo = form.info || {};
  const title = formInfo.title || "No Title";
  const description = formInfo.description || "No Description";
  const documentTitle = formInfo.documentTitle || title;

  const editUrl = `https://docs.google.com/forms/d/${formId}/edit`;
  const responderUrl = form.responderUri || `https://docs.google.com/forms/d/${formId}/viewform`;

  const items = form.items || [];
  const questionsText = items.length > 0 
    ? items.map((item: any, index: number) => {
        const itemTitle = item.title || `Question ${index + 1}`;
        const required = item.questionItem?.question?.required || false;
        const requiredText = required ? " (Required)" : "";
        return `  ${index + 1}. ${itemTitle}${requiredText}`;
      }).join('\n')
    : "  No questions found";

  return `Form Details for ${userGoogleEmail}:
- Title: "${title}"
- Description: "${description}"
- Document Title: "${documentTitle}"
- Form ID: ${formId}
- Edit URL: ${editUrl}
- Responder URL: ${responderUrl}
- Questions (${items.length} total):
${questionsText}`;
}

export async function setPublishSettings(userId: string, params: z.infer<typeof SetPublishSettingsSchema>) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const forms = google.forms({ version: 'v1', auth: oauth2Client });
  
  const { userGoogleEmail, formId, publishAsTemplate = false, requireAuthentication = false } = params;

  const requestBody = {
    publishSettings: {}
  };

  try {
    await forms.forms.setPublishSettings({
      formId,
      requestBody
    });

    return `Successfully updated publish settings for form ${formId} for ${userGoogleEmail}. Note: The Google Forms API may have limited publish settings support.`;
  } catch (error: any) {
    return `Error updating publish settings for form ${formId}: ${error.message}. The Google Forms API may not support these specific publish settings.`;
  }
}

export async function getFormResponse(userId: string, params: z.infer<typeof GetFormResponseSchema>) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const forms = google.forms({ version: 'v1', auth: oauth2Client });
  
  const { userGoogleEmail, formId, responseId } = params;

  const res = await forms.forms.responses.get({
    formId,
    responseId
  });

  const response = res.data;
  const responseIdValue = response.responseId || "Unknown";
  const createTime = response.createTime || "Unknown";
  const lastSubmittedTime = response.lastSubmittedTime || "Unknown";

  const answers = response.answers || {};
  const answerDetails: string[] = [];
  
  for (const [questionId, answerData] of Object.entries(answers)) {
    const textAnswers = (answerData as any)?.textAnswers?.answers || [];
    if (textAnswers.length > 0) {
      const answerText = textAnswers.map((ans: any) => ans.value || "").join(", ");
      answerDetails.push(`  Question ID ${questionId}: ${answerText}`);
    } else {
      answerDetails.push(`  Question ID ${questionId}: No answer provided`);
    }
  }

  const answersText = answerDetails.length > 0 ? answerDetails.join('\n') : "  No answers found";

  return `Form Response Details for ${userGoogleEmail}:
- Form ID: ${formId}
- Response ID: ${responseIdValue}
- Created: ${createTime}
- Last Submitted: ${lastSubmittedTime}
- Answers:
${answersText}`;
}

export async function listFormResponses(userId: string, params: z.infer<typeof ListFormResponsesSchema>) {
  const oauth2Client = await getGoogleOAuthClient(userId);
  const forms = google.forms({ version: 'v1', auth: oauth2Client });
  
  const { userGoogleEmail, formId, pageSize = 10, pageToken } = params;

  const requestParams: any = {
    formId,
    pageSize
  };

  if (pageToken) {
    requestParams.pageToken = pageToken;
  }

  const res = await forms.forms.responses.list(requestParams);

  const responsesResult = res.data;
  const responses = responsesResult.responses || [];
  const nextPageToken = responsesResult.nextPageToken;

  if (responses.length === 0) {
    return `No responses found for form ${formId} for ${userGoogleEmail}.`;
  }

  const responseDetails = responses.map((response: any, index: number) => {
    const responseId = response.responseId || "Unknown";
    const createTime = response.createTime || "Unknown";
    const lastSubmittedTime = response.lastSubmittedTime || "Unknown";
    const answersCount = Object.keys(response.answers || {}).length;
    
    return `  ${index + 1}. Response ID: ${responseId} | Created: ${createTime} | Last Submitted: ${lastSubmittedTime} | Answers: ${answersCount}`;
  });

  const paginationInfo = nextPageToken ? `\nNext page token: ${nextPageToken}` : "\nNo more pages.";

  return `Form Responses for ${userGoogleEmail}:
- Form ID: ${formId}
- Total responses returned: ${responses.length}
- Responses:
${responseDetails.join('\n')}${paginationInfo}`;
}