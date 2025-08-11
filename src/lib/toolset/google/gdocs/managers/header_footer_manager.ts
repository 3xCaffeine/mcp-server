/**
 * Header Footer Manager
 * 
 * High-level operations for managing headers and footers in Google Docs
 */
import { logger } from '@/lib/utils/logger';

interface HeaderFooterResult {
  success: boolean;
  message: string;
}

interface SectionInfo {
  content_preview: string;
  element_count: number;
  start_index: number;
  end_index: number;
}

interface DocumentHeadersFooters {
  headers: Record<string, SectionInfo>;
  footers: Record<string, SectionInfo>;
  has_headers: boolean;
  has_footers: boolean;
}

export class HeaderFooterManager {
  private service: any;

  constructor(service: any) {
    this.service = service;
  }

  async updateHeaderFooterContent(
    documentId: string,
    sectionType: string,
    content: string,
    headerFooterType: "DEFAULT" | "FIRST_PAGE" | "EVEN_PAGE" | "FIRST_PAGE_ONLY" = "DEFAULT"
  ): Promise<HeaderFooterResult> {
    logger.info(`Updating ${sectionType} in document ${documentId}`);

    if (!["header", "footer"].includes(sectionType)) {
      return { success: false, message: "section_type must be 'header' or 'footer'" };
    }

    if (!["DEFAULT", "FIRST_PAGE_ONLY", "EVEN_PAGE"].includes(headerFooterType)) {
      return { success: false, message: "header_footer_type must be 'DEFAULT', 'FIRST_PAGE_ONLY', or 'EVEN_PAGE'" };
    }

    try {
      const doc = await this.getDocument(documentId);
      const [targetSection, sectionId] = await this.findTargetSection(doc, sectionType, headerFooterType);

      if (!targetSection) {
        return {
          success: false,
          message: `No ${sectionType} found in document. Please create a ${sectionType} first in Google Docs.`
        };
      }

      const success = await this.replaceSectionContent(documentId, targetSection, content);

      return {
        success,
        message: success
          ? `Updated ${sectionType} content in document ${documentId}`
          : `Could not find content structure in ${sectionType} to update`
      };

    } catch (error) {
      logger.error(`Failed to update ${sectionType}: ${error}`);
      return { success: false, message: `Failed to update ${sectionType}: ${error}` };
    }
  }

  private async getDocument(documentId: string): Promise<any> {
    const response = await this.service.documents().get({ documentId });
    return response.data;
  }

  private async findTargetSection(
    doc: any,
    sectionType: string,
    headerFooterType: "DEFAULT" | "FIRST_PAGE" | "EVEN_PAGE" | "FIRST_PAGE_ONLY"
  ): Promise<[any, string] | [null, null]> {
    const sections = sectionType === "header" ? doc.headers || {} : doc.footers || {};

    // Try to find exact match
    for (const [sectionId, sectionData] of Object.entries(sections)) {
      if ((sectionData as any).type === headerFooterType) {
        return [sectionData, sectionId];
      }
    }

    // Fallback patterns
    const targetPatterns: Record<"DEFAULT" | "FIRST_PAGE" | "EVEN_PAGE" | "FIRST_PAGE_ONLY", string[]> = {
      "DEFAULT": ["default", "kix"],
      "FIRST_PAGE": ["first", "firstpage"],
      "EVEN_PAGE": ["even", "evenpage"],
      "FIRST_PAGE_ONLY": ["first", "firstpage"]
    };

    const patterns = targetPatterns[headerFooterType] || [];
    for (const pattern of patterns) {
      for (const [sectionId, sectionData] of Object.entries(sections)) {
        if (sectionId.toLowerCase().includes(pattern)) {
          return [sectionData, sectionId];
        }
      }
    }

    // Return first available as fallback
    const entries = Object.entries(sections);
    if (entries.length > 0) {
      return [entries[0][1], entries[0][0]];
    }

    return [null, null];
  }

  private async replaceSectionContent(
    documentId: string,
    section: any,
    newContent: string
  ): Promise<boolean> {
    const contentElements = section.content || [];
    if (!contentElements.length) return false;

    const firstPara = this.findFirstParagraph(contentElements);
    if (!firstPara) return false;

    const startIndex = firstPara.startIndex || 0;
    const endIndex = firstPara.endIndex || 0;

    const requests: any[] = [];

    if (endIndex > startIndex) {
      requests.push({
        deleteContentRange: {
          range: {
            startIndex,
            endIndex: endIndex - 1
          }
        }
      });
    }

    requests.push({
      insertText: {
        location: { index: startIndex },
        text: newContent
      }
    });

    try {
      await this.service.documents().batchUpdate({
        documentId,
        requestBody: { requests }
      });
      return true;
    } catch (error) {
      logger.error(`Failed to replace section content: ${error}`);
      return false;
    }
  }

  private findFirstParagraph(contentElements: any[]): any | null {
    return contentElements.find(element => element.paragraph) || null;
  }

  async getHeaderFooterInfo(documentId: string): Promise<DocumentHeadersFooters> {
    try {
      const doc = await this.getDocument(documentId);

      const headersInfo: Record<string, SectionInfo> = {};
      for (const [headerId, headerData] of Object.entries(doc.headers || {})) {
        headersInfo[headerId] = this.extractSectionInfo(headerData as any);
      }

      const footersInfo: Record<string, SectionInfo> = {};
      for (const [footerId, footerData] of Object.entries(doc.footers || {})) {
        footersInfo[footerId] = this.extractSectionInfo(footerData as any);
      }

      return {
        headers: headersInfo,
        footers: footersInfo,
        has_headers: Object.keys(headersInfo).length > 0,
        has_footers: Object.keys(footersInfo).length > 0
      };

    } catch (error) {
      logger.error(`Failed to get header/footer info: ${error}`);
      return { error: String(error) } as any;
    }
  }

  private extractSectionInfo(sectionData: any): SectionInfo {
    const contentElements = sectionData.content || [];
    
    let textContent = "";
    for (const element of contentElements) {
      if (element.paragraph) {
        const para = element.paragraph;
        for (const paraElement of para.elements || []) {
          if (paraElement.textRun) {
            textContent += paraElement.textRun.content || '';
          }
        }
      }
    }

    return {
      content_preview: textContent.slice(0, 100) || "(empty)",
      element_count: contentElements.length,
      start_index: contentElements[0]?.startIndex || 0,
      end_index: contentElements[contentElements.length - 1]?.endIndex || 0
    };
  }

  async createHeaderFooter(
    documentId: string,
    sectionType: string,
    headerFooterType = "DEFAULT"
  ): Promise<HeaderFooterResult> {
    if (!["header", "footer"].includes(sectionType)) {
      return { success: false, message: "section_type must be 'header' or 'footer'" };
    }

    const typeMapping: Record<string, string> = {
      "DEFAULT": "DEFAULT",
      "FIRST_PAGE": "FIRST_PAGE",
      "EVEN_PAGE": "EVEN_PAGE",
      "FIRST_PAGE_ONLY": "FIRST_PAGE"
    };

    const apiType = typeMapping[headerFooterType] || headerFooterType;
    if (!["DEFAULT", "FIRST_PAGE", "EVEN_PAGE"].includes(apiType)) {
      return { success: false, message: "header_footer_type must be 'DEFAULT', 'FIRST_PAGE', or 'EVEN_PAGE'" };
    }

    try {
      const request: any = { type: apiType };
      const batchRequest = sectionType === "header"
        ? { createHeader: request }
        : { createFooter: request };

      await this.service.documents().batchUpdate({
        documentId,
        requestBody: { requests: [batchRequest] }
      });

      return {
        success: true,
        message: `Successfully created ${sectionType} with type ${apiType}`
      };

    } catch (error) {
      const errorMsg = String(error);
      if (errorMsg.toLowerCase().includes("already exists")) {
        return {
          success: false,
          message: `A ${sectionType} of type ${apiType} already exists in the document`
        };
      }
      return { success: false, message: `Failed to create ${sectionType}: ${errorMsg}` };
    }
  }
}