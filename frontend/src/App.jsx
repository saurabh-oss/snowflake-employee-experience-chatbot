import { useState, useEffect, useRef } from "react";

// Set REACT_APP_API_URL in frontend/.env.local to point at your running backend.
// If not set, the UI runs in demo mode using canned responses below.
const API_URL = process.env.REACT_APP_API_URL || null;

// ─── Demo conversation data (used when backend is not connected) ───
const DEMO_CONVERSATIONS = [
  {
    id: "leave",
    user: "How many leave days do I have left this year?",
    bot: {
      text: "You have **12 days** of annual leave remaining for FY26. Here's a quick breakdown:\n\n• **Taken:** 8 days\n• **Pre-approved:** 3 days (May 19–21)\n• **Available:** 12 days\n\nYour carry-forward limit is 5 days — I'd recommend planning your remaining leave before September 30.",
      sources: [{ type: "analyst", label: "Cortex Analyst → SQL", detail: "SELECT leave_balance FROM hr.employee_leave WHERE emp_id = 'EMP-4821' AND fiscal_year = 2026" }],
      chips: ["Apply for leave", "Team leave calendar", "Carry-forward policy"]
    }
  },
  {
    id: "policy",
    user: "What's the policy on working from another country?",
    bot: {
      text: "You can work remotely from an **approved country for up to 30 calendar days per year**, subject to:\n\n1. **Manager approval** via the Remote Work Request form\n2. **Tax desk pre-clearance** (mandatory for stays > 14 days)\n3. The country must be on the **approved list** — currently 28 countries\n\nNote: Social security implications apply in EU countries after Day 1. Contact the Global Mobility team before booking travel.",
      sources: [
        { type: "search", label: "Cortex Search → Policy", detail: "Global Mobility Policy v4.2 §3.1 — Remote Work from Abroad (Updated Jan 2026)" },
        { type: "search", label: "Cortex Search → FAQ", detail: "HR Knowledge Base: International Remote Work FAQ #IW-2241" }
      ],
      chips: ["Approved country list", "Remote work form", "Contact Global Mobility"]
    }
  },
  {
    id: "ticket",
    user: "My VPN keeps disconnecting every 10 minutes. Can you raise a ticket?",
    bot: {
      text: "I've created **IT ticket INC-78432** for your VPN issue. Here's what I've submitted:\n\n• **Category:** Network / VPN\n• **Priority:** P3 — Medium\n• **Summary:** Intermittent VPN disconnection every ~10 min\n• **Assigned to:** Network Operations (Tier 2)\n\nYou'll receive a confirmation email shortly. Average resolution for VPN issues is **4.2 hours**. Want me to also check if there's a known outage?",
      sources: [{ type: "action", label: "MCP → ServiceNow", detail: "Created INC-78432 via ServiceNow REST API — assigned to Network Ops queue" }],
      chips: ["Check VPN status page", "Escalate to P2", "Similar past tickets"]
    }
  },
  {
    id: "analytics",
    user: "Show me attrition trends for my team over the last 4 quarters",
    bot: {
      text: "Here's your team's attrition summary (Engineering — Platform):\n\n| Quarter | Headcount | Exits | Rate |\n|---------|-----------|-------|------|\n| Q1 FY26 | 42 | 2 | 4.8% |\n| Q2 FY26 | 44 | 1 | 2.3% |\n| Q3 FY26 | 43 | 3 | 7.0% |\n| Q4 FY26 | 41 | 0 | 0.0% |\n\nYour trailing-12-month rate is **14.1%** vs org average of **11.2%**. The Q3 spike correlates with a market salary correction — 2 of 3 exits cited compensation. Your current quarter looks strong.",
      sources: [{ type: "analyst", label: "Cortex Analyst → SQL", detail: "Aggregated from hr.attrition_fact joined with hr.org_hierarchy WHERE manager_id = 'EMP-4821'" }],
      chips: ["Exit interview themes", "Comp benchmark", "Retention risk scores"]
    }
  }
];

// ─── SVG Icons ───
const Icons = {
  Send: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Snowflake: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="12" y1="2" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/>
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.3"/>
      <circle cx="12" cy="4" r="1" fill="currentColor"/><circle cx="12" cy="20" r="1" fill="currentColor"/>
      <circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="20" cy="12" r="1" fill="currentColor"/>
    </svg>
  ),
  Shield: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <polyline points="9 12 11 14 15 10" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Source: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  Db: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
  Bolt: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="10" y2="18"/></svg>
  ),
  Plus: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  ),
  Chevron: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
  ),
};

// ─── Source badge component ───
function SourceBadge({ source }) {
  const [open, setOpen] = useState(false);
  const colors = {
    analyst: { bg: "rgba(0,180,216,0.12)", border: "rgba(0,180,216,0.3)", text: "#00B4D8", icon: <Icons.Db /> },
    search:  { bg: "rgba(6,167,125,0.12)", border: "rgba(6,167,125,0.3)", text: "#06A77D", icon: <Icons.Source /> },
    action:  { bg: "rgba(255,183,3,0.12)", border: "rgba(255,183,3,0.3)", text: "#FFB703", icon: <Icons.Bolt /> },
  };
  const c = colors[source.type] || colors.search;

  return (
    <div style={{ marginTop: 6 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: c.bg, border: `1px solid ${c.border}`,
          borderRadius: 8, padding: "5px 10px",
          color: c.text, fontSize: 11, fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          cursor: "pointer", transition: "all 0.2s",
          width: "100%", textAlign: "left"
        }}
      >
        {c.icon}
        <span style={{ flex: 1 }}>{source.label}</span>
        <span style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", display: "flex" }}>
          <Icons.Chevron />
        </span>
      </button>
      {open && (
        <div style={{
          marginTop: 4, padding: "8px 10px",
          background: "rgba(0,0,0,0.2)", borderRadius: 6,
          fontSize: 10, color: "rgba(255,255,255,0.65)",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineHeight: 1.6, wordBreak: "break-all",
          animation: "fadeSlideIn 0.2s ease"
        }}>
          {source.detail}
        </div>
      )}
    </div>
  );
}

// ─── Parse markdown-lite ───
function renderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let tableRows = [];
  let inTable = false;

  const processInline = (str, ki = 0) => {
    const parts = [];
    let remaining = str;
    let idx = 0;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      if (boldMatch) {
        const before = remaining.substring(0, boldMatch.index);
        if (before) parts.push(<span key={`t${ki}-${idx++}`}>{before}</span>);
        parts.push(<strong key={`b${ki}-${idx++}`} style={{ color: "#fff", fontWeight: 600 }}>{boldMatch[1]}</strong>);
        remaining = remaining.substring(boldMatch.index + boldMatch[0].length);
      } else {
        parts.push(<span key={`r${ki}-${idx++}`}>{remaining}</span>);
        remaining = "";
      }
    }
    return parts;
  };

  const flushTable = () => {
    if (tableRows.length < 2) return null;
    const headers = tableRows[0];
    const data = tableRows.slice(2);
    return (
      <div key={`tbl-${elements.length}`} style={{
        margin: "10px 0", borderRadius: 8, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)", fontSize: 11
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(0,180,216,0.1)" }}>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, color: "#00B4D8", fontSize: 10 }}>{h.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr key={ri} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: "6px 10px", color: "rgba(255,255,255,0.85)" }}>{processInline(cell.trim(), `${ri}-${ci}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("|")) {
      if (!inTable) { inTable = true; tableRows = []; }
      const cells = line.split("|").filter((_, idx) => idx > 0 && idx < line.split("|").length - 1);
      if (!line.match(/^\|[\s-|]+\|$/)) tableRows.push(cells);
      else tableRows.push("SEP");
      continue;
    }
    if (inTable) {
      const tbl = flushTable();
      if (tbl) elements.push(tbl);
      inTable = false; tableRows = [];
    }
    if (line.trim() === "") { elements.push(<div key={`sp-${i}`} style={{ height: 6 }} />); continue; }
    if (line.startsWith("• ") || line.startsWith("- ")) {
      const content = line.replace(/^[•\-]\s*/, "");
      elements.push(
        <div key={`li-${i}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "2px 0 2px 4px" }}>
          <span style={{ color: "#00B4D8", fontSize: 7, marginTop: 5 }}>●</span>
          <span style={{ flex: 1 }}>{processInline(content, i)}</span>
        </div>
      );
      continue;
    }
    if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\.\s/)[1];
      const content = line.replace(/^\d+\.\s/, "");
      elements.push(
        <div key={`ol-${i}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "2px 0" }}>
          <span style={{
            background: "rgba(0,180,216,0.15)", color: "#00B4D8",
            borderRadius: "50%", width: 20, height: 20, minWidth: 20,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700
          }}>{num}</span>
          <span style={{ flex: 1 }}>{processInline(content, i)}</span>
        </div>
      );
      continue;
    }
    elements.push(<div key={`p-${i}`} style={{ padding: "1px 0" }}>{processInline(line, i)}</div>);
  }
  if (inTable) { const tbl = flushTable(); if (tbl) elements.push(tbl); }
  return elements;
}

// ─── Message Bubble ───
function MessageBubble({ msg }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (msg.role === "user") {
    return (
      <div style={{
        display: "flex", justifyContent: "flex-end", padding: "4px 16px",
        opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "all 0.35s cubic-bezier(0.22,1,0.36,1)"
      }}>
        <div style={{
          maxWidth: "82%", padding: "12px 16px",
          background: "linear-gradient(135deg, #00B4D8 0%, #0096B7 100%)",
          borderRadius: "18px 18px 4px 18px",
          color: "#fff", fontSize: 14, lineHeight: 1.55,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
          boxShadow: "0 4px 20px rgba(0,180,216,0.25)"
        }}>
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", gap: 10, padding: "4px 16px", alignItems: "flex-start",
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)"
    }}>
      <div style={{
        width: 32, height: 32, minWidth: 32, borderRadius: 10,
        background: "linear-gradient(135deg, rgba(0,180,216,0.15) 0%, rgba(6,167,125,0.1) 100%)",
        border: "1px solid rgba(0,180,216,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#00B4D8", marginTop: 2
      }}>
        <Icons.Snowflake />
      </div>
      <div style={{
        flex: 1, maxWidth: "calc(100% - 50px)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "4px 18px 18px 18px",
        padding: "14px 16px",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      }}>
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13.5, lineHeight: 1.65, fontFamily: "'DM Sans', sans-serif" }}>
          {renderMarkdown(msg.text)}
        </div>

        {msg.sources && msg.sources.length > 0 && (
          <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 4, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
              Sources & provenance
            </div>
            {msg.sources.map((src, si) => <SourceBadge key={si} source={src} />)}
          </div>
        )}

        {msg.chips && msg.chips.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {msg.chips.map((chip, ci) => (
              <button key={ci} style={{
                padding: "6px 12px", borderRadius: 20,
                border: "1px solid rgba(0,180,216,0.25)",
                background: "rgba(0,180,216,0.06)",
                color: "#00B4D8", fontSize: 11, fontWeight: 500,
                cursor: "pointer", transition: "all 0.2s",
                fontFamily: "'DM Sans', sans-serif"
              }}
                onMouseOver={e => { e.target.style.background = "rgba(0,180,216,0.15)"; e.target.style.borderColor = "rgba(0,180,216,0.5)"; }}
                onMouseOut={e => { e.target.style.background = "rgba(0,180,216,0.06)"; e.target.style.borderColor = "rgba(0,180,216,0.25)"; }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Typing Indicator ───
function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 10, padding: "4px 16px", alignItems: "flex-start" }}>
      <div style={{
        width: 32, height: 32, minWidth: 32, borderRadius: 10,
        background: "linear-gradient(135deg, rgba(0,180,216,0.15), rgba(6,167,125,0.1))",
        border: "1px solid rgba(0,180,216,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#00B4D8"
      }}>
        <Icons.Snowflake />
      </div>
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "4px 18px 18px 18px", padding: "16px 20px", display: "flex", gap: 5
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: "50%", background: "#00B4D8",
            animation: `typingBounce 1.2s ease-in-out ${i * 0.15}s infinite`
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar ───
function Sidebar({ open, onClose, onSelectConvo, onTopicSelect }) {
  const quickTopics = [
    { emoji: "🏖", label: "Leave & Time Off",    question: "How many leave days do I have remaining this year?" },
    { emoji: "📋", label: "Company Policies",    question: "What's the policy on working from another country?" },
    { emoji: "🔧", label: "IT Support",          question: "I need to raise an IT support ticket." },
    { emoji: "📊", label: "Team Analytics",      question: "Show me attrition trends for my team over the last 4 quarters." },
    { emoji: "💰", label: "Payroll & Benefits",  question: "What are my current benefits and payroll details?" },
    { emoji: "🎓", label: "Learning & Dev",      question: "What learning and development programs are available to me?" },
  ];

  return (
    <>
      {open && (
        <div
          className="ex-overlay"
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)", zIndex: 998, animation: "fadeIn 0.2s ease"
          }}
        />
      )}
      <div
        className="ex-sidebar"
        style={{
          position: "fixed", top: 0, left: open ? 0 : -300, width: 280, height: "100%",
          background: "linear-gradient(180deg, #0a0e1a 0%, #0d1525 100%)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
          zIndex: 999, transition: "left 0.3s cubic-bezier(0.22,1,0.36,1)",
          display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif"
        }}
      >
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #00B4D8, #06A77D)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff"
            }}>
              <Icons.Snowflake />
            </div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>Ask EX</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Snowflake Intelligence</div>
            </div>
          </div>
          <button onClick={() => { onSelectConvo(null); onClose(); }} style={{
            width: "100%", padding: "10px 14px",
            background: "rgba(0,180,216,0.1)", border: "1px solid rgba(0,180,216,0.2)",
            borderRadius: 10, color: "#00B4D8", fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "inherit"
          }}>
            <Icons.Plus /> New conversation
          </button>
        </div>

        <div style={{ padding: "16px 20px", flex: 1, overflowY: "auto" }}>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>Quick topics</div>
          {quickTopics.map((t, i) => (
            <button key={i}
              onClick={() => { onTopicSelect(t.question); onClose(); }}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 12px", background: "transparent", border: "none",
                borderRadius: 8, color: "rgba(255,255,255,0.8)", fontSize: 13,
                cursor: "pointer", transition: "all 0.15s", marginBottom: 2,
                fontFamily: "inherit", textAlign: "left"
              }}
              onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              onMouseOut={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 18 }}>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #1a3a5c, #0d2137)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#00B4D8", fontSize: 14, fontWeight: 700
          }}>JR</div>
          <div>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>Jordan Rivera</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Engineering · Platform</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main App ───
export default function EXChatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [demoIdx, setDemoIdx] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [connected, setConnected] = useState(!!API_URL);
  const scrollRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, typing]);

  // Check backend health on mount when API_URL is configured
  useEffect(() => {
    if (!API_URL) return;
    fetch(`${API_URL}/health`)
      .then(r => r.json())
      .then(d => setConnected(d.snowflake_connected))
      .catch(() => setConnected(false));
  }, []);

  const simulateDemoResponse = (demoConvo) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, {
        role: "bot", text: demoConvo.bot.text,
        sources: demoConvo.bot.sources, chips: demoConvo.bot.chips
      }]);
    }, 1500 + Math.random() * 800);
  };

  const callBackend = async (text) => {
    setTyping(true);
    // Send last 6 messages (3 exchanges) as history so the LLM has conversation context
    const history = messages.slice(-6).map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text
    }));
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, emp_id: "EMP-4821", history })
      });
      const data = await res.json();
      const sources = (data.tools_called || []).map(t => ({
        type: t.tool === "cortex_analyst" ? "analyst" : t.tool === "cortex_search" ? "search" : "action",
        label: t.tool === "cortex_analyst" ? `Cortex Analyst → SQL` : t.tool === "cortex_search" ? `Cortex Search (${t.results_count} results)` : t.tool,
        detail: t.sql || `${t.results_count ?? ""} results retrieved`
      }));
      setMessages(prev => [...prev, { role: "bot", text: data.response, sources, chips: [] }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "bot", text: "⚠️ Could not reach the backend. Is it running?", sources: [], chips: [] }]);
    } finally {
      setTyping(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    if (API_URL) {
      callBackend(text);
    } else {
      const demo = DEMO_CONVERSATIONS[demoIdx % DEMO_CONVERSATIONS.length];
      setDemoIdx(prev => prev + 1);
      simulateDemoResponse(demo);
    }
  };

  const handleDemoQuestion = (demo) => {
    setMessages(prev => [...prev, { role: "user", text: demo.user }]);
    if (API_URL) {
      callBackend(demo.user);
    } else {
      simulateDemoResponse(demo);
    }
  };

  // ─── Splash Screen ───
  if (showSplash) {
    return (
      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #050a18 0%, #0a1628 40%, #0d1f35 100%)",
        fontFamily: "'DM Sans', sans-serif", animation: "fadeIn 0.5s ease"
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
          @keyframes typingBounce { 0%,60%,100% { transform: translateY(0); opacity: 0.3 } 30% { transform: translateY(-6px); opacity: 1 } }
          @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 20px rgba(0,180,216,0.2), 0 0 60px rgba(0,180,216,0.05) } 50% { box-shadow: 0 0 30px rgba(0,180,216,0.35), 0 0 80px rgba(0,180,216,0.1) } }
          @keyframes spinSlow { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        `}</style>
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: "linear-gradient(135deg, #00B4D8, #06A77D)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", animation: "pulseGlow 2s ease-in-out infinite", marginBottom: 24
        }}>
          <div style={{ animation: "spinSlow 8s linear infinite" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="12" y1="2" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              <line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/>
              <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.4"/>
              <circle cx="12" cy="4" r="1.2" fill="currentColor"/><circle cx="12" cy="20" r="1.2" fill="currentColor"/>
              <circle cx="4" cy="12" r="1.2" fill="currentColor"/><circle cx="20" cy="12" r="1.2" fill="currentColor"/>
            </svg>
          </div>
        </div>
        <div style={{ color: "#fff", fontSize: 26, fontWeight: 700, letterSpacing: -0.5, animation: "slideUp 0.6s ease 0.2s both" }}>Ask EX</div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 6, animation: "slideUp 0.6s ease 0.4s both" }}>
          Powered by Snowflake Intelligence
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, marginTop: 24,
          color: "rgba(0,180,216,0.7)", fontSize: 11, fontWeight: 500,
          animation: "slideUp 0.6s ease 0.6s both"
        }}>
          <Icons.Shield /> Governed perimeter · End-to-end encrypted
        </div>
      </div>
    );
  }

  // ─── Main Chat UI ───
  return (
    <div
      className="ex-root"
      style={{
        height: "100vh", display: "flex", flexDirection: "column",
        background: "linear-gradient(160deg, #050a18 0%, #0a1628 40%, #0d1f35 100%)",
        fontFamily: "'DM Sans', sans-serif",
        position: "relative", overflow: "hidden"
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes typingBounce { 0%,60%,100% { transform: translateY(0); opacity: 0.3 } 30% { transform: translateY(-6px); opacity: 1 } }
        @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 20px rgba(0,180,216,0.2) } 50% { box-shadow: 0 0 30px rgba(0,180,216,0.35) } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.4); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }

        /* ── Desktop layout (≥900px): sidebar always visible, side-by-side ── */
        @media (min-width: 900px) {
          .ex-root {
            flex-direction: row !important;
            overflow: visible !important;
          }
          .ex-sidebar {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            height: 100vh !important;
            z-index: 1 !important;
            flex-shrink: 0;
            transition: none !important;
          }
          .ex-overlay {
            display: none !important;
          }
          .ex-menu-btn {
            display: none !important;
          }
          .ex-chat-panel {
            flex: 1;
            min-width: 0;
          }
        }
      `}</style>

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectConvo={() => setMessages([])}
        onTopicSelect={q => setInput(q)}
      />

      {/* Chat panel — flex column, fills remaining width on desktop */}
      <div className="ex-chat-panel" style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(5,10,24,0.85)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", zIndex: 10,
          flexShrink: 0
        }}>
          <button
            className="ex-menu-btn"
            onClick={() => setSidebarOpen(true)}
            style={{
              background: "none", border: "none", color: "rgba(255,255,255,0.65)", cursor: "pointer", padding: 4, display: "flex"
            }}
          >
            <Icons.Menu />
          </button>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, rgba(0,180,216,0.2), rgba(6,167,125,0.15))",
            border: "1px solid rgba(0,180,216,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#00B4D8"
          }}>
            <Icons.Snowflake />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>Ask EX</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: connected ? "#06A77D" : "#FFB703",
                boxShadow: connected ? "0 0 8px rgba(6,167,125,0.5)" : "0 0 8px rgba(255,183,3,0.5)"
              }} />
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                {connected ? "Connected · Snowflake Intelligence" : "Demo mode · Connect backend to go live"}
              </span>
            </div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20,
            background: "rgba(6,167,125,0.08)", border: "1px solid rgba(6,167,125,0.15)",
            color: "#06A77D", fontSize: 10, fontWeight: 600
          }}>
            <Icons.Shield /> Governed
          </div>
        </div>

        {/* Messages area */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingTop: 16, paddingBottom: 8 }}>
          {messages.length === 0 && (
            <div style={{ padding: "40px 24px", animation: "fadeIn 0.5s ease", maxWidth: 720, margin: "0 auto", width: "100%" }}>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
                  background: "linear-gradient(135deg, rgba(0,180,216,0.1), rgba(6,167,125,0.08))",
                  border: "1px solid rgba(0,180,216,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#00B4D8"
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="12" y1="2" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    <line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/>
                    <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.3"/>
                  </svg>
                </div>
                <div style={{ color: "#fff", fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>How can I help today?</div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
                  {API_URL
                    ? "I'm connected to your Snowflake account. Ask me anything about HR, IT, or your team."
                    : "Running in demo mode. Set REACT_APP_API_URL to connect to the live backend."}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
                {DEMO_CONVERSATIONS.map((demo, i) => (
                  <button key={i} onClick={() => handleDemoQuestion(demo)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14, cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                    fontFamily: "inherit", animation: `slideUp 0.4s ease ${0.1 + i * 0.08}s both`
                  }}
                    onMouseOver={e => { e.currentTarget.style.background = "rgba(0,180,216,0.06)"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.15)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  >
                    <div style={{
                      width: 36, height: 36, minWidth: 36, borderRadius: 10,
                      background: ["rgba(0,180,216,0.1)", "rgba(6,167,125,0.1)", "rgba(255,183,3,0.1)", "rgba(144,224,239,0.1)"][i],
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
                    }}>
                      {["🏖", "🌍", "🔧", "📊"][i]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 500 }}>{demo.user}</div>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 }}>
                        {["Cortex Analyst", "Cortex Search", "MCP → ServiceNow", "Cortex Analyst"][i]}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div style={{
                marginTop: 24, padding: "14px 16px",
                background: "rgba(255,183,3,0.04)", border: "1px solid rgba(255,183,3,0.12)", borderRadius: 14
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Icons.Shield />
                  <span style={{ color: "#FFB703", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Security posture</span>
                </div>
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11.5, lineHeight: 1.6 }}>
                  All inference runs inside Snowflake's governed perimeter. Your data never leaves the account — RBAC, column masking, and row-access policies enforced on every query.
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {typing && <TypingIndicator />}
          <div style={{ height: 8 }} />
        </div>

        {/* Input area */}
        <div style={{
          padding: "12px 16px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(5,10,24,0.9)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          flexShrink: 0
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, padding: "4px 6px 4px 16px", transition: "border-color 0.2s",
            maxWidth: 800, margin: "0 auto"
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Ask anything about work..."
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "#fff", fontSize: 14, fontFamily: "'DM Sans', sans-serif", padding: "10px 0"
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 12,
                background: input.trim() ? "linear-gradient(135deg, #00B4D8, #0096B7)" : "rgba(255,255,255,0.05)",
                border: "none", color: input.trim() ? "#fff" : "rgba(255,255,255,0.3)",
                cursor: input.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
                boxShadow: input.trim() ? "0 4px 16px rgba(0,180,216,0.3)" : "none"
              }}
            >
              <Icons.Send />
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 8, color: "rgba(255,255,255,0.4)", fontSize: 10 }}>
            Snowflake Intelligence · Cortex AI · RBAC Governed
          </div>
        </div>

      </div>{/* end ex-chat-panel */}
    </div>
  );
}
