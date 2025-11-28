import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const apiKey = process.env.GOOGLE_API_KEY;
const client = new GoogleGenAI({ apiKey });

// Hardcoded Store ID from setup script
const STORE_ID = "fileSearchStores/buffett-wisdom-store-popula-ko4w8geo203b";

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const { symbol } = await req.json();
        console.log(`Analyzing symbol: ${symbol}`);

        if (!apiKey) {
          throw new Error("GOOGLE_API_KEY is not defined");
        }

        const model = "gemini-2.5-flash";

        // Step 1: Get Buffett's Wisdom (RAG)
        console.log("Step 1: Fetching Buffett's wisdom...");
        const ragPrompt = `
          You are Warren Buffett. Search your shareholder letters for any mentions of ${symbol} or companies in the same industry.
          
          Analyze the business based on your core investment principles:
          1. **Economic Moat**: Is there a durable competitive advantage?
          2. **Management Integrity**: Do they treat shareholders as partners?
          3. **Financial Health**: Focus on Return on Equity (ROE) and Free Cash Flow.
          
          Summarize relevant quotes and principles from the letters. **You MUST cite the year of the shareholder letter for every quote or principle mentioned.**
        `;

        const ragResult = await client.models.generateContent({
          model: model,
          contents: [{ role: "user", parts: [{ text: ragPrompt }] }],
          config: {
            tools: [{ fileSearch: { fileSearchStoreNames: [STORE_ID] } }],
          }
        });

        const buffettWisdom = ragResult.text;
        console.log("Buffett Wisdom:", buffettWisdom);

        // Send Step 1 result immediately
        const step1Data = {
          step: 1,
          buffettWisdom: buffettWisdom
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(step1Data)}\n\n`));

        // Step 2: Get Real-time Data and Synthesize (Google Search)
        console.log("Step 2: Fetching real-time data and synthesizing...");
        const finalPrompt = `
            You are Warren Buffett.
            
            Here is your wisdom regarding ${symbol} (based on your letters):
            "${buffettWisdom}"
            
            Now, use Google Search to find the **current price, market status, latest news, and key financial metrics** for ${symbol}.
            
            **IMPORTANT**: Search for these specific financial metrics:
            - **P/E Ratio** (Price-to-Earnings Ratio)
            - **Market Cap** (Market Capitalization in USD or appropriate currency)
            - **Dividend Yield** (as a percentage)
            - **ROE** (Return on Equity as a percentage)
            - **Free Cash Flow** (in USD or appropriate currency)
            - **Debt-to-Equity Ratio** (Total Debt / Total Equity)
            - **EPS** (Earnings Per Share)
            - **Operating Margin** (Operating Income / Revenue as a percentage)
            - **Book Value Per Share** (Total Assets - Total Liabilities / Shares Outstanding)
            - **Revenue Growth** (Year-over-year revenue growth rate as a percentage)
            
            Combine your wisdom with this real-time data to provide a deep financial analysis **IN KOREAN**.
            Your tone should be wise, patient, and focused on long-term value.
            
            **CRITICAL INSTRUCTIONS**:
            1. Write the "opinion" field entirely in **Korean (한국어)**.
            2. Use **Markdown formatting** for the "opinion" field to improve readability:
               - Use **bold** for key terms and emphasis.
               - Use bullet points for lists.
               - Use headers (###) to separate sections (e.g., "투자 철학", "현재 상황 분석", "결론").
               - **CRITICAL**: Use double line breaks (\\n\\n) between every paragraph to ensure proper spacing. Do not write long blocks of text.
            3. Use **professional Korean financial terminology** (e.g., use "경제적 해자" for Economic Moat, "내재 가치" for Intrinsic Value).
            4. You must cite the shareholder letters (e.g., "1987년 주주서한에서...") when referencing the wisdom provided above.
            5. For keyFinancials, provide actual numerical values or "N/A" if not found. Use proper formatting (e.g., "$3.2T" for market cap, "15.2%" for percentages).
            6. **Investment Recommendation**: Provide a clear recommendation (매수/보유/매도) with detailed reasoning in Korean.
            7. **Macro Perspective**: Analyze how current macroeconomic conditions (interest rates, inflation, market sentiment) affect this investment in Korean.
            
            Return the response in the following JSON format:
            {
              "opinion": "Markdown formatted Korean analysis...",
              "recommendation": "매수/보유/매도 중 하나와 상세한 이유 (Korean)",
              "macroPerspective": "거시경제 관점에서의 분석 (Korean, 금리/인플레이션/시장 심리 등)",
              "currentPrice": "Real-time price with currency symbol",
              "marketStatus": "Open/Closed",
              "keyFinancials": {
                "peRatio": "Exact P/E ratio or 'N/A'",
                "marketCap": "Market cap with currency (e.g., '$3.2T') or 'N/A'",
                "dividendYield": "Dividend yield percentage (e.g., '0.5%') or 'N/A'",
                "roe": "ROE percentage (e.g., '147%') or 'N/A'",
                "freeCashFlow": "Free cash flow with currency (e.g., '$96B') or 'N/A'",
                "debtToEquity": "Debt-to-Equity ratio (e.g., '0.45') or 'N/A'",
                "eps": "Earnings per share with currency (e.g., '$12.34') or 'N/A'",
                "operatingMargin": "Operating margin percentage (e.g., '25.5%') or 'N/A'",
                "bookValuePerShare": "Book value per share with currency (e.g., '$45.67') or 'N/A'",
                "revenueGrowth": "Revenue growth percentage (e.g., '15.2%') or 'N/A'"
              },
              "recentNews": [
                { "title": "News title in English", "titleKo": "뉴스 제목 한글 번역", "url": "News URL" }
              ]
            }
          `;

        const finalResult = await client.models.generateContent({
          model: model,
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
          config: {
            tools: [{ googleSearch: {} }],
            systemInstruction: "You are Warren Buffett. Speak in his wisdom and tone."
          }
        });

        let responseText = finalResult.text;
        console.log("Final Response:", responseText);

        if (!responseText) {
          throw new Error("No response text received from Gemini");
        }

        // Clean up markdown code blocks and control characters
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          responseText = jsonMatch[0];
        } else {
          responseText = responseText.replace(/```json\n|\n```/g, "").replace(/```/g, "").trim();
        }

        // Remove control characters that break JSON parsing
        responseText = responseText.replace(/[\x00-\x1F\x7F]/g, (char) => {
          // Keep newlines and tabs, remove other control characters
          if (char === '\n' || char === '\r' || char === '\t') {
            return char;
          }
          return '';
        });

        const analysis = JSON.parse(responseText);

        // Send Step 2 result
        const step2Data = {
          step: 2,
          ...analysis
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(step2Data)}\n\n`));

        controller.close();

      } catch (error: unknown) {
        console.error("Analysis failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorData = {
          error: "Failed to analyze stock",
          details: errorMessage
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
