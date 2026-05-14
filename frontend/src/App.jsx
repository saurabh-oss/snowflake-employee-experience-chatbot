import { useState, useEffect, useRef } from "react";

// Set REACT_APP_API_URL in frontend/.env.local to point at your running backend.
// If not set, the UI runs in demo mode using canned responses below.
const API_URL = process.env.REACT_APP_API_URL || null;

// ─── Demo conversation data (used when backend is not connected) ───
const DEMO_CONVERSATIONS = [
  {
    id: "leave",
    user: "How many leave days do I have remaining this year?",
    bot: {
      text: "Here's your leave balance for **FY2026**:\n\n| Leave Type | Entitled | Taken | Pre-Approved | **Balance** |\n|------------|----------|-------|--------------|-------------|\n| Annual Leave | 20 | 8 | 3 | **9 days** |\n| Sick Leave | 10 | 2 | 0 | **8 days** |\n| Bereavement Leave | 3 | 0 | 0 | **3 days** |\n\nYou have **9 annual leave days** available. Note: your carry-forward of 5 days was included in your entitlement. The carry-forward deadline is December 31, 2026.",
      sources: [{ type: "analyst", label: "Cortex Analyst → EMPLOYEE_LEAVE", detail: "SELECT LEAVE_TYPE, TOTAL_ENTITLED, TAKEN, PRE_APPROVED, BALANCE FROM HR_DATA.EMPLOYEE_LEAVE WHERE EMP_ID = 'EMP-4821' AND FISCAL_YEAR = 2026" }],
      chips: ["Apply for leave", "Parental leave policy", "Carry-forward rules"]
    }
  },
  {
    id: "review",
    user: "What is the status of my performance review for H1 FY26?",
    bot: {
      text: "Your **H1 FY26 Mid-Year Review** is currently in **Manager Review** stage.\n\n• **Review cycle:** H1 FY26 (Mid-Year)\n• **Status:** Manager Review — your self-assessment has been submitted\n• **Self-rating submitted:** 4.0 / 5.0\n• **Due date:** June 30, 2026\n• **Reviewer:** Alex Chen\n\nYour last **Annual FY25** review is complete — final rating was **4.5 (Exceeds Expectations)**, with 4 of 5 goals met. Great work!",
      sources: [{ type: "analyst", label: "Cortex Analyst → PERFORMANCE_REVIEWS", detail: "SELECT REVIEW_CYCLE, STATUS, SELF_RATING, FINAL_RATING, RATING_LABEL, DUE_DATE FROM HR_DATA.PERFORMANCE_REVIEWS WHERE EMP_ID = 'EMP-4821' ORDER BY DUE_DATE DESC" }],
      chips: ["View review guidelines", "Performance policy", "Set H2 goals"]
    }
  },
  {
    id: "ticket",
    user: "My VPN keeps disconnecting every 10 minutes. Please raise a ticket.",
    bot: {
      text: "Done — I've created an IT ticket for your VPN issue:\n\n• **Ticket ID:** INC-91847\n• **Category:** Network / VPN\n• **Priority:** P3 — Medium\n• **Summary:** VPN disconnecting intermittently every ~10 minutes\n• **Assigned to:** Network Operations\n• **Status:** Open\n\nYou'll receive a confirmation shortly. For urgent issues, escalate to P2 by replying to the ticket email or asking me to update the priority.",
      sources: [
        { type: "action", label: "Action → IT_TICKETS (INSERT)", detail: "INSERT INTO HR_DATA.IT_TICKETS (TICKET_ID, EMP_ID, CATEGORY, SUBCATEGORY, PRIORITY, SUMMARY, STATUS, ASSIGNED_GROUP) VALUES ('INC-91847', 'EMP-4821', 'Network', 'VPN', 'P3', ...)" },
        { type: "search", label: "Cortex Search → IT Acceptable Use Policy v3.0", detail: "§4.2 VPN and Remote Access — all remote connections must use the corporate VPN client" }
      ],
      chips: ["Escalate to P2", "Check ticket status", "VPN troubleshooting guide"]
    }
  },
  {
    id: "budget",
    user: "How much of my L&D budget have I used this year?",
    bot: {
      text: "Here's your **Learning & Development budget** for FY2026:\n\n| | Amount |\n|---|---|\n| **Annual Budget** | $3,000 |\n| **Used** | $974 |\n| **Committed** | $1,799 (AWS re:Invent — Dec) |\n| **Remaining** | **$227** |\n\nYou've completed **SnowPro Core Certification** ($375) and **Crucial Conversations Workshop** ($599). Your upcoming AWS re:Invent is approved.\n\n⚠️ You have only **$227 left** this year — plan accordingly before booking anything new.",
      sources: [
        { type: "analyst", label: "Cortex Analyst → LEARNING_BUDGET", detail: "SELECT ANNUAL_BUDGET, USED, COMMITTED, REMAINING FROM HR_DATA.LEARNING_BUDGET WHERE EMP_ID = 'EMP-4821' AND FISCAL_YEAR = 2026" },
        { type: "analyst", label: "Cortex Analyst → LEARNING_DEVELOPMENT", detail: "SELECT COURSE_NAME, STATUS, COST FROM HR_DATA.LEARNING_DEVELOPMENT WHERE EMP_ID = 'EMP-4821' AND FISCAL_YEAR = 2026" }
      ],
      chips: ["L&D policy", "Submit expense for course", "Browse LinkedIn Learning"]
    }
  }
];

// ─── Travel Agent Config ───
const TRAVEL_AGENTS_CONFIG = [
  { id: "calendar", emoji: "📅", label: "Calendar",  workMsg: "Checking schedule conflicts...",      delay: 1800 },
  { id: "budget",   emoji: "💰", label: "Budget",    workMsg: "Validating travel budget policy...",  delay: 2800 },
  { id: "flight",   emoji: "✈️", label: "Flight",   workMsg: "Searching SFO → JFK · May 14...",     delay: 3500 },
  { id: "hotel",    emoji: "🏨", label: "Hotel",     workMsg: "Finding hotels in Midtown NYC...",    delay: 4500 },
  { id: "approval", emoji: "✅", label: "Approval",  workMsg: "Routing request to manager...",       delay: 5500 },
];
const TRAVEL_AGENT_RESULTS = {
  calendar: { status: "done",    msg: "No conflicts · Blocked May 14–17 on calendar" },
  budget:   { status: "done",    msg: "Budget OK · $847 travel YTD of $2,500 limit" },
  flight:   { status: "done",    msg: "Delta DL 412 · SFO→JFK · $342 · Confirmed" },
  hotel:    { status: "done",    msg: "Marriott Times Sq · $189/nt · 3 nights · $567" },
  approval: { status: "pending", msg: "Sent to Alex Chen · Est. response ~2 hrs" },
};

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
  Sparkle: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
  ),
};

// ─── Source badge component ───
function SourceBadge({ source }) {
  const [open, setOpen] = useState(false);
  const colors = {
    analyst: { bg: "rgba(0,180,216,0.12)", border: "rgba(0,180,216,0.3)", text: "#00B4D8", icon: <Icons.Db /> },
    search:  { bg: "rgba(6,167,125,0.12)", border: "rgba(6,167,125,0.3)", text: "#06A77D", icon: <Icons.Source /> },
    action:  { bg: "rgba(255,183,3,0.12)", border: "rgba(255,183,3,0.3)", text: "#FFB703", icon: <Icons.Bolt /> },
    agent:   { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)", text: "#8B5CF6", icon: <Icons.Sparkle /> },
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

// ─── Agent Card ───
function AgentCard({ config, state }) {
  const { status, message } = state;
  const palette = {
    idle:    { accent: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.07)" },
    working: { accent: "#00B4D8",               bg: "rgba(0,180,216,0.05)",   border: "rgba(0,180,216,0.2)"   },
    done:    { accent: "#06A77D",               bg: "rgba(6,167,125,0.05)",   border: "rgba(6,167,125,0.2)"   },
    pending: { accent: "#FFB703",               bg: "rgba(255,183,3,0.05)",   border: "rgba(255,183,3,0.2)"   },
  }[status];
  return (
    <div style={{
      padding: "10px 13px", borderRadius: 10,
      background: palette.bg, border: `1px solid ${palette.border}`,
      transition: "all 0.5s cubic-bezier(0.22,1,0.36,1)",
      display: "flex", alignItems: "center", gap: 11
    }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{config.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: 600 }}>{config.label} Agent</div>
        <div style={{ color: palette.accent, fontSize: 10.5, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {message}
        </div>
      </div>
      <div style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {status === "working" && (
          <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(0,180,216,0.25)", borderTopColor: "#00B4D8", animation: "agentSpin 0.75s linear infinite" }} />
        )}
        {status === "done" && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06A77D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        )}
        {status === "pending" && (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFB703" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        )}
      </div>
    </div>
  );
}

// ─── Travel Agent Panel ───
function TravelAgentPanel({ request }) {
  const init = Object.fromEntries(TRAVEL_AGENTS_CONFIG.map(a => [a.id, { status: "idle", message: "Ready" }]));
  const [states, setStates] = useState(init);
  const [complete, setComplete] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => { const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t); }, []);

  useEffect(() => {
    const timers = [];
    TRAVEL_AGENTS_CONFIG.forEach((agent, i) => {
      timers.push(setTimeout(() =>
        setStates(p => ({ ...p, [agent.id]: { status: "working", message: agent.workMsg } })),
        150 + i * 110
      ));
      timers.push(setTimeout(() => {
        const r = TRAVEL_AGENT_RESULTS[agent.id];
        setStates(p => ({ ...p, [agent.id]: { status: r.status, message: r.msg } }));
      }, agent.delay));
    });
    timers.push(setTimeout(() => setComplete(true), 6400));
    return () => timers.forEach(clearTimeout);
  }, []);

  const allResolved = Object.values(states).every(s => s.status === "done" || s.status === "pending");

  return (
    <div style={{
      display: "flex", gap: 10, padding: "4px 16px", alignItems: "flex-start",
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
      transition: "all 0.4s cubic-bezier(0.22,1,0.36,1)"
    }}>
      <div style={{
        width: 32, height: 32, minWidth: 32, borderRadius: 10,
        background: "linear-gradient(135deg, rgba(0,180,216,0.15), rgba(6,167,125,0.1))",
        border: "1px solid rgba(0,180,216,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginTop: 2
      }}>🌍</div>
      <div style={{
        flex: 1, maxWidth: "calc(100% - 50px)", overflow: "hidden",
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "4px 18px 18px 18px",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 16px",
          background: "linear-gradient(135deg, rgba(0,180,216,0.08), rgba(6,167,125,0.05))",
          borderBottom: "1px solid rgba(255,255,255,0.06)"
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Travel Automation — {request.destination}</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 }}>
                {request.startLabel} → {request.endLabel} · {request.purpose}
              </div>
            </div>
            <span style={{
              fontSize: 10, padding: "3px 9px", borderRadius: 20, fontWeight: 700, letterSpacing: 0.5, flexShrink: 0,
              background: allResolved ? "rgba(6,167,125,0.12)" : "rgba(0,180,216,0.12)",
              border: `1px solid ${allResolved ? "rgba(6,167,125,0.25)" : "rgba(0,180,216,0.25)"}`,
              color: allResolved ? "#06A77D" : "#00B4D8",
            }}>{allResolved ? "PROCESSED" : "PROCESSING"}</span>
          </div>
          <div style={{
            marginTop: 10, padding: "6px 10px", borderRadius: 8,
            background: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.4)",
            fontSize: 10, fontFamily: "'JetBrains Mono', monospace"
          }}>5 agents · asyncio.gather() · parallel execution · Snowflake Cortex</div>
        </div>

        {/* Agent cards */}
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
          {TRAVEL_AGENTS_CONFIG.map(agent => <AgentCard key={agent.id} config={agent} state={states[agent.id]} />)}
        </div>

        {/* Summary */}
        {complete && (
          <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", animation: "fadeSlideIn 0.5s ease" }}>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
              Booking Summary
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
              {[
                { label: "Flight", value: "$342", icon: "✈️" },
                { label: "Hotel (3 nts)", value: "$567", icon: "🏨" },
                { label: "Total", value: "$909", icon: "💳", highlight: true },
              ].map((item, i) => (
                <div key={i} style={{
                  flex: 1, minWidth: 90, padding: "9px 11px", borderRadius: 10,
                  background: item.highlight ? "rgba(0,180,216,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${item.highlight ? "rgba(0,180,216,0.2)" : "rgba(255,255,255,0.07)"}`,
                }}>
                  <div style={{ fontSize: 13, marginBottom: 3 }}>{item.icon}</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>{item.label}</div>
                  <div style={{ color: item.highlight ? "#00B4D8" : "#fff", fontSize: 15, fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div style={{
              padding: "8px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,183,3,0.05)", border: "1px solid rgba(255,183,3,0.12)",
              color: "rgba(255,183,3,0.85)", fontSize: 11
            }}>
              <span>⏳</span>
              <span>Awaiting approval from <strong style={{ color: "#FFB703" }}>Alex Chen</strong> — you'll be notified within 2 hrs.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar ───
function Sidebar({ open, onClose, onSelectConvo, onTopicSelect, onTravelDemo }) {
  const quickTopics = [
    { emoji: "🏖", label: "Leave Balance",       question: "How many leave days do I have remaining this year?" },
    { emoji: "📝", label: "Performance Review",  question: "What is the status of my performance review for H1 FY26?" },
    { emoji: "🔧", label: "Raise IT Ticket",     question: "My VPN keeps disconnecting every 10 minutes. Please raise a ticket." },
    { emoji: "📊", label: "Team Attrition",      question: "Show me attrition trends for my team over the last 4 quarters." },
    { emoji: "🎓", label: "L&D Budget",          question: "How much of my learning and development budget have I used this year?" },
    { emoji: "💼", label: "My Benefits",         question: "What benefits am I currently enrolled in?" },
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

        <div style={{ padding: "0 20px 14px" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Demo</div>
          <button
            onClick={() => { onTravelDemo(); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "11px 12px", borderRadius: 10, cursor: "pointer",
              background: "linear-gradient(135deg, rgba(0,180,216,0.08), rgba(6,167,125,0.06))",
              border: "1px solid rgba(0,180,216,0.2)",
              fontFamily: "inherit", transition: "all 0.2s"
            }}
            onMouseOver={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,180,216,0.14), rgba(6,167,125,0.1))"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.35)"; }}
            onMouseOut={e => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(0,180,216,0.08), rgba(6,167,125,0.06))"; e.currentTarget.style.borderColor = "rgba(0,180,216,0.2)"; }}
          >
            <span style={{ fontSize: 20 }}>🌍</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ color: "#00B4D8", fontSize: 12, fontWeight: 700 }}>Multi-Agent Travel Demo</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 1 }}>5 agents · parallel · asyncio.gather()</div>
            </div>
          </button>
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

  const handleTravelDemo = () => {
    setMessages(prev => [
      ...prev,
      { role: "user", text: "Book travel to New York, May 14–17, for the Q2 Engineering Summit." },
      { type: "travel", request: { destination: "New York, NY", purpose: "Q2 Engineering Summit", startLabel: "May 14, 2026", endLabel: "May 17, 2026" } }
    ]);
  };

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

      let sources = [];
      if (data.via_cortex_agents) {
        // Response came from the Cortex Agents API — one top-level agent badge
        // plus one badge per tool the agent chose to invoke.
        const toolNames = (data.tools_called || []).map(t => {
          if (t.tool === "hr_data_analyst") return "Cortex Analyst";
          if (t.tool === "policy_search")   return "Cortex Search";
          return t.tool;
        });
        sources.push({
          type: "agent",
          label: `Cortex AI Agent · ${toolNames.join(" + ") || "Snowflake Intelligence"}`,
          detail: `Native agent orchestration via /api/v2/cortex/agent:run · Tools selected autonomously: ${toolNames.join(", ") || "none"}`,
        });
        // Per-tool provenance badges
        (data.tools_called || []).forEach(t => {
          if (t.tool === "hr_data_analyst") {
            sources.push({ type: "analyst", label: "Cortex Analyst → SQL", detail: t.sql || "Query executed" });
          } else if (t.tool === "policy_search") {
            sources.push({ type: "search", label: `Cortex Search · ${t.results_count ?? "?"} results`, detail: `${t.results_count ?? ""} policy document results` });
          }
        });
      } else {
        // Manual orchestration fallback — existing badge mapping
        sources = (data.tools_called || []).map(t => ({
          type: t.tool === "cortex_analyst" ? "analyst" : t.tool === "cortex_search" ? "search" : "action",
          label: t.tool === "cortex_analyst" ? "Cortex Analyst → SQL" : t.tool === "cortex_search" ? `Cortex Search (${t.results_count} results)` : t.tool,
          detail: t.sql || `${t.results_count ?? ""} results retrieved`,
        }));
      }

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
        @keyframes agentSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
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
        onTravelDemo={handleTravelDemo}
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
                      {["🏖", "📝", "🔧", "🎓"][i]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 500 }}>{demo.user}</div>
                      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 }}>
                        {["Cortex Analyst", "Cortex Analyst", "Action → Snowflake", "Cortex Analyst"][i]}
                      </div>
                    </div>
                  </button>
                ))}
                <button onClick={handleTravelDemo} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14, cursor: "pointer", textAlign: "left", transition: "all 0.2s",
                  fontFamily: "inherit", animation: "slideUp 0.4s ease 0.42s both"
                }}
                  onMouseOver={e => { e.currentTarget.style.background = "rgba(6,167,125,0.06)"; e.currentTarget.style.borderColor = "rgba(6,167,125,0.2)"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                >
                  <div style={{
                    width: 36, height: 36, minWidth: 36, borderRadius: 10,
                    background: "rgba(6,167,125,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
                  }}>🌍</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: 500 }}>Book travel to New York for Q2 Engineering Summit</div>
                    <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 }}>5 Agents · Parallel · asyncio.gather()</div>
                  </div>
                </button>
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
            msg.type === "travel"
              ? <TravelAgentPanel key={i} request={msg.request} />
              : <MessageBubble key={i} msg={msg} />
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
