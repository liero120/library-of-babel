export interface Document {
  id: number;
  title: string;
  source_type: 'pdf' | 'markdown' | 'text' | 'url';
  source_ref: string | null;
  section_count: number;
  created_at: string;
}

export interface DocumentDetail extends Document {
  full_text: string;
  sections: Section[];
}

export interface Section {
  idx: number;
  title: string | null;
  content: string;
  word_count: number;
}

export interface Session {
  id: number;
  doc_id: number;
  doc_title: string;
  current_section: number;
  mode: EngagementMode;
  lens_type: string | null;
  started_at: string;
  updated_at: string;
}

export interface Provocation {
  id: number;
  session_id: number;
  section_idx: number;
  mode: string;
  action: string;
  lens_type: string | null;
  response: string;
  created_at: string;
}

export interface OutlineNote {
  id: number;
  doc_id: number;
  section_idx: number | null;
  note_text: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export type EngagementMode = 'provocation' | 'lens' | 'scaffold';

export type ProvocationAction = 'challenge' | 'weakness' | 'missing';
export type ScaffoldAction = 'connect' | 'falsify' | 'argue';

export const LENS_TYPES = [
  { value: 'financial', label: 'Financial' },
  { value: 'ethical', label: 'Ethical' },
  { value: 'technical', label: 'Technical' },
  { value: 'legal', label: 'Legal' },
  { value: 'power', label: 'Power Dynamics' },
  { value: 'historical', label: 'Historical' },
  { value: 'epistemological', label: 'Epistemological' },
] as const;

export const PROVOCATION_ACTIONS: { action: ProvocationAction; label: string; icon: string }[] = [
  { action: 'challenge', label: 'Challenge this', icon: '\u2694' },
  { action: 'weakness', label: 'Find weakness', icon: '\uD83D\uDD0D' },
  { action: 'missing', label: "What am I missing?", icon: '\uD83D\uDC41' },
];

export const SCAFFOLD_ACTIONS: { action: ScaffoldAction; label: string; icon: string }[] = [
  { action: 'connect', label: 'How does this connect?', icon: '\uD83D\uDD17' },
  { action: 'falsify', label: 'What if this were false?', icon: '\u2717' },
  { action: 'argue', label: "What's my argument?", icon: '\uD83D\uDCAC' },
];
