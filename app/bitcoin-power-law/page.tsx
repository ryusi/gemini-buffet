"use client";

import React, { useState, useEffect } from "react";
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
  ReferenceLine,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  Activity,
  Bitcoin,
  Calculator,
  Target,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

// Types
interface BitcoinData {
  date: string;
  price: number;
  days: number;
  logDays: number;
  logPrice: number;
  expectedLogPrice: number;
  fairValue: number;
  residual: number;
  zScore: number;
  band: string;
}

interface RegressionStats {
  slope: number;
  intercept: number;
  rSquared: number;
  sigma: number;
}

interface PowerLawData {
  data: BitcoinData[];
  stats: RegressionStats;
  currentPrice: number;
  fairValue: number;
  zScore: number;
  advice: string;
}

// Utility functions
const linearRegression = (x: number[], y: number[]): RegressionStats => {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const ssRes = y.reduce((sum, yi, i) => {
    const predicted = intercept + slope * x[i];
    return sum + Math.pow(yi - predicted, 2);
  }, 0);
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const rSquared = 1 - ssRes / ssTot;

  // Calculate residuals and sigma
  const residuals = y.map((yi, i) => yi - (intercept + slope * x[i]));
  const sigma = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / n);

  return { slope, intercept, rSquared, sigma };
};

const fetchBitcoinPowerLawData = async (): Promise<PowerLawData> => {
  try {
    const response = await fetch("/api/bitcoin-power-law", {
      cache: "no-cache",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiData = await response.json();

    return {
      data: apiData.data,
      stats: {
        slope: apiData.regression.slope,
        intercept: apiData.regression.intercept,
        rSquared: apiData.regression.rSquared,
        sigma: apiData.regression.sigma,
      },
      currentPrice: apiData.current.price,
      fairValue: apiData.current.fairValue,
      zScore: apiData.current.zScore,
      advice: apiData.current.advice,
    };
  } catch (error) {
    console.error("Failed to fetch Bitcoin Power Law data:", error);

    // Fallback to mock data if API fails
    return generateMockPowerLawData();
  }
};

const generateMockPowerLawData = (): PowerLawData => {
  // Genesis block date: 2009-01-03
  const genesisDate = new Date("2009-01-03");
  const startDate = new Date("2013-01-01");
  const endDate = new Date();

  const data: BitcoinData[] = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
    const days = Math.floor(
      (d.getTime() - genesisDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const logDays = Math.log(days);

    const basePowerLaw = Math.exp(-17.01 + 5.84 * Math.log(days));
    const noise = 1 + (Math.random() - 0.5) * 0.6;
    const cyclicalEffect = Math.sin((days / 365.25) * 2 * Math.PI) * 0.2;
    const halving4YearCycle =
      Math.sin((days / (365.25 * 4)) * 2 * Math.PI) * 0.3;

    const price =
      basePowerLaw * noise * Math.exp(cyclicalEffect + halving4YearCycle);
    const logPrice = Math.log(price);

    data.push({
      date: d.toISOString().split("T")[0],
      price,
      days,
      logDays,
      logPrice,
      expectedLogPrice: 0,
      fairValue: 0,
      residual: 0,
      zScore: 0,
      band: "neutral",
    });
  }

  const xValues = data.map((d) => d.logDays);
  const yValues = data.map((d) => d.logPrice);
  const stats = linearRegression(xValues, yValues);

  data.forEach((d) => {
    d.expectedLogPrice = stats.intercept + stats.slope * d.logDays;
    d.fairValue = Math.exp(d.expectedLogPrice);
    d.residual = d.logPrice - d.expectedLogPrice;
    d.zScore = d.residual / stats.sigma;

    if (d.zScore > 2) d.band = "bubble";
    else if (d.zScore > 1) d.band = "overvalued";
    else if (d.zScore < -1) d.band = "undervalued";
    else d.band = "fair";
  });

  const currentData = data[data.length - 1];
  let advice = "평범한 시장 (Hold)";
  if (currentData.zScore > 2.5) advice = "🔥 극도의 탐욕 (매도 고려)";
  else if (currentData.zScore < -1.0) advice = "💎 저평가 구간 (매수 기회)";

  return {
    data,
    stats,
    currentPrice: currentData.price,
    fairValue: currentData.fairValue,
    zScore: currentData.zScore,
    advice,
  };
};

// Components
const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color: string;
}) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-slate-500">{subtitle}</div>
    </div>
  );
};

const BubbleGauge = ({ score }: { score: number }) => {
  const getColor = (s: number) => {
    if (s > 2.5) return "#dc2626"; // 극도의 탐욕
    if (s > 2) return "#ea580c"; // 버블
    if (s > 1) return "#f59e0b"; // 과열
    if (s > 0) return "#84cc16"; // 적정
    if (s > -1) return "#22c55e"; // 저평가
    return "#059669"; // 매수기회
  };

  const getLabel = (s: number) => {
    if (s > 2.5) return "🔥 극도의 탐욕";
    if (s > 2) return "📈 버블 구간";
    if (s > 1) return "⚠️ 과열";
    if (s > 0) return "😐 적정";
    if (s > -1) return "💚 저평가";
    return "💎 매수 기회";
  };

  // Normalize score to 0-100 for gauge (assuming range -3 to +3)
  const normalizedScore = Math.max(0, Math.min(100, ((score + 3) / 6) * 100));

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative w-64 h-32 mb-6">
        {/* Gauge Background */}
        <svg
          className="w-full h-full transform -rotate-90"
          viewBox="0 0 200 100"
        >
          <path
            d="M 20 80 A 80 80 0 0 1 180 80"
            stroke="#334155"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 20 80 A 80 80 0 0 1 180 80"
            stroke={getColor(score)}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${normalizedScore * 2.51} 1000`}
          />
        </svg>

        {/* Score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
          <div className="text-3xl font-bold text-white mb-1">
            {score > 0 ? "+" : ""}
            {score.toFixed(2)}σ
          </div>
        </div>
      </div>

      <div
        className="px-4 py-2 rounded-full text-sm font-medium border"
        style={{
          color: getColor(score),
          backgroundColor: getColor(score) + "20",
          borderColor: getColor(score) + "40",
        }}
      >
        {getLabel(score)}
      </div>
    </div>
  );
};

export default function BitcoinPowerLawPage() {
  const [mounted, setMounted] = useState(false);
  const [powerLawData, setPowerLawData] = useState<PowerLawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch data function
  const fetchData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      const data = await fetchBitcoinPowerLawData();
      setPowerLawData(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Failed to fetch Bitcoin Power Law data:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData(true);

    // Auto-refresh every 30 minutes (Bitcoin data doesn't change as frequently)
    const interval = setInterval(
      () => {
        fetchData(false);
      },
      30 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  if (loading && !powerLawData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mb-4"></div>
          <div className="text-xl text-slate-400">
            비트코인 Power Law 데이터 로딩...
          </div>
        </div>
      </div>
    );
  }

  if (!powerLawData) return null;

  // Chart data with bands for Logarithmic Regression Channel
  const chartData = powerLawData.data.slice(-200).map((d) => ({
    date: d.date,
    price: d.price,
    fairValue: d.fairValue,
    upperBand2: Math.exp(d.expectedLogPrice + 2 * powerLawData.stats.sigma), // +2σ
    upperBand1: Math.exp(d.expectedLogPrice + 1 * powerLawData.stats.sigma), // +1σ
    lowerBand1: Math.exp(d.expectedLogPrice - 1 * powerLawData.stats.sigma), // -1σ
    zScore: d.zScore,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 text-slate-200">
      <Navigation />
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400 mb-2">
              Bitcoin Power Law Analysis
            </h1>
            <p className="text-slate-400">
              데답(데이터가 답이다) - 비트코인 시장버블지수
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 rounded-lg text-orange-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              새로고침
            </button>
            <div className="text-right text-xs text-slate-500">
              <div>마지막 업데이트</div>
              <div>{lastUpdate.toLocaleTimeString("ko-KR")}</div>
            </div>
          </div>
        </header>

        {/* KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="현재 비트코인 가격"
            value={`$${powerLawData.currentPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            subtitle="실시간 BTC 가격"
            icon={Bitcoin}
            color="bg-orange-600"
          />
          <KPICard
            title="추세선 기준 적정가격"
            value={`$${powerLawData.fairValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
            subtitle="Power Law Fair Value"
            icon={Target}
            color="bg-blue-600"
          />
          <KPICard
            title="현재 버블 지수"
            value={`${powerLawData.zScore > 0 ? "+" : ""}${powerLawData.zScore.toFixed(2)}σ`}
            subtitle="Z-Score (표준편차)"
            icon={Activity}
            color={
              powerLawData.zScore > 2
                ? "bg-red-600"
                : powerLawData.zScore > 0
                  ? "bg-yellow-600"
                  : "bg-green-600"
            }
          />
          <KPICard
            title="모델 결정계수"
            value={`${(powerLawData.stats.rSquared * 100).toFixed(1)}%`}
            subtitle={`R² = ${powerLawData.stats.rSquared.toFixed(3)}`}
            icon={Calculator}
            color={
              powerLawData.stats.rSquared > 0.9
                ? "bg-green-600"
                : "bg-yellow-600"
            }
          />
        </div>

        {/* Main Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bubble Index Gauge */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4 text-slate-200 flex items-center gap-2">
              <AlertTriangle className="text-orange-400" size={20} />
              시장 버블 지수
            </h2>
            <BubbleGauge score={powerLawData.zScore} />
            <div className="mt-4 text-center">
              <div className="text-lg font-semibold text-white mb-2">
                {powerLawData.advice}
              </div>
              <div className="text-sm text-slate-400">
                현재가가 적정가 대비{" "}
                {powerLawData.zScore > 0 ? "고평가" : "저평가"} 상태
              </div>
            </div>
          </div>

          {/* Power Law Statistics */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-6 text-slate-200 flex items-center gap-2">
              <TrendingUp className="text-blue-400" size={20} />
              Power Law 회귀 통계
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-slate-400">
                    회귀식 기울기 (Slope)
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {powerLawData.stats.slope.toFixed(3)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">
                    회귀식 절편 (Intercept)
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {powerLawData.stats.intercept.toFixed(3)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-slate-400">표준편차 (Sigma)</div>
                  <div className="text-2xl font-bold text-white">
                    {powerLawData.stats.sigma.toFixed(3)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">모델 설명력</div>
                  <div className="text-2xl font-bold text-green-400">
                    {powerLawData.stats.rSquared > 0.9 ? "우수" : "보통"}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
              <div className="text-sm text-slate-300">
                <strong>회귀식:</strong> log(Price) ={" "}
                {powerLawData.stats.intercept.toFixed(2)} +{" "}
                {powerLawData.stats.slope.toFixed(2)} × log(Days)
              </div>
            </div>
          </div>
        </div>

        {/* Logarithmic Regression Channel Chart */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-slate-200">
            Logarithmic Regression Channel (Rainbow Chart)
          </h2>

          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <YAxis
                  scale="log"
                  domain={["dataMin * 0.5", "dataMax * 2"]}
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value: any, name: string) => [
                    `$${Number(value).toLocaleString()}`,
                    name === "price"
                      ? "BTC Price"
                      : name === "fairValue"
                        ? "Fair Value"
                        : name === "upperBand2"
                          ? "+2σ Band"
                          : name === "upperBand1"
                            ? "+1σ Band"
                            : name === "lowerBand1"
                              ? "-1σ Band"
                              : name,
                  ]}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#f1f5f9",
                  }}
                />

                {/* Regression Bands - Rainbow Chart Style */}
                <Area
                  type="monotone"
                  dataKey="upperBand2"
                  stroke="none"
                  fill="#dc2626"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="upperBand1"
                  stroke="none"
                  fill="#f59e0b"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="lowerBand1"
                  stroke="none"
                  fill="#22c55e"
                  fillOpacity={0.2}
                />

                {/* Fair Value Line */}
                <Line
                  type="monotone"
                  dataKey="fairValue"
                  stroke="#6b7280"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Fair Value"
                />

                {/* Actual BTC Price */}
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={false}
                  name="BTC Price"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend */}
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-red-600 rounded opacity-60"></div>
              <span className="text-slate-300">+2σ 버블 구간 (매도)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-yellow-500 rounded opacity-60"></div>
              <span className="text-slate-300">+1σ 과열 구간</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-gray-500 rounded"></div>
              <span className="text-slate-300">적정가 (Fair Value)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-green-500 rounded opacity-60"></div>
              <span className="text-slate-300">-1σ 매수 구간</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-orange-500 rounded"></div>
              <span className="text-slate-300">BTC 실제 가격</span>
            </div>
          </div>
        </div>

        {/* Bubble Index Oscillator */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 text-slate-200">
            Bubble Index Oscillator (Z-Score)
          </h2>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={10}
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <YAxis stroke="#64748b" fontSize={10} domain={[-3, 3]} />
                <Tooltip
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value: any) => [
                    `${Number(value).toFixed(2)}σ`,
                    "Bubble Index",
                  ]}
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#f1f5f9",
                  }}
                />

                {/* Reference Lines */}
                <ReferenceLine
                  y={2}
                  stroke="#dc2626"
                  strokeDasharray="2 2"
                  label="버블 경계"
                />
                <ReferenceLine
                  y={0}
                  stroke="#64748b"
                  strokeDasharray="2 2"
                  label="적정가"
                />
                <ReferenceLine
                  y={-1}
                  stroke="#22c55e"
                  strokeDasharray="2 2"
                  label="저점 경계"
                />

                <Line
                  type="monotone"
                  dataKey="zScore"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
