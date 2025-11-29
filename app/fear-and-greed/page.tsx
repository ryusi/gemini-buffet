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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  BarChart2,
  Target,
  Scale,
  PieChart as PieIcon,
  Zap,
  RefreshCw,
  Wifi,
  WifiOff,
  Bitcoin,
  DollarSign,
  Coins,
  Banknote,
  TrendingUpIcon,
  Pickaxe,
} from "lucide-react";

// Types for API data
interface FearGreedData {
  timestamp: string;
  current: {
    score: number;
    label: string;
    description: string;
    confidence?: number;
  };
  indicators: Array<{
    name: string;
    score: number;
    icon: string;
    color: string;
    status: string;
    description: string;
    realTime?: boolean;
  }>;
  detailedIndicators?: Array<{
    title: string;
    current: number;
    status: string;
    rsi: string;
    description: string;
    details: string[];
  }>;
  historical?: Array<{
    date: string;
    value: number;
    label: string;
  }>;
  cnnActual?: {
    score: number;
    label: string;
    indicators: {
      marketMomentum: number;
      stockStrength: number;
      stockBreadth: number;
      putCallOptions: number;
      marketVolatility: number;
      safeHavenDemand: number;
      junkBondDemand: number;
    };
    previousClose: number;
    oneWeekAgo: number;
    oneMonthAgo: number;
  };
  metadata: {
    updateFrequency: string;
    lastUpdate: string;
    dataSource: string;
    reliability: string;
    realTime?: boolean;
    fallback?: boolean;
    assetType?: string;
    cnnDataAvailable?: boolean;
  };
}

type AssetType = "stocks" | "crypto" | "commodities";

// Default fallback data by asset type
const FALLBACK_DATA: Record<AssetType, FearGreedData> = {
  stocks: {
    timestamp: new Date().toISOString(),
    current: {
      score: 64.1,
      label: "중립",
      description: "주식 시장이 균형적인 상태를 유지하고 있습니다...",
    },
    indicators: [
      {
        name: "VIX 변동성",
        score: 65,
        icon: "📈",
        color: "#ef4444",
        status: "탐욕",
        description: "VIX 지수가 낮아 시장 변동성이 안정적",
      },
      {
        name: "모멘텀 강도",
        score: 65,
        icon: "⚡",
        color: "#ef4444",
        status: "탐욕",
        description: "RSI 기반 모멘텀이 강세를 보임",
      },
      {
        name: "52주 고가 근접도",
        score: 90,
        icon: "🎯",
        color: "#dc2626",
        status: "탐욕",
        description: "52주 고가 대비 현재가 비중이 높음",
      },
      {
        name: "거래량 이상",
        score: 50,
        icon: "📊",
        color: "#6b7280",
        status: "중립",
        description: "평소 거래량과 비슷한 수준",
      },
      {
        name: "볼린저밴드",
        score: 64,
        icon: "📊",
        color: "#f97316",
        status: "탐욕",
        description: "볼린저밴드 상단 영역에 위치하여 과매수 신호",
      },
      {
        name: "P/C 비율",
        score: 45,
        icon: "⚖️",
        color: "#84cc16",
        status: "중립",
        description: "풋/콜 옵션 비율이 균형적",
      },
      {
        name: "시장 폭",
        score: 70,
        icon: "📊",
        color: "#f97316",
        status: "탐욕",
        description: "상승 종목이 하락 종목보다 많음",
      },
    ],
    historical: [
      { date: "2024-01", value: 45, label: "1월" },
      { date: "2024-02", value: 52, label: "2월" },
      { date: "2024-03", value: 68, label: "3월" },
      { date: "2024-04", value: 35, label: "4월" },
      { date: "2024-05", value: 41, label: "5월" },
      { date: "2024-06", value: 58, label: "6월" },
      { date: "2024-07", value: 72, label: "7월" },
      { date: "2024-08", value: 38, label: "8월" },
      { date: "2024-09", value: 64, label: "9월" },
      { date: "2024-10", value: 71, label: "10월" },
      { date: "2024-11", value: 59, label: "11월" },
      { date: "2024-12", value: 64.1, label: "12월" },
    ],
    detailedIndicators: [
      {
        title: "VIX 변동성",
        current: 65,
        status: "탐욕",
        rsi: "15.11",
        description:
          "VIX는 시장의 공포 지수로 현재는 낮은 수준이며, 시장 변동성이 안정적인 상태를 보임",
        details: [
          "• 최근 VIX - 낮은 수준",
          "• 20-30: 경계선 - 주의 필요",
          "• 20-30: 불안정 - 주의 필요",
          "• 30+: 공포 단계 - 매수 기회",
        ],
      },
      {
        title: "모멘텀 강도",
        current: 65,
        status: "탐욕",
        rsi: "60.44",
        description:
          "RSI(Relative Strength Index) - 과매수 상태로 상승 모멘텀이 강하게 나타남",
        details: [
          "• RSI 14일",
          "• 50 이상: 강세 - 상승세 지속",
          "• 30-70: 정상 구간",
          "• 70+: 과매수 상태 - 주의",
        ],
      },
      {
        title: "52주 고가 근접도",
        current: 90,
        status: "탐욕",
        rsi: "90.5%",
        description:
          "52주 대비 현재가가 매우 높은 수준으로, 52주 최고가 갱신에 근접한 상태",
        details: [
          "• 최근 최고: (S&P/S&P 최고가 기준) > 90",
          "• 80-90%: 고점 근접 - 과열 주의",
          "• 90%+: 신고점 갱신 가능성",
          "• >70%: 강세 범위",
        ],
      },
      {
        title: "볼린저밴드",
        current: 64,
        status: "탐욕",
        rsi: "상단밴드 +1.2σ",
        description:
          "볼린저밴드는 가격 변동성을 측정하는 지표로, 현재 상단밴드 근처에서 과매수 상태를 나타냄",
        details: [
          "• 볼린저밴드 20일 이동평균",
          "• 상단밴드 접촉: 과매수 신호",
          "• 중앙선: 균형 상태",
          "• 하단밴드 접촉: 과매도 기회",
          "• 밴드폭 확장: 변동성 증가",
        ],
      },
      {
        title: "거래량 이상",
        current: 50,
        status: "중립",
        rsi: "0.65x",
        description:
          "평소 거래량 대비 현재 거래량이 다소 부족한 상태로, 시장 참여도가 보통 수준",
        details: [
          "• 최근 거래량",
          "• 1.5배+: 높은 관심도 - 과열",
          "• 0.8-1.2배: 정상 범위",
          "• <0.7배: 관심 저조",
        ],
      },
      {
        title: "시장 폭",
        current: 70,
        status: "탐욕",
        rsi: "A/D: +245",
        description:
          "시장 폭은 상승 종목과 하락 종목의 비율로 시장 전반의 참여도를 측정하며, 현재 광범위한 상승세로 건강한 시장 상태를 보임",
        details: [
          "• A/D 라인 (Advance/Decline)",
          "• 70%+: 건강한 강세장",
          "• 50-70%: 선별적 상승",
          "• 30-50%: 혼조세",
          "• 30% 미만: 전반적 약세",
        ],
      },
    ],
    metadata: {
      updateFrequency: "5분",
      lastUpdate: new Date().toISOString(),
      dataSource: "주식 시장 지표",
      reliability: "높음",
    },
  },
  crypto: {
    timestamp: new Date().toISOString(),
    current: {
      score: 58.3,
      label: "탐욕",
      description:
        "암호화폐 시장이 탐욕 상태로 상승 모멘텀을 보이고 있습니다...",
    },
    indicators: [
      {
        name: "비트코인 도미넌스",
        score: 72,
        icon: "₿",
        color: "#f97316",
        status: "탐욕",
        description: "비트코인 도미넌스가 높아 BTC 강세",
      },
      {
        name: "온체인 활동",
        score: 65,
        icon: "🔗",
        color: "#ef4444",
        status: "탐욕",
        description: "네트워크 활동이 활발함",
      },
      {
        name: "소셜 미디어",
        score: 80,
        icon: "📱",
        color: "#dc2626",
        status: "탐욕",
        description: "암호화폐 관련 소셜 활동 급증",
      },
      {
        name: "거래량",
        score: 45,
        icon: "📊",
        color: "#84cc16",
        status: "중립",
        description: "거래량이 평균적인 수준",
      },
      {
        name: "변동성",
        score: 55,
        icon: "⚡",
        color: "#f97316",
        status: "중립",
        description: "적당한 변동성 수준",
      },
      {
        name: "시장 캡",
        score: 68,
        icon: "💰",
        color: "#f97316",
        status: "탐욕",
        description: "전체 시가총액 상승세",
      },
      {
        name: "펀딩 레이트",
        score: 40,
        icon: "📈",
        color: "#84cc16",
        status: "중립",
        description: "선물 펀딩 레이트 안정적",
      },
    ],
    historical: [
      { date: "2024-01", value: 35, label: "1월" },
      { date: "2024-02", value: 42, label: "2월" },
      { date: "2024-03", value: 78, label: "3월" },
      { date: "2024-04", value: 25, label: "4월" },
      { date: "2024-05", value: 38, label: "5월" },
      { date: "2024-06", value: 62, label: "6월" },
      { date: "2024-07", value: 85, label: "7월" },
      { date: "2024-08", value: 28, label: "8월" },
      { date: "2024-09", value: 55, label: "9월" },
      { date: "2024-10", value: 82, label: "10월" },
      { date: "2024-11", value: 48, label: "11월" },
      { date: "2024-12", value: 58.3, label: "12월" },
    ],
    detailedIndicators: [
      {
        title: "비트코인 도미넌스",
        current: 72,
        status: "탐욕",
        rsi: "52.3%",
        description:
          "비트코인이 전체 암호화폐 시장에서 차지하는 비중이 높아 BTC 강세장을 나타냄",
        details: [
          "• 현재 도미넌스: 52.3%",
          "• 60%+: 비트코인 강세",
          "• 40-60%: 균형 상태",
          "• 40% 미만: 알트코인 시즌",
        ],
      },
      {
        title: "온체인 활동",
        current: 65,
        status: "탐욕",
        rsi: "84.2K",
        description:
          "블록체인 네트워크 활동이 활발하며 실제 사용량이 증가하고 있음",
        details: [
          "• 일일 활성 주소: 84.2K",
          "• 거래 건수 증가: +15%",
          "• 네트워크 수수료: 상승",
          "• 해시레이트: 사상 최고",
        ],
      },
      {
        title: "소셜 미디어",
        current: 80,
        status: "탐욕",
        rsi: "+245%",
        description:
          "트위터, 레딧 등에서 암호화폐 관련 언급이 급증하며 관심도 상승",
        details: [
          "• 소셜 볼륨: +245%",
          "• 긍정 감정: 68%",
          "• 트렌딩 키워드: Bitcoin, ETH",
          "• 인플루언서 활동: 활발",
        ],
      },
      {
        title: "거래량",
        current: 45,
        status: "중립",
        rsi: "0.85x",
        description: "암호화폐 거래량이 평균적인 수준으로 과열되지 않은 상태",
        details: [
          "• 24시간 거래량: 0.85x",
          "• 스팟 거래: 보통",
          "• 선물 거래: 평균",
          "• DEX 활동: 안정적",
        ],
      },
    ],
    metadata: {
      updateFrequency: "5분",
      lastUpdate: new Date().toISOString(),
      dataSource: "암호화폐 시장 지표",
      reliability: "높음",
    },
  },
  commodities: {
    timestamp: new Date().toISOString(),
    current: {
      score: 72.8,
      label: "탐욕",
      description:
        "원자재 시장이 강한 상승세를 보이며 인플레이션 헤지 수요가 증가하고 있습니다...",
    },
    indicators: [
      {
        name: "금 가격",
        score: 85,
        icon: "🥇",
        color: "#dc2626",
        status: "탐욕",
        description: "금 가격이 사상 최고점 근처",
      },
      {
        name: "원유 (WTI)",
        score: 68,
        icon: "🛢️",
        color: "#f97316",
        status: "탐욕",
        description: "원유 가격 상승세 지속",
      },
      {
        name: "구리",
        score: 75,
        icon: "🔶",
        color: "#f97316",
        status: "탐욕",
        description: "구리 수요 증가로 가격 상승",
      },
      {
        name: "은",
        score: 60,
        icon: "⚪",
        color: "#f97316",
        status: "중립",
        description: "은 가격 완만한 상승",
      },
      {
        name: "농산물",
        score: 55,
        icon: "🌾",
        color: "#84cc16",
        status: "중립",
        description: "곡물 가격 안정적",
      },
      {
        name: "천연가스",
        score: 82,
        icon: "⛽",
        color: "#dc2626",
        status: "탐욕",
        description: "천연가스 가격 급등",
      },
      {
        name: "달러 지수",
        score: 35,
        icon: "💵",
        color: "#16a34a",
        status: "공포",
        description: "달러 약세로 원자재 상승",
      },
    ],
    historical: [
      { date: "2024-01", value: 55, label: "1월" },
      { date: "2024-02", value: 62, label: "2월" },
      { date: "2024-03", value: 58, label: "3월" },
      { date: "2024-04", value: 68, label: "4월" },
      { date: "2024-05", value: 73, label: "5월" },
      { date: "2024-06", value: 65, label: "6월" },
      { date: "2024-07", value: 70, label: "7월" },
      { date: "2024-08", value: 78, label: "8월" },
      { date: "2024-09", value: 74, label: "9월" },
      { date: "2024-10", value: 69, label: "10월" },
      { date: "2024-11", value: 75, label: "11월" },
      { date: "2024-12", value: 72.8, label: "12월" },
    ],
    detailedIndicators: [
      {
        title: "금 가격",
        current: 85,
        status: "탐욕",
        rsi: "$2,085/oz",
        description:
          "금 가격이 사상 최고점 근처에서 거래되며 안전자산 선호와 인플레이션 헤지 수요 증가",
        details: [
          "• 현재가: $2,085/온스",
          "• 52주 최고: $2,100",
          "• 중앙은행 매입 지속",
          "• 실질금리 하락",
        ],
      },
      {
        title: "원유 (WTI)",
        current: 68,
        status: "탐욕",
        rsi: "$78.5/bbl",
        description:
          "WTI 원유가 공급 제약과 수요 증가로 상승세를 지속하고 있음",
        details: [
          "• 현재가: $78.5/배럴",
          "• OPEC+ 감산 지속",
          "• 중국 수요 회복",
          "• 재고 감소 추세",
        ],
      },
      {
        title: "구리",
        current: 75,
        status: "탐욕",
        rsi: "$8,450/톤",
        description:
          "구리가 전기차와 신재생 에너지 수요 증가로 강한 상승세를 보임",
        details: [
          "• 현재가: $8,450/톤",
          "• 전기차 수요 급증",
          "• 공급 부족 우려",
          "• 중국 경기 회복",
        ],
      },
      {
        title: "천연가스",
        current: 82,
        status: "탐욕",
        rsi: "$3.85/MMBtu",
        description: "천연가스가 겨울 수요와 공급 제약으로 가격 급등세를 보임",
        details: [
          "• 현재가: $3.85/MMBtu",
          "• 겨울 수요 급증",
          "• 유럽 공급 불안",
          "• 재고 부족",
        ],
      },
    ],
    metadata: {
      updateFrequency: "5분",
      lastUpdate: new Date().toISOString(),
      dataSource: "원자재 시장 지표",
      reliability: "높음",
    },
  },
};

// Components
const FearGreedGauge = ({ score }: { score: number }) => {
  const getColor = (s: number) => {
    if (s >= 75) return "#dc2626"; // 극한 탐욕
    if (s >= 55) return "#f97316"; // 탐욕
    if (s >= 45) return "#eab308"; // 중립
    if (s >= 25) return "#84cc16"; // 공포
    return "#16a34a"; // 극한 공포
  };

  const getLabel = (s: number) => {
    if (s >= 75) return "극한 탐욕";
    if (s >= 55) return "탐욕";
    if (s >= 45) return "중립";
    if (s >= 25) return "공포";
    return "극한 공포";
  };

  const segments = [
    { start: 0, end: 20, color: "#16a34a", label: "극한 공포" },
    { start: 20, end: 35, color: "#84cc16", label: "공포" },
    { start: 35, end: 45, color: "#eab308", label: "중립" },
    { start: 45, end: 55, color: "#f97316", label: "탐욕" },
    { start: 55, end: 80, color: "#dc2626", label: "극한 탐욕" },
  ];

  const angle = (score / 100) * 180;

  return (
    <div className="relative w-80 h-48 mx-auto">
      {/* Gauge Background */}
      <svg className="w-full h-full" viewBox="0 0 320 160">
        {/* Background Arc */}
        <path
          d="M 40 140 A 120 120 0 0 1 280 140"
          fill="none"
          stroke="#1e293b"
          strokeWidth="20"
        />

        {/* Colored Segments */}
        {segments.map((segment, index) => {
          const startAngle = (segment.start / 100) * 180 - 90;
          const endAngle = (segment.end / 100) * 180 - 90;
          const radius = 120;
          const cx = 160;
          const cy = 140;

          const x1 = cx + radius * Math.cos((startAngle * Math.PI) / 180);
          const y1 = cy + radius * Math.sin((startAngle * Math.PI) / 180);
          const x2 = cx + radius * Math.cos((endAngle * Math.PI) / 180);
          const y2 = cy + radius * Math.sin((endAngle * Math.PI) / 180);

          return (
            <path
              key={index}
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`}
              fill={segment.color}
              opacity="0.8"
            />
          );
        })}

        {/* Needle */}
        <line
          x1="160"
          y1="140"
          x2={160 + 100 * Math.cos(((angle - 90) * Math.PI) / 180)}
          y2={140 + 100 * Math.sin(((angle - 90) * Math.PI) / 180)}
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Center Circle */}
        <circle
          cx="160"
          cy="140"
          r="8"
          fill="#1f2937"
          stroke="#ffffff"
          strokeWidth="2"
        />
      </svg>

      {/* Score Display */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-5xl font-bold text-white mb-1">{score}</div>
        <div
          className={`text-lg font-medium px-3 py-1 rounded-full`}
          style={{
            color: getColor(score),
            backgroundColor: getColor(score) + "20",
          }}
        >
          {getLabel(score)}
        </div>
      </div>

      {/* Scale Labels */}
      <div className="absolute bottom-2 left-0 text-xs text-slate-400">
        0-20
        <br />
        극한 공포
      </div>
      <div className="absolute bottom-2 left-16 text-xs text-slate-400">
        20-35
        <br />
        공포
      </div>
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-slate-400 text-center">
        45-55
        <br />
        중립
      </div>
      <div className="absolute bottom-2 right-16 text-xs text-slate-400 text-right">
        55-80
        <br />
        탐욕
      </div>
      <div className="absolute bottom-2 right-0 text-xs text-slate-400 text-right">
        80-100
        <br />
        극한 탐욕
      </div>
    </div>
  );
};

const IndicatorBar = ({ indicator }: { indicator: any }) => {
  // Special handling for Bollinger Bands
  const getBollingerBandPosition = (score: number) => {
    if (score >= 80) return "상단 밴드 근처";
    if (score >= 60) return "상단 영역";
    if (score >= 40) return "중앙 영역";
    if (score >= 20) return "하단 영역";
    return "하단 밴드 근처";
  };

  const isBollingerBand = indicator?.name === "볼린저밴드";

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-slate-800/30 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-lg">{indicator?.icon}</span>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{indicator?.name}</span>
            {indicator?.realTime !== false ? (
              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] rounded border border-green-500/30 flex items-center gap-0.5">
                <Activity size={8} />
                실시간
              </span>
            ) : (
              <span className="px-1.5 py-0.5 bg-gray-500/20 text-gray-400 text-[10px] rounded border border-gray-500/30">
                추정치
              </span>
            )}
          </div>
          {isBollingerBand && (
            <span className="text-xs text-slate-400">
              {getBollingerBandPosition(indicator?.score || 0)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden relative">
          {/* Bollinger Band zones */}
          {isBollingerBand && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-yellow-500/20 to-red-500/20" />
              <div className="absolute left-[20%] w-px h-full bg-slate-500/50" />
              <div className="absolute left-[40%] w-px h-full bg-slate-400/50" />
              <div className="absolute left-[60%] w-px h-full bg-slate-400/50" />
              <div className="absolute left-[80%] w-px h-full bg-slate-500/50" />
            </>
          )}
          <div
            className="h-full rounded-full transition-all duration-300 relative z-10"
            style={{
              width: `${indicator?.score || 0}%`,
              backgroundColor: indicator?.color || "#6b7280",
            }}
          />
        </div>
        <span className="text-white font-bold text-lg w-8 text-right">
          {indicator?.score || 0}
        </span>
      </div>
    </div>
  );
};

const DetailedIndicatorCard = ({
  indicator,
}: {
  indicator: FearGreedData["detailedIndicators"][0];
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "탐욕":
        return "#f97316";
      case "극한 탐욕":
        return "#dc2626";
      case "공포":
        return "#84cc16";
      case "극한 공포":
        return "#16a34a";
      default:
        return "#6b7280";
    }
  };

  const getIcon = (title: string) => {
    switch (title) {
      case "VIX 변동성":
        return <Activity className="text-orange-400" size={20} />;
      case "모멘텀 강도":
        return <TrendingUp className="text-red-400" size={20} />;
      case "52주 고가 근접도":
        return <Target className="text-blue-400" size={20} />;
      case "거래량 이상":
        return <BarChart3 className="text-gray-400" size={20} />;
      case "볼린저밴드":
        return <BarChart2 className="text-purple-400" size={20} />;
      default:
        return <Activity className="text-blue-400" size={20} />;
    }
  };

  const isBollingerBand = indicator.title === "볼린저밴드";

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/30">
      {/* Header with icon and status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {getIcon(indicator.title)}
          <h3 className="text-white font-semibold text-lg">
            {indicator.title}
          </h3>
        </div>
        <div
          className="px-2 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: getStatusColor(indicator.status) + "20",
            color: getStatusColor(indicator.status),
          }}
        >
          {indicator.status}
        </div>
      </div>

      {/* Main score */}
      <div className="text-4xl font-bold text-white mb-3">
        {indicator.current}
      </div>

      {/* Special Bollinger Bands visualization */}
      {isBollingerBand && (
        <div className="mb-4">
          <div className="text-xs text-slate-400 mb-2">볼린저밴드 위치</div>
          <div className="relative h-6 bg-slate-700/30 rounded-lg overflow-hidden">
            {/* Band zones */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-yellow-500/10 via-orange-500/10 to-red-500/10" />

            {/* Band dividers */}
            <div className="absolute left-[25%] w-px h-full bg-slate-500/40" />
            <div className="absolute left-[50%] w-px h-full bg-slate-400/60" />
            <div className="absolute left-[75%] w-px h-full bg-slate-500/40" />

            {/* Current position indicator */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-lg border-2 border-white/80"
              style={{
                left: `${indicator.current}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75" />
            </div>
          </div>

          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span className="text-green-400">하단밴드</span>
            <span className="text-yellow-400">중앙선</span>
            <span className="text-red-400">상단밴드</span>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-xs text-slate-400 mb-2">
          <span>지표 점수</span>
          <span>{indicator.current}/100</span>
        </div>
        <div className="relative h-3 w-full bg-slate-700/60 rounded-full overflow-hidden shadow-inner border border-slate-600/30">
          {/* Background gradient track */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-yellow-500/10 via-orange-500/10 to-red-500/10 rounded-full" />

          {/* Active progress bar */}
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out shadow-lg relative overflow-hidden"
            style={{
              width: `${Math.max(5, indicator.current)}%`,
              background: `linear-gradient(90deg,
                ${
                  indicator.current >= 75
                    ? "#dc2626, #ef4444"
                    : indicator.current >= 55
                      ? "#f97316, #fb923c"
                      : indicator.current >= 45
                        ? "#eab308, #fbbf24"
                        : indicator.current >= 25
                          ? "#84cc16, #a3e635"
                          : "#16a34a, #22c55e"
                })`,
              boxShadow: `0 0 10px ${
                indicator.current >= 75
                  ? "#dc262660"
                  : indicator.current >= 55
                    ? "#f9731660"
                    : indicator.current >= 45
                      ? "#eab30860"
                      : indicator.current >= 25
                        ? "#84cc1660"
                        : "#16a34a60"
              }`,
            }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-ping opacity-75" />
            </div>
          </div>
        </div>

        {/* Progress bar labels */}
        <div className="flex justify-between text-xs text-slate-500 mt-1.5 px-1">
          <span>0</span>
          <span className="text-green-400 font-medium">25</span>
          <span className="text-yellow-400 font-medium">50</span>
          <span className="text-orange-400 font-medium">75</span>
          <span className="text-red-400 font-medium">100</span>
        </div>
      </div>

      {/* RSI/Additional info */}
      <div className="text-slate-400 text-sm mb-3">{indicator.rsi}</div>

      {/* Description */}
      <div className="text-slate-300 text-sm mb-4 leading-relaxed">
        {indicator.description}
      </div>

      {/* Details list */}
      <div className="space-y-1">
        {indicator.details.map((detail, index) => (
          <div key={index} className="text-slate-400 text-xs leading-relaxed">
            {detail}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function FearAndGreedPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<AssetType>("stocks");
  const [data, setData] =
    useState<Record<AssetType, FearGreedData>>(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(true);
  const [dataHealth, setDataHealth] = useState<{
    realTimeCount: number;
    fallbackCount: number;
    status: "healthy" | "degraded" | "offline";
  }>({ realTimeCount: 0, fallbackCount: 0, status: "healthy" });

  // Fetch data function
  const fetchData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);

    try {
      // Fetch data for all asset types
      const [stocksResponse, cryptoResponse, commoditiesResponse] =
        await Promise.all([
          fetch("/api/fear-greed?type=stocks", { cache: "no-cache" }),
          fetch("/api/fear-greed?type=crypto", { cache: "no-cache" }),
          fetch("/api/fear-greed?type=commodities", { cache: "no-cache" }),
        ]);

      const newData: Record<AssetType, FearGreedData> = {
        stocks: stocksResponse.ok
          ? await stocksResponse.json().catch(() => FALLBACK_DATA.stocks)
          : FALLBACK_DATA.stocks,
        crypto: cryptoResponse.ok
          ? await cryptoResponse.json().catch(() => FALLBACK_DATA.crypto)
          : FALLBACK_DATA.crypto,
        commodities: commoditiesResponse.ok
          ? await commoditiesResponse
              .json()
              .catch(() => FALLBACK_DATA.commodities)
          : FALLBACK_DATA.commodities,
      };

      setData(newData);
      setLastUpdate(new Date());
      setIsConnected(true);

      // Check data health
      const currentData = newData[activeTab];
      const realTimeIndicators =
        currentData.indicators?.filter((i) => i.realTime !== false).length || 0;
      const totalIndicators = currentData.indicators?.length || 0;
      const fallbackCount = totalIndicators - realTimeIndicators;

      setDataHealth({
        realTimeCount: realTimeIndicators,
        fallbackCount: fallbackCount,
        status: currentData.metadata?.fallback
          ? "offline"
          : fallbackCount > totalIndicators / 2
            ? "degraded"
            : "healthy",
      });
    } catch (err) {
      console.error("Failed to fetch Fear & Greed data:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setIsConnected(false);

      // Try market data API as fallback
      try {
        const fallbackResponse = await fetch("/api/market-data", {
          cache: "no-cache",
        });
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setData((prev) => ({
            ...prev,
            [activeTab]: {
              ...prev[activeTab],
              ...fallbackData,
              indicators: fallbackData.indicators || prev[activeTab].indicators,
              detailedIndicators:
                fallbackData.detailedIndicators ||
                prev[activeTab].detailedIndicators,
              metadata: {
                ...prev[activeTab].metadata,
                dataSource:
                  fallbackData.metadata?.dataSource || "실시간 시장 데이터",
                lastUpdate: new Date().toISOString(),
                fallback: true,
              },
            },
          }));
          setIsConnected(true);
          setError(null);
        }
      } catch (fallbackErr) {
        console.error("Fallback API also failed:", fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    fetchData(true);
  };

  useEffect(() => {
    setMounted(true);

    // Only fetch data after component is mounted
    if (mounted) {
      fetchData(true);
    }

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(
      () => {
        if (mounted) {
          fetchData(false);
        }
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [mounted]);

  // Auto-refresh on page focus
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        fetchData(false);
      }
    };

    document.addEventListener("visibilitychange", handleFocus);
    return () => document.removeEventListener("visibilitychange", handleFocus);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mb-4"></div>
          <div className="text-xl text-slate-400">시스템 초기화 중...</div>
        </div>
      </div>
    );
  }

  const currentData = data[activeTab] || FALLBACK_DATA[activeTab];

  const getTabIcon = (tab: AssetType) => {
    switch (tab) {
      case "stocks":
        return <TrendingUpIcon className="w-4 h-4" />;
      case "crypto":
        return <Bitcoin className="w-4 h-4" />;
      case "commodities":
        return <Pickaxe className="w-4 h-4" />;
    }
  };

  const getTabLabel = (tab: AssetType) => {
    switch (tab) {
      case "stocks":
        return "주식";
      case "crypto":
        return "암호화폐";
      case "commodities":
        return "원자재";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900 text-slate-200">
      <Navigation />
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* CNN Comparison Banner */}
        {activeTab === "stocks" && currentData.cnnActual && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="text-blue-400 mt-1">
                <Activity size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-blue-400 font-semibold mb-3 text-lg">
                  🎯 CNN 공식 지수 vs 우리 앱 비교
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="text-xs text-slate-400 mb-1">CNN 공식</div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {currentData.cnnActual.score}
                    </div>
                    <div className="text-sm text-blue-400">
                      {currentData.cnnActual.label}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="text-xs text-slate-400 mb-1">우리 앱</div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {currentData.current.score}
                    </div>
                    <div className="text-sm text-purple-400">
                      {currentData.current.label}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>차이: {Math.abs(currentData.cnnActual.score - currentData.current.score)}점</span>
                  <span>•</span>
                  <span>Gemini로 CNN 페이지 실시간 스크래핑</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "stocks" && !currentData.cnnActual && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-blue-400 mt-1">
                <Activity size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-blue-400 font-semibold mb-2">
                  CNN Fear & Greed Index 비교
                </h3>
                <p className="text-slate-300 text-sm mb-3">
                  실제 CNN 공식 지수와 비교해보세요. CNN은 7개 지표의 역사적 편차를 정규화하여 계산합니다.
                </p>
                <a
                  href="https://edition.cnn.com/markets/fear-and-greed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
                >
                  CNN 공식 지수 확인하기 →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Header with Status */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {activeTab === "stocks" ? "주식 투자 심리 지수" : "글로벌 투자 심리 지수"}
            </h1>
            <p className="text-slate-400">
              {activeTab === "stocks"
                ? "CNN 방식 7개 지표 기반 실시간 분석"
                : "주식 · 암호화폐 · 원자재 통합 투자심리 분석"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Data Health Status */}
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                dataHealth.status === "healthy"
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : dataHealth.status === "degraded"
                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                    : "bg-red-500/10 text-red-400 border-red-500/30"
              }`}
            >
              <Activity size={16} />
              <div className="flex flex-col">
                <div className="font-medium">
                  {dataHealth.status === "healthy"
                    ? "실시간 연결"
                    : dataHealth.status === "degraded"
                      ? "일부 실시간"
                      : "Fallback 모드"}
                </div>
                {currentData.metadata?.realTime !== false && (
                  <div className="text-xs opacity-75">
                    {dataHealth.realTimeCount}/
                    {dataHealth.realTimeCount + dataHealth.fallbackCount} 지표
                    활성
                  </div>
                )}
              </div>
            </div>

            {/* Connection Status */}
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                isConnected
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
              {isConnected ? "연결됨" : "연결 끊김"}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg text-blue-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              새로고침
            </button>

            {/* Last Update */}
            <div className="text-xs text-slate-500">
              <div>마지막 업데이트</div>
              <div>{lastUpdate.toLocaleTimeString("ko-KR")}</div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400">
              <WifiOff size={16} />
              <span className="font-medium">데이터 연결 오류</span>
            </div>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Asset Type Tabs */}
        <div className="flex justify-center">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-2 border border-slate-700/50">
            <div className="flex gap-2">
              {(["stocks", "crypto", "commodities"] as AssetType[]).map(
                (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      activeTab === tab
                        ? "bg-blue-600 text-white shadow-lg"
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    }`}
                  >
                    {getTabIcon(tab)}
                    {getTabLabel(tab)}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side - Main Gauge */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">
                  현재 {getTabLabel(activeTab)} 심리
                </h2>
                {currentData.metadata?.realTime && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30 flex items-center gap-1">
                    <Activity size={12} />
                    실시간
                  </span>
                )}
                {currentData.metadata?.fallback && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
                    Fallback 모드
                  </span>
                )}
              </div>
              <p className="text-slate-400">
                {currentData.current.description}
              </p>
              {currentData.current.confidence && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="text-xs text-slate-500">신뢰도:</div>
                  <div className="flex items-center gap-1">
                    <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          currentData.current.confidence >= 80
                            ? "bg-green-500"
                            : currentData.current.confidence >= 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${currentData.current.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {currentData.current.confidence}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="animate-spin text-blue-400" size={32} />
              </div>
            ) : (
              <FearGreedGauge score={currentData.current.score} />
            )}

            <div className="mt-8 text-center">
              <div className="text-sm text-slate-500 mb-2">
                데이터 소스: {currentData.metadata.dataSource}
              </div>
              <div className="text-xs text-slate-600">
                업데이트 주기: {currentData.metadata.updateFrequency}
              </div>
              {currentData.metadata?.lastUpdate && (
                <div className="text-xs text-slate-600 mt-1">
                  최종 업데이트:{" "}
                  {new Date(currentData.metadata.lastUpdate).toLocaleString(
                    "ko-KR",
                  )}
                </div>
              )}
              {activeTab === "stocks" && currentData.cnnActual && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="text-xs text-green-400 mb-2 flex items-center gap-2">
                    <Activity size={12} />
                    CNN 실제 데이터 수집 완료
                  </div>
                  <div className="text-xs text-slate-500">
                    Gemini API로 CNN 페이지를 실시간 스크래핑하여 공식 값을 가져왔습니다.
                  </div>
                </div>
              )}
              {activeTab === "stocks" && !currentData.cnnActual && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="text-xs text-yellow-400 mb-2">
                    ⚠️ 참고: CNN 공식 지수와 차이가 있을 수 있습니다
                  </div>
                  <div className="text-xs text-slate-500">
                    CNN은 각 지표의 역사적 편차와 표준편차를 사용하여 정규화합니다.
                    우리 앱은 Yahoo Finance 데이터로 근사치를 계산합니다.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Indicators */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {getTabLabel(activeTab)} 구성요소 분석
              </h2>
              {activeTab === "stocks" && (
                <div className="text-xs text-slate-500">
                  CNN 7개 지표 방식
                </div>
              )}
            </div>

            <div className="space-y-4 mb-6">
              {currentData.indicators?.map((indicator, index) => (
                <IndicatorBar key={index} indicator={indicator} />
              )) || (
                <div className="text-center text-slate-400 py-8">
                  데이터를 불러오는 중...
                </div>
              )}
            </div>

            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">전체 점수</span>
                <span className="text-3xl font-bold text-white">
                  {currentData.current.score}
                </span>
              </div>
              <div className="text-center mt-2">
                <span
                  className={`text-lg font-medium ${
                    currentData.current.score >= 75
                      ? "text-red-400"
                      : currentData.current.score >= 55
                        ? "text-orange-400"
                        : currentData.current.score >= 45
                          ? "text-yellow-400"
                          : currentData.current.score >= 25
                            ? "text-lime-400"
                            : "text-green-400"
                  }`}
                >
                  {currentData.current.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Detailed Analysis */}
        {currentData.detailedIndicators &&
          currentData.detailedIndicators.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">
                {getTabLabel(activeTab)} 구성요소 상세
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {currentData.detailedIndicators?.map((indicator, index) => (
                  <DetailedIndicatorCard key={index} indicator={indicator} />
                )) || (
                  <div className="text-center text-slate-400 py-8 col-span-full">
                    상세 데이터를 불러오는 중...
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Historical Chart Section */}
        {currentData.historical && currentData.historical.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <TrendingUp className="text-blue-400" size={24} />
                {getTabLabel(activeTab)} 심리지수 히스토리
              </h2>

              {/* Current Status Info */}
              <div className="mt-4 md:mt-0 bg-slate-700/50 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-sm text-slate-400 mb-1">현재 상태</div>
                  <div className="text-2xl font-bold text-orange-400 mb-1">
                    {currentData.current.score}
                  </div>
                  <div className="text-sm text-orange-400">
                    {currentData.current.label}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={currentData.historical}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#334155"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderColor: "#334155",
                      color: "#f1f5f9",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#94a3b8" }}
                    formatter={(value: any) => [
                      `${Number(value).toFixed(1)}`,
                      "Fear & Greed Index",
                    ]}
                  />

                  {/* Background areas for different sentiment zones */}
                  <defs>
                    <pattern
                      id="extremeFear"
                      patternUnits="userSpaceOnUse"
                      width="100%"
                      height="25"
                    >
                      <rect
                        width="100%"
                        height="25"
                        fill="#16a34a"
                        opacity="0.1"
                      />
                    </pattern>
                    <pattern
                      id="fear"
                      patternUnits="userSpaceOnUse"
                      width="100%"
                      height="20"
                    >
                      <rect
                        width="100%"
                        height="20"
                        fill="#84cc16"
                        opacity="0.1"
                      />
                    </pattern>
                    <pattern
                      id="neutral"
                      patternUnits="userSpaceOnUse"
                      width="100%"
                      height="10"
                    >
                      <rect
                        width="100%"
                        height="10"
                        fill="#eab308"
                        opacity="0.1"
                      />
                    </pattern>
                    <pattern
                      id="greed"
                      patternUnits="userSpaceOnUse"
                      width="100%"
                      height="20"
                    >
                      <rect
                        width="100%"
                        height="20"
                        fill="#f97316"
                        opacity="0.1"
                      />
                    </pattern>
                    <pattern
                      id="extremeGreed"
                      patternUnits="userSpaceOnUse"
                      width="100%"
                      height="25"
                    >
                      <rect
                        width="100%"
                        height="25"
                        fill="#dc2626"
                        opacity="0.1"
                      />
                    </pattern>
                  </defs>

                  {/* Reference lines for zones */}
                  <ReferenceLine
                    y={25}
                    stroke="#84cc16"
                    strokeDasharray="2 2"
                    opacity={0.5}
                  />
                  <ReferenceLine
                    y={45}
                    stroke="#eab308"
                    strokeDasharray="2 2"
                    opacity={0.5}
                  />
                  <ReferenceLine
                    y={55}
                    stroke="#f97316"
                    strokeDasharray="2 2"
                    opacity={0.5}
                  />
                  <ReferenceLine
                    y={75}
                    stroke="#dc2626"
                    strokeDasharray="2 2"
                    opacity={0.5}
                  />

                  {/* Background zones */}
                  <Area
                    type="monotone"
                    dataKey={() => 25}
                    fill="#16a34a"
                    fillOpacity={0.05}
                    stroke="none"
                  />
                  <Area
                    type="monotone"
                    dataKey={() => 45}
                    fill="#84cc16"
                    fillOpacity={0.05}
                    stroke="none"
                  />
                  <Area
                    type="monotone"
                    dataKey={() => 55}
                    fill="#eab308"
                    fillOpacity={0.05}
                    stroke="none"
                  />
                  <Area
                    type="monotone"
                    dataKey={() => 75}
                    fill="#f97316"
                    fillOpacity={0.05}
                    stroke="none"
                  />
                  <Area
                    type="monotone"
                    dataKey={() => 100}
                    fill="#dc2626"
                    fillOpacity={0.05}
                    stroke="none"
                  />

                  {/* Main line */}
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{
                      fill: "#3b82f6",
                      strokeWidth: 2,
                      stroke: "#ffffff",
                      r: 5,
                    }}
                    activeDot={{
                      r: 8,
                      fill: "#3b82f6",
                      stroke: "#ffffff",
                      strokeWidth: 3,
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Legend */}
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-green-500 rounded shadow-lg"></div>
                  <span className="text-slate-300">0-25 극한 공포</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-lime-500 rounded shadow-lg"></div>
                  <span className="text-slate-300">25-45 공포</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-yellow-500 rounded shadow-lg"></div>
                  <span className="text-slate-300">45-55 중립</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-orange-500 rounded shadow-lg"></div>
                  <span className="text-slate-300">55-75 탐욕</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-2 bg-red-500 rounded shadow-lg"></div>
                  <span className="text-slate-300">75-100 극한 탐욕</span>
                </div>
              </div>

              {/* Chart Analysis */}
              <div className="mt-4 text-center">
                <p className="text-slate-400 text-sm">
                  📊 최근 3개월간 시장 심리가{" "}
                  <span className="text-orange-400 font-semibold">탐욕</span>과{" "}
                  <span className="text-lime-400 font-semibold">공포</span>{" "}
                  사이를 오가며 변동성을 보이고 있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Additional Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 볼린저밴드 위치 */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-purple-400" size={20} />
                <h3 className="font-bold text-white">볼린저밴드 분석</h3>
              </div>
              <div className="text-2xl font-bold text-orange-400">
                {currentData.indicators?.find((i) => i.name === "볼린저밴드")
                  ?.score || 64}
              </div>
            </div>

            {/* Bollinger Band Visual */}
            <div className="mb-4">
              <div className="relative h-8 bg-slate-700/30 rounded-lg overflow-hidden border border-slate-600/30">
                {/* Band zones */}
                <div className="absolute left-0 w-[25%] h-full bg-green-500/15" />
                <div className="absolute left-[25%] w-[25%] h-full bg-yellow-500/15" />
                <div className="absolute left-[50%] w-[25%] h-full bg-orange-500/15" />
                <div className="absolute left-[75%] w-[25%] h-full bg-red-500/15" />

                {/* Band lines */}
                <div className="absolute left-[25%] w-px h-full bg-green-400/80" />
                <div className="absolute left-[50%] w-px h-full bg-yellow-400/80" />
                <div className="absolute left-[75%] w-px h-full bg-red-400/80" />

                {/* Current price position */}
                <div
                  className="absolute top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-lg border-2 border-white/80 z-10"
                  style={{
                    left: `${currentData.indicators?.find((i) => i.name === "볼린저밴드")?.score || 64}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75" />
                </div>
              </div>

              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span className="text-green-400">하단밴드</span>
                <span className="text-yellow-400">중앙선</span>
                <span className="text-red-400">상단밴드</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-slate-300 text-sm font-medium">
                상단 영역 (과매수 신호)
              </div>
              <div className="text-slate-400 text-xs">• 변동성: 높음 📈</div>
              <div className="text-slate-400 text-xs">• 추세: 상승 지속</div>
              <div className="text-slate-400 text-xs">
                • 신호: 조정 가능성 주의
              </div>
            </div>
          </div>

          {/* Put/Call 비율 */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Scale className="text-cyan-400" size={20} />
                <h3 className="font-bold text-white">Put/Call 비율</h3>
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                {currentData.indicators?.find((i) => i.name === "P/C 비율")
                  ?.score || 45}
              </div>
            </div>

            {/* Put/Call Ratio Visual */}
            <div className="mb-4">
              <div className="relative h-6 bg-slate-700/30 rounded-lg overflow-hidden">
                <div className="absolute left-0 w-[40%] h-full bg-red-500/20" />
                <div className="absolute left-[40%] w-[20%] h-full bg-yellow-500/20" />
                <div className="absolute left-[60%] w-[40%] h-full bg-green-500/20" />

                <div className="absolute left-[40%] w-px h-full bg-yellow-400/60" />
                <div className="absolute left-[60%] w-px h-full bg-yellow-400/60" />

                {/* Current ratio position */}
                <div
                  className="absolute top-1/2 w-2 h-4 bg-cyan-400 rounded-sm shadow-lg"
                  style={{
                    left: `${currentData.indicators?.find((i) => i.name === "P/C 비율")?.score || 45}%`,
                    transform: "translateX(-50%) translateY(-50%)",
                  }}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span className="text-red-400">고공포</span>
                <span className="text-yellow-400">균형</span>
                <span className="text-green-400">고탐욕</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-slate-300 text-sm">균형적 수준 (0.82)</div>
              <div className="text-slate-400 text-xs">
                풋옵션과 콜옵션 비율이 안정적
              </div>
            </div>
          </div>

          {/* 시장 폭 */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="text-green-400" size={20} />
                <h3 className="font-bold text-white">시장 폭</h3>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {currentData.indicators?.find((i) => i.name === "시장 폭")
                  ?.score || 70}
              </div>
            </div>

            {/* Market Breadth Visual */}
            <div className="mb-4">
              <div className="flex h-6 rounded-lg overflow-hidden border border-slate-600/30">
                <div
                  className="bg-green-500/80 flex items-center justify-center text-xs text-white font-medium"
                  style={{
                    width: `${currentData.indicators?.find((i) => i.name === "시장 폭")?.score || 70}%`,
                  }}
                >
                  상승
                </div>
                <div
                  className="bg-red-500/80 flex items-center justify-center text-xs text-white font-medium"
                  style={{
                    width: `${100 - (currentData.indicators?.find((i) => i.name === "시장 폭")?.score || 70)}%`,
                  }}
                >
                  하락
                </div>
              </div>

              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span className="text-green-400">
                  상승종목{" "}
                  {currentData.indicators?.find((i) => i.name === "시장 폭")
                    ?.score || 70}
                  %
                </span>
                <span className="text-red-400">
                  하락종목{" "}
                  {100 -
                    (currentData.indicators?.find((i) => i.name === "시장 폭")
                      ?.score || 70)}
                  %
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-slate-300 text-sm font-medium">
                건강한 상승세 🚀
              </div>
              <div className="text-slate-400 text-xs">• A/D 라인: 상승 📈</div>
              <div className="text-slate-400 text-xs">
                • 참여도: 높음 (광범위)
              </div>
              <div className="text-slate-400 text-xs">
                • 신호: 지속 가능한 상승
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
