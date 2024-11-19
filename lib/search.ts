import * as cheerio from "cheerio";
import { Source } from "@/lib/types";
import { z } from "zod";
import { groq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

interface SerpApiResponse {
  organic_results: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
    thumbnail?: string;
  }>;
  error?: string;
}

interface InitialSource {
  id: string;
  title: string;
  url: string;
}

interface ParsedContent {
  content: string;
  siteName: string;
}

function extractSiteName(url: string, html: string): string {
  const hostname = new URL(url).hostname.replace("www.", "");

  const $ = cheerio.load(html);
  const metaSiteName =
    $('meta[property="og:site_name"]').attr("content") ||
    $('meta[name="application-name"]').attr("content") ||
    $('meta[property="twitter:site"]').attr("content");

  if (metaSiteName) {
    return metaSiteName.trim();
  }

  return hostname
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(".")
    .split(".")[0];
}

function parseHtmlContent($: cheerio.CheerioAPI): string {
  $("script, style, nav, header, footer, iframe, noscript").remove();

  const mainContent = $(
    'main, article, [role="main"], .main-content, #main-content'
  ).first();
  const content = mainContent.length ? mainContent : $("body");

  let text = "";
  content.find("h1, h2, h3, h4, h5, h6, p, li").each((_, element) => {
    const elementText = $(element).text().trim();
    if (elementText) {
      if (element.tagName.match(/^h[1-6]$/)) {
        text += `\n${elementText}\n`;
      } else {
        text += `${elementText}\n`;
      }
    }
  });

  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchUrlContent(url: string): Promise<ParsedContent | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("text/html")) {
      console.error(`Unsupported content type for ${url}: ${contentType}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    return {
      content: parseHtmlContent($),
      siteName: extractSiteName(url, html),
    };
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

async function searchGoogle(searchTerm: string): Promise<InitialSource[]> {
  const params = new URLSearchParams({
    api_key: process.env.SERP_API_KEY!,
    q: searchTerm,
    engine: "google",
    num: "5",
    gl: "us",
    hl: "en",
  });

  try {
    const response = await fetch(
      `https://serpapi.com/search?${params.toString()}`
    );
    const data = (await response.json()) as SerpApiResponse;

    if (data.error) {
      console.error("SerpAPI error:", data.error);
      return [];
    }

    return data.organic_results.map((result) => ({
      id: crypto.randomUUID(),
      title: result.title,
      url: result.link,
      thumbnail: result.thumbnail,
    }));
  } catch (error) {
    console.error("Error making SerpAPI call:", error);
    return [];
  }
}

const sourceValidSchema = z.object({
  valid: z.boolean(),
});
const sourceValidPrompt = `
You are a helpful assistant that validates the relevance of a source.

Is the following source relevant to the query?

Query: {query}

** Source CONTENT **
{source}
`;

export async function validateSource(
  source: Source,
  query: string
): Promise<boolean> {
  if (!source.content) return false;

  const { object: sourceValid } = await generateObject({
    model: anthropic("claude-3-5-haiku-latest"),
    prompt: sourceValidPrompt
      .replace("{source}", source.content)
      .replace("{query}", query),
    schema: sourceValidSchema,
  });

  return sourceValid.valid;
}

export async function validateSources(sources: Source[]): Promise<Source[]> {
  const validationResults = await Promise.all(
    sources.map(async (source) => ({
      source,
      isValid: await validateSource(source, source.content || ""),
    }))
  );
  return validationResults
    .filter((result) => result.isValid)
    .map((result) => result.source);
}

export async function searchAndEnrichResults(
  searchTerms: string[]
): Promise<Source[]> {
  // Get initial results
  const searchResults = await Promise.all(searchTerms.map(searchGoogle));

  // Remove duplicates based on URL
  const uniqueResults = new Map<string, InitialSource>();
  searchResults.flat().forEach((result) => {
    if (!uniqueResults.has(result.url)) {
      uniqueResults.set(result.url, result);
    }
  });

  // Enrich with content and site names
  const enrichedResults = await Promise.all(
    Array.from(uniqueResults.values()).map(
      async (result): Promise<Source | null> => {
        const content = await fetchUrlContent(result.url);
        if (!content) return null;

        return {
          ...result,
          siteName: content.siteName,
          content: content.content,
        };
      }
    )
  );

  // Filter out null results and ensure type safety
  const completeResults = enrichedResults.filter(
    (source): source is Source => source !== null
  );

  return await validateSources(completeResults);
}
