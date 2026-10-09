/**
 * Atlas - Core Shared Types
 * Definiciones canónicas de entidades, contratos y estados verificables
 */

export type RequirementStatus = 
  | 'VERIFICADO' 
  | 'FALLIDO' 
  | 'INCOMPLETO' 
  | 'NO_VERIFICABLE' 
  | 'NO_IMPLEMENTADO';

export type TechnologyCategory =
  | 'library'
  | 'framework'
  | 'dev_tool'
  | 'architecture_pattern'
  | 'protocol_standard'
  | 'storage_database'
  | 'queue_background'
  | 'analysis_testing'
  | 'ai_data'
  | 'infrastructure_deployment';

export type ConfidenceLevel = 'confirmed' | 'inferred' | 'candidate';

export type SourceType = 'official_doc' | 'repository' | 'spec_standard' | 'secondary' | 'inferred';

export interface SourceReference {
  id: string;
  title: string;
  url?: string;
  type: SourceType;
  verifiedAt: string;
  notes?: string;
}

export interface TechnologyRecord {
  id: string;
  name: string;
  category: TechnologyCategory;
  description: string;
  howItWorks: string;
  problemSolved: string;
  prerequisites: string[];
  limitations: string[];
  alternatives: string[];
  whenToUse: string;
  ecosystem: string[];
  maturity: 'stable' | 'emerging' | 'niche' | 'legacy';
  sources: SourceReference[];
  isVerified: boolean;
  offlineAvailable: boolean;
}

export interface ResearchQuery {
  id: string;
  problemDescription: string;
  createdAt: string;
  provider: 'local_engine' | 'gemini_grounded' | 'hybrid';
  technologies: TechnologyRecord[];
  comparisonSummary?: string;
  offlineMode: boolean;
  warnings: string[];
}

export interface ProjectMetadata {
  id: string;
  name: string;
  path: string;
  lastScannedAt: string;
  detectedLanguages: { name: string; percentage: number; filesCount: number }[];
  detectedFrameworks: string[];
  detectedDatabases: string[];
  packageManagers: string[];
  availableScripts: Record<string, string>;
  testFrameworks: string[];
  entryPoints: string[];
  filesCount: number;
  directoriesCount: number;
  totalSize: number;
}

export interface FileTreeNode {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
  children?: FileTreeNode[];
}

export interface ProjectScanSummary {
  id: string;
  projectId: string;
  scannedAt: string;
  languages: { name: string; percentage: number; confidence: ConfidenceLevel }[];
  frameworks: { name: string; version?: string; evidenceFile: string }[];
  manifests: { path: string; manager: string; dependenciesCount: number }[];
  scripts: { name: string; command: string; source: string; category: 'test' | 'build' | 'lint' | 'start' | 'other' }[];
  testFiles: string[];
  configFiles: string[];
  entryPoints: string[];
  moduleDependencies?: { source: string; target: string; type: 'import' | 'require' }[];
}

export interface SpecificationRequirement {
  id: string;
  code: string; // e.g. REQ-01
  title: string;
  description: string;
  category: 'functional' | 'architectural' | 'security' | 'testing' | 'performance';
  verificationMethod: 'static_analysis' | 'test_execution' | 'config_inspection' | 'composite';
}

export interface EvidenceRecord {
  id: string;
  type: 'file_content' | 'ast_symbol' | 'test_output' | 'script_result' | 'manifest_entry' | 'absence_proof';
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  snippet?: string;
  commandExecuted?: string;
  exitCode?: number;
  outputLog?: string;
  description: string;
  timestamp: string;
}

export interface AuditFinding {
  id: string;
  sessionId: string;
  requirementId: string;
  requirementCode: string;
  requirementTitle: string;
  status: RequirementStatus;
  summary: string;
  rationale: string;
  limitations: string;
  evidence: EvidenceRecord[];
}

export interface AuditSession {
  id: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  specificationText: string;
  requirementsCount: number;
  verifiedCount: number;
  failedCount: number;
  incompleteCount: number;
  notVerifiableCount: number;
  notImplementedCount: number;
  findings: AuditFinding[];
  checksExecuted: {
    command: string;
    exitCode: number;
    durationMs: number;
    authorized: boolean;
  }[];
}

export interface ExecutionRequest {
  projectId: string;
  command: string;
  args?: string[];
  workingDirectory: string;
  purpose: string;
  timeoutMs?: number;
  authorizedByUser: boolean;
}

export interface ExecutionResult {
  id: string;
  command: string;
  workingDirectory: string;
  exitCode: number | null;
  durationMs: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  error?: string;
  executedAt: string;
}

export interface SavedKnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  relatedTechnology?: string;
  relatedProjectId?: string;
  sourceUrl?: string;
  verifiedConclusion: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationSettings {
  geminiApiKeyConfigured: boolean;
  researchProvider: 'local_first' | 'gemini_grounded';
  offlineOnly: boolean;
  allowedDirectories: string[];
  maxExecutionTimeoutSeconds: number;
  maxFileSizeToInspectKB: number;
  maskSecretsInReports: boolean;
  requireExplicitExecutionAuth: boolean;
  disableTelemetry: boolean;
}
