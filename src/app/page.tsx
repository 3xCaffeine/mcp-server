"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Shield, Brain, Mail, Calendar, FolderOpen, FileSpreadsheet, Presentation, CheckSquare, Zap, ArrowRight, Lock, Sparkles } from "lucide-react";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  const features = [
    {
      icon: <Mail className="h-6 w-6" />,
      title: "Gmail Integration",
      description: "Full email management with advanced search and automation"
    },
    {
      icon: <FolderOpen className="h-6 w-6" />,
      title: "Google Drive",
      description: "File management, search, and content manipulation"
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Calendar Sync",
      description: "Event management and scheduling automation"
    },
    {
      icon: <FileSpreadsheet className="h-6 w-6" />,
      title: "Sheets API",
      description: "Spreadsheet data manipulation and analysis"
    },
    {
      icon: <Presentation className="h-6 w-6" />,
      title: "Slides Control",
      description: "Presentation creation and batch updates"
    },
    {
      icon: <CheckSquare className="h-6 w-6" />,
      title: "Tasks Management",
      description: "Task lists and project organization"
    },
    {
      icon: <Brain className="h-6 w-6" />,
      title: "Memory Graph",
      description: "Intelligent knowledge storage and retrieval"
    },
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: "Sequential Thinking",
      description: "Advanced reasoning and problem-solving"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        <div className="relative container mx-auto px-4 pt-16 pb-24">
          <div className="text-center max-w-4xl mx-auto">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-green-500/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Server Active
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              VaultAssist MCP Server
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground mb-4 leading-relaxed">
              Secure OAuth 2.1 Model Context Protocol server with
            </p>

            <p className="text-lg sm:text-xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto">
              Advanced Google Workspace integration, intelligent memory graphs, and sequential thinking capabilities
            </p>

            {/* CTA Buttons */}
            <div className="flex gap-4 items-center justify-center flex-col sm:flex-row mb-16">
              {!isLoading && (
                <>
                  {isAuthenticated ? (
                    <Link href="/dashboard">
                      <Button size="lg" className="group rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg h-14 px-8 transition-all duration-300 hover:scale-105">
                        Open Dashboard
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/auth">
                      <Button size="lg" className="group rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg h-14 px-8 transition-all duration-300 hover:scale-105">
                        <Shield className="mr-2 h-5 w-5" />
                        Secure Sign In
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </Link>
                  )}
                </>
              )}

              <Button variant="outline" size="lg" className="rounded-full font-semibold text-lg h-14 px-8 border-2 hover:bg-accent transition-all duration-300" asChild>
                <a href="https://better-auth.com/docs" target="_blank" rel="noopener noreferrer">
                  <Lock className="mr-2 h-5 w-5" />
                  View Security Docs
                </a>
              </Button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-2 border-border/50 hover:border-primary/50 bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-lg mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="border-t border-border/50 bg-muted/5">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-blue-500/20">
              <Zap className="h-4 w-4" />
              Enterprise-Grade Security
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-6">
              Built for Production
            </h2>

            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              OAuth 2.1 compliance, secure token handling, and enterprise-ready architecture designed for mission-critical AI applications.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              Powered by OAuth 2.1 & Better Auth
            </div>

            <div className="flex gap-6">
              <a
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Brain className="h-4 w-4" />
                MCP Protocol
              </a>
              <a
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                href="https://better-auth.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Lock className="h-4 w-4" />
                Better Auth
              </a>
              <a
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                href="https://nextjs.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Zap className="h-4 w-4" />
                Next.js
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
