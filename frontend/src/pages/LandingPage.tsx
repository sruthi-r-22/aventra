import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  ListChecks,
  Sparkles,
  Cake,
  Heart,
  Briefcase,
  Compass,
  SlidersHorizontal,
  Wallet,
  Store,
  Clock3,
  Lightbulb,
  PartyPopper,
  Landmark,
  Building2,
  CheckCircle2,
  CalendarCheck,
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'home' | 'features' | 'about'>('home');

  // Track active section for navbar highlighting
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      const featuresEl = document.getElementById('features');
      const aboutEl = document.getElementById('about');

      const aboutTop = aboutEl ? aboutEl.getBoundingClientRect().top + window.scrollY : null;
      if (aboutEl && aboutTop !== null && scrollPosition >= aboutTop) {
        setActiveSection('about');
      } else if (featuresEl && scrollPosition >= featuresEl.offsetTop) {
        setActiveSection('features');
      } else {
        setActiveSection('home');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#17252B] font-landing selection:bg-[#E5F3EE] selection:text-[#164B3D]">
      {/* ─── 1. NAVBAR ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-gray-200/50 transition-all">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 h-20 flex items-center justify-between">
          {/* Left: Aventra Logo + PlanForge Subtitle */}
          <div
            onClick={() => scrollToSection('home')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            {/* Dual organic pebble / leaf logo icon */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              {/* Dark forest green pebble shape */}
              <div className="absolute left-0 top-0 w-6 h-8 bg-[#164B3D] rounded-[50%_50%_50%_50%/70%_70%_30%_30%] -rotate-12 transition-transform group-hover:scale-105" />
              {/* Sage / mint leaf shape */}
              <div className="absolute right-0 bottom-0 w-5 h-7 bg-[#52B9A3] rounded-[50%_50%_50%_50%/30%_30%_70%_70%] opacity-90 transition-transform group-hover:scale-105" />
            </div>

            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[#17252B] leading-none">
                Aventra
              </span>
              <span className="text-[10px] text-[#66717A] font-medium tracking-wide mt-1">
                Powered by PlanForge
              </span>
            </div>
          </div>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <button
              type="button"
              onClick={() => scrollToSection('home')}
              className={`relative py-1 transition-colors cursor-pointer ${
                activeSection === 'home'
                  ? 'text-[#17252B] font-bold'
                  : 'text-[#66717A] hover:text-[#17252B]'
              }`}
            >
              Home
              {activeSection === 'home' && (
                <span className="absolute bottom-[-4px] left-0 right-0 h-[2px] bg-[#164B3D] rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className={`relative py-1 transition-colors cursor-pointer ${
                activeSection === 'features'
                  ? 'text-[#17252B] font-bold'
                  : 'text-[#66717A] hover:text-[#17252B]'
              }`}
            >
              Features
              {activeSection === 'features' && (
                <span className="absolute bottom-[-4px] left-0 right-0 h-[2px] bg-[#164B3D] rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className={`relative py-1 transition-colors cursor-pointer ${
                activeSection === 'about'
                  ? 'text-[#17252B] font-bold'
                  : 'text-[#66717A] hover:text-[#17252B]'
              }`}
            >
              About
              {activeSection === 'about' && (
                <span className="absolute bottom-[-4px] left-0 right-0 h-[2px] bg-[#164B3D] rounded-full" />
              )}
            </button>
          </nav>

          {/* Right: Primary Action Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="bg-[#164B3D] hover:bg-[#0F382E] text-white px-5 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all shadow-xs hover:shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Get Started</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION ──────────────────────────────────────── */}
      <section id="home" className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
        {/* Subtle decorative background curves and sage organic blobs */}
        <div className="absolute top-10 right-0 w-[55vw] h-[55vw] max-w-[850px] max-h-[850px] bg-gradient-to-br from-[#EBF3EF]/70 via-[#E4EFE9]/40 to-transparent rounded-full blur-2xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-[#EFF6F2]/50 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* ─── LEFT COLUMN: Headlines & Description ─── */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6 lg:pr-4">
              {/* Small Pale Green Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5F2EC] border border-[#CCE4DA] text-[#164B3D] text-[11px] sm:text-xs font-semibold tracking-wide w-fit">
                <span>Plan • Organize • Reimagine</span>
              </div>

              {/* Large Elegant Serif Heading */}
              <h1 className="font-serif-hero text-5xl sm:text-6xl xl:text-[76px] font-bold text-[#17252B] tracking-tight leading-[1.06]">
                Events, made
                <span className="block italic text-[#164B3D] font-normal mt-1 sm:mt-2">
                  smarter.
                </span>
              </h1>

              {/* Description */}
              <p className="text-base sm:text-lg text-[#66717A] leading-relaxed max-w-md font-normal">
                Aventra helps you plan, organize, and manage every detail of your event — with the power of AI and PlanForge.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="bg-[#164B3D] hover:bg-[#0F382E] text-white px-7 py-3.5 rounded-full font-bold text-sm tracking-wide transition-all shadow-md hover:shadow-lg flex items-center gap-2.5 cursor-pointer active:scale-95"
                >
                  <span>Get Started</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('features')}
                  className="bg-white/80 hover:bg-white text-[#17252B] border border-gray-200/90 px-6 py-3.5 rounded-full font-semibold text-sm transition-all hover:shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Compass size={16} className="text-[#164B3D]" />
                  <span>Explore Features</span>
                </button>
              </div>
            </div>

            {/* ─── RIGHT COLUMN: Overlapping Event Photography Collage ─── */}
            <div className="lg:col-span-7 relative min-h-[520px] sm:min-h-[580px] lg:min-h-[640px] flex items-center justify-center">
              {/* Handwritten script in top right */}
              <div className="absolute top-2 sm:top-3 lg:top-3 right-0 sm:right-2 lg:right-1 z-30 text-right font-handwriting text-xl sm:text-2xl lg:text-[26px] text-[#3B4A43] leading-snug select-none rotate-[-4deg]">
                <p>Turn</p>
                <p>Ideas</p>
                <p>into</p>
                <p className="text-[#164B3D] font-bold translate-x-6 sm:translate-x-10 lg:translate-x-14 translate-y-1 sm:translate-y-1.5">
                  Unforgettable
                </p>
                <p className="translate-x-9 sm:translate-x-16 lg:translate-x-20 translate-y-1 sm:translate-y-1.5">
                  Experiences
                </p>
              </div>

              {/* Organic Botanical Leaf SVGs */}
              <svg
                className="absolute top-16 left-4 sm:left-12 w-28 h-28 text-[#52B9A3]/30 pointer-events-none -z-0 rotate-12"
                viewBox="0 0 100 100"
                fill="currentColor"
              >
                <path d="M50 0 C20 30 20 70 50 100 C80 70 80 30 50 0 Z" />
              </svg>

              <svg
                className="absolute bottom-12 right-20 w-32 h-32 text-[#164B3D]/15 pointer-events-none -z-0 -rotate-45"
                viewBox="0 0 100 100"
                fill="currentColor"
              >
                <path d="M50 0 C25 25 25 75 50 100 C75 75 75 25 50 0 Z" />
              </svg>

              {/* Small cluster of decorative sage dots */}
              <div className="absolute bottom-20 left-1/3 grid grid-cols-3 gap-1.5 opacity-40 pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-[#164B3D]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#52B9A3]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#164B3D]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#52B9A3]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#164B3D]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#52B9A3]" />
              </div>

              {/* ── Photo 1: Birthday Celebration (Top Center-Right) ── */}
              <div className="absolute top-2 right-12 sm:right-24 lg:right-20 z-10 w-48 sm:w-56 lg:w-64 aspect-4/3 rounded-3xl border-4 border-white shadow-xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                <img
                  src="https://static.vecteezy.com/system/resources/previews/029/317/657/large_2x/celebration-setting-lively-decorations-make-for-a-spirited-birthday-party-background-ai-generated-photo.jpg"
                  alt="Birthday celebration with glowing candles"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>

              {/* Floating Label for Birthdays */}
              <div className="absolute top-36 sm:top-40 right-4 sm:right-10 lg:right-8 z-30 bg-white/95 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 pr-4 sm:pr-5 shadow-xl border border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E8F5F1] text-[#164B3D] flex items-center justify-center shrink-0">
                  <Cake size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h4 className="font-bold text-[#17252B] text-xs sm:text-sm leading-tight">
                    Birthdays
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-[#66717A] mt-0.5">
                    Make every moment special
                  </p>
                </div>
              </div>

              {/* ── Photo 2: Romantic Outdoor Wedding (Large Center Piece) ── */}
              <div className="relative z-20 w-[300px] sm:w-[400px] lg:w-[450px] aspect-4/3 rounded-3xl border-4 border-white shadow-2xl overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                <img
                  src="https://media-api.xogrp.com/images/72241d24-e14d-4cca-98a6-9af1d06b95cf~sc_768.576"
                  alt="Romantic outdoor wedding ceremony with floral arrangements"
                  className="w-full h-full object-cover"
                  loading="eager"
                />

                {/* Floating Label for Weddings (positioned overlapping lower right of wedding photo) */}
                <div className="absolute bottom-4 right-4 z-30 bg-white/95 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 pr-4 sm:pr-5 shadow-xl border border-gray-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F5F1] text-[#164B3D] flex items-center justify-center shrink-0">
                    <Heart size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#17252B] text-xs sm:text-sm leading-tight">
                      Weddings
                    </h4>
                    <p className="text-[10px] sm:text-[11px] text-[#66717A] mt-0.5">
                      From vision to a perfect day
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Photo 3: Corporate Event / Conference (Lower Left) ── */}
              <div className="absolute bottom-2 left-0 sm:left-4 lg:left-6 z-20 w-56 sm:w-72 lg:w-80 aspect-16/10 rounded-3xl border-4 border-white shadow-2xl overflow-hidden -rotate-3 group hover:rotate-0 transition-transform duration-300">
                <img
                  src="/landing/corporate.jpg"
                  alt="Corporate conference stage with audience"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>

              {/* Floating Label for Corporate Events */}
              <div className="absolute bottom-2 sm:bottom-4 left-[-8px] sm:left-2 lg:left-0 z-30 bg-white/95 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 pr-4 sm:pr-5 shadow-xl border border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E8F5F1] text-[#164B3D] flex items-center justify-center shrink-0">
                  <Briefcase size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h4 className="font-bold text-[#17252B] text-xs sm:text-sm leading-tight">
                    Corporate Events
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-[#66717A] mt-0.5">
                    Organize with confidence
                  </p>
                </div>
              </div>

              {/* ── Photo 4: Festivals & Celebrations (Lower Right) ── */}
              <div className="absolute bottom-10 sm:bottom-14 lg:bottom-16 right-[-10px] sm:right-2 lg:right-0 z-10 w-44 sm:w-56 lg:w-60 aspect-3/4 rounded-3xl border-4 border-white shadow-xl overflow-hidden rotate-3 group hover:rotate-0 transition-transform duration-300">
                <img
                  src="/images/festivals-celebrations.jpg"
                  alt="Festivals & Celebrations"
                  className="w-full h-full object-cover"
                  loading="eager"
                  onError={(e) => {
                    // Fallback to remote URL if local asset is not found
                    (e.target as HTMLImageElement).src =
                      'https://i.pinimg.com/originals/cb/bc/2e/cbbc2e31f6682b2289fb2e95f9ccd278.jpg';
                  }}
                />
              </div>

              {/* Floating Label for Festivals & Celebrations */}
              <div className="absolute bottom-16 sm:bottom-20 right-[-14px] sm:right-0 lg:right-[-6px] z-30 bg-white/95 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 pr-4 sm:pr-5 shadow-xl border border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E8F5F1] text-[#164B3D] flex items-center justify-center shrink-0">
                  <Sparkles size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h4 className="font-bold text-[#17252B] text-xs sm:text-sm leading-tight">
                    Festivals & Celebrations
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-[#66717A] mt-0.5">
                    Bigger ideas, better experiences
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. HOW IT WORKS ─────────────────────────────────────── */}
      <section className="border-t border-[#E3E8E2] bg-[#FAF9F5] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="inline-flex px-3.5 py-1.5 rounded-full bg-[#E5EFE8] text-[#164B3D] text-[10px] sm:text-xs font-bold tracking-wider uppercase mb-3">
              How it works
            </span>
            <h2 className="font-serif-hero text-3xl sm:text-4xl font-bold text-[#17252B] tracking-tight">
              Plan your event in four simple steps
            </h2>
            <p className="text-sm text-[#66717A] mt-3">
              Aventra makes event planning easy, structured, and stress-free.
            </p>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
            <div className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] border-t border-dashed border-[#B8C9BE]" />
            {[
              {
                title: 'Create Your Event',
                description: 'Enter event type, date, location, budget, and guest count.',
                icon: Calendar,
              },
              {
                title: 'Plan & Customize',
                description: 'Organize budgets, tasks, timelines, and vendors.',
                icon: SlidersHorizontal,
              },
              {
                title: 'Get Smart Suggestions',
                description: 'Use AI-assisted, constraint-aware replanning.',
                icon: Lightbulb,
              },
              {
                title: 'Bring It to Life',
                description: 'Track preparation progress and manage your event.',
                icon: PartyPopper,
              },
            ].map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-[#E5EFE8] border-[5px] border-[#FAF9F5] ring-1 ring-[#DCE9E1] text-[#164B3D] flex items-center justify-center shadow-xs">
                    <Icon size={21} strokeWidth={1.9} />
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#164B3D] text-white text-[10px] font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <h3 className="text-sm font-bold text-[#17252B]">{step.title}</h3>
                  </div>
                  <p className="max-w-[250px] text-xs text-[#66717A] leading-relaxed mt-2">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 4. EVENT TYPES ───────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-white border-y border-[#E3E8E2]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <span className="inline-flex px-3.5 py-1.5 rounded-full bg-[#E5EFE8] text-[#164B3D] text-[10px] sm:text-xs font-bold tracking-wider uppercase mb-3">
              For every occasion
            </span>
            <h2 className="font-serif-hero text-3xl sm:text-4xl font-bold text-[#17252B] tracking-tight">
              Plan any event, your way
            </h2>
            <p className="text-sm text-[#66717A] mt-3">
              Aventra is designed for gatherings both intimate and large-scale.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {
                name: 'Weddings',
                image: 'https://media-api.xogrp.com/images/72241d24-e14d-4cca-98a6-9af1d06b95cf~sc_768.576',
                icon: Heart,
                alt: 'Wedding celebration',
              },
              {
                name: 'Birthdays',
                image: 'https://static.vecteezy.com/system/resources/previews/029/317/657/large_2x/celebration-setting-lively-decorations-make-for-a-spirited-birthday-party-background-ai-generated-photo.jpg',
                icon: Cake,
                alt: 'Colorful birthday celebration',
              },
              {
                name: 'College Fests',
                image: '/landing/festival.jpg',
                icon: PartyPopper,
                alt: 'Festival stage and crowd',
              },
              {
                name: 'Corporate Events',
                image: '/landing/corporate.jpg',
                icon: Briefcase,
                alt: 'Corporate event audience',
              },
              {
                name: 'Conferences',
                image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=85',
                icon: Building2,
                alt: 'Conference attendees',
              },
              {
                name: 'Cultural Events',
                image: '/landing/festival.jpg',
                icon: Landmark,
                alt: 'Cultural festival celebration',
              },
            ].map((eventType) => {
              const Icon = eventType.icon;
              return (
                <article
                  key={eventType.name}
                  className="group overflow-hidden rounded-2xl border border-[#E3E8E2] bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-[#E5EFE8]">
                    <img
                      src={eventType.image}
                      alt={eventType.alt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#103D32]/70 via-transparent to-transparent" />
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-3">
                    <h3 className="text-xs sm:text-sm font-bold text-[#17252B]">{eventType.name}</h3>
                    <span className="w-7 h-7 shrink-0 rounded-full bg-[#E5EFE8] text-[#164B3D] flex items-center justify-center">
                      <Icon size={14} />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 5. WHY AVENTRA / FEATURES ────────────────────────────── */}
      <section id="features" className="py-16 sm:py-20 bg-[#FAF9F5]">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
            <span className="inline-flex px-3.5 py-1.5 rounded-full bg-[#E5EFE8] text-[#164B3D] text-[10px] sm:text-xs font-bold tracking-wider uppercase mb-3">
              Why Aventra
            </span>
            <h2 className="font-serif-hero text-3xl sm:text-4xl font-bold text-[#17252B] tracking-tight">
              Everything you need for a successful event
            </h2>
            <p className="text-sm text-[#66717A] mt-3 leading-relaxed">
              From planning to execution, Aventra brings all your event needs together in one simple, intuitive platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              {
                title: 'Plan & Organize',
                description: 'Manage event details, tasks, vendors, and timelines in one place.',
                icon: CalendarCheck,
              },
              {
                title: 'Track Your Budget',
                description: 'Keep track of expenses, payments, and budget allocations.',
                icon: Wallet,
              },
              {
                title: 'Manage Vendors',
                description: 'Organize vendor contacts, estimated costs, and booking status.',
                icon: Store,
              },
              {
                title: 'Stay on Schedule',
                description: 'Create and track tasks with deadlines and dependencies.',
                icon: Clock3,
              },
              {
                title: 'Plan with AI',
                description: 'Get AI-assisted suggestions checked against planning constraints.',
                icon: Sparkles,
              },
              {
                title: 'Manage Everything Together',
                description: 'See your event, budget, tasks, vendors, and timeline in one workspace.',
                icon: ListChecks,
              },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="flex items-start gap-4 rounded-2xl border border-[#E3E8E2] bg-white p-5 sm:p-6 shadow-xs transition-all hover:border-[#B8D9CF] hover:shadow-sm"
                >
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-[#E5EFE8] text-[#164B3D] flex items-center justify-center">
                    <Icon size={20} strokeWidth={1.9} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#17252B]">{feature.title}</h3>
                    <p className="text-xs text-[#66717A] mt-1.5 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div id="about" className="scroll-mt-28 max-w-3xl mx-auto text-center mt-14 sm:mt-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#164B3D]">About Aventra</span>
            <p className="text-sm text-[#66717A] mt-3 leading-relaxed">
              Aventra brings event planning tools together with PlanForge, which helps organize budgets, dependencies, and schedules with constraint-aware planning.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 6. FINAL CALL TO ACTION ──────────────────────────────── */}
      <section className="bg-[#FAF9F5] px-6 sm:px-10 lg:px-12 pb-16 sm:pb-20">
        <div className="relative max-w-7xl mx-auto overflow-hidden rounded-[2rem] bg-[#103D32] px-6 py-12 sm:px-12 sm:py-14 lg:px-16">
          <div className="absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -right-2 -top-14 h-52 w-52 rounded-full border border-white/10" />
          <div className="absolute right-20 bottom-[-5rem] h-56 w-56 rounded-full bg-[#52B9A3]/10 blur-2xl" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#BDE5D9]">
              <CheckCircle2 size={13} />
              Your next celebration starts here
            </span>
            <h2 className="font-serif-hero text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-white mt-4">
              Ready to plan your next event?
            </h2>
            <p className="text-sm sm:text-base text-white/75 mt-4 max-w-xl leading-relaxed">
              Bring your ideas to life with smarter planning, organized budgets, and intelligent event management.
            </p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#164B3D] shadow-sm transition-colors hover:bg-[#E5EFE8] cursor-pointer"
            >
              <span>Start Planning</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── 7. FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-gray-200/80 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative w-6 h-6 flex items-center justify-center">
              <div className="absolute left-0 top-0 w-4 h-6 bg-[#164B3D] rounded-full -rotate-12" />
              <div className="absolute right-0 bottom-0 w-3 h-5 bg-[#52B9A3] rounded-full opacity-90" />
            </div>
            <div>
              <span className="font-bold text-[#17252B] text-base">Aventra</span>
              <span className="text-xs text-[#66717A] ml-2">Powered by PlanForge</span>
            </div>
          </div>

          <p className="text-xs text-[#66717A]">
            Every event, intelligently orchestrated. © {new Date().getFullYear()} Aventra.
          </p>
        </div>
      </footer>
    </div>
  );
}
