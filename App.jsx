import React, { useState, useEffect } from "react";
import {
  ArrowLeft, ArrowRight, Plus, ShieldCheck, Link2, Copy, Check, MessageCircle,
  LogOut, ClipboardList, Activity, Dumbbell, Trash2, Calendar,
} from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────
//  ÉLO — prontuário de bolso
//  Login → Cadastro → Avaliação → Prontuário → Evolução → Prescrição
// ──────────────────────────────────────────────────────────────────────────

const LIBRARY = {
  Lombar: ["Báscula pélvica", "Ponte de glúteo", "Gato-camelo", "Prancha modificada", "Cão-pássaro"],
  Cervical: ["Retração cervical", "Mobilidade cervical", "Isometria de flexores", "Alongamento de trapézio"],
  Ombro: ["Pendular de Codman", "Rotação externa com elástico", "Elevação escapular", "Deslizamento na parede"],
  Joelho: ["Agachamento parcial", "Extensão terminal", "Fortalecimento de quadríceps", "Equilíbrio unipodal"],
};
const REGIONS = [...Object.keys(LIBRARY), "Outro"];
const ONSET = ["< 6 sem (agudo)", "6–12 sem", "> 12 sem (crônico)"];
const DISABILITY = ["Leve", "Moderada", "Grave"];
const FEAR = ["Confiante", "Inseguro", "Com medo"];
const RED_FLAGS = ["Perda de força", "Alteração de sensibilidade", "Febre / mal-estar", "Trauma recente", "Dor noturna intensa"];

const painColor = (p) => (p <= 3 ? "#0e5c57" : p <= 5 ? "#3f7d5a" : p <= 7 ? "#a98646" : "#bd7150");
const todayStr = () => new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

function computeProfile(a) {
  if (a.redFlags && a.redFlags.length)
    return { label: "Sinais de alerta — reavaliar", color: "var(--alert)", bg: "var(--clay-soft)" };
  const chronic = (a.onset || "").includes("crônico");
  const fear = a.fear && a.fear !== "Confiante";
  const highDis = a.disability === "Grave";
  if ((chronic && fear) || highDis)
    return { label: "Requer maior atenção", color: "var(--amber)", bg: "#f7efd9" };
  return { label: "Quadro favorável", color: "var(--teal)", bg: "var(--teal-soft)" };
}

const SEED = [{
  id: 1, name: "Marina Souza", age: 38, whatsapp: "(35) 99999-0000", complaint: "Dor lombar ao sentar e levantar",
  createdAt: "02/06/2026",
  assessment: { pain: 7, region: "Lombar", onset: "> 12 sem (crônico)", disability: "Moderada", fear: "Com medo", redFlags: [] },
  evolutions: [
    { date: "16/06/2026", pain: 5, note: "Relata melhora ao caminhar; ainda tem receio de agachar.", conduct: "Mantida prescrição + educação em dor." },
    { date: "09/06/2026", pain: 6, note: "Dor pela manhã, melhora ao longo do dia.", conduct: "Terapia manual + orientação domiciliar." },
  ],
  prescription: [
    { name: "Báscula pélvica", region: "Lombar", sets: "2 × 10" },
    { name: "Ponte de glúteo", region: "Lombar", sets: "3 × 12" },
  ],
}];

// ── persistência local ───────────────────────────────────────────────────────
const STORE_KEY = "elo.patients.v1";
const AUTH_KEY = "elo.auth.v1";
function loadPatients() {
  try { const r = localStorage.getItem(STORE_KEY); return r ? JSON.parse(r) : SEED; }
  catch (e) { return SEED; }
}

// ── UI helpers ───────────────────────────────────────────────────────────────
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--line)", background: "#fff", fontFamily: "inherit", fontSize: 14, color: "var(--ink)", outline: "none", boxSizing: "border-box" };

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#3c4a46", display: "block", marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}
function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} className="opt" style={{
      padding: "9px 13px", borderRadius: 99, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
      border: active ? "1.5px solid var(--teal)" : "1.5px solid var(--line)",
      background: active ? "var(--teal-soft)" : "#fff", color: active ? "var(--teal)" : "var(--ink)",
    }}>{children}</button>
  );
}
function AppBar({ title, onBack, right }) {
  return (
    <div className="flex items-center gap-2" style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--cream)", zIndex: 5 }}>
      {onBack && (
        <button onClick={onBack} className="opt" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink)", padding: 4, display: "flex" }}>
          <ArrowLeft size={20} />
        </button>
      )}
      <div style={{ flex: 1, fontWeight: 700, fontSize: 16 }}>{title}</div>
      {right}
    </div>
  );
}
function PrimaryBtn({ children, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className="opt flex items-center justify-center gap-2" style={{
      width: "100%", padding: 15, borderRadius: 14, border: "none", fontFamily: "inherit", fontSize: 15, fontWeight: 700,
      background: disabled ? "#cdd6d2" : "var(--teal)", color: "#fff", cursor: disabled ? "not-allowed" : "pointer",
    }}>{children}</button>
  );
}
function PainCurve({ values, color = "var(--teal)" }) {
  const w = 380, h = 70, pad = 8, max = 10;
  if (values.length < 2) return <div style={{ fontSize: 12, color: "var(--muted)" }}>Ainda sem evolução suficiente para o gráfico.</div>;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (w - pad * 2), pad + (1 - v / max) * (h - pad * 2)]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
      {[2.5, 5, 7.5].map((g, i) => { const y = pad + (1 - g / max) * (h - pad * 2); return <line key={i} x1={pad} x2={w - pad} y1={y} y2={y} stroke="#e6ddca" strokeWidth="1" />; })}
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} />)}
    </svg>
  );
}

// ── Google logo ──────────────────────────────────────────────────────────────
function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// ── Telas ──────────────────────────────────────────────────────────────────
function Login({ onEnter }) {
  return (
    <div className="rise" style={{ padding: "48px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 2, color: "var(--teal)" }}>ÉLO</div>
        <p className="serif" style={{ fontSize: 14.5, color: "#55605b", marginTop: 4 }}>o prontuário que cabe no bolso</p>
      </div>
      <button onClick={onEnter} className="opt flex items-center justify-center gap-2" style={{ width: "100%", padding: 14, borderRadius: 12, border: "1px solid var(--line)", background: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#3c4a46", cursor: "pointer" }}>
        <GoogleG /> Continuar com Google
      </button>
      <button onClick={onEnter} className="opt" style={{ width: "100%", padding: 12, borderRadius: 12, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--muted)", cursor: "pointer", marginTop: 6 }}>
        ou entrar com e-mail
      </button>
      <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 26 }}>Acesso do fisioterapeuta · protótipo</p>
    </div>
  );
}

function Home({ patients, onNew, onOpen, onExit }) {
  return (
    <div>
      <AppBar title="Meus pacientes" right={
        <button onClick={onExit} className="opt" title="sair" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4, display: "flex" }}><LogOut size={18} /></button>
      } />
      <div style={{ padding: 16 }}>
        <button onClick={onNew} className="opt flex items-center justify-center gap-2" style={{ width: "100%", padding: 14, borderRadius: 14, border: "1.5px dashed var(--teal)", background: "var(--teal-soft)", fontFamily: "inherit", fontSize: 14.5, fontWeight: 700, color: "var(--teal)", cursor: "pointer", marginBottom: 16 }}>
          <Plus size={18} /> Novo paciente
        </button>
        {patients.length === 0 && <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: 20 }}>Comece cadastrando seu primeiro paciente.</p>}
        <div className="flex flex-col gap-2.5">
          {patients.map((p) => {
            const last = p.evolutions[0];
            const pain = last ? last.pain : p.assessment.pain;
            return (
              <button key={p.id} onClick={() => onOpen(p.id)} className="opt card flex items-center gap-3 text-left" style={{ padding: 14, cursor: "pointer" }}>
                <span style={{ width: 42, height: 42, borderRadius: 12, background: "var(--teal-soft)", color: "var(--teal)", display: "grid", placeItems: "center", flexShrink: 0, fontWeight: 700 }}>
                  {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.complaint}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: painColor(pain), background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 8px" }}>dor {pain}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NewPatient({ onSave, onCancel }) {
  const [step, setStep] = useState(0); // 0 cadastro · 1 avaliação
  const [d, setD] = useState({ name: "", age: "", whatsapp: "", complaint: "" });
  const [a, setA] = useState({ pain: 5, region: "Lombar", onset: ONSET[0], disability: "Leve", fear: "Confiante", redFlags: [] });
  const set = (k, v) => setD({ ...d, [k]: v });
  const setA2 = (k, v) => setA({ ...a, [k]: v });
  const toggleFlag = (f) => setA({ ...a, redFlags: a.redFlags.includes(f) ? a.redFlags.filter((x) => x !== f) : [...a.redFlags, f] });
  const cadastroOk = d.name.trim() && d.complaint.trim();

  return (
    <div>
      <AppBar title={step === 0 ? "Cadastro" : "Avaliação simples"} onBack={step === 0 ? onCancel : () => setStep(0)} />
      <div className="flex gap-1.5" style={{ padding: "12px 16px 0" }}>
        {[0, 1].map((i) => <span key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? "var(--teal)" : "var(--line)" }} />)}
      </div>

      {step === 0 && (
        <div className="rise" style={{ padding: 16 }}>
          <Field label="Nome completo"><input style={inputStyle} value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Marina Souza" /></Field>
          <div className="flex gap-3">
            <div style={{ flex: 1 }}><Field label="Idade"><input style={inputStyle} value={d.age} onChange={(e) => set("age", e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="38" /></Field></div>
            <div style={{ flex: 2 }}><Field label="WhatsApp"><input style={inputStyle} value={d.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(35) 9....." /></Field></div>
          </div>
          <Field label="Queixa principal"><textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={d.complaint} onChange={(e) => set("complaint", e.target.value)} placeholder="O que trouxe o paciente até você?" /></Field>
          <PrimaryBtn disabled={!cadastroOk} onClick={() => setStep(1)}>Continuar <ArrowRight size={17} /></PrimaryBtn>
        </div>
      )}

      {step === 1 && (
        <div className="rise" style={{ padding: 16 }}>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: "#3c4a46", marginBottom: 8 }}>Dor agora (0 a 10)</p>
          <div className="flex items-center gap-3" style={{ marginBottom: 18 }}>
            <span style={{ fontSize: 34, fontWeight: 800, color: painColor(a.pain), minWidth: 40 }}>{a.pain}</span>
            <input type="range" min={0} max={10} value={a.pain} onChange={(e) => setA2("pain", +e.target.value)} className="slider" style={{ flex: 1, color: painColor(a.pain), background: `linear-gradient(90deg, ${painColor(a.pain)} ${a.pain * 10}%, #e6ddca ${a.pain * 10}%)` }} />
          </div>

          <p style={{ fontSize: 12.5, fontWeight: 600, color: "#3c4a46", marginBottom: 8 }}>Região</p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 18 }}>{REGIONS.map((r) => <Chip key={r} active={a.region === r} onClick={() => setA2("region", r)}>{r}</Chip>)}</div>

          <p style={{ fontSize: 12.5, fontWeight: 600, color: "#3c4a46", marginBottom: 8 }}>Tempo de evolução</p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 18 }}>{ONSET.map((o) => <Chip key={o} active={a.onset === o} onClick={() => setA2("onset", o)}>{o}</Chip>)}</div>

          <p style={{ fontSize: 12.5, fontWeight: 600, color: "#3c4a46", marginBottom: 8 }}>Limitação funcional</p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 18 }}>{DISABILITY.map((o) => <Chip key={o} active={a.disability === o} onClick={() => setA2("disability", o)}>{o}</Chip>)}</div>

          <p style={{ fontSize: 12.5, fontWeight: 600, color: "#3c4a46", marginBottom: 8 }}>Como se sente em se movimentar</p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 18 }}>{FEAR.map((o) => <Chip key={o} active={a.fear === o} onClick={() => setA2("fear", o)}>{o}</Chip>)}</div>

          <p style={{ fontSize: 12.5, fontWeight: 600, color: "#3c4a46", marginBottom: 8 }}>Sinais de alerta <span style={{ color: "var(--muted)", fontWeight: 500 }}>(marque se houver)</span></p>
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 22 }}>{RED_FLAGS.map((f) => <Chip key={f} active={a.redFlags.includes(f)} onClick={() => toggleFlag(f)}>{f}</Chip>)}</div>

          <PrimaryBtn onClick={() => onSave({ ...d, assessment: a })}>Salvar e abrir prontuário</PrimaryBtn>
        </div>
      )}
    </div>
  );
}

function PatientRecord({ patient, onBack, onAddEvolution, onUpdateRx }) {
  const [tab, setTab] = useState("resumo");
  const p = patient;
  const prof = computeProfile(p.assessment);
  const tabs = [["resumo", "Prontuário", ClipboardList], ["evolucao", "Evolução", Activity], ["prescricao", "Prescrição", Dumbbell]];
  return (
    <div>
      <AppBar title={p.name} onBack={onBack} />
      <div style={{ padding: "14px 16px 0" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{p.age ? p.age + " anos · " : ""}{p.assessment.region}</span>
        </div>
        <div style={{ background: prof.bg, color: prof.color, fontSize: 12.5, fontWeight: 700, padding: "8px 12px", borderRadius: 10 }}>{prof.label}</div>
      </div>

      <div className="flex gap-1" style={{ padding: "14px 16px 0" }}>
        {tabs.map(([v, l, Icon]) => (
          <button key={v} onClick={() => setTab(v)} className="opt flex flex-col items-center gap-1" style={{
            flex: 1, padding: "8px 4px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700,
            background: tab === v ? "var(--teal)" : "transparent", color: tab === v ? "#fff" : "var(--muted)",
          }}><Icon size={17} /> {l}</button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {tab === "resumo" && <Resumo p={p} />}
        {tab === "evolucao" && <Evolucao p={p} onAdd={onAddEvolution} />}
        {tab === "prescricao" && <Prescricao p={p} onUpdate={onUpdateRx} />}
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-3" style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>{k}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{v || "—"}</span>
    </div>
  );
}
function Resumo({ p }) {
  return (
    <div className="rise">
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--teal)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Dados</p>
        <Row k="Queixa principal" v={p.complaint} />
        <Row k="WhatsApp" v={p.whatsapp} />
        <Row k="Cadastro" v={p.createdAt} />
      </div>
      <div className="card" style={{ padding: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--teal)", textTransform: "uppercase", letterSpacing: .6, marginBottom: 6 }}>Avaliação inicial</p>
        <Row k="Dor (END)" v={p.assessment.pain + " / 10"} />
        <Row k="Região" v={p.assessment.region} />
        <Row k="Tempo de evolução" v={p.assessment.onset} />
        <Row k="Limitação funcional" v={p.assessment.disability} />
        <Row k="Perfil de movimento" v={p.assessment.fear} />
        <Row k="Sinais de alerta" v={p.assessment.redFlags.length ? p.assessment.redFlags.join(", ") : "Nenhum"} />
      </div>
    </div>
  );
}

function Evolucao({ p, onAdd }) {
  const [open, setOpen] = useState(false);
  const [pain, setPain] = useState(p.evolutions[0] ? p.evolutions[0].pain : p.assessment.pain);
  const [note, setNote] = useState("");
  const [conduct, setConduct] = useState("");
  const save = () => {
    onAdd(p.id, { date: todayStr(), pain, note: note.trim(), conduct: conduct.trim() });
    setNote(""); setConduct(""); setOpen(false);
  };
  const series = [p.assessment.pain, ...[...p.evolutions].reverse().map((e) => e.pain)];
  return (
    <div className="rise">
      <div className="card" style={{ padding: 16, marginBottom: 14, background: "var(--sand)" }}>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Trajetória da dor</p>
        <PainCurve values={series} color={painColor(series[series.length - 1])} />
      </div>

      {!open && (
        <button onClick={() => setOpen(true)} className="opt flex items-center justify-center gap-2" style={{ width: "100%", padding: 13, borderRadius: 12, border: "1.5px dashed var(--teal)", background: "var(--teal-soft)", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "var(--teal)", cursor: "pointer", marginBottom: 14 }}>
          <Plus size={17} /> Nova evolução
        </button>
      )}
      {open && (
        <div className="card rise" style={{ padding: 16, marginBottom: 14 }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: painColor(pain), minWidth: 34 }}>{pain}</span>
            <input type="range" min={0} max={10} value={pain} onChange={(e) => setPain(+e.target.value)} className="slider" style={{ flex: 1, color: painColor(pain), background: `linear-gradient(90deg, ${painColor(pain)} ${pain * 10}%, #e6ddca ${pain * 10}%)` }} />
          </div>
          <Field label="Relato do paciente"><textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical" }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Como passou a semana?" /></Field>
          <Field label="Conduta de hoje"><input style={inputStyle} value={conduct} onChange={(e) => setConduct(e.target.value)} placeholder="O que foi feito na sessão" /></Field>
          <div className="flex gap-2">
            <button onClick={() => setOpen(false)} className="opt" style={{ flex: 1, padding: 13, borderRadius: 12, border: "1px solid var(--line)", background: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancelar</button>
            <div style={{ flex: 2 }}><PrimaryBtn onClick={save}>Salvar evolução</PrimaryBtn></div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {p.evolutions.map((e, i) => (
          <div key={i} className="card" style={{ padding: 14 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}><Calendar size={13} /> {e.date}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: painColor(e.pain), background: "var(--sand)", borderRadius: 8, padding: "3px 8px" }}>dor {e.pain}</span>
            </div>
            {e.note && <p style={{ fontSize: 13, lineHeight: 1.45 }}>{e.note}</p>}
            {e.conduct && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}><strong>Conduta:</strong> {e.conduct}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Prescricao({ p, onUpdate }) {
  const [region, setRegion] = useState(p.assessment.region in LIBRARY ? p.assessment.region : "Lombar");
  const [copied, setCopied] = useState(false);
  const rx = p.prescription;
  const has = (name) => rx.some((x) => x.name === name);
  const toggle = (name) => {
    if (has(name)) onUpdate(p.id, rx.filter((x) => x.name !== name));
    else onUpdate(p.id, [...rx, { name, region, sets: "3 × 10" }]);
  };
  const first = p.name.split(" ")[0];
  const slug = first.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const link = `elo.app/p/${slug}-x7k2`;
  const copy = () => { try { if (navigator.clipboard) navigator.clipboard.writeText("https://" + link); } catch (e) {} setCopied(true); setTimeout(() => setCopied(false), 1600); };
  const wa = () => {
    const msg = encodeURIComponent(`Oi, ${first}! Aqui estão seus exercícios de hoje (${rx.length}): https://${link}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div className="rise">
      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Prescrição atual {rx.length > 0 && <span style={{ color: "var(--muted)" }}>· {rx.length}</span>}</p>
      {rx.length === 0 && <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 12 }}>Toque nos exercícios abaixo para montar o plano.</p>}
      <div className="flex flex-col gap-2" style={{ marginBottom: 18 }}>
        {rx.map((e, i) => (
          <div key={i} className="card flex items-center gap-3" style={{ padding: "10px 12px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{e.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{e.sets} · {e.region}</div>
            </div>
            <button onClick={() => toggle(e.name)} className="opt" style={{ background: "none", border: "none", color: "var(--clay)", cursor: "pointer", padding: 4, display: "flex" }}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Biblioteca</p>
      <div className="flex flex-wrap gap-2" style={{ marginBottom: 12 }}>{Object.keys(LIBRARY).map((r) => <Chip key={r} active={region === r} onClick={() => setRegion(r)}>{r}</Chip>)}</div>
      <div className="flex flex-col gap-2" style={{ marginBottom: 22 }}>
        {LIBRARY[region].map((name) => (
          <button key={name} onClick={() => toggle(name)} className="opt flex items-center gap-3 text-left" style={{
            padding: "11px 12px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
            border: has(name) ? "1.5px solid var(--teal)" : "1px solid var(--line)", background: has(name) ? "var(--teal-soft)" : "#fff",
          }}>
            <span style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: "grid", placeItems: "center", background: has(name) ? "var(--teal)" : "var(--sand)", color: "#fff" }}>{has(name) && <Check size={14} />}</span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{name}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 16, background: "var(--sand)" }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
          <Link2 size={16} style={{ color: "var(--teal)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Link do paciente</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Exercícios e check-in · sem app, sem senha.</div>
          </div>
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 12.5, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "9px 11px", color: "#3c4a46", wordBreak: "break-all", marginBottom: 10 }}>{link}</div>
        <div className="flex gap-2">
          <button onClick={copy} className="opt flex items-center justify-center gap-1.5" style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid var(--line)", background: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {copied ? <><Check size={14} style={{ color: "var(--teal)" }} /> Copiado</> : <><Copy size={14} /> Copiar</>}
          </button>
          <button onClick={wa} disabled={rx.length === 0} className="opt flex items-center justify-center gap-1.5" style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", background: rx.length === 0 ? "#cdd6d2" : "var(--teal)", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: rx.length === 0 ? "not-allowed" : "pointer" }}>
            <MessageCircle size={14} /> WhatsApp
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2" style={{ marginTop: 14, fontSize: 11, color: "var(--muted)" }}>
        <ShieldCheck size={13} /> Registro de telemonitoramento · COFFITO 619/2025
      </div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function Elo() {
  const [auth, setAuth] = useState(() => { try { return localStorage.getItem(AUTH_KEY) === "1"; } catch (e) { return false; } });
  const [patients, setPatients] = useState(loadPatients);
  const [route, setRoute] = useState({ name: "home" });

  useEffect(() => { try { localStorage.setItem(STORE_KEY, JSON.stringify(patients)); } catch (e) {} }, [patients]);
  useEffect(() => { try { localStorage.setItem(AUTH_KEY, auth ? "1" : "0"); } catch (e) {} }, [auth]);

  const addPatient = (data) => {
    const id = Date.now();
    const np = { id, name: data.name, age: data.age, whatsapp: data.whatsapp, complaint: data.complaint, createdAt: todayStr(), assessment: data.assessment, evolutions: [], prescription: [] };
    setPatients([np, ...patients]);
    setRoute({ name: "patient", id });
  };
  const addEvolution = (id, ev) => setPatients((ps) => ps.map((p) => p.id === id ? { ...p, evolutions: [ev, ...p.evolutions] } : p));
  const updateRx = (id, rx) => setPatients((ps) => ps.map((p) => p.id === id ? { ...p, prescription: rx } : p));
  const current = patients.find((p) => p.id === route.id);

  return (
    <div className="elo-root" style={{ padding: "20px 14px 40px", minHeight: "100vh" }}>
      <div style={{ maxWidth: 440, margin: "0 auto", background: "var(--cream)", borderRadius: 26, overflow: "hidden", border: "1px solid var(--line)", boxShadow: "0 30px 60px -28px rgba(16,33,31,.45)", minHeight: 640 }}>
        {!auth && <Login onEnter={() => { setAuth(true); setRoute({ name: "home" }); }} />}
        {auth && route.name === "home" && (
          <Home patients={patients} onNew={() => setRoute({ name: "new" })} onOpen={(id) => setRoute({ name: "patient", id })} onExit={() => setAuth(false)} />
        )}
        {auth && route.name === "new" && (
          <NewPatient onCancel={() => setRoute({ name: "home" })} onSave={addPatient} />
        )}
        {auth && route.name === "patient" && current && (
          <PatientRecord patient={current} onBack={() => setRoute({ name: "home" })} onAddEvolution={addEvolution} onUpdateRx={updateRx} />
        )}
        {auth && route.name === "patient" && !current && (
          <div style={{ padding: 24 }}><button onClick={() => setRoute({ name: "home" })} className="opt" style={{ border: "none", background: "none", color: "var(--teal)", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}>← voltar</button></div>
        )}
      </div>
    </div>
  );
}
