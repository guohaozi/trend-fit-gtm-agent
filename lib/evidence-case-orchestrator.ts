import type { CompetitorResearchFinding } from "./competitor-research-provider";
import { competitorResearchFindingsToCandidates } from "./competitor-research-provider";
import type { CustomerResearchFinding } from "./customer-research-provider";
import { customerResearchFindingsToCandidates } from "./customer-research-provider";
import {
  generateEvidenceAdjustmentCaseFromDraft,
  type GenerateEvidenceAdjustmentCaseFromDraftInput
} from "./evidence-case-generator";
import { buildEvidenceDraft, type EvidenceCandidate, type EvidenceDraft } from "./evidence-collector";
import type { EvidenceAdjustmentCase } from "./evidence-adjustment";
import type { SeoKeywordFinding } from "./seo-keyword-provider";
import { seoKeywordFindingsToCandidates } from "./seo-keyword-provider";
import type { RiskTolerance, Scores } from "./types";

export type OrchestrateEvidenceCaseInput = {
  id: string;
  caseId: string;
  researchDate: string;
  baselineScores: Scores;
  riskTolerance: RiskTolerance;
  tooling?: string;
  profileUsed?: GenerateEvidenceAdjustmentCaseFromDraftInput["profileUsed"];
  customerResearchFindings?: CustomerResearchFinding[];
  seoKeywordFindings?: SeoKeywordFinding[];
  competitorResearchFindings?: CompetitorResearchFinding[];
  additionalCandidates?: EvidenceCandidate[];
};

export type OrchestratedEvidenceCase = {
  candidates: EvidenceCandidate[];
  draft: EvidenceDraft;
  evidenceCase: EvidenceAdjustmentCase;
};

function defaultTooling(input: OrchestrateEvidenceCaseInput): string {
  const providers = [
    input.customerResearchFindings?.length ? "customer-research" : null,
    input.seoKeywordFindings?.length ? "seo-keyword-research" : null,
    input.competitorResearchFindings?.length ? "competitor-research" : null
  ].filter(Boolean);

  return providers.length > 0 ? `${providers.join(" + ")} orchestrator fixture` : "evidence-case orchestrator";
}

export function orchestrateEvidenceCase(input: OrchestrateEvidenceCaseInput): OrchestratedEvidenceCase {
  const candidates = [
    ...customerResearchFindingsToCandidates(input.customerResearchFindings ?? []),
    ...seoKeywordFindingsToCandidates(input.seoKeywordFindings ?? []),
    ...competitorResearchFindingsToCandidates(input.competitorResearchFindings ?? []),
    ...(input.additionalCandidates ?? [])
  ];

  const draft = buildEvidenceDraft({
    id: input.id,
    case: input.caseId,
    researchDate: input.researchDate,
    tooling: input.tooling ?? defaultTooling(input),
    baselineScores: input.baselineScores,
    candidates
  });

  return {
    candidates,
    draft,
    evidenceCase: generateEvidenceAdjustmentCaseFromDraft({
      draft,
      riskTolerance: input.riskTolerance,
      profileUsed: input.profileUsed
    })
  };
}
