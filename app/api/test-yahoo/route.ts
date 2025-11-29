import { NextResponse } from "next/server";

// Test endpoint to verify Yahoo Finance API
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "AAPL";

  try {
    console.log(`[TEST] Testing Yahoo Finance for ${symbol}...`);

    // Test 1: Chart API
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    console.log(`[TEST] Fetching: ${chartUrl}`);

    const chartResponse = await fetch(chartUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const chartData = await chartResponse.json();
    const chartResult = chartData.chart?.result?.[0];
    const meta = chartResult?.meta;

    console.log(`[TEST] Chart API Status: ${chartResponse.status}`);
    console.log(`[TEST] Current Price: ${meta?.regularMarketPrice}`);
    console.log(`[TEST] Market State: ${meta?.marketState}`);

    // Test 2: Quote Summary API
    const statsUrl = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=defaultKeyStatistics,financialData,summaryDetail,price`;
    console.log(`[TEST] Fetching: ${statsUrl}`);

    const statsResponse = await fetch(statsUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const statsData = await statsResponse.json();
    const quoteSummary = statsData.quoteSummary?.result?.[0];

    console.log(`[TEST] Stats API Status: ${statsResponse.status}`);

    const financialData = quoteSummary?.financialData || {};
    const keyStatistics = quoteSummary?.defaultKeyStatistics || {};
    const summaryDetail = quoteSummary?.summaryDetail || {};
    const priceData = quoteSummary?.price || {};

    // Extract and format all available data
    const testResults = {
      symbol: symbol,
      timestamp: new Date().toISOString(),
      chartApi: {
        status: chartResponse.status,
        currentPrice: meta?.regularMarketPrice,
        previousClose: meta?.previousClose,
        marketState: meta?.marketState,
        currency: meta?.currency,
        exchangeName: meta?.exchangeName,
      },
      statsApi: {
        status: statsResponse.status,
        modulesReceived: quoteSummary ? Object.keys(quoteSummary) : [],
      },
      extractedData: {
        price: {
          current: meta?.regularMarketPrice || priceData?.regularMarketPrice?.raw,
          currency: meta?.currency || priceData?.currency,
          marketCap: priceData?.marketCap?.raw || summaryDetail?.marketCap?.raw,
        },
        valuation: {
          peRatio:
            summaryDetail?.trailingPE?.raw ||
            priceData?.trailingPE?.raw ||
            null,
          forwardPE: summaryDetail?.forwardPE?.raw || null,
          pegRatio: keyStatistics?.pegRatio?.raw || null,
          priceToBook: keyStatistics?.priceToBook?.raw || null,
        },
        profitability: {
          roe: financialData?.returnOnEquity?.raw || null,
          roa: financialData?.returnOnAssets?.raw || null,
          operatingMargin: financialData?.operatingMargins?.raw || null,
          profitMargin: financialData?.profitMargins?.raw || null,
        },
        growth: {
          revenueGrowth: financialData?.revenueGrowth?.raw || null,
          earningsGrowth: financialData?.earningsGrowth?.raw || null,
        },
        financial: {
          totalCash: financialData?.totalCash?.raw || null,
          totalDebt: financialData?.totalDebt?.raw || null,
          debtToEquity: financialData?.debtToEquity?.raw || null,
          currentRatio: financialData?.currentRatio?.raw || null,
          freeCashflow: financialData?.freeCashflow?.raw || null,
        },
        perShare: {
          eps: keyStatistics?.trailingEps?.raw || summaryDetail?.trailingEps?.raw,
          bookValue: keyStatistics?.bookValue?.raw || null,
          revenuePerShare: keyStatistics?.revenuePerShare?.raw || null,
        },
        dividends: {
          dividendRate: summaryDetail?.dividendRate?.raw || null,
          dividendYield: summaryDetail?.dividendYield?.raw || null,
          payoutRatio: summaryDetail?.payoutRatio?.raw || null,
        },
        shares: {
          sharesOutstanding: keyStatistics?.sharesOutstanding?.raw || null,
          floatShares: keyStatistics?.floatShares?.raw || null,
        },
      },
      rawFinancialData: financialData,
      rawKeyStatistics: keyStatistics,
      rawSummaryDetail: summaryDetail,
      rawPriceData: priceData,
    };

    console.log(`[TEST] Test completed successfully for ${symbol}`);

    return NextResponse.json(testResults, { status: 200 });
  } catch (error) {
    console.error(`[TEST] Error testing Yahoo Finance:`, error);
    return NextResponse.json(
      {
        error: "Failed to test Yahoo Finance API",
        details: error instanceof Error ? error.message : "Unknown error",
        symbol: symbol,
      },
      { status: 500 },
    );
  }
}
