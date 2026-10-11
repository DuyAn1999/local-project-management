// Presentation data only. Scanner and runtime records arrive in later checkpoints.
export interface ProjectPresentation {
  id: string;
  name: string;
  path: string;
  languages: readonly string[];
  ecosystem: string;
  marker: string;
  packageManager?: string;
  commands: readonly { name: string; invocation: string; body: string }[];
}

export interface DesignPreview {
  projects: readonly ProjectPresentation[];
  selectedId: string;
  onSelect: (id: string) => void;
}
