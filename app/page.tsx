"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

const scholarships = [
  {
    id: 1,
    name: "Tech Excellence Scholarship",
    provider: "Silicon Valley Foundation",
    amount: 15000,
    deadlineText: "15 days left",
    category: "stem",
    categoryLabel: "STEM",
    matchScore: 95,
    applicants: 234,
    description: "For students pursuing degrees in computer science, engineering, or related technical fields."
  },
  {
    id: 2,
    name: "Future Leaders Grant",
    provider: "National Leadership Institute",
    amount: 10000,
    deadlineText: "28 days left",
    category: "business",
    categoryLabel: "Business",
    matchScore: 88,
    applicants: 567,
    description: "Supporting emerging leaders with demonstrated community involvement and leadership potential."
  },
  {
    id: 3,
    name: "Creative Arts Fellowship",
    provider: "Arts & Culture Council",
    amount: 8000,
    deadlineText: "10 days left",
    category: "arts",
    categoryLabel: "Arts",
    matchScore: 82,
    applicants: 189,
    description: "For talented students in visual arts, music, theater, or creative writing programs."
  },
  {
    id: 4,
    name: "Athletic Achievement Award",
    provider: "Sports Foundation USA",
    amount: 12000,
    deadlineText: "30 days left",
    category: "sports",
    categoryLabel: "Athletics",
    matchScore: 91,
    applicants: 412,
    description: "Recognizing student-athletes who excel both in their sport and in the classroom."
  },
  {
    id: 5,
    name: "Community Hero Scholarship",
    provider: "Civic Engagement Foundation",
    amount: 5000,
    deadlineText: "20 days left",
    category: "community",
    categoryLabel: "Community",
    matchScore: 79,
    applicants: 823,
    description: "For students with outstanding records of community service and volunteer work."
  },
  {
    id: 6,
    name: "STEM Innovation Grant",
    provider: "Technology Innovation Corp",
    amount: 20000,
    deadlineText: "45 days left",
    category: "stem",
    categoryLabel: "STEM",
    matchScore: 97,
    applicants: 156,
    description: "Supporting innovative research projects and academic excellence in STEM fields."
  }
];

const filters = [
  { value: "all", label: "All Scholarships" },
  { value: "stem", label: "STEM" },
  { value: "arts", label: "Arts & Humanities" },
  { value: "business", label: "Business" },
  { value: "sports", label: "Athletics" },
  { value: "community", label: "Community Service" }
];

function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function useCounterAnimation(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const counters = entry.target.querySelectorAll("[data-target]");
            counters.forEach((el) => {
              const target = parseInt(el.getAttribute("data-target") || "0");
              if (target === 0) {
                el.textContent = "0";
                return;
              }
              const suffix = target === 89 ? "%" : "+";
              const duration = 2000;
              const startTime = performance.now();

              function update(currentTime: number) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeOut = 1 - Math.pow(1 - progress, 3);
                const current = Math.floor(target * easeOut);
                el.textContent = current.toLocaleString() + suffix;
                if (progress < 1) requestAnimationFrame(update);
              }
              requestAnimationFrame(update);
            });
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.max(1, Math.random() * 2);
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.1;
      }

      reset() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.max(1, Math.random() * 2);
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.1;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > canvas!.width || this.y < 0 || this.y > canvas!.height) {
          this.reset();
        }
      }

      draw() {
        const safeOpacity = Math.max(0, Math.min(1, this.opacity));
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(217, 119, 6, ${safeOpacity})`;
        ctx!.fill();
      }
    }

    resize();
    const count = Math.min(50, Math.floor((canvas.width * canvas.height) / 20000));
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) particles.push(new Particle());

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const opacity = Math.max(0, Math.min(0.1, (1 - dist / 150) * 0.1));
            ctx!.beginPath();
            ctx!.moveTo(p1.x, p1.y);
            ctx!.lineTo(p2.x, p2.y);
            ctx!.strokeStyle = `rgba(217, 119, 6, ${opacity})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        });
      });
      animationId = requestAnimationFrame(animate);
    }

    animate();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

function ScholarshipCard({ s }: { s: (typeof scholarships)[0] }) {
  return (
    <div className="scholarship-card">
      <div className="flex items-start justify-between mb-4">
        <span className="category-tag">{s.categoryLabel}</span>
        <span className="amount-badge">${s.amount.toLocaleString()}</span>
      </div>
      <h3 className="text-lg font-semibold mb-1 font-heading">{s.name}</h3>
      <p className="text-sm text-[var(--muted-2)] mb-3">{s.provider}</p>
      <p className="text-sm text-[var(--muted)] mb-4 line-clamp-2">{s.description}</p>
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="deadline-badge">{s.deadlineText}</span>
        <span className="text-[var(--muted-2)]">{s.applicants} applicants</span>
      </div>
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[var(--muted-2)]">Match Score</span>
          <span className="text-amber-400 font-medium">{s.matchScore}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${s.matchScore}%` }} />
        </div>
      </div>
      <Link href="/auth/sign-up" className="btn-gold w-full text-sm py-2 block text-center">
        Apply Now
      </Link>
    </div>
  );
}

export default function LandingPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useReveal();
  useCounterAnimation(statsRef);

  const filteredScholarships = scholarships.filter((s) => {
    const matchesFilter = activeFilter === "all" || s.category === activeFilter;
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <main className="relative min-h-screen">
      <ParticleCanvas />

      {/* Gradient Orbs */}
      <div className="gradient-orb orb-gold" style={{ top: "-200px", right: "-200px" }} />
      <div className="gradient-orb orb-blue" style={{ bottom: "20%", left: "-150px" }} />

      {/* Navigation */}
      <nav className="nav-glass fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-amber-500 to-orange-600 shadow-md">
                <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold font-heading">ApplyPilot</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#scholarships" className="nav-link text-sm font-medium">Scholarships</a>
              <a href="#how-it-works" className="nav-link text-sm font-medium">How It Works</a>
              <a href="#dashboard" className="nav-link text-sm font-medium">Dashboard</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link href="/auth/sign-in" className="btn-outline text-sm py-2 px-5">Sign In</Link>
              <Link href="/auth/sign-up" className="btn-gold text-sm py-2 px-5">Get Started</Link>
            </div>

            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div
        className={`mobile-menu-panel fixed inset-y-0 right-0 w-64 bg-gray-900 z-50 p-6 md:hidden border-l border-gray-800 ${mobileMenuOpen ? "open" : ""}`}
      >
        <button
          className="absolute top-4 right-4"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex flex-col gap-6 mt-12">
          <a href="#scholarships" className="text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Scholarships</a>
          <a href="#how-it-works" className="text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
          <a href="#dashboard" className="text-gray-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Dashboard</a>
          <hr className="border-gray-800" />
          <Link href="/auth/sign-up" className="btn-gold text-sm text-center">Get Started</Link>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="reveal">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-6">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-amber-400 text-sm font-medium">Your scholarship co-pilot, launching soon</span>
              </div>

              <h1 className="hero-title font-heading mb-6">
                Find Your Path to a <span className="hero-highlight">Brighter Future</span>
              </h1>

              <p className="text-lg text-gray-400 mb-8 max-w-xl">
                Discover personalized scholarship opportunities tailored to your unique profile.
                Our smart matching system connects you with funding that fits your goals.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/auth/sign-up" className="btn-gold">
                  Start Your Journey
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link href="/auth/sign-in" className="btn-outline">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Watch Demo
                </Link>
              </div>

              {/* Stats */}
              <div ref={statsRef} className="grid grid-cols-3 gap-6">
                <div>
                  <div className="stat-number" data-target="0">0</div>
                  <div className="text-gray-500 text-sm">Scholarships Listed</div>
                </div>
                <div>
                  <div className="stat-number" data-target="0">0</div>
                  <div className="text-gray-500 text-sm">Applications Sent</div>
                </div>
                <div>
                  <div className="stat-number" data-target="0">0</div>
                  <div className="text-gray-500 text-sm">Awards Won</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] text-[var(--muted-2)]">Stats update live as the community grows</span>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="reveal relative" style={{ transitionDelay: "0.2s" }}>
              <div className="dashboard-preview">
                <div className="dashboard-header">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-500 ml-2">My Applications</span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Your Progress</span>
                    <span className="text-amber-400 text-sm">4 of 6 complete</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: "66%" }} />
                  </div>

                  <div className="space-y-3 mt-6">
                    {[
                      { name: "Tech Excellence Award", amount: "$5,000", status: "Approved", statusClass: "status-approved", iconBg: "bg-amber-500/20", iconColor: "text-amber-400", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
                      { name: "Future Leaders Program", amount: "$10,000", status: "In Review", statusClass: "status-review", iconBg: "bg-blue-500/20", iconColor: "text-blue-400", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
                      { name: "STEM Innovation Grant", amount: "$7,500", status: "Pending", statusClass: "status-pending", iconBg: "bg-yellow-500/20", iconColor: "text-yellow-400", icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }
                    ].map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${item.iconBg} rounded-lg flex items-center justify-center`}>
                            <svg className={`w-5 h-5 ${item.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.amount}</div>
                          </div>
                        </div>
                        <span className={`${item.statusClass} text-xs px-2 py-1 rounded`}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating Badge */}
              <div className="absolute -top-4 -right-4 bg-linear-to-br from-amber-500 to-amber-600 text-black px-4 py-2 rounded-lg shadow-lg transform rotate-3">
                <div className="text-xs font-medium">NEW MATCH</div>
                <div className="text-lg font-bold font-heading">$15,000</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 scroll-indicator">
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Scholarship Search Section */}
      <section id="scholarships" className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 reveal">
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Discover Your Perfect Match</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Browse through thousands of scholarships tailored to your background, interests, and goals.</p>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto mb-8 reveal">
            <div className="search-box flex items-center gap-4">
              <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                className="bg-transparent border-none outline-none text-[var(--text)] w-full placeholder:text-[var(--muted-2)]"
                placeholder="Search scholarships by name, category, or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn-gold text-sm py-2 px-4 hidden sm:block">Search</button>
            </div>
          </div>

          {/* Filter Tags */}
          <div className="flex flex-wrap justify-center gap-3 mb-10 reveal">
            {filters.map((f) => (
              <button
                key={f.value}
                className={`filter-tag ${activeFilter === f.value ? "active" : ""}`}
                onClick={() => setActiveFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Scholarship Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScholarships.map((s) => (
              <ScholarshipCard key={s.id} s={s} />
            ))}
          </div>

          <div className="text-center mt-10 reveal">
            <Link href="/auth/sign-up" className="btn-outline">Load More Scholarships</Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-20 bg-linear-to-b from-transparent via-amber-950/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Your Journey in 4 Simple Steps</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">We&apos;ve streamlined the scholarship application process so you can focus on what matters most.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: 1, title: "Create Your Profile", desc: "Tell us about yourself, your achievements, and your educational goals.", iconBg: "bg-amber-500/10", iconColor: "text-amber-400", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
              { num: 2, title: "Get Matched", desc: "Our AI analyzes your profile to find the best scholarship opportunities.", iconBg: "bg-blue-500/10", iconColor: "text-blue-400", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
              { num: 3, title: "Apply Easily", desc: "Submit applications with auto-filled forms and guided essay assistance.", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-400", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
              { num: 4, title: "Achieve Success", desc: "Track your applications and celebrate when you win!", iconBg: "bg-purple-500/10", iconColor: "text-purple-400", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" }
            ].map((step, i) => (
              <div key={step.num} className="step-card reveal" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="step-number">{step.num}</div>
                <div className="mt-4">
                  <div className={`w-12 h-12 ${step.iconBg} rounded-xl flex items-center justify-center mb-4`}>
                    <svg className={`w-6 h-6 ${step.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={step.icon} />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold font-heading mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section id="dashboard" className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="reveal">
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-6">Your Personal Command Center</h2>
              <p className="text-gray-400 mb-8">Track all your applications, deadlines, and awards in one intuitive dashboard. Never miss an opportunity again.</p>

              <div className="space-y-4">
                {[
                  { title: "Application Tracking", desc: "Monitor the status of every application in real-time with detailed progress updates.", iconBg: "bg-amber-500/20", iconColor: "text-amber-400", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
                  { title: "Smart Reminders", desc: "Get notified about upcoming deadlines and new matching scholarships automatically.", iconBg: "bg-emerald-500/20", iconColor: "text-emerald-400", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
                  { title: "Analytics & Insights", desc: "Understand your chances and optimize your profile for better matches.", iconBg: "bg-blue-500/20", iconColor: "text-blue-400", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" }
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start gap-4">
                    <div className={`w-10 h-10 ${feature.iconBg} rounded-lg flex items-center justify-center shrink-0`}>
                      <svg className={`w-5 h-5 ${feature.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={feature.icon} />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{feature.title}</h4>
                      <p className="text-gray-400 text-sm">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dashboard Visual */}
            <div className="reveal dashboard-preview" style={{ transitionDelay: "0.2s" }}>
              <div className="dashboard-header">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500 ml-2">Dashboard Overview</span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400 font-heading">12</div>
                    <div className="text-xs text-gray-500">Applied</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-400 font-heading">3</div>
                    <div className="text-xs text-gray-500">Awarded</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400 font-heading">$22.5K</div>
                    <div className="text-xs text-gray-500">Total Won</div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Profile Completion</span>
                    <span className="text-amber-400">85%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: "85%" }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-300">Upcoming Deadlines</div>
                  <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                    <div className="text-sm">Innovation Scholarship</div>
                    <div className="text-xs text-red-400">2 days left</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg">
                    <div className="text-sm">Community Service Award</div>
                    <div className="text-xs text-yellow-400">5 days left</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TODO: Testimonials section — re-enable once we have real success stories
      <section id="testimonials" className="relative py-20 bg-linear-to-b from-transparent via-emerald-950/5 to-transparent">
        ...
      </section>
      */}

      {/* CTA Section */}
      <section className="relative py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="reveal bg-linear-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Start Your Scholarship Journey Today</h2>
              <p className="text-gray-400 mb-8 max-w-2xl mx-auto">Your calm, structured workspace for scholarship applications. Create your free profile in under 5 minutes.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/sign-up" className="btn-gold text-lg px-8 py-3">Create Free Account</Link>
                <a href="#scholarships" className="btn-outline text-lg px-8 py-3">Browse Scholarships</a>
              </div>
              <p className="text-xs text-gray-500 mt-6">No credit card required. Your data is secure and never shared.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-linear-to-br from-amber-500 to-orange-600">
                  <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
                <span className="font-bold font-heading">ApplyPilot</span>
              </div>
              <p className="text-gray-500 text-sm">A calm, structured workspace for scholarship applications. From discovery to submitted.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#scholarships" className="hover:text-amber-400 transition-colors">Browse Scholarships</a></li>
                <li><a href="#how-it-works" className="hover:text-amber-400 transition-colors">How It Works</a></li>
                <li><Link href="/pricing" className="hover:text-amber-400 transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><span className="cursor-default">About Us</span></li>
                <li><span className="cursor-default">Careers</span></li>
                <li><span className="cursor-default">Press</span></li>
                <li><span className="cursor-default">Contact</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><span className="cursor-default">Privacy Policy</span></li>
                <li><span className="cursor-default">Terms of Service</span></li>
                <li><span className="cursor-default">Cookie Policy</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} ApplyPilot. All rights reserved.</p>
            <div className="flex gap-4">
              <span className="text-gray-500" aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </span>
              <span className="text-gray-500" aria-label="LinkedIn">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
              </span>
              <span className="text-gray-500" aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
