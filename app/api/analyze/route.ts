import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  console.log("API received request");
  try {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is missing");
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // @ts-expect-error: googleSearch is an experimental feature not yet in types
      tools: [{ googleSearch: {} }],
      systemInstruction: `당신은 전설적인 투자자 워렌 버핏입니다. 구글 검색 도구를 사용하여 사용자가 입력한 종목의 **오늘 현재 주가, 최신 뉴스, 재무 정보**를 검색하세요. 그리고 버핏 특유의 위트 있고 통찰력 있는 말투로 투자 의견을 제시하세요.

      응답은 반드시 아래 JSON 스키마를 따라야 하며, 마크다운 코드 블록 없이 순수 JSON 문자열만 반환하거나, 텍스트 내에 JSON이 포함되어야 합니다.

      JSON Schema:
      {
        "symbol": "종목명",
        "currentPrice": "현재가 (통화 포함)",
        "marketStatus": "시장 상황 (예: 장중, 장마감)",
        "buffettOpinion": "버핏의 한줄 평 (예: '자네, 이 기업은 해자가 깊구만...')",
        "keyFinancials": { "revenue": "매출", "operatingIncome": "영업이익" },
        "news": [
          { "title": "뉴스 제목", "source": "언론사", "link": "기사 링크" }
        ]
      }`,
    });
    const { symbol } = await req.json();
    console.log("Analyzing symbol:", symbol);

    if (!symbol) {
      return NextResponse.json({ error: "Stock symbol is required" }, { status: 400 });
    }

    const result = await model.generateContent(symbol);
    const response = await result.response;
    const text = response.text();

    console.log("Gemini Response:", text);

    // Extract JSON from the response (handling potential markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from Gemini response");
    }

    const jsonResponse = JSON.parse(jsonMatch[0]);

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    console.error("Error analyzing stock:", error);
    return NextResponse.json({
      error: "Failed to analyze stock",
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
