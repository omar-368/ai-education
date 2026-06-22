import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  Layers3,
  History,
  LayoutDashboard,
  Settings,
  Target,
  X,
} from "lucide-react";
import type { AppSection } from "../types";

const items = [
  ["dashboard", "Dashboard", LayoutDashboard],
  ["material", "Study Material", BookOpen],
  ["quiz", "Quiz Arena", BrainCircuit],
  ["weak", "Weak Topics", Target],
  ["flashcards", "Flashcards", Layers3],
  ["history", "History", History],
  ["settings", "Settings", Settings],
] as const;

interface Props {
  active: AppSection;
  onNavigate: (section: AppSection) => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ active, onNavigate, open, onClose }: Props) {
  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand">
        <div className="brand-mark"><BarChart3 size={22} /></div>
        <div><strong>AI Education</strong><span>Study smarter</span></div>
        <button className="icon-button mobile-only" onClick={onClose}><X /></button>
      </div>
      <nav>
        {items.map(([id, label, Icon]) => (
          <button
            key={id}
            className={active === id ? "active" : ""}
            onClick={() => { onNavigate(id); onClose(); }}
          >
            <Icon size={19} /> {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-tip">
        <div className="tip-icon"><BrainCircuit size={20} /></div>
        <strong>Adaptive mode</strong>
        <p>Your questions evolve with every answer.</p>
      </div>
    </aside>
  );
}
