"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, TrendingUp, DollarSign, Newspaper, AlertCircle, ArrowRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnalysisData {
  symbol: string;
  currentPrice: string;
  marketStatus: string;
  buffettOpinion: string;
  keyFinancials: {
    revenue: string;
    operatingIncome: string;
  };
  news: Array<{
    title: string;
    source: string;
    link: string;
  }>;
}

export default function Home() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!symbol.trim()) return;

    console.log("Starting analysis for:", symbol);
    setLoading(true);
    setError("");
    setData(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });

      console.log("Response status:", response.status);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to analyze stock");
      }

      setData(result);
    } catch (err: unknown) {
      console.error("Analysis error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12 flex flex-col items-center font-sans selection:bg-accent selection:text-black">
      {/* Hero Section */}
      <div className="max-w-4xl w-full flex flex-col items-center gap-8 mb-16 mt-8">
        <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-accent/20 shadow-[0_0_40px_rgba(34,197,94,0.2)] animate-in zoom-in duration-700">
          <Image
            src="/geminibuffett.png"
            alt="Gemini Buffett"
            fill
            className="object-cover hover:scale-105 transition-transform duration-500"
            priority
          />
        </div>

        <div className="text-center space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-150">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
            Gemini <span className="text-accent">Buffett</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto font-light">
            &quot;Price is what you pay. Value is what you get.&quot;
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="w-full max-w-xl mb-20 relative z-10 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-green-600/20 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
          <div className="relative flex items-center bg-card rounded-full border border-white/10 shadow-2xl">
            <Search className="absolute left-6 text-gray-500 w-6 h-6" />
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Enter stock symbol (e.g., AAPL, 005930)"
              className="w-full bg-transparent border-none py-5 pl-16 pr-36 text-xl placeholder:text-gray-600 focus:ring-0 text-white rounded-full"
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="absolute right-2 top-2 bottom-2 bg-accent hover:bg-green-400 text-black font-bold px-8 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse">Thinking...</span>
              ) : (
                <>
                  Analyze <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Results Grid */}
      {data && (
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">

          {/* Buffett's Opinion - Spans full width on mobile, 8 cols on desktop */}
          <div className="md:col-span-8 bg-card rounded-3xl p-8 border border-white/5 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-32 h-32 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-accent">
              <span className="bg-accent/10 p-2 rounded-lg">Oracle&apos;s Insight</span>
            </h2>
            <p className="text-xl md:text-2xl leading-relaxed text-gray-200 font-serif italic">
              &quot;{data.buffettOpinion}&quot;
            </p>
          </div>

          {/* Price Card - 4 cols */}
          <div className="md:col-span-4 bg-card rounded-3xl p-8 border border-white/5 shadow-xl flex flex-col justify-between group hover:border-accent/20 transition-colors">
            <div>
              <h3 className="text-gray-400 font-medium mb-2">Current Price</h3>
              <div className="text-4xl font-bold text-white tracking-tight">{data.currentPrice}</div>
            </div>
            <div className="mt-8">
              <div className={cn(
                "inline-flex items-center px-4 py-2 rounded-full text-sm font-medium",
                data.marketStatus.toLowerCase().includes("closed")
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-green-500/10 text-green-400 border border-green-500/20"
              )}>
                {data.marketStatus}
              </div>
            </div>
          </div>

          {/* Financials - 6 cols */}
          <div className="md:col-span-6 bg-card rounded-3xl p-8 border border-white/5 shadow-xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" /> Key Financials
            </h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <p className="text-gray-500 text-sm uppercase tracking-wider">Revenue</p>
                <p className="text-2xl font-semibold">{data.keyFinancials.revenue}</p>
              </div>
              <div className="space-y-2">
                <p className="text-gray-500 text-sm uppercase tracking-wider">Operating Income</p>
                <p className="text-2xl font-semibold">{data.keyFinancials.operatingIncome}</p>
              </div>
            </div>
          </div>

          {/* News - 6 cols */}
          <div className="md:col-span-6 bg-card rounded-3xl p-8 border border-white/5 shadow-xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-accent" /> Latest News
            </h3>
            <div className="space-y-4">
              {data.news.map((item, idx) => (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <h4 className="font-medium text-gray-200 group-hover:text-accent transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">{item.source}</p>
                </a>
              ))}
            </div>
          </div>

        </div>
      )}
    </main>
  );
}
