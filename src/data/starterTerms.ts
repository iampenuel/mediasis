import mesh7000Raw from './generated/mesh7000.json';
import { seedTerms, type SeedTerm } from './seedTerms';

type MeshJsonTerm = {
  id: string;
  term: string;
  pronunciation?: string;
  definition: string;
  example_sentence?: string;
  category?: string;
  difficulty?: number;
};

const mesh7000 = (mesh7000Raw as MeshJsonTerm[])
  .filter((term) => Boolean(term.id && term.term && term.definition))
  .map(
    (term): SeedTerm => ({
      id: term.id,
      term: term.term,
      pronunciation: term.pronunciation?.trim() || term.term,
      definition: term.definition,
      exampleSentence:
        term.example_sentence?.trim() || `Clinical usage: ${term.term} was documented in the patient assessment.`,
      category: term.category?.trim() || 'MeSH',
      difficulty: Math.max(1, Math.min(5, term.difficulty ?? 2)),
    }),
  );

export const starterTerms: SeedTerm[] = mesh7000.length >= 7000 ? mesh7000.slice(0, 7000) : seedTerms;
export const starterSource = mesh7000.length >= 7000 ? 'mesh7000' : 'fallback-seed';
