"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Navigation from "../../components/Navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  Legend,
  Brush,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Bitcoin,
  Calculator,
  RefreshCw,
  Target,
  TrendingUp,
  Zap,
  ArrowLeftRight,
  GitCompare,
  Info,
  HelpCircle,
} from "lucide-react";

// --- Interfaces ---

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
  band: "bubble" | "overvalued" | "fair" | "undervalued" | "neutral";
}

interface RegressionStats {
  slope: number;
  intercept: number;
  rSquared: number;
  sigma: number;
}

interface PowerLawData {
  symbol: string;
  data: BitcoinData[];
  stats: RegressionStats;
  currentPrice: number;
  fairValue: number;
  zScore: number;
  advice: string;
}

interface ComparisonData {
  date: string;
  btcZScore: number;
  ethZScore: number;
  btcPrice: number;
  ethPrice: number;
}

// --- Utility Functions ---

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

const calculateCorrelation = (data: ComparisonData[]) => {
  if (data.length === 0) return 0;
  const x = data.map((d) => d.btcZScore);
  const y = data.map((d) => d.ethZScore);
  const n = data.length;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
  );

  return denominator === 0 ? 0 : numerator / denominator;
};

const fetchPowerLawData = async (
  coin: "BTC" | "ETH",
): Promise<PowerLawData> => {
  const symbol = coin === "BTC" ? "BTCUSDT" : "ETHUSDT";
  // BTC Genesis: 2009-01-03, ETH Genesis: 2015-07-30
  // 데이터 분석의 정확도를 위해 Genesis Date는 고정
  const genesisDate =
    coin === "BTC" ? new Date("2009-01-03") : new Date("2015-07-30");

  try {
    // Binance API - Limit 1000 (approx 2.7 years daily data)
    // Note: For a true Power Law, we need full history.
    // This is a simplified version using available recent data + mathematical projection
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=1000`,
    );

    if (!response.ok) {
      throw new Error(`Binance API 오류: ${response.status}`);
    }

    const klines = await response.json();

    if (!klines || klines.length === 0) {
      throw new Error("가격 데이터를 가져올 수 없습니다");
    }

    const data: BitcoinData[] = [];

    klines.forEach((kline: any[]) => {
      const timestamp = kline[0];
      const closePrice = parseFloat(kline[4]);
      const date = new Date(timestamp);

      const days = Math.floor(
        (date.getTime() - genesisDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (days > 0 && closePrice > 0) {
        const logDays = Math.log(days);
        const logPrice = Math.log(closePrice);

        data.push({
          date: date.toISOString().split("T")[0],
          price: closePrice,
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
    });

    if (data.length === 0) {
      throw new Error("유효한 가격 데이터가 없습니다");
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
    else if (currentData.zScore > 1.5) advice = "⚠️ 과열 구간 (분할 매도)";
    else if (currentData.zScore < -1.0) advice = "💎 저평가 구간 (매수 기회)";

    return {
      symbol: coin,
      data,
      stats,
      currentPrice: currentData.price,
      fairValue: currentData.fairValue,
      zScore: currentData.zScore,
      advice,
    };
  } catch (error) {
    console.error(`Failed to fetch ${coin} data:`, error);
    throw error;
  }
};

// --- Components ---

const InfoTooltip = ({ text }: { text: string }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="ml-1 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <HelpCircle size={16} />
      </button>
      {isVisible && (
        <div className="absolute z-50 left-0 top-6 w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs text-slate-300 leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
};

const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  tooltip,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  color: string;
  tooltip?: string;
}) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-slate-600 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
        <h3 className="text-sm font-medium text-slate-400 flex items-center">
          {title}
          {tooltip && <InfoTooltip text={tooltip} />}
        </h3>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-slate-500">{subtitle}</div>
    </div>
  );
};

const ZScoreBarChart = ({ score }: { score: number }) => {
  const zones = [
    { min: -3, max: -1, label: "매수 기회", color: "#059669", emoji: "💎" },
    { min: -1, max: 0, label: "저평가", color: "#22c55e", emoji: "📈" },
    { min: 0, max: 1, label: "적정", color: "#84cc16", emoji: "✅" },
    { min: 1, max: 2, label: "과열", color: "#f59e0b", emoji: "⚠️" },
    { min: 2, max: 2.5, label: "버블", color: "#ea580c", emoji: "🔥" },
    { min: 2.5, max: 3, label: "극도 위험", color: "#dc2626", emoji: "💥" },
  ];

  const getCurrentZone = (s: number) => {
    return zones.find((z) => s >= z.min && s < z.max) || zones[zones.length - 1];
  };

  const currentZone = getCurrentZone(score);

  return (
    <div className="w-full space-y-4">
      {/* Z-Score Bar Visualization */}
      <div className="relative h-16 bg-slate-900/50 rounded-lg overflow-hidden border border-slate-700">
        {/* Background zones */}
        <div className="absolute inset-0 flex">
          {zones.map((zone, idx) => (
            <div
              key={idx}
              className="flex-1 transition-all duration-300"
              style={{ backgroundColor: zone.color, opacity: 0.3 }}
            />
          ))}
        </div>

        {/* Current position indicator */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-all duration-1000 ease-out"
          style={{
            left: `${Math.max(0, Math.min(100, ((score + 3) / 6) * 100))}%`,
            boxShadow: "0 0 20px rgba(255,255,255,0.8)",
          }}
        >
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <div className="bg-white text-slate-900 px-2 py-1 rounded text-xs font-bold shadow-lg">
              {score.toFixed(2)}σ
            </div>
          </div>
        </div>

        {/* Zone labels */}
        <div className="absolute inset-0 flex items-center justify-around px-2 text-[10px] font-medium text-white/80">
          {zones.map((zone, idx) => (
            <div key={idx} className="text-center">
              <div>{zone.emoji}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {zones.map((zone, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-1.5 p-2 rounded-lg transition-all ${currentZone === zone
              ? "bg-slate-700 ring-2 ring-white/30"
              : "bg-slate-800/30"
              }`}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: zone.color }}
            />
            <span className="text-slate-300 truncate">{zone.label}</span>
          </div>
        ))}
      </div>

      {/* Current Status */}
      <div
        className="p-4 rounded-lg text-center"
        style={{ backgroundColor: `${currentZone.color}20` }}
      >
        <div className="text-2xl mb-1">{currentZone.emoji}</div>
        <div className="text-lg font-bold text-white">{currentZone.label}</div>
        <div className="text-sm text-slate-400 mt-1">
          Z-Score: {score > 0 ? "+" : ""}
          {score.toFixed(2)}σ
        </div>
      </div>
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

  // Normalize score to 0-100 for gauge (assuming range -3 to +3)
  const normalizedScore = Math.max(0, Math.min(100, ((score + 3) / 6) * 100));
  const needleRotation = (normalizedScore / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-64 h-32 mb-6 overflow-hidden">
        {/* Gauge Background */}
        <div className="absolute w-64 h-64 rounded-full bg-slate-700/30 top-0 left-0 border-[20px] border-t-transparent border-l-transparent border-r-transparent border-b-slate-700/30 rotate-45 hidden"></div>

        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Gradient Arc */}
          <path
            d="M10,100 A90,90 0 0,1 190,100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="20"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient
              id="gaugeGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Needle */}
          <g
            transform={`translate(100,100) rotate(${needleRotation})`}
            className="transition-transform duration-1000 ease-out"
          >
            <path d="M-2,0 L0,-85 L2,0 Z" fill="#fff" />
            <circle cx="0" cy="0" r="4" fill="#fff" />
          </g>
        </svg>
      </div>
    </div>
  );
};

// --- Main Page ---

export default function BitcoinPowerLawPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"BTC" | "ETH">("BTC");
  const [btcData, setBtcData] = useState<PowerLawData | null>(null);
  const [ethData, setEthData] = useState<PowerLawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Initialization
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [btc, eth] = await Promise.all([
        fetchPowerLawData("BTC"),
        fetchPowerLawData("ETH"),
      ]);
      setBtcData(btc);
      setEthData(eth);
      setLastUpdate(new Date());
    } catch (err) {
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted, fetchData]);

  // Prepare current view data
  const currentViewData = activeTab === "BTC" ? btcData : ethData;

  // Prepare comparison data
  const comparisonData: ComparisonData[] = useMemo(() => {
    if (!btcData || !ethData) return [];

    // Create a map for ETH data by date for O(1) lookup
    const ethMap = new Map(ethData.data.map((d) => [d.date, d]));

    // Join on date
    const joined: ComparisonData[] = [];
    btcData.data.forEach((btc) => {
      const eth = ethMap.get(btc.date);
      if (eth) {
        joined.push({
          date: btc.date,
          btcZScore: btc.zScore,
          ethZScore: eth.zScore,
          btcPrice: btc.price,
          ethPrice: eth.price,
        });
      }
    });

    return joined.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [btcData, ethData]);

  const correlationCoefficient = useMemo(
    () => calculateCorrelation(comparisonData),
    [comparisonData],
  );

  // Prepare Chart Data with Bands
  const mainChartData = useMemo(() => {
    if (!currentViewData) return [];
    return currentViewData.data.slice(-365 * 2).map((d) => ({
      date: d.date,
      price: d.price,
      fairValue: d.fairValue,
      upperBand2: Math.exp(
        d.expectedLogPrice + 2 * currentViewData.stats.sigma,
      ),
      upperBand1: Math.exp(
        d.expectedLogPrice + 1 * currentViewData.stats.sigma,
      ),
      lowerBand1: Math.exp(
        d.expectedLogPrice - 1 * currentViewData.stats.sigma,
      ),
      lowerBand2: Math.exp(
        d.expectedLogPrice - 2 * currentViewData.stats.sigma,
      ),
      zScore: d.zScore,
    }));
  }, [currentViewData]);

  if (!mounted) return null;

  if (loading && !btcData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        <div className="text-slate-400">시장 데이터를 분석 중입니다...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navigation />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-md mx-auto p-8 bg-slate-900 rounded-xl border border-red-900/30">
            <AlertTriangle className="mx-auto mb-4 text-red-500" size={48} />
            <h2 className="text-2xl font-bold text-white mb-4">
              데이터 로딩 실패
            </h2>
            <p className="text-slate-400 mb-6">{error}</p>
            <button
              onClick={fetchData}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={18} /> 다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-slate-200">
      <Navigation />
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <TrendingUp className="text-orange-400" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-white">
                Power Law & Cycle Analysis
              </h1>
            </div>
            <p className="text-slate-400 ml-1">
              비트코인 및 이더리움 시장 적정가(Fair Value) 분석 및 사이클 비교
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex">
              <button
                onClick={() => setActiveTab("BTC")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "BTC"
                  ? "bg-orange-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
                  }`}
              >
                <Bitcoin size={16} /> Bitcoin
              </button>
              <button
                onClick={() => setActiveTab("ETH")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "ETH"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white"
                  }`}
              >
                <Zap size={16} /> Ethereum
              </button>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* KPI Cards - Based on Active Tab */}
        {currentViewData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title={`${activeTab} 현재 가격`}
              value={`$${currentViewData.currentPrice.toLocaleString()}`}
              subtitle="Real-time Market Price"
              icon={activeTab === "BTC" ? Bitcoin : Zap}
              color={activeTab === "BTC" ? "bg-orange-600" : "bg-blue-600"}
              tooltip="바이낸스 API에서 가져온 실시간 시장 가격입니다. 이 가격은 현재 거래소에서 형성되고 있는 실제 시장 가격을 나타냅니다."
            />
            <KPICard
              title="적정 가치 (Fair Value)"
              value={`$${currentViewData.fairValue.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}`}
              subtitle="Power Law Trendline"
              icon={Target}
              color="bg-emerald-600"
              tooltip="Power Law 모델을 기반으로 계산된 이론적 적정 가격입니다. 역사적 데이터의 로그 회귀 분석을 통해 산출되며, 장기적인 가격 추세선을 나타냅니다."
            />
            <KPICard
              title="버블 지수 (Z-Score)"
              value={`${currentViewData.zScore > 0 ? "+" : ""
                }${currentViewData.zScore.toFixed(2)} σ`}
              subtitle="Standard Deviations from Trend"
              icon={Activity}
              color={
                currentViewData.zScore > 2
                  ? "bg-red-600"
                  : currentViewData.zScore > 0
                    ? "bg-yellow-600"
                    : "bg-green-600"
              }
              tooltip="현재 가격이 적정 가치에서 얼마나 벗어났는지를 표준편차(σ)로 나타낸 지표입니다. +2σ 이상이면 버블 위험, -1σ 이하면 저평가 구간을 의미합니다."
            />
            <KPICard
              title="시장 상태"
              value={currentViewData.zScore > 0 ? "고평가" : "저평가"}
              subtitle={currentViewData.advice.split("(")[0].trim()}
              icon={Info}
              color="bg-slate-600"
              tooltip="Z-Score를 기반으로 판단한 현재 시장 상태입니다. 고평가는 가격이 적정 가치보다 높은 상태, 저평가는 낮은 상태를 의미합니다."
            />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Charts */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1. Rainbow Chart */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <TrendingUp className="text-blue-400" size={20} />
                  {activeTab} Logarithmic Regression Channel
                </h2>
                <div className="text-xs text-slate-500">Scale: Log-Linear</div>
              </div>

              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={mainChartData}>
                    <defs>
                      <linearGradient
                        id="chartGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={
                            activeTab === "BTC" ? "#f97316" : "#3b82f6"
                          }
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={
                            activeTab === "BTC" ? "#f97316" : "#3b82f6"
                          }
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(date) =>
                        new Date(date).toLocaleDateString(undefined, {
                          month: "short",
                          year: "2-digit",
                        })
                      }
                      minTickGap={50}
                    />
                    <YAxis
                      scale="log"
                      domain={["auto", "auto"]}
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(value) =>
                        `$${(value / 1000).toFixed(0)}k`
                      }
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        color: "#f1f5f9",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ fontSize: "13px" }}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleDateString()
                      }
                      formatter={(value: number) => [
                        `$${value.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}`,
                      ]}
                    />
                    <Legend />

                    {/* Bands */}
                    <Area
                      name="+2σ Sell"
                      dataKey="upperBand2"
                      stroke="none"
                      fill="#ef4444"
                      fillOpacity={0.15}
                    />
                    <Area
                      name="+1σ Over"
                      dataKey="upperBand1"
                      stroke="none"
                      fill="#eab308"
                      fillOpacity={0.15}
                    />
                    <Area
                      name="-1σ Buy"
                      dataKey="lowerBand1"
                      stroke="none"
                      fill="#22c55e"
                      fillOpacity={0.15}
                    />

                    {/* Lines */}
                    <Line
                      name="Fair Value"
                      type="monotone"
                      dataKey="fairValue"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      name="Price"
                      type="monotone"
                      dataKey="price"
                      stroke={activeTab === "BTC" ? "#f97316" : "#3b82f6"}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Z-Score Correlation Analysis (New Feature) */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <GitCompare className="text-purple-400" size={20} />
                    Cycle Correlation Analysis
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    BTC vs ETH 버블 사이클 동조화 현상 분석
                  </p>
                </div>
                <div className="bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-700">
                  <span className="text-slate-400 text-sm mr-2">
                    상관계수 (Correlation):
                  </span>
                  <span
                    className={`font-bold ${correlationCoefficient > 0.8
                      ? "text-green-400"
                      : "text-yellow-400"
                      }`}
                  >
                    {correlationCoefficient.toFixed(3)}
                  </span>
                </div>
              </div>

              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={comparisonData}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(date) =>
                        new Date(date).toLocaleDateString(undefined, {
                          year: "2-digit",
                          month: "2-digit",
                        })
                      }
                      minTickGap={50}
                    />
                    <YAxis stroke="#64748b" fontSize={12} domain={[-3, 3]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        color: "#f1f5f9",
                      }}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleDateString()
                      }
                    />
                    <Legend />
                    <ReferenceLine
                      y={0}
                      stroke="#475569"
                      strokeDasharray="3 3"
                    />
                    <Line
                      name="BTC Z-Score"
                      type="monotone"
                      dataKey="btcZScore"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      name="ETH Z-Score"
                      type="monotone"
                      dataKey="ethZScore"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Brush
                      dataKey="date"
                      height={30}
                      stroke="#475569"
                      fill="#1e293b"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-sm text-slate-400 bg-slate-900/30 p-4 rounded-lg">
                <strong className="text-slate-200">💡 Insight:</strong> 두
                자산의 Z-Score가 함께 움직일 때 시장의 추세가 강력함을
                의미합니다. 현재 BTC Z-Score는{" "}
                <span className="text-orange-400 font-bold">
                  {btcData?.zScore.toFixed(2)}
                </span>
                , ETH Z-Score는{" "}
                <span className="text-blue-400 font-bold">
                  {ethData?.zScore.toFixed(2)}
                </span>
                입니다. 격차가 클수록 키맞추기(Gap Filling) 가능성이 있습니다.
              </div>
            </div>
          </div>

          {/* Right Column: Gauges & Stats */}
          <div className="space-y-8">
            {/* Z-Score Visualization */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Activity className="text-purple-400" size={20} />
                버블 지수 (Z-Score)
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                현재 {activeTab} 시장 상태 분석
              </p>

              <ZScoreBarChart score={currentViewData?.zScore || 0} />

              <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <div className="text-xs text-slate-400 leading-relaxed">
                  <strong className="text-slate-200">💡 해석 가이드:</strong>
                  <br />
                  Z-Score는 현재 가격이 장기 추세선에서 얼마나 벗어났는지를
                  표준편차(σ)로 나타냅니다.
                  <br />
                  <br />
                  • <strong className="text-green-400">-1σ 이하</strong>: 역사적
                  저평가 구간
                  <br />
                  • <strong className="text-yellow-400">0~1σ</strong>: 정상 범위
                  <br />
                  • <strong className="text-orange-400">1~2σ</strong>: 과열 주의
                  <br />• <strong className="text-red-400">2σ 이상</strong>: 버블
                  위험
                </div>
              </div>
            </div>

            {/* Statistics Panel */}
            {currentViewData && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Calculator size={18} className="text-slate-400" />
                  Regression Statistics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm flex items-center">
                      Slope (기울기)
                      <InfoTooltip text="로그 회귀선의 기울기입니다. 이 값이 클수록 시간에 따른 가격 상승률이 높다는 것을 의미합니다. Power Law의 지수(exponent)를 나타냅니다." />
                    </span>
                    <span className="font-mono text-white">
                      {currentViewData.stats.slope.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm flex items-center">
                      R² (결정계수)
                      <InfoTooltip text="모델의 설명력을 나타내는 지표입니다. 0~1 사이의 값을 가지며, 1에 가까울수록 데이터가 추세선에 잘 맞는다는 의미입니다. 0.8 이상이면 매우 높은 설명력을 의미합니다." />
                    </span>
                    <span
                      className={`font-mono ${currentViewData.stats.rSquared > 0.8
                        ? "text-green-400"
                        : "text-yellow-400"
                        }`}
                    >
                      {currentViewData.stats.rSquared.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-sm flex items-center">
                      Sigma (σ)
                      <InfoTooltip text="표준편차로, 가격이 추세선에서 평균적으로 얼마나 벗어나는지를 나타냅니다. 이 값을 기준으로 ±1σ, ±2σ 밴드를 그려 과열/저평가 구간을 판단합니다." />
                    </span>
                    <span className="font-mono text-white">
                      {currentViewData.stats.sigma.toFixed(4)}
                    </span>
                  </div>
                  <div className="pt-2">
                    <div className="text-xs text-slate-500 mb-2">
                      Model Equation:
                    </div>
                    <code className="block bg-slate-950 p-3 rounded text-xs text-slate-300 font-mono break-all">
                      log(P) = {currentViewData.stats.intercept.toFixed(2)} +{" "}
                      {currentViewData.stats.slope.toFixed(2)} × log(Days)
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* Legend / Guide */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Chart Guide</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-slate-300">
                    <strong>+2σ (Bubble):</strong> 역사적 고점 영역. 매도 고려.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-slate-300">
                    <strong>+1σ (Overvalued):</strong> 과열 구간. 주의 필요.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  <span className="text-slate-300">
                    <strong>Fair Value:</strong> 장기 추세선. 적정 가격.
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-slate-300">
                    <strong>-1σ (Undervalued):</strong> 저평가 구간. 매수 기회.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
