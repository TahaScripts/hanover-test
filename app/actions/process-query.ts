"use server";

import { revalidatePath } from "next/cache";
import { QueryMessage, AssistantMessage, Source } from "@/lib/types";
import { generateObject, generateText } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";
import { searchAndEnrichResults } from "@/lib/search";
import { anthropic } from "@ai-sdk/anthropic";
const queryTermsSchema = z.object({
  searchTerms: z.array(z.string()),
});

const queryTermsPrompt = `
You are a helpful assistant that converts user queries into search terms for Google and similar search engines.

Query: {query}

Generate UP TO 5 search terms that are relevant to the query.
`;

export async function generateSearchTerms(
  query: QueryMessage
): Promise<string[]> {
  const { object: queryTerms } = await generateObject({
    model: anthropic("claude-3-5-haiku-latest"),
    prompt: queryTermsPrompt.replace("{query}", query.message),
    schema: queryTermsSchema,
  });

  return queryTerms.searchTerms;
}

export async function performSearch(searchTerms: string[]): Promise<Source[]> {
  return await searchAndEnrichResults(searchTerms);
}

function generateFinalResponsePrompt(sources: Source[], query: QueryMessage) {
  const prompt1 = `
    Use the following context to answer the user's query. If you cannot answer the information, try to summarize the context given if related to the question. Mention all company names given in the context.
    ALWAYS add Markdown in-line citations in this format: [[1231234]], which indicates the document used to answer a specific chunk in the answer. Add one citation for every source you used in the answer. Add the references as soon as the chunk referencing it is like so [[123123]][[112312]][[13123123]].
    For responses involving lists or multiple related data points, present them in a tabular format using Markdown tables for clarity and quick reference. Ensure that each table column header or list item is straightforward and directly relates to the query.
    When asked to list a few things, add the citation for how you got each point. Even if multiple lines come from the same source, you must add the proper citation to each line.
    DO NOT ADD CITATIONS AS THEIR OWN COLUMNS IN THE TABLE. NEVER DO THIS. ALWAYS HAVE THEM IN THE LAST COLUMN OF THE NORMAL TEXT.

    [CONTEXT EXAMPLE]
    {"id":"8f2d8bd4-b3f4-46d2-b2b0-57aa9d25384c","content": "Roth IRA is ...."}

    [CITATION EXAMPLE]
    The main benefit of a Roth IRA is the ability to enjoy tax-free withdrawals in retirement, which can be advantageous if you expect to be in a higher tax bracket later on [12413123]. Roth IRAs were introduced in 1997 and named after Senator William Roth, their chief legislative sponsor [[12413123]].
  
    1. Citadel 1 - $125,000 [[8f2d8bd4-b3f4-46d2-b2b0-57aa9d25384c]]
    2. Citadel 2 - $375,000 [[8f2d8bd4-b3f4-46d2-b2b0-57aa9d25384c]]
    3. Citadel 3 - $10,000 [[8f2d8bd4-b3f4-46d2-b2b0-57aa9d25384c]]

    <USER_QUERY>`;

  const prompt2 = query.message;

  let prompt3 = `</QUERY>
    
    <SOURCES>`;

  for (const source of sources) {
    prompt3 += `{"id": "${source.id}", "content": "${source.content}"}`;
  }

  prompt3 += `</SOURCES>`;

  return prompt1 + prompt2 + prompt3;
}

export async function generateFinalResponse(
  sources: Source[],
  query: QueryMessage
): Promise<string> {
  const prompt = generateFinalResponsePrompt(sources, query);
  const { text: finalResponse } = await generateText({
    model: anthropic("claude-3-5-sonnet-20241022"),
    prompt,
  });

  return finalResponse;
}
