import { Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  PartialBlockObjectResponse,
  ParagraphBlockObjectResponse,
  RichTextItemResponse,
  TextRichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { isNotFalsey } from "../lib/utils";

const notion = new Client({ auth: process.env.NOTION_KEY });

const databaseId = process.env.NOTION_DATABASE_ID;

const isParagraph = (
  block: BlockObjectResponse | PartialBlockObjectResponse
): block is ParagraphBlockObjectResponse =>
  "type" in block && block.type === "paragraph";

const isTextRichTextItemResponse = (
  richText: RichTextItemResponse
): richText is TextRichTextItemResponse => richText.type === "text";

export const getBlogPost = async () => {
  try {
    if (!databaseId) {
      throw new Error("Missing Notion database ID environment variable.");
    }

    const database = await notion.databases.query({ database_id: databaseId });

    const blocks = await Promise.all(
      database.results.map(async (page) => {
        return notion.blocks.children.list({ block_id: page.id });
      })
    );

    const paragraphs = blocks
      .flatMap((block) =>
        block.results
          .map((r) => (isParagraph(r) ? r.paragraph : undefined))
          .filter(isNotFalsey)
      )
      .flatMap((paragraph) => paragraph.rich_text.map((r) => r))
      .map((text) => (isTextRichTextItemResponse(text) ? text.text : undefined))
      .filter(isNotFalsey);
  } catch (e) {}
};
