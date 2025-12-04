"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navigation from "../../components/Navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart,
  Legend,
  BarChart,
  Bar,
  Cell,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  RefreshCw,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  Target,
  Link as LinkIcon,
} from "lucide-react";

// Types
interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date: string;
}

interface TickerData {
  symbol: string;
  price: number;
}

interface IndicatorData {
  rsi: number;
  ma7: number;
  ma25: number;
  ma99: number;
}

interface CorrelationData {
  name: string;
  value: number;
}

// Helper to calculate RSI
const calculateRSI = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

// Helper to calculate Moving Average
const calculateMA = (prices: number[], period: number): number => {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
};

// Helper to calculate Pearson Correlation Coefficient
const calculateCorrelationCoefficient = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  // Use the most recent n data points
  const x_ = x.slice(x.length - n);
  const y_ = y.slice(y.length - n);

  const sum_x = x_.reduce((a, b) => a + b, 0);
  const sum_y = y_.reduce((a, b) => a + b, 0);
  const sum_xy = x_.reduce((a, b, i) => a + b * y_[i], 0);
  const sum_x2 = x_.reduce((a, b) => a + b * b, 0);
  const sum_y2 = y_.reduce((a, b) => a + b * b, 0);

  const numerator = n * sum_xy - sum_x * sum_y;
  const denominator = Math.sqrt(
    (n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y),
  );

  if (denominator === 0) return 0;
  return numerator / denominator;
};

export default function CryptoDashboardPage() {
  const [activeTab, setActiveTab] = useState<"BTC" | "ETH">("BTC");
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [ethKlines, setEthKlines] = useState<KlineData[]>([]); // Keep ETH data for correlation
  const [btcKlines, setBtcKlines] = useState<KlineData[]>([]); // Keep BTC data for correlation
  const [marketCorrelations, setMarketCorrelations] = useState<
    CorrelationData[]
  >([]);
  const [scatterData, setScatterData] = useState<
    { x: number; y: number; date: string }[]
  >([]);
  const [rollingData, setRollingData] = useState<
    { date: string; correlation: number }[]
  >([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [prevPrice, setPrevPrice] = useState<number>(0);
  const [indicators, setIndicators] = useState<IndicatorData>({
    rsi: 0,
    ma7: 0,
    ma25: 0,
    ma99: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefreshSeconds, setAutoRefreshSeconds] = useState<number>(30);

  const fetchMarketCorrelations = useCallback(
    async (baseKlines: KlineData[]) => {
      const targets = [
        "BTCUSDT",
        "ETHUSDT",
        "BNBUSDT",
        "SOLUSDT",
        "XRPUSDT",
        "ADAUSDT",
        "DOGEUSDT",
        "AVAXUSDT",
      ];
      const activeSymbol = activeTab === "BTC" ? "BTCUSDT" : "ETHUSDT";
      const filteredTargets = targets.filter((t) => t !== activeSymbol);

      const promises = filteredTargets.map(async (symbol) => {
        try {
          const res = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=100`,
          );
          const data = await res.json();
          const prices = data.map((item: (string | number)[]) =>
            Number(item[4]),
          );
          return { symbol: symbol.replace("USDT", ""), prices };
        } catch {
          return null;
        }
      });

      const results = await Promise.all(promises);
      const validResults = results.filter(
        (r): r is { symbol: string; prices: number[] } => r !== null,
      );

      const baseCloses = baseKlines.map((k) => k.close);

      const correlations = validResults.map((item) => {
        const corr = calculateCorrelationCoefficient(baseCloses, item.prices);
        return { name: item.symbol, value: corr };
      });

      // Sort by absolute correlation strength
      correlations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
      setMarketCorrelations(correlations);
    },
    [activeTab],
  );

  const fetchMarketData = useCallback(async () => {
    setLoading(true);
    try {
      const symbol = activeTab === "BTC" ? "BTCUSDT" : "ETHUSDT";

      // Fetch Klines (Candlestick data)
      const klineResponse = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=100`,
      );
      const klineRaw = await klineResponse.json();

      // Process Kline Data
      const processedKlines: KlineData[] = klineRaw.map(
        (item: (string | number)[]) => ({
          time: Number(item[0]),
          open: Number(item[1]),
          high: Number(item[2]),
          low: Number(item[3]),
          close: Number(item[4]),
          volume: Number(item[5]),
          date: new Date(Number(item[0])).toLocaleDateString(),
        }),
      );

      setKlines(processedKlines);

      // Fetch current price separately
      const tickerResponse = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
      );
      const tickerData: TickerData = await tickerResponse.json();
      const price = parseFloat(tickerData.price);

      setPrevPrice(currentPrice || price);
      setCurrentPrice(price);

      // Calculate Indicators
      const closes = processedKlines.map((k) => k.close);
      const rsi = calculateRSI(closes);
      const ma7 = calculateMA(closes, 7);
      const ma25 = calculateMA(closes, 25);
      const ma99 = calculateMA(closes, 99);

      setIndicators({ rsi, ma7, ma25, ma99 });
      setLastUpdate(new Date());

      // Store specific coin data for simple correlation chart
      if (activeTab === "BTC") {
        setBtcKlines(processedKlines);
        if (ethKlines.length === 0) {
          fetchSecondaryData("ETHUSDT", setEthKlines);
        }
      } else {
        setEthKlines(processedKlines);
        if (btcKlines.length === 0) {
          fetchSecondaryData("BTCUSDT", setBtcKlines);
        }
      }

      // Fetch broader market correlations
      fetchMarketCorrelations(processedKlines);
    } catch (error) {
      console.error("Error fetching Binance data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    currentPrice,
    ethKlines.length,
    btcKlines.length,
    fetchMarketCorrelations,
  ]);

  const fetchSecondaryData = async (
    symbol: string,
    setter: React.Dispatch<React.SetStateAction<KlineData[]>>,
  ) => {
    try {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=100`,
      );
      const raw = await response.json();
      const processed: KlineData[] = raw.map((item: (string | number)[]) => ({
        time: Number(item[0]),
        open: Number(item[1]),
        high: Number(item[2]),
        low: Number(item[3]),
        close: Number(item[4]),
        volume: Number(item[5]),
        date: new Date(Number(item[0])).toLocaleDateString(),
      }));
      setter(processed);
    } catch (e) {
      console.error("Failed to fetch secondary data", e);
    }
  };

  // Initial Fetch & Interval
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(() => {
      fetchMarketData();
    }, 30000); // 30 seconds auto refresh

    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Timer countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoRefreshSeconds((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset timer when fetching
  useEffect(() => {
    setAutoRefreshSeconds(30);
  }, [lastUpdate]);

  // Calculate Advanced Correlations (Scatter & Rolling)
  useEffect(() => {
    if (btcKlines.length === 0 || ethKlines.length === 0) return;

    const btcMap = new Map(btcKlines.map((k) => [k.time, k]));
    const commonData = ethKlines
      .filter((k) => btcMap.has(k.time))
      .map((eth) => ({
        time: eth.time,
        date: eth.date,
        ethClose: eth.close,
        btcClose: btcMap.get(eth.time)!.close,
      }))
      .sort((a, b) => a.time - b.time);

    const scatter = [];
    const btcReturns = [];
    const ethReturns = [];
    const dates = [];

    for (let i = 1; i < commonData.length; i++) {
      const curr = commonData[i];
      const prev = commonData[i - 1];

      const btcRet = ((curr.btcClose - prev.btcClose) / prev.btcClose) * 100;
      const ethRet = ((curr.ethClose - prev.ethClose) / prev.ethClose) * 100;

      scatter.push({
        x: parseFloat(btcRet.toFixed(2)),
        y: parseFloat(ethRet.toFixed(2)),
        date: curr.date,
      });

      btcReturns.push(btcRet);
      ethReturns.push(ethRet);
      dates.push(curr.date);
    }

    setScatterData(scatter);

    // Calculate 30-day rolling correlation
    const rolling = [];
    const windowSize = 30;
    for (let i = windowSize; i < btcReturns.length; i++) {
      const sliceBTC = btcReturns.slice(i - windowSize, i);
      const sliceETH = ethReturns.slice(i - windowSize, i);
      const corr = calculateCorrelationCoefficient(sliceBTC, sliceETH);
      rolling.push({
        date: dates[i],
        correlation: parseFloat(corr.toFixed(3)),
      });
    }
    setRollingData(rolling);
  }, [btcKlines, ethKlines]);

  // Prepare BTC/ETH Correlation Data
  const correlationData = btcKlines
    .map((btc, index) => {
      const eth = ethKlines[index];
      if (!eth) return null;
      return {
        date: btc.date,
        BTC: btc.close,
        ETH: eth.close,
        // Normalized for comparison (starting at 100)
        normBTC: (btc.close / btcKlines[0].close) * 100,
        normETH: (eth.close / ethKlines[0].close) * 100,
      };
    })
    .filter((item) => item !== null);

  const priceChange = currentPrice - prevPrice;
  const priceChangePercent =
    prevPrice !== 0 ? (priceChange / prevPrice) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-orange-500" />
              Crypto Dashboard
            </h1>
            <p className="text-slate-400 mt-1">
              실시간 시세 및 기술적 지표 분석
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/50 p-2 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setActiveTab("BTC")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "BTC"
                  ? "bg-orange-500 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              BTC
            </button>
            <button
              onClick={() => setActiveTab("ETH")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "ETH"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              ETH
            </button>
          </div>
        </div>

        {/* Info Bar */}
        <div className="flex justify-between items-center mb-6 text-sm text-slate-400 bg-slate-800/30 px-4 py-2 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Binance API Connected
          </div>
          <div className="flex items-center gap-4">
            <span>Last Update: {lastUpdate.toLocaleTimeString()}</span>
            <div className="flex items-center gap-2">
              <RefreshCw
                className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
              />
              <span>{autoRefreshSeconds}s</span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Price Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-400 text-sm mb-2 font-medium">
              Current Price
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              $
              {currentPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div
              className={`flex items-center gap-1 text-sm font-medium ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {priceChange >= 0 ? (
                <ArrowUpRight size={16} />
              ) : (
                <ArrowDownRight size={16} />
              )}
              {priceChangePercent.toFixed(2)}%
            </div>
          </div>

          {/* RSI Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-400 text-sm mb-2 font-medium">
              RSI (14)
            </div>
            <div
              className={`text-3xl font-bold mb-2 ${indicators.rsi > 70 ? "text-red-400" : indicators.rsi < 30 ? "text-green-400" : "text-white"}`}
            >
              {indicators.rsi.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500">
              {indicators.rsi > 70
                ? "Overbought"
                : indicators.rsi < 30
                  ? "Oversold"
                  : "Neutral"}
            </div>
          </div>

          {/* MA Trend Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-400 text-sm mb-2 font-medium">
              Trend (MA)
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {currentPrice > indicators.ma99 ? (
                <span className="text-green-400">Bullish</span>
              ) : (
                <span className="text-red-400">Bearish</span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              vs MA99: $
              {indicators.ma99.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </div>
          </div>

          {/* Volatility/Volume placeholder */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="text-slate-400 text-sm mb-2 font-medium">
              24h Volume
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {(klines.length > 0
                ? klines[klines.length - 1].volume
                : 0
              ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-500">{activeTab} Units</div>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Price Chart */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 h-[400px]">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Activity className="text-orange-500" size={20} />
              Price & MA History (100 Days)
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={klines}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={["auto", "auto"]}
                  tick={{ fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#fff",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="close"
                  stroke={activeTab === "BTC" ? "#f97316" : "#3b82f6"}
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                  name="Price"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={() => indicators.ma25}
                  stroke="none"
                />
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={activeTab === "BTC" ? "#f97316" : "#3b82f6"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={activeTab === "BTC" ? "#f97316" : "#3b82f6"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Investment Analysis */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Zap className="text-yellow-500" size={20} />
              Analysis
            </h3>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">RSI Signal</span>
                  <span
                    className={`font-bold ${indicators.rsi > 70 ? "text-red-400" : indicators.rsi < 30 ? "text-green-400" : "text-yellow-400"}`}
                  >
                    {indicators.rsi > 70
                      ? "SELL"
                      : indicators.rsi < 30
                        ? "BUY"
                        : "HOLD"}
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${indicators.rsi > 70 ? "bg-red-500" : indicators.rsi < 30 ? "bg-green-500" : "bg-yellow-500"}`}
                    style={{ width: `${indicators.rsi}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">MA Trend (99d)</span>
                  <span className="font-bold text-slate-200">
                    {currentPrice > indicators.ma99 ? "Uptrend" : "Downtrend"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <div
                    className={`w-2 h-2 rounded-full ${currentPrice > indicators.ma99 ? "bg-green-500" : "bg-red-500"}`}
                  ></div>
                  Price is {currentPrice > indicators.ma99 ? "above" : "below"}{" "}
                  long-term average
                </div>
              </div>

              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div className="text-xs text-slate-400 mb-2 font-bold uppercase">
                  Trading Tip
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {indicators.rsi < 30
                    ? "RSI가 30 미만으로 과매도 구간입니다. 분할 매수 기회가 될 수 있습니다."
                    : indicators.rsi > 70
                      ? "RSI가 70 이상으로 과매수 구간입니다. 차익 실현을 고려할 수 있습니다."
                      : "시장이 중립적인 상태입니다. 추세 전환을 기다리거나 장기 보유 전략을 유지하세요."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Correlation Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* BTC/ETH Correlation */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 h-[350px]">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target className="text-purple-500" size={20} />
              BTC / ETH Normalized Correlation
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#fff",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="normBTC"
                  name="BTC %"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="normETH"
                  name="ETH %"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Market Correlation Matrix */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 h-[350px]">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <LinkIcon className="text-blue-500" size={20} />
              Market Correlation ({activeTab} vs Others)
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={marketCorrelations}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  type="number"
                  domain={[-1, 1]}
                  tick={{ fill: "#94a3b8" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#e2e8f0", fontWeight: "bold" }}
                  width={60}
                />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#fff",
                  }}
                  formatter={(value: number) => [value.toFixed(3), "Pearson r"]}
                />
                <Bar dataKey="value" barSize={20}>
                  {marketCorrelations.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.value > 0.7
                          ? "#4ade80" // High positive correlation
                          : entry.value > 0.3
                            ? "#a3e635" // Moderate positive
                            : entry.value < -0.3
                              ? "#f87171" // Negative correlation
                              : "#94a3b8" // Neutral
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Advanced Correlation Analysis */}
        <div className="mt-8">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-blue-400" size={20} />
            Advanced Correlation Analysis
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Scatter Plot */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 h-[350px]">
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-white">
                  Daily Returns Scatter (BTC vs ETH)
                </h4>
                <p className="text-xs text-slate-400">
                  X: BTC Daily Return %, Y: ETH Daily Return %
                </p>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="BTC Return"
                    unit="%"
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8" }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="ETH Return"
                    unit="%"
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8" }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#334155",
                      color: "#fff",
                    }}
                  />
                  <Scatter
                    name="Returns"
                    data={scatterData}
                    fill="#8884d8"
                    shape="circle"
                  >
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.x > 0 && entry.y > 0
                            ? "#4ade80"
                            : entry.x < 0 && entry.y < 0
                              ? "#f87171"
                              : "#94a3b8"
                        }
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Rolling Correlation */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 h-[350px]">
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-white">
                  30-Day Rolling Correlation
                </h4>
                <p className="text-xs text-slate-400">
                  Correlation coefficient over trailing 30 days
                </p>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rollingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                  />
                  <YAxis
                    domain={[-1, 1]}
                    tick={{ fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#334155",
                      color: "#fff",
                    }}
                  />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Area
                    type="monotone"
                    dataKey="correlation"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
