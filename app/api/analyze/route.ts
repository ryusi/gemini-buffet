import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GOOGLE_API_KEY;
const client = new GoogleGenAI({ apiKey });

// Hardcoded Store ID from setup script
const STORE_ID = "fileSearchStores/buffett-wisdom-store-popula-ko4w8geo203b";

// Helper function to fetch real-time stock data from Yahoo Finance
async function fetchStockData(symbol: string) {
  try {
    const cleanSymbol = symbol.toUpperCase().trim();
    console.log(`[YAHOO FINANCE] Fetching data for ${cleanSymbol}...`);

    // Fetch quote data
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?interval=1d&range=1d`;
    const quoteResponse = await fetch(quoteUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!quoteResponse.ok) {
      throw new Error(`Yahoo Finance quote API error: ${quoteResponse.status}`);
    }

    const quoteData = await quoteResponse.json();
    console.log(`[YAHOO FINANCE] Quote data received for ${cleanSymbol}`);

    const result = quoteData.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];

    const currentPrice =
      meta.regularMarketPrice || quote.close[quote.close.length - 1];
    const previousClose = meta.previousClose;
    const marketState = meta.marketState; // REGULAR, PRE, POST, CLOSED

    console.log(
      `[YAHOO FINANCE] Current price: $${currentPrice?.toFixed(2)}, Market: ${marketState}`,
    );

    // Fetch key statistics with multiple modules for better coverage
    const statsUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${cleanSymbol}?modules=defaultKeyStatistics,financialData,summaryDetail,price`;
    console.log(`[YAHOO FINANCE] Fetching statistics from: ${statsUrl}`);

    const statsResponse = await fetch(statsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    let financialData: Record<string, any> = {};
    let keyStatistics: Record<string, any> = {};
    let summaryDetail: Record<string, any> = {};
    let priceData: Record<string, any> = {};

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log(`[YAHOO FINANCE] Stats response OK`);

      const quoteSummary = statsData.quoteSummary?.result?.[0];
      if (quoteSummary) {
        financialData = quoteSummary.financialData || {};
        keyStatistics = quoteSummary.defaultKeyStatistics || {};
        summaryDetail = quoteSummary.summaryDetail || {};
        priceData = quoteSummary.price || {};

        console.log(`[YAHOO FINANCE] Parsed modules:`, {
          hasFinancialData: Object.keys(financialData).length > 0,
          hasKeyStatistics: Object.keys(keyStatistics).length > 0,
          hasSummaryDetail: Object.keys(summaryDetail).length > 0,
          hasPriceData: Object.keys(priceData).length > 0,
        });
      } else {
        console.warn(`[YAHOO FINANCE] No quoteSummary result in response`);
      }
    } else {
      console.error(
        `[YAHOO FINANCE] Stats response failed: ${statsResponse.status}`,
      );
    }

    // Format market cap
    const formatLargeNumber = (num: number) => {
      if (!num || isNaN(num)) return "N/A";
      if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      return `$${num.toFixed(2)}`;
    };

    const formatPercentage = (value: any) => {
      if (!value) return "N/A";
      const rawValue = typeof value === "object" ? value.raw : value;
      if (rawValue === undefined || rawValue === null || isNaN(rawValue))
        return "N/A";
      return `${(rawValue * 100).toFixed(2)}%`;
    };

    const formatCurrency = (value: any) => {
      if (!value) return "N/A";
      const rawValue = typeof value === "object" ? value.raw : value;
      if (rawValue === undefined || rawValue === null || isNaN(rawValue))
        return "N/A";
      return `$${rawValue.toFixed(2)}`;
    };

    const formatNumber = (value: any) => {
      if (!value) return "N/A";
      const rawValue = typeof value === "object" ? value.raw : value;
      if (rawValue === undefined || rawValue === null || isNaN(rawValue))
        return "N/A";
      return rawValue.toFixed(2);
    };

    // Extract market cap from multiple possible sources
    const getMarketCap = () => {
      // Try from price module
      if (priceData.marketCap?.raw) {
        return formatLargeNumber(priceData.marketCap.raw);
      }
      // Try from summaryDetail
      if (summaryDetail.marketCap?.raw) {
        return formatLargeNumber(summaryDetail.marketCap.raw);
      }
      // Calculate from shares and price
      if (meta.regularMarketPrice && keyStatistics.sharesOutstanding?.raw) {
        return formatLargeNumber(
          meta.regularMarketPrice * keyStatistics.sharesOutstanding.raw,
        );
      }
      return "N/A";
    };

    const keyFinancials = {
      peRatio: formatNumber(summaryDetail.trailingPE || priceData.trailingPE),
      marketCap: getMarketCap(),
      dividendYield: formatPercentage(summaryDetail.dividendYield),
      roe: formatPercentage(financialData.returnOnEquity),
      freeCashFlow: formatLargeNumber(financialData.freeCashflow?.raw),
      debtToEquity: formatNumber(financialData.debtToEquity),
      eps: formatCurrency(
        keyStatistics.trailingEps || summaryDetail.trailingEps,
      ),
      operatingMargin: formatPercentage(financialData.operatingMargins),
      bookValuePerShare: formatCurrency(keyStatistics.bookValue),
      revenueGrowth: formatPercentage(financialData.revenueGrowth),
    };

    console.log(`[YAHOO FINANCE] Formatted financials:`, keyFinancials);

    // Check how many N/A values we have
    const naCount = Object.values(keyFinancials).filter(
      (v) => v === "N/A",
    ).length;
    console.log(
      `[YAHOO FINANCE] N/A count: ${naCount} out of ${Object.keys(keyFinancials).length}`,
    );

    console.log(`[YAHOO FINANCE] Successfully fetched data for ${cleanSymbol}`);

    return {
      currentPrice: currentPrice ? `$${currentPrice.toFixed(2)}` : "N/A",
      previousClose: previousClose ? `$${previousClose.toFixed(2)}` : "N/A",
      marketStatus:
        marketState === "REGULAR"
          ? "Open"
          : marketState === "CLOSED"
            ? "Closed"
            : marketState === "PRE"
              ? "Pre-Market"
              : "After-Hours",
      keyFinancials,
      previousClose,
      rawData: {
        financialData,
        keyStatistics,
        summaryDetail,
        priceData,
      },
    };
  } catch (error) {
    console.error("[YAHOO FINANCE] Error fetching stock data:", error);
    if (error instanceof Error) {
      console.error("[YAHOO FINANCE] Error details:", error.message);
      console.error("[YAHOO FINANCE] Error stack:", error.stack);
    }
    return null;
  }
}

// Helper function to clean and fix JSON string
function cleanJsonString(jsonStr: string): string {
  let cleaned = jsonStr;

  // Remove markdown code blocks
  cleaned = cleaned
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  // Extract JSON object if there's extra text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  // Fix common JSON issues
  cleaned = cleaned
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "")
    // Fix trailing commas before closing braces/brackets
    .replace(/,(\s*[}\]])/g, "$1")
    // Fix multiple consecutive commas
    .replace(/,+/g, ",")
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*/g, "");

  // Try to fix unescaped newlines in string values
  try {
    // Find string values and ensure newlines are properly escaped
    cleaned = cleaned.replace(/"([^"]*(?:\\"[^"]*)*)"/g, (match, content) => {
      // If content has unescaped newlines, escape them
      const fixed = content
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t");
      return `"${fixed}"`;
    });
  } catch (e) {
    console.error("Error fixing string values:", e);
  }

  return cleaned.trim();
}

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

          **CRITICAL**: You MUST write your entire response in KOREAN (한국어).

          Summarize relevant quotes and principles from the letters in Korean.
          **You MUST cite the year of the shareholder letter for every quote or principle mentioned** (e.g., "1987년 주주서한에서...").

          Use professional Korean financial terminology:
          - Economic Moat → 경제적 해자
          - Intrinsic Value → 내재 가치
          - Return on Equity → 자기자본이익률
          - Free Cash Flow → 잉여현금흐름
          - Management → 경영진

          Write in a conversational but professional Korean style, as if Warren Buffett is speaking directly to Korean investors.
        `;

        const ragResult = await client.models.generateContent({
          model: model,
          contents: [{ role: "user", parts: [{ text: ragPrompt }] }],
          config: {
            tools: [{ fileSearch: { fileSearchStoreNames: [STORE_ID] } }],
            systemInstruction:
              "You are Warren Buffett speaking to Korean investors. You MUST respond entirely in Korean (한국어). Use professional financial terminology and cite specific years from shareholder letters.",
          },
        });

        const buffettWisdom = ragResult.text;
        console.log("Buffett Wisdom:", buffettWisdom);

        // Send Step 1 result immediately
        const step1Data = {
          step: 1,
          buffettWisdom: buffettWisdom,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(step1Data)}\n\n`),
        );

        // Step 2: Fetch real-time stock data
        console.log("Step 2: Fetching real-time stock data...");
        const stockData = await fetchStockData(symbol);

        if (!stockData) {
          console.error("[ANALYZE] Step 2 - Failed to fetch stock data");
          throw new Error(
            "Failed to fetch real-time stock data from Yahoo Finance",
          );
        }

        console.log("[ANALYZE] Step 2 - Real-time data fetched successfully");
        console.log(
          "[ANALYZE] Step 2 - Stock Data (without raw):",
          JSON.stringify(
            {
              currentPrice: stockData.currentPrice,
              marketStatus: stockData.marketStatus,
              keyFinancials: stockData.keyFinancials,
            },
            null,
            2,
          ),
        );

        // Log raw data separately for debugging
        if (stockData.rawData) {
          console.log("[ANALYZE] Step 2 - Raw Yahoo Finance data available");
          console.log(
            "[ANALYZE] Step 2 - financialData keys:",
            Object.keys(stockData.rawData.financialData || {}),
          );
          console.log(
            "[ANALYZE] Step 2 - keyStatistics keys:",
            Object.keys(stockData.rawData.keyStatistics || {}),
          );
          console.log(
            "[ANALYZE] Step 2 - summaryDetail keys:",
            Object.keys(stockData.rawData.summaryDetail || {}),
          );
          console.log(
            "[ANALYZE] Step 2 - priceData keys:",
            Object.keys(stockData.rawData.priceData || {}),
          );
        }

        // Step 3: Synthesize with AI analysis
        console.log("Step 3: Synthesizing AI analysis with real-time data...");
        const finalPrompt = `
            You are Warren Buffett analyzing ${symbol}.

            Here is your wisdom regarding ${symbol} (based on your letters):
            "${buffettWisdom}"

            Here is the REAL-TIME financial data for ${symbol} (from Yahoo Finance):
            - Current Price: ${stockData.currentPrice}
            - Previous Close: ${stockData.previousClose}
            - Market Status: ${stockData.marketStatus}
            - P/E Ratio: ${stockData.keyFinancials.peRatio}
            - Market Cap: ${stockData.keyFinancials.marketCap}
            - Dividend Yield: ${stockData.keyFinancials.dividendYield}
            - ROE (Return on Equity): ${stockData.keyFinancials.roe}
            - Free Cash Flow: ${stockData.keyFinancials.freeCashFlow}
            - Debt-to-Equity Ratio: ${stockData.keyFinancials.debtToEquity}
            - EPS (Earnings Per Share): ${stockData.keyFinancials.eps}
            - Operating Margin: ${stockData.keyFinancials.operatingMargin}
            - Book Value Per Share: ${stockData.keyFinancials.bookValuePerShare}
            - Revenue Growth: ${stockData.keyFinancials.revenueGrowth}

            **NOTE**: If any metric shows "N/A", acknowledge it in your analysis and use Google Search to try to find that specific metric for ${symbol}.

            Now, use Google Search to find the **latest news** for ${symbol}.

            Combine your wisdom with this real-time financial data to provide a deep financial analysis **IN KOREAN**.
            Your tone should be wise, patient, and focused on long-term value.

            **CRITICAL INSTRUCTIONS**:
            1. **YOU MUST RESPOND WITH VALID JSON ONLY. NO EXTRA TEXT BEFORE OR AFTER THE JSON.**
            2. Write the "opinion" field entirely in **Korean (한국어)**.
            3. Use **Markdown formatting** for the "opinion" field to improve readability:
               - Use **bold** for key terms and emphasis.
               - Use bullet points for lists.
               - Use headers (###) to separate sections (e.g., "투자 철학", "현재 상황 분석", "결론").
               - **CRITICAL**: Use double line breaks (\\n\\n) between every paragraph to ensure proper spacing. Do not write long blocks of text.
            4. Use **professional Korean financial terminology** (e.g., use "경제적 해자" for Economic Moat, "내재 가치" for Intrinsic Value).
            5. You must cite the shareholder letters (e.g., "1987년 주주서한에서...") when referencing the wisdom provided above.
            6. **CRITICAL FOR keyFinancials**: Use the EXACT values provided above from Yahoo Finance. DO NOT change these numbers.
            7. **Investment Recommendation**: Provide a clear recommendation (매수/보유/매도) with detailed reasoning in Korean, based on the financial metrics provided.
            8. **Macro Perspective**: Analyze how current macroeconomic conditions (interest rates, inflation, market sentiment) affect this investment in Korean.
            9. **ESCAPE ALL SPECIAL CHARACTERS IN JSON STRINGS**: Use \\" for quotes, \\n for newlines, \\\\ for backslashes.
            10. **DO NOT include trailing commas in JSON objects or arrays.**
            11. **Recent News**: Use Google Search to find 3-5 recent news articles about ${symbol}.

            Return ONLY the following valid JSON format (no markdown, no code blocks, no extra text):
            {
              "opinion": "Markdown formatted Korean analysis based on the real financial data provided above...",
              "recommendation": "매수/보유/매도 중 하나와 상세한 이유 (Korean)",
              "macroPerspective": "거시경제 관점에서의 분석 (Korean, 금리/인플레이션/시장 심리 등)",
              "currentPrice": "${stockData.currentPrice}",
              "marketStatus": "${stockData.marketStatus}",
              "keyFinancials": {
                "peRatio": "${stockData.keyFinancials.peRatio}",
                "marketCap": "${stockData.keyFinancials.marketCap}",
                "dividendYield": "${stockData.keyFinancials.dividendYield}",
                "roe": "${stockData.keyFinancials.roe}",
                "freeCashFlow": "${stockData.keyFinancials.freeCashFlow}",
                "debtToEquity": "${stockData.keyFinancials.debtToEquity}",
                "eps": "${stockData.keyFinancials.eps}",
                "operatingMargin": "${stockData.keyFinancials.operatingMargin}",
                "bookValuePerShare": "${stockData.keyFinancials.bookValuePerShare}",
                "revenueGrowth": "${stockData.keyFinancials.revenueGrowth}"
              },
              "recentNews": [
                { "title": "Actual news title in English from Google Search", "titleKo": "뉴스 제목 한글 번역", "url": "Actual URL from search" }
              ]
            }

            **IMPORTANT**:
            - Use the EXACT financial values provided above. DO NOT modify them.
            - Focus your analysis on interpreting these numbers from Warren Buffett's perspective.
            - Use Google Search ONLY for finding recent news articles about ${symbol}.
          `;

        const finalResult = await client.models.generateContent({
          model: model,
          contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
          config: {
            tools: [{ googleSearch: {} }],
            systemInstruction:
              'You are Warren Buffett analyzing a stock with REAL financial data already provided. Use Google Search ONLY for finding recent news articles. DO NOT modify the financial values provided in the prompt - use them exactly as given. Speak in his wisdom and tone. YOU MUST respond with VALID JSON only. DO NOT include markdown code blocks, extra text, or any content outside the JSON object. All strings in JSON must properly escape special characters (use \\" for quotes, \\n for newlines). DO NOT use trailing commas.',
          },
        });

        let responseText = finalResult.text;
        console.log(
          `[ANALYZE] Step 3 - Raw Response Length: ${responseText?.length} characters`,
        );
        console.log(
          "[ANALYZE] Step 3 - First 500 chars:",
          responseText?.substring(0, 500),
        );

        if (!responseText) {
          throw new Error("No response text received from Gemini");
        }

        // Clean JSON string using helper function
        responseText = cleanJsonString(responseText);

        console.log(
          `[ANALYZE] Step 3 - Cleaned Length: ${responseText.length} characters`,
        );
        console.log(
          "[ANALYZE] Step 3 - Cleaned (first 500 chars):",
          responseText.substring(0, 500),
        );
        console.log(
          "[ANALYZE] Step 3 - Cleaned (last 200 chars):",
          responseText.substring(Math.max(0, responseText.length - 200)),
        );

        let analysis;
        try {
          console.log("[ANALYZE] Step 3 - Attempting JSON.parse...");
          analysis = JSON.parse(responseText);

          // Validate required fields
          if (!analysis.opinion || !analysis.recommendation) {
            console.error("[ANALYZE] Step 3 - Missing required fields");
            throw new Error("Missing required fields in analysis");
          }

          console.log("[ANALYZE] Step 3 - JSON parsed successfully");
        } catch (parseError) {
          console.error("[ANALYZE] Step 3 - JSON Parse Error:", parseError);
          console.error(
            "[ANALYZE] Step 3 - Failed JSON (first 1000 chars):",
            responseText.substring(0, 1000),
          );
          console.error(
            "[ANALYZE] Step 3 - Failed JSON (last 500 chars):",
            responseText.substring(Math.max(0, responseText.length - 500)),
          );

          // More robust regex patterns for fallback extraction
          const extractField = (fieldName: string): string | null => {
            // Try multiple patterns
            const patterns = [
              new RegExp(
                `"${fieldName}"\\s*:\\s*"([^"]*(?:\\\\"[^"]*)*)"`,
                "s",
              ),
              new RegExp(
                `"${fieldName}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"\\w+"|\\s*})`,
                "",
              ),
            ];

            for (const pattern of patterns) {
              const match = responseText.match(pattern);
              if (match && match[1]) {
                return match[1]
                  .replace(/\\n/g, "\n")
                  .replace(/\\"/g, '"')
                  .replace(/\\\\/g, "\\")
                  .replace(/\\t/g, "\t");
              }
            }
            return null;
          };

          const opinion = extractField("opinion");
          const recommendation = extractField("recommendation");
          const macroPerspective = extractField("macroPerspective");
          const currentPrice = extractField("currentPrice");
          const marketStatus = extractField("marketStatus");

          if (opinion || recommendation) {
            console.log("[ANALYZE] Step 3 - Using fallback extraction method");
            console.log("[ANALYZE] Step 3 - Extracted fields:", {
              hasOpinion: !!opinion,
              hasRecommendation: !!recommendation,
              hasMacroPerspective: !!macroPerspective,
              hasCurrentPrice: !!currentPrice,
              hasMarketStatus: !!marketStatus,
            });
            analysis = {
              opinion:
                opinion ||
                "AI 분석 결과를 파싱하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
              recommendation:
                recommendation || "매수/매도 의견을 추출할 수 없습니다.",
              macroPerspective:
                macroPerspective || "거시경제 관점을 추출할 수 없습니다.",
              currentPrice: currentPrice || "N/A",
              marketStatus: marketStatus || "Unknown",
              keyFinancials: {
                peRatio: "N/A",
                marketCap: "N/A",
                dividendYield: "N/A",
                roe: "N/A",
                freeCashFlow: "N/A",
                debtToEquity: "N/A",
                eps: "N/A",
                operatingMargin: "N/A",
                bookValuePerShare: "N/A",
                revenueGrowth: "N/A",
              },
              recentNews: [],
            };
          } else {
            // Send error to client
            const errorData = {
              error: "Failed to parse analysis",
              details: `JSON 파싱 오류: ${parseError instanceof Error ? parseError.message : "Unknown error"}. AI 응답 형식이 올바르지 않습니다. 다시 시도해 주세요.`,
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`),
            );
            controller.close();
            return;
          }
        }

        // Ensure we use the real stock data even if AI doesn't return it properly
        if (!analysis.currentPrice || analysis.currentPrice === "N/A") {
          analysis.currentPrice = stockData.currentPrice;
        }
        if (!analysis.marketStatus || analysis.marketStatus === "Unknown") {
          analysis.marketStatus = stockData.marketStatus;
        }
        if (
          !analysis.keyFinancials ||
          Object.values(analysis.keyFinancials).every((v) => v === "N/A")
        ) {
          analysis.keyFinancials = stockData.keyFinancials;
        }

        // Send Step 2 result
        console.log("[ANALYZE] Step 3 - Sending final analysis to client");
        console.log(
          "[ANALYZE] Step 3 - Key Financials:",
          JSON.stringify(analysis.keyFinancials, null, 2),
        );
        const step2Data = {
          step: 2,
          ...analysis,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(step2Data)}\n\n`),
        );

        console.log(`[ANALYZE] Analysis completed successfully for ${symbol}`);
        controller.close();
      } catch (error: unknown) {
        console.error("Analysis failed:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const errorData = {
          error: "Failed to analyze stock",
          details: errorMessage,
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
