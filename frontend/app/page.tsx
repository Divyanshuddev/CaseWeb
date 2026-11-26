"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Archive,
  Clock,
  Compass,
  FileSearch,
  FolderOpen,
  GitBranch,
  Pin,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { casesApi } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { RedPushpin } from "@/components/ui/RedPushpin";
import type { CaseItem } from "@/types";

interface MiniNode {
  id: string;
  label: string;
  tag: string;
  x: number;
  y: number;
  rotate: number;
  img?: string;
}

const PREVIEW_NODES: MiniNode[] = [
  {
    id: "n1",
    label: "Arthur Pendelton",
    tag: "SUSPECT",
    x: 42,
    y: 44,
    rotate: -3,
    img: "/images/demo/suspect-arthur.svg",
  },
  {
    id: "n2",
    label: "East Study & Boathouse",
    tag: "LOCATION",
    x: 340,
    y: 120,
    rotate: 2,
    img: "/images/demo/estate-map.svg",
  },
  {
    id: "n3",
    label: "Photograph 01",
    tag: "EXHIBIT A-01",
    x: 640,
    y: 38,
    rotate: 3,
    img: "/images/demo/study-photo.svg",
  },
  {
    id: "n4",
    label: "Brass Skeleton Key",
    tag: "CLUE",
    x: 640,
    y: 235,
    rotate: -2,
    img: "/images/demo/clue-key.svg",
  },
];

export default function LandingPage() {
  const { user } = useAuthStore();
  const [demoCases, setDemoCases] = useState<CaseItem[]>([]);
  const [loadingDemos, setLoadingDemos] = useState(true);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string>("n2");

  useEffect(() => {
    let active = true;
    casesApi
      .demo()
      .then((res) => {
        if (active) setDemoCases(res);
      })
      .catch(() => {
        if (active) setDemoCases([]);
      })
      .finally(() => {
        if (active) setLoadingDemos(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-charcoal text-cream overflow-x-hidden">
      {/* Top Navbar */}
      <header className="fixed top-0 inset-x-0 z-40 h-16 bg-charcoal/85 backdrop-blur-md border-b border-[#2c231c] px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <RedPushpin size="sm" />
          <span className="font-typewriter text-lg tracking-widest text-cream">CASEWEB</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-xs uppercase tracking-widest text-paper/80">
          <a href="#how-it-works" className="hover:text-cream transition">
            Methodology
          </a>
          <a href="#board-preview" className="hover:text-cream transition">
            Corkboard
          </a>
          <a href="#tools" className="hover:text-cream transition">
            Tools
          </a>
          <a href="#mysteries" className="hover:text-cream transition">
            Demo Cases
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-blood-red hover:bg-[#991e25] text-cream text-xs font-semibold uppercase tracking-wider rounded-sm transition"
            >
              Open Workspace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3.5 py-2 text-xs uppercase tracking-wider text-paper hover:text-cream transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blood-red hover:bg-[#991e25] text-cream text-xs font-semibold uppercase tracking-wider rounded-sm transition"
              >
                Start Investigation
              </Link>
            </>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative min-h-screen pt-20 pb-16 flex items-center corkboard-surface wood-frame overflow-hidden">
        <div className="absolute inset-0 desk-lamp-glow pointer-events-none" />

        {/* Animated Red Threads Background SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-65"
          viewBox="0 0 1440 820"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M 180 210 Q 480 340 760 220 T 1240 270"
            fill="none"
            stroke="#B3262E"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="1600"
            initial={{ strokeDashoffset: 1600, opacity: 0 }}
            animate={{ strokeDashoffset: 0, opacity: 0.9 }}
            transition={{ duration: 1.8, ease: "easeInOut" }}
          />
          <motion.path
            d="M 210 560 Q 520 430 760 220 T 1180 590"
            fill="none"
            stroke="#B3262E"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="1600"
            initial={{ strokeDashoffset: 1600, opacity: 0 }}
            animate={{ strokeDashoffset: 0, opacity: 0.85 }}
            transition={{ duration: 2.1, delay: 0.3, ease: "easeInOut" }}
          />
          <motion.path
            d="M 380 150 Q 680 520 1030 460"
            fill="none"
            stroke="#8e1b22"
            strokeWidth="2"
            strokeDasharray="1200"
            initial={{ strokeDashoffset: 1200, opacity: 0 }}
            animate={{ strokeDashoffset: 0, opacity: 0.7 }}
            transition={{ duration: 2.3, delay: 0.5, ease: "easeInOut" }}
          />
        </svg>

        {/* Floating Vintage Evidence Photos */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="hidden xl:block absolute left-10 top-28 w-48 bg-[#f2e7d0] p-2.5 pb-6 shadow-2xl -rotate-6 border border-[#9d8462]"
        >
          <div className="flex justify-center -mt-4 mb-1">
            <RedPushpin size="sm" />
          </div>
          <img
            src="/images/demo/study-photo.svg"
            alt="Crime scene evidence"
            className="w-full h-28 object-cover grayscale"
          />
          <p className="font-handwriting text-[#1d1712] text-sm mt-1.5 text-center">
            East Study — 01:15 AM
          </p>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="hidden xl:block absolute right-12 top-32 w-48 bg-[#f2e7d0] p-2.5 pb-6 shadow-2xl rotate-6 border border-[#9d8462]"
        >
          <div className="flex justify-center -mt-4 mb-1">
            <RedPushpin size="sm" />
          </div>
          <img
            src="/images/demo/newspaper-clipping.svg"
            alt="Newspaper clipping"
            className="w-full h-28 object-cover"
          />
          <p className="font-handwriting text-[#1d1712] text-sm mt-1.5 text-center">
            Chronicle Clipping #04
          </p>
        </motion.div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Animated Case File Opening Effect */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-block mb-6"
          >
            <button
              type="button"
              onClick={() => setDossierOpen((o) => !o)}
              className="group relative inline-flex items-center gap-2.5 px-4 py-1.5 bg-[#e8d4b0] text-[#1c1611] rounded-sm border border-[#7c6142] shadow-lg font-typewriter text-xs uppercase tracking-widest hover:bg-cream transition"
            >
              <FolderOpen className="w-4 h-4 text-blood-red" />
              <span>CASE FILE CW-1947-01 · {dossierOpen ? "HIDE BRIEF" : "OPEN DOSSIER"}</span>
            </button>

            {dossierOpen && (
              <motion.div
                initial={{ opacity: 0, scaleY: 0.85, y: -6 }}
                animate={{ opacity: 1, scaleY: 1, y: 0 }}
                className="mt-3 max-w-md mx-auto vintage-paper p-4 rounded-sm border border-[#7b6244] shadow-2xl text-left origin-top"
              >
                <div className="flex items-center justify-between text-[11px] font-typewriter text-blood-red mb-1">
                  <span>FICTIONAL MYSTERY ARCHIVE</span>
                  <span>CONFIDENTIAL</span>
                </div>
                <p className="text-xs text-[#241d16] leading-relaxed">
                  &ldquo;Organize fictional photographs, suspect alibis, clippings, and timelines on an
                  interactive corkboard. Red strings represent investigator hypotheses—never automated
                  accusations.&rdquo;
                </p>
              </motion.div>
            )}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-serifVintage text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-cream drop-shadow-[0_6px_24px_rgba(0,0,0,0.85)]"
          >
            EVERY CLUE TELLS A STORY.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="mt-5 text-lg sm:text-2xl text-paper font-typewriter tracking-wide drop-shadow"
          >
            Build connections. Discover patterns. Solve the mystery.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href={user ? "/dashboard" : "/register"}
              className="px-7 py-3.5 bg-blood-red hover:bg-[#991e25] text-cream font-typewriter text-sm uppercase tracking-widest rounded-sm shadow-2xl border border-[#e05259]/40 transition"
            >
              START INVESTIGATION
            </Link>
            <a
              href="#mysteries"
              className="px-7 py-3.5 bg-[#1b1714]/90 hover:bg-[#27211c] text-paper font-typewriter text-sm uppercase tracking-widest rounded-sm border border-[#7c6142] shadow-xl transition"
            >
              EXPLORE CASES
            </a>
          </motion.div>
        </div>
      </section>

      {/* HOW CASEWEB WORKS */}
      <section id="how-it-works" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="font-typewriter text-xs uppercase tracking-[0.25em] text-blood-red">
            Investigation Workflow
          </p>
          <h2 className="font-serifVintage text-3xl sm:text-4xl font-bold text-cream mt-2">
            How CaseWeb Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Catalog Evidence & Suspects",
              desc: "Upload scene photographs, newspaper clippings, PDFs, location blueprints, and fictional suspect profiles into a secure case archive.",
              icon: Archive,
            },
            {
              step: "02",
              title: "Pin & Arrange on the Corkboard",
              desc: "Drag, resize, and rotate physical-style evidence cards on your React Flow corkboard with realistic pushpins and warm desk-lamp contrast.",
              icon: Pin,
            },
            {
              step: "03",
              title: "Thread Red-String Hypotheses",
              desc: "Draw curved red strings between suspects, locations, and clues with custom relationship notes, then spot timeline conflicts and export reports.",
              icon: GitBranch,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="vintage-paper p-6 rounded-sm border border-[#7b6244] shadow-xl relative"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="font-typewriter text-xs px-2 py-0.5 bg-[#241d17] text-paper rounded-sm">
                    STEP {item.step}
                  </span>
                  <RedPushpin size="sm" />
                </div>
                <Icon className="w-7 h-7 text-blood-red mb-3" />
                <h3 className="font-serifVintage text-xl font-bold text-[#1a1510]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-[#3c3024] leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* INTERACTIVE EVIDENCE BOARD PREVIEW */}
      <section id="board-preview" className="py-16 px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="font-typewriter text-xs uppercase tracking-[0.25em] text-blood-red">
              Interactive Preview
            </p>
            <h2 className="font-serifVintage text-3xl font-bold text-cream mt-1">
              The Detective Evidence Wall
            </h2>
          </div>
          <p className="text-sm text-paper/75 max-w-md">
            Click any pinned exhibit below to inspect how suspects, maps, and clues connect with red
            investigator threads.
          </p>
        </div>

        <div className="relative h-[420px] rounded-sm corkboard-surface wood-frame overflow-hidden p-4">
          <div className="absolute inset-0 desk-lamp-glow pointer-events-none" />
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 920 380">
            <path
              d="M 160 90 Q 260 150 420 170"
              fill="none"
              stroke="#B3262E"
              strokeWidth="3"
            />
            <path
              d="M 480 165 Q 580 120 710 95"
              fill="none"
              stroke="#B3262E"
              strokeWidth="3"
            />
            <path
              d="M 730 130 Q 760 205 725 270"
              fill="none"
              stroke="#B3262E"
              strokeWidth="3"
            />
          </svg>

          {PREVIEW_NODES.map((node) => {
            const active = selectedPreviewId === node.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedPreviewId(node.id)}
                style={{
                  left: `${(node.x / 920) * 100}%`,
                  top: `${(node.y / 380) * 100}%`,
                  transform: `rotate(${node.rotate}deg)`,
                }}
                className={`absolute w-44 sm:w-48 vintage-paper p-2.5 rounded-sm border text-left transition shadow-2xl ${
                  active ? "ring-2 ring-blood-red scale-105 z-20" : "border-[#7d6445] z-10 hover:scale-[1.03]"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-typewriter uppercase bg-[#201914] text-paper px-1.5 py-0.5 rounded-sm">
                    {node.tag}
                  </span>
                  <RedPushpin size="sm" />
                </div>
                {node.img && (
                  <img
                    src={node.img}
                    alt={node.label}
                    className="w-full h-20 object-cover border border-[#9a8161] mb-1.5"
                  />
                )}
                <p className="font-typewriter text-xs text-[#1d1712] font-bold truncate">
                  {node.label}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* INVESTIGATION TOOLS */}
      <section id="tools" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="font-typewriter text-xs uppercase tracking-[0.25em] text-blood-red">
            Bureau Toolkit
          </p>
          <h2 className="font-serifVintage text-3xl sm:text-4xl font-bold text-cream mt-2">
            Built for Complex Mystery Mapping
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            {
              icon: Compass,
              title: "7 Custom Corkboard Nodes",
              desc: "Photographs, Suspects, Victims, Documents, Locations, Clues, and Timeline markers with resize and rotation.",
            },
            {
              icon: GitBranch,
              title: "Red-String Hypotheses",
              desc: "Connect any two items with curved crimson string, pushpin endpoints, and editable relationship notes.",
            },
            {
              icon: FileSearch,
              title: "Secure Evidence Archive",
              desc: "Upload verified images and PDFs with SHA-256 fingerprinting, category filtering, and 1-click pinning.",
            },
            {
              icon: Users,
              title: "Fictional Suspect Dossiers",
              desc: "Track aliases, alibi notes, relationship to the case, and investigation status.",
            },
            {
              icon: Clock,
              title: "Conflict-Aware Timeline",
              desc: "Chronological event log that automatically highlights overlapping or conflicting timestamps.",
            },
            {
              icon: Sparkles,
              title: "PNG, PDF & JSON Exports",
              desc: "Export your full evidence wall as PNG, generate a PDF dossier summary, or download structured JSON.",
            },
          ].map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.title}
                className="bg-[#1b1815] border border-[#332920] p-5 rounded-sm hover:border-paper/50 transition"
              >
                <Icon className="w-6 h-6 text-blood-red mb-3" />
                <h3 className="font-serifVintage text-lg font-semibold text-cream">{tool.title}</h3>
                <p className="mt-1.5 text-sm text-paper/75 leading-relaxed">{tool.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* FEATURED FICTIONAL MYSTERIES */}
      <section id="mysteries" className="py-20 px-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="font-typewriter text-xs uppercase tracking-[0.25em] text-blood-red">
              Open Before Registration
            </p>
            <h2 className="font-serifVintage text-3xl sm:text-4xl font-bold text-cream mt-1">
              Featured Fictional Mysteries
            </h2>
          </div>
          <p className="text-sm text-paper/75 max-w-md">
            Inspect a complete live investigation board right now. Sign up anytime to clone a file or
            open your own cases.
          </p>
        </div>

        {loadingDemos ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-64 bg-[#1b1815] border border-[#332920] rounded-sm animate-pulse"
              />
            ))}
          </div>
        ) : demoCases.length === 0 ? (
          <div className="p-8 bg-[#1b1815] border border-[#332920] rounded-sm text-center text-sm text-paper/75">
            Start the backend API server to browse live fictional demo cases.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {demoCases.map((c) => (
              <div
                key={c.id}
                className="vintage-paper rounded-sm border border-[#7b6244] shadow-2xl overflow-hidden flex flex-col"
              >
                <div className="h-44 bg-[#181512] relative overflow-hidden">
                  {c.thumbnail_url && (
                    <img
                      src={c.thumbnail_url}
                      alt={c.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  <span className="absolute top-3 left-3 font-typewriter text-xs px-2.5 py-1 bg-[#151515]/90 text-paper border border-[#6e563a] rounded-sm">
                    {c.case_number}
                  </span>
                  <span className="absolute top-3 right-3 font-typewriter text-xs px-2.5 py-1 bg-blood-red text-cream rounded-sm">
                    {c.status}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between text-[#1c1611]">
                  <div>
                    <h3 className="font-serifVintage text-2xl font-bold">{c.title}</h3>
                    <p className="mt-2 text-sm text-[#3d3023] leading-relaxed">{c.description}</p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#bfa682] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-xs font-typewriter text-[#4b3b29]">
                      <span>{c.evidence_count} Evidence</span>
                      <span>{c.node_count} Pinned</span>
                      <span>{c.connection_count} Threads</span>
                    </div>
                    <Link
                      href={`/cases/${c.id}`}
                      className="px-4 py-2 bg-[#1c1611] hover:bg-blood-red text-cream font-typewriter text-xs uppercase tracking-wider rounded-sm transition"
                    >
                      Inspect Corkboard →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#2c231c] bg-[#100e0d] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <RedPushpin size="sm" />
              <span className="font-typewriter text-base tracking-widest text-cream">CASEWEB</span>
            </div>
            <p className="mt-2 text-xs text-muted-gray max-w-lg flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-blood-red shrink-0 mt-0.5" />
              <span>
                Fictional mystery &amp; creative case-organization platform. Designed for storytelling,
                tabletop mysteries, and puzzle investigations—not real-world surveillance.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs text-paper/75 font-typewriter uppercase">
            <Link href="/login" className="hover:text-cream">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-cream">
              Register
            </Link>
            <Link href="/dashboard" className="hover:text-cream">
              Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
