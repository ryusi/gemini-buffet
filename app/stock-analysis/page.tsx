"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  TrendingUp,
  DollarSign,
  BarChart3,
  Clock,
  AlertCircle,
  Loader2,
  Newspaper,
  X,
  History,
} from "lucide-react";
import Navigation from "../../components/Navigation";

interface KeyFinancials {
  peRatio: string;
  marketCap: string;
  dividendYield: string;
  roe: string;
  freeCashFlow: string;
  debtToEquity: string;
  eps: string;
  operatingMargin: string;
  bookValuePerShare: string;
  revenueGrowth: string;
}

interface NewsItem {
  title: string;
  titleKo: string;
  url: string;
}

interface AnalysisResult {
  step: number;
  buffettWisdom?: string;
  opinion?: string;
  recommendation?: string;
  macroPerspective?: string;
  currentPrice?: string;
  marketStatus?: string;
  keyFinancials?: KeyFinancials;
  recentNews?: NewsItem[];
  error?: string;
  details?: string;
}

interface SearchHistory {
  symbol: string;
  data: AnalysisResult;
  timestamp: number;
}

export default function StockAnalysisPage() {
  const [symbol, setSymbol] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [buffettWisdom, setBuffettWisdom] = useState("");
  const [finalAnalysis, setFinalAnalysis] = useState<AnalysisResult | null>(
    null,
  );
  const [error, setError] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentSymbol, setCurrentSymbol] = useState("");

  const analysisRef = useRef<HTMLDivElement>(null);

  // Load search history from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("stockSearchHistory");
      if (saved) {
        try {
          setSearchHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to load search history:", e);
        }
      }
    }
  }, []);

  // Save to localStorage
  const saveToHistory = (sym: string, analysisData: AnalysisResult) => {
    const newEntry: SearchHistory = {
      symbol: sym.toUpperCase(),
      data: analysisData,
      timestamp: Date.now(),
    };

    const updated = [
      newEntry,
      ...searchHistory.filter((h) => h.symbol !== sym.toUpperCase()),
    ].slice(0, 10);

    setSearchHistory(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("stockSearchHistory", JSON.stringify(updated));
    }
  };

  // Load from history
  const loadFromHistory = (sym: string) => {
    const found = searchHistory.find((h) => h.symbol === sym.toUpperCase());
    if (found) {
      setFinalAnalysis(found.data);
      setCurrentSymbol(found.symbol);
      setSymbol(found.symbol);
      setBuffettWisdom(found.data.buffettWisdom || "");
      setShowHistoryModal(false);

      // Scroll to results
      setTimeout(() => {
        analysisRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  };

  const handleAnalyze = async () => {
    if (!symbol.trim()) {
      setError("주식 심볼을 입력해주세요.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep(0);
    setBuffettWisdom("");
    setFinalAnalysis(null);
    setError("");
    setCurrentSymbol(symbol.toUpperCase());

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol: symbol.toUpperCase() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.error) {
                  setError(`분석 실패: ${data.details}`);
                  setIsAnalyzing(false);
                  return;
                }

                if (data.step === 1) {
                  setAnalysisStep(1);
                  setBuffettWisdom(data.buffettWisdom);
                } else if (data.step === 2) {
                  setAnalysisStep(2);
                  setFinalAnalysis(data);
                  setIsAnalyzing(false);

                  // Save to history
                  saveToHistory(symbol.toUpperCase(), data);

                  // Scroll to results
                  setTimeout(() => {
                    analysisRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }, 100);
                }
              } catch (parseError) {
                console.error("Failed to parse SSE data:", parseError);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError(
        err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.",
      );
      setIsAnalyzing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isAnalyzing) {
      handleAnalyze();
    }
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown parsing for Korean text
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(
        /### (.*?)(\n|$)/g,
        '<h3 class="text-lg font-semibold text-orange-400 mt-6 mb-3">$1</h3>',
      )
      .replace(/- (.*?)(\n|$)/g, '<li class="ml-4 mb-1">• $1</li>')
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>");
  };

  const financialLabels: { [key: string]: string } = {
    peRatio: "PER",
    marketCap: "시가총액",
    dividendYield: "배당수익률",
    roe: "ROE",
    freeCashFlow: "FCF",
    debtToEquity: "부채비율",
    eps: "EPS",
    operatingMargin: "영업이익률",
    bookValuePerShare: "BPS",
    revenueGrowth: "매출성장률",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200">
      <Navigation />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-blue-400 to-green-400 mb-6">
            주식 분석
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-4">
            워런 버핏의 지혜로 주식을 분석하세요
          </p>
          <p className="text-lg text-slate-400 max-w-3xl mx-auto">
            60년간의 주주서한과 실시간 데이터를 결합한 AI 투자 분석
          </p>
        </div>

        {/* Search Section */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                주식 심볼 입력
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  placeholder="예: AAPL, TSLA, MSFT, BRK.B"
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  disabled={isAnalyzing}
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !symbol.trim()}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    분석중...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-5 w-5" />
                    분석하기
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-red-300">{error}</span>
            </div>
          )}

          {/* History Button */}
          {searchHistory.length > 0 && !isAnalyzing && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-green-500/30 rounded-lg text-sm font-medium transition-all"
              >
                <History className="w-4 h-4" />
                최근 검색 ({searchHistory.length})
              </button>
            </div>
          )}
        </div>

        {/* Analysis Progress */}
        {isAnalyzing && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Loader2 className="h-6 w-6 animate-spin text-green-400" />
              <h2 className="text-xl font-semibold text-white">
                {symbol} 분석 중...
              </h2>
            </div>

            <div className="space-y-4">
              <div
                className={`flex items-center gap-3 ${analysisStep >= 1 ? "text-green-400" : "text-slate-400"}`}
              >
                <div
                  className={`w-3 h-3 rounded-full ${analysisStep >= 1 ? "bg-green-400" : "bg-slate-600"}`}
                />
                <span>1단계: 버핏의 주주서한에서 관련 지혜 검색</span>
              </div>
              <div
                className={`flex items-center gap-3 ${analysisStep >= 2 ? "text-green-400" : "text-slate-400"}`}
              >
                <div
                  className={`w-3 h-3 rounded-full ${analysisStep >= 2 ? "bg-green-400" : "bg-slate-600"}`}
                />
                <span>2단계: 실시간 데이터 수집 및 종합 분석</span>
              </div>
            </div>
          </div>
        )}

        {/* Buffett Wisdom */}
        {buffettWisdom && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-green-400 mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              워런 버핏의 지혜
            </h2>
            <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
              {buffettWisdom}
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistoryModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHistoryModal(false)}
          >
            <div
              className="bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Clock className="w-6 h-6 text-green-400" />
                  최근 검색
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchHistory.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => loadFromHistory(item.symbol)}
                    className="w-full text-left p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 border border-slate-600 hover:border-green-500/30 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">
                        {item.symbol}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(item.timestamp).toLocaleDateString("ko-KR", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {item.data.currentPrice}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Final Analysis */}
        {finalAnalysis && (
          <div ref={analysisRef} className="space-y-6">
            {/* Stock Info Header */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {currentSymbol || symbol}
                  </h2>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-semibold text-green-400">
                      {finalAnalysis.currentPrice || "N/A"}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        finalAnalysis.marketStatus === "Open"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {finalAnalysis.marketStatus === "Open"
                        ? "장 중"
                        : "장 마감"}
                    </span>
                  </div>
                </div>

                {finalAnalysis.recommendation && (
                  <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg p-4">
                    <div className="text-sm text-slate-300 mb-1">투자 의견</div>
                    <div className="text-lg font-semibold text-green-400">
                      {finalAnalysis.recommendation.split(" ")[0]}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Key Financials */}
            {finalAnalysis.keyFinancials && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  주요 재무지표
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Object.entries(finalAnalysis.keyFinancials).map(
                    ([key, value]) => (
                      <div key={key} className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-xs text-slate-400 mb-1">
                          {financialLabels[key] || key}
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {value || "N/A"}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Analysis Opinion */}
            {finalAnalysis.opinion && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  버핏 스타일 분석
                </h3>
                <div
                  className="text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(finalAnalysis.opinion),
                  }}
                />
              </div>
            )}

            {/* Investment Recommendation */}
            {finalAnalysis.recommendation && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  투자 의견
                </h3>
                <div
                  className="text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(finalAnalysis.recommendation),
                  }}
                />
              </div>
            )}

            {/* Macro Perspective */}
            {finalAnalysis.macroPerspective && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">
                  거시경제 관점
                </h3>
                <div
                  className="text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(finalAnalysis.macroPerspective),
                  }}
                />
              </div>
            )}

            {/* Recent News */}
            {finalAnalysis.recentNews &&
              finalAnalysis.recentNews.length > 0 && (
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Newspaper className="h-5 w-5" />
                    최근 뉴스
                  </h3>
                  <div className="space-y-3">
                    {finalAnalysis.recentNews.map((news, index) => (
                      <a
                        key={index}
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        <div className="text-white font-medium mb-1">
                          {news.titleKo}
                        </div>
                        <div className="text-sm text-slate-400">
                          {news.title}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-slate-800 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold">Gemini Buffet</div>
              <div className="text-xs text-slate-400">
                Warren Buffett&apos;s Wisdom + AI Analysis
              </div>
            </div>
          </div>
          <div className="text-sm text-slate-400">
            © 2024 Gemini Buffet. 워런 버핏의 투자 철학을 현대적 분석과
            결합합니다.
          </div>
        </footer>
      </div>
    </div>
  );
}
