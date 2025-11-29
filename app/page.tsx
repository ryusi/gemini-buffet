"use client";

import React from "react";
import Navigation from "../components/Navigation";
import Link from "next/link";
import {
  TrendingUp,
  Bitcoin,
  BarChart3,
  ArrowRight,
  Activity,
  Target,
  Zap,
  Globe,
  Search,
} from "lucide-react";

export default function HomePage() {
  const features = [
    {
      title: "주식 분석",
      description:
        "워런 버핏의 60년 투자 철학과 실시간 데이터를 결합한 AI 주식 분석. 주주서한의 지혜와 최신 재무 데이터를 바탕으로 종목을 평가합니다.",
      href: "/stock-analysis",
      icon: Search,
      color: "from-green-500 to-blue-500",
      features: [
        "🧠 버핏 주주서한 지혜 검색",
        "📊 실시간 재무지표 분석",
        "💡 AI 투자 의견 제시",
      ],
      status: "RAG + 실시간 데이터",
    },
    {
      title: "Fear & Greed Index",
      description:
        "글로벌 투자 심리 지수를 실시간으로 분석합니다. 주식, 암호화폐, 원자재 시장의 투자심리를 종합적으로 파악할 수 있습니다.",
      href: "/fear-and-greed",
      icon: BarChart3,
      color: "from-purple-500 to-pink-500",
      features: [
        "📈 주식 시장: VIX, S&P 500, 볼린저밴드",
        "₿ 암호화폐: 비트코인 도미넌스, F&G 지수",
        "🥇 원자재: 금, 원유, 구리 실시간 가격",
      ],
      status: "실시간 연동",
    },
    {
      title: "Bitcoin Power Law",
      description:
        "비트코인 온체인 및 퀀트 데이터 분석을 통한 시장버블지수입니다. 멱법칙 회귀 모형으로 비트코인의 적정가격을 산출합니다.",
      href: "/bitcoin-power-law",
      icon: Bitcoin,
      color: "from-orange-500 to-yellow-500",
      features: [
        "📊 Power Law 회귀 분석 (Log-Log)",
        "🎯 Z-Score 버블 지수 계산",
        "🌈 Rainbow Chart 시각화",
      ],
      status: "실시간 BTC 데이터",
    },
  ];

  const stats = [
    { label: "분석 기능", value: "3개", icon: Activity },
    { label: "실시간 데이터 소스", value: "7+", icon: Globe },
    { label: "분석 지표", value: "20+", icon: Target },
    { label: "업데이트 주기", value: "5분", icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200">
      <Navigation />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 mb-4">
              Gemini Buffet
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 mb-6">
              전문가 수준의 투자 분석 플랫폼
            </p>
            <p className="text-lg text-slate-500 max-w-3xl mx-auto">
              실시간 시장 데이터와 고급 퀀트 분석을 통해 주식, 암호화폐, 원자재
              시장의 투자 기회를 발굴하고 리스크를 관리하세요.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6"
                >
                  <div className="flex items-center justify-center mb-3">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-orange-500/20 to-yellow-500/20">
                      <Icon className="h-6 w-6 text-orange-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-800/80 transition-all duration-300 group"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className={`p-4 rounded-xl bg-gradient-to-r ${feature.color}`}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {feature.title}
                    </h3>
                    <div
                      className={`text-sm px-3 py-1 rounded-full bg-gradient-to-r ${feature.color} bg-opacity-20 text-white font-medium inline-block`}
                    >
                      {feature.status}
                    </div>
                  </div>
                </div>

                <p className="text-slate-300 mb-6 leading-relaxed">
                  {feature.description}
                </p>

                <div className="space-y-3 mb-8">
                  {feature.features.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-yellow-400"></div>
                      <span className="text-slate-400 text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={feature.href}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r ${feature.color} text-white font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 group-hover:shadow-2xl`}
                >
                  분석 시작하기
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Technology Stack */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            기술 스택 & 데이터 소스
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-orange-400 mb-4">
                실시간 데이터
              </h3>
              <ul className="space-y-2 text-slate-300">
                <li>• Yahoo Finance API</li>
                <li>• Alternative.me F&G Index</li>
                <li>• CoinGecko API</li>
                <li>• NYSE, NASDAQ 데이터</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-orange-400 mb-4">
                분석 기법
              </h3>
              <ul className="space-y-2 text-slate-300">
                <li>• RAG (검색증강생성)</li>
                <li>• Power Law 회귀 분석</li>
                <li>• 시계열 분석</li>
                <li>• Z-Score 표준화</li>
                <li>• 다중 지표 가중평균</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-orange-400 mb-4">
                기술 스택
              </h3>
              <ul className="space-y-2 text-slate-300">
                <li>• Next.js 14 + TypeScript</li>
                <li>• React + Recharts</li>
                <li>• Tailwind CSS</li>
                <li>• Real-time APIs</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-white mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-slate-300 mb-8 text-lg">
              전문가 수준의 투자 분석으로 더 나은 투자 결정을 내려보세요
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/stock-analysis"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Search className="h-5 w-5" />
                주식 분석
              </Link>
              <Link
                href="/fear-and-greed"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <BarChart3 className="h-5 w-5" />
                Fear & Greed Index
              </Link>
              <Link
                href="/bitcoin-power-law"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Bitcoin className="h-5 w-5" />
                Bitcoin Power Law
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-yellow-500">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-white font-bold">Gemini Buffet</div>
                <div className="text-xs text-slate-400">
                  Professional Investment Analytics
                </div>
              </div>
            </div>
            <div className="text-sm text-slate-400">
              © 2024 Gemini Buffet. 실시간 데이터 기반 투자 분석 플랫폼.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
