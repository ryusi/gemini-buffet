"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Search, TrendingUp, DollarSign, Newspaper, AlertCircle, ArrowRight, Clock, X } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ReactMarkdown from 'react-markdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnalysisData {
  opinion: string;
  recommendation: string;
  macroPerspective: string;
  currentPrice: string;
  marketStatus: string;
  keyFinancials: {
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
  };
  recentNews: Array<{
    title: string;
    titleKo: string;
    url: string;
  }>;
}

interface SearchHistory {
  symbol: string;
  data: AnalysisData;
  timestamp: number;
}

export default function Home() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [currentSymbol, setCurrentSymbol] = useState("");
  const [lastSearchTime, setLastSearchTime] = useState<number | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Load search history from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stockSearchHistory');
      if (saved) {
        try {
          setSearchHistory(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load search history:', e);
        }
      }
    }
  }, []);

  // Save to localStorage
  const saveToHistory = (sym: string, analysisData: AnalysisData) => {
    const newEntry: SearchHistory = {
      symbol: sym.toUpperCase(),
      data: analysisData,
      timestamp: Date.now()
    };

    const updated = [
      newEntry,
      ...searchHistory.filter(h => h.symbol !== sym.toUpperCase())
    ].slice(0, 10);

    setSearchHistory(updated);
    localStorage.setItem('stockSearchHistory', JSON.stringify(updated));
  };

  // Load from history
  const loadFromHistory = (sym: string) => {
    const found = searchHistory.find(h => h.symbol === sym.toUpperCase());
    if (found) {
      setData(found.data);
      setCurrentSymbol(found.symbol);
      setLastSearchTime(found.timestamp);
      setSymbol(found.symbol);
      setShowHistoryModal(false);
    }
  };

  const handleAnalyze = async () => {
    if (!symbol.trim()) return;

    const upperSymbol = symbol.toUpperCase();
    console.log("Starting analysis for:", upperSymbol);
    setLoading(true);
    setLoadingStep("버핏의 투자 철학 검색 중...");
    setError("");
    setData(null);
    setCurrentSymbol(upperSymbol);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: upperSymbol }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze stock");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const parsedData = JSON.parse(jsonStr);

              if (parsedData.error) {
                throw new Error(parsedData.details || "Analysis failed");
              }

              if (parsedData.step === 1) {
                setLoadingStep("실시간 시장 데이터 분석 중...");
                setData({
                  opinion: `### 워렌 버핏의 투자 철학\n\n${parsedData.buffettWisdom}`,
                  recommendation: "분석 중...",
                  macroPerspective: "분석 중...",
                  currentPrice: "분석 중...",
                  marketStatus: "",
                  keyFinancials: {
                    peRatio: "...", marketCap: "...", dividendYield: "...",
                    roe: "...", freeCashFlow: "...", debtToEquity: "...",
                    eps: "...", operatingMargin: "...", bookValuePerShare: "...", revenueGrowth: "..."
                  },
                  recentNews: []
                });
              } else if (parsedData.step === 2) {
                setData(parsedData);
                setLastSearchTime(Date.now());
                saveToHistory(upperSymbol, parsedData);
                setLoading(false);
                setLoadingStep("");
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (err: unknown) {
      console.error("Analysis error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
      setLoadingStep("");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 flex flex-col items-center font-sans selection:bg-accent selection:text-black">
      <div className="max-w-4xl w-full flex flex-col items-center gap-8 mb-16 mt-8">
        <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-accent/20 shadow-[0_0_40px_rgba(34,197,94,0.2)] animate-in zoom-in duration-700">
          <Image src="/dogebuffett.png" alt="Doge Buffett" fill className="object-cover hover:scale-105 transition-transform duration-500" priority />
        </div>
        <div className="text-center space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-150">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">Gemini <span className="text-accent">Buffett</span></h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light">&quot;Price is what you pay. Value is what you get.&quot;</p>
        </div>
      </div>

      <div className="w-full max-w-xl mb-20 relative z-10 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-green-600/20 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
          <div className="relative flex items-center bg-card rounded-full border border-white/10 shadow-2xl">
            <Search className="absolute left-6 text-gray-500 w-6 h-6" />
            <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Enter stock symbol (e.g., AAPL, 005930)"
              className="w-full bg-transparent border-none py-5 pl-16 pr-36 text-xl placeholder:text-gray-600 focus:ring-0 text-white rounded-full"
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()} />
            <button onClick={handleAnalyze} disabled={loading}
              className="absolute right-2 top-2 bottom-2 bg-accent hover:bg-green-400 text-black font-bold px-8 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {loading ? <span className="animate-pulse text-sm">분석 중...</span> : (<>Analyze <ArrowRight className="w-4 h-4" /></>)}
            </button>
          </div>
        </div>
        {error && (<div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2"><AlertCircle className="w-5 h-5" /><p>{error}</p></div>)}
        {loading && loadingStep && (<div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-xl flex items-center gap-3 text-accent animate-in fade-in slide-in-from-top-2"><div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div><p className="font-medium">{loadingStep}</p></div>)}

        {/* History Button */}
        {searchHistory.length > 0 && !loading && (
          <div className="mt-6 flex justify-center">
            <button onClick={() => setShowHistoryModal(true)} className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-accent/30 rounded-full text-sm font-medium transition-all">
              <Clock className="w-4 h-4" />
              최근 검색 ({searchHistory.length})
            </button>
          </div>
        )}
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowHistoryModal(false)}>
          <div className="bg-card rounded-3xl p-8 border border-white/10 shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2"><Clock className="w-6 h-6 text-accent" />최근 검색</h3>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchHistory.map((item) => (
                <button key={item.symbol} onClick={() => loadFromHistory(item.symbol)} className="w-full text-left p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 transition-all group">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-white group-hover:text-accent transition-colors">{item.symbol}</span>
                    <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-400">{item.data.currentPrice}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {
        data && (
          <div className="w-full max-w-6xl space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex items-center justify-between"><h2 className="text-3xl font-bold text-white">{currentSymbol}</h2>{lastSearchTime && (<p className="text-sm text-gray-400">마지막 검색: {new Date(lastSearchTime).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>)}</div>
            <div className="bg-card rounded-3xl p-8 border border-white/5 shadow-xl relative overflow-hidden group"><div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><TrendingUp className="w-32 h-32 text-accent" /></div><h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-accent"><span className="bg-accent/10 p-2 rounded-lg">Oracle&apos;s Insight</span></h2><div className="prose prose-invert max-w-none"><ReactMarkdown components={{ h3: ({ node, ...props }: any) => <h3 className="text-xl font-bold text-accent mt-6 mb-3" {...props} />, strong: ({ node, ...props }: any) => <strong className="text-white font-semibold" {...props} />, ul: ({ node, ...props }: any) => <ul className="list-disc pl-6 space-y-2 my-4" {...props} />, li: ({ node, ...props }: any) => <li className="text-lg text-gray-300" {...props} />, p: ({ node, ...props }: any) => <p className="text-lg md:text-xl leading-relaxed text-gray-200 font-serif mb-4" {...props} /> }}>{data.opinion}</ReactMarkdown></div></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="bg-card rounded-3xl p-8 border border-white/5 shadow-xl"><h3 className="text-xl font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-accent" /> 매수/매도 관점</h3><div className="prose prose-invert max-w-none"><ReactMarkdown components={{ strong: ({ node, ...props }: any) => <strong className="text-accent font-semibold" {...props} />, p: ({ node, ...props }: any) => <p className="text-base leading-relaxed text-gray-300 mb-3" {...props} /> }}>{data.recommendation}</ReactMarkdown></div></div><div className="bg-card rounded-3xl p-8 border border-white/5 shadow-xl"><h3 className="text-xl font-bold mb-4 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-accent" /> 거시적 관점</h3><div className="prose prose-invert max-w-none"><ReactMarkdown components={{ strong: ({ node, ...props }: any) => <strong className="text-accent font-semibold" {...props} />, p: ({ node, ...props }: any) => <p className="text-base leading-relaxed text-gray-300 mb-3" {...props} /> }}>{data.macroPerspective}</ReactMarkdown></div></div></div>
            <div className="bg-card rounded-3xl p-8 border border-white/5 shadow-xl"><div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10"><div className="flex items-center gap-4"><DollarSign className="w-6 h-6 text-accent" /><div><h3 className="text-sm text-gray-400 font-medium mb-1">Current Price</h3><div className="text-3xl font-bold text-white tracking-tight">{data.currentPrice}</div></div></div><div className={cn("inline-flex items-center px-4 py-2 rounded-full text-sm font-medium", (data.marketStatus || "").toLowerCase().includes("closed") ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20")}>{data.marketStatus}</div></div><h3 className="text-xl font-bold mb-6">Key Financials</h3><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-6">{[{ key: 'peRatio', label: 'P/E Ratio', ko: '주가수익비율', desc: '주가를 1주당 순이익으로 나눈 값입니다. 낮을수록 저평가되었을 가능성이 있습니다.' }, { key: 'marketCap', label: 'Market Cap', ko: '시가총액', desc: '상장된 모든 주식의 가치를 합한 금액입니다. 기업의 규모를 나타냅니다.' }, { key: 'roe', label: 'ROE', ko: '자기자본이익률', desc: '투입한 자기자본으로 얼마만큼의 이익을 냈는지 보여주는 수익성 지표입니다.' }, { key: 'freeCashFlow', label: 'Free Cash Flow', ko: '잉여현금흐름', desc: '기업이 사업을 유지하고 남은 현금으로, 배당이나 재투자의 재원이 됩니다.' }, { key: 'debtToEquity', label: 'Debt-to-Equity', ko: '부채비율', desc: '총부채를 자기자본으로 나눈 값입니다. 낮을수록 재무구조가 건전합니다.' }, { key: 'eps', label: 'EPS', ko: '주당순이익', desc: '1주당 얼마의 순이익을 냈는지 보여줍니다. 높을수록 수익성이 좋습니다.' }, { key: 'operatingMargin', label: 'Operating Margin', ko: '영업이익률', desc: '매출 대비 영업이익의 비율입니다. 높을수록 본업에서 효율적으로 이익을 냅니다.' }, { key: 'bookValuePerShare', label: 'Book Value/Share', ko: '주당순자산', desc: '1주당 순자산 가치입니다. 주가와 비교하여 저평가 여부를 판단합니다.' }, { key: 'revenueGrowth', label: 'Revenue Growth', ko: '매출성장률', desc: '전년 대비 매출 증가율입니다. 기업의 성장 추세를 파악할 수 있습니다.' }, { key: 'dividendYield', label: 'Dividend Yield', ko: '배당수익률', desc: '현재 주가 대비 받을 수 있는 배당금의 비율입니다.' }].map((metric) => (<div key={metric.key} className="space-y-1 group relative"><div className="flex items-center gap-2 cursor-help"><p className="text-gray-500 text-xs uppercase tracking-wider font-medium">{metric.label} <span className="text-gray-600">({metric.ko})</span></p><AlertCircle className="w-3 h-3 text-gray-600 opacity-50 group-hover:opacity-100 transition-opacity" /><div className="absolute bottom-full left-0 mb-2 w-48 p-3 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-300 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none">{metric.desc}<div className="absolute bottom-[-4px] left-4 w-2 h-2 bg-gray-900 border-r border-b border-white/10 transform rotate-45"></div></div></div><p className="text-2xl font-semibold text-gray-100">{data.keyFinancials[metric.key as keyof typeof data.keyFinancials]}</p></div>))}</div></div>
            <div className="bg-card rounded-3xl p-8 border border-white/5 shadow-xl"><h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Newspaper className="w-5 h-5 text-accent" /> Latest News</h3>{data.recentNews && data.recentNews.length > 0 ? (<div className="space-y-4">{data.recentNews.map((item, idx) => (<a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"><h4 className="font-medium text-gray-200 group-hover:text-accent transition-colors line-clamp-2 leading-snug mb-1">{item.titleKo || item.title}</h4>{item.titleKo && (<p className="text-xs text-gray-500 line-clamp-1">{item.title}</p>)}</a>))}</div>) : (<div className="text-center py-8"><p className="text-gray-400 text-sm">최신 뉴스를 찾을 수 없습니다. 심볼을 확인하거나 나중에 다시 시도해주세요.</p></div>)}</div>
          </div>
        )
      }
    </main >
  );
}
