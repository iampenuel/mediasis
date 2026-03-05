#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { XMLParser } from 'fast-xml-parser';

const TARGET_COUNT = 7000;
const DEFAULT_OUT = path.resolve(process.cwd(), 'src/data/generated/mesh7000.json');

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  return [value];
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function pickScopeNote(record) {
  const concepts = asArray(record?.ConceptList?.Concept);
  const preferred = concepts.find((concept) => concept?.['@_PreferredConceptYN'] === 'Y');
  const ordered = preferred ? [preferred, ...concepts.filter((concept) => concept !== preferred)] : concepts;

  for (const concept of ordered) {
    const candidates = [
      concept?.ScopeNote,
      concept?.ConceptScopeNote,
      concept?.Note,
      concept?.Scope,
      concept?.Definition,
    ];

    for (const candidate of candidates) {
      const text = normalizeText(candidate);
      if (text.length > 0) {
        return text;
      }
    }
  }

  return '';
}

function difficultyFromTerm(term) {
  const words = normalizeText(term).split(' ').length;
  if (term.length > 22 || words > 3) {
    return 4;
  }

  if (term.length > 16 || words > 2) {
    return 3;
  }

  if (term.length > 10) {
    return 2;
  }

  return 1;
}

function makeExample(term) {
  return `Clinical context: ${term} was documented during assessment and plan.`;
}

async function run() {
  const sourcePath = process.argv[2];
  const outPath = process.argv[3] ? path.resolve(process.cwd(), process.argv[3]) : DEFAULT_OUT;

  if (sourcePath === '--help' || sourcePath === '-h') {
    console.log('Usage: npm run import:mesh -- <path-to-MeSH-Descriptor-XML> [output-json-path]');
    process.exit(0);
  }

  if (!sourcePath) {
    console.error('Usage: npm run import:mesh -- <path-to-MeSH-Descriptor-XML> [output-json-path]');
    process.exit(1);
  }

  const xml = await fs.readFile(path.resolve(process.cwd(), sourcePath), 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    parseTagValue: false,
  });

  const parsed = parser.parse(xml);
  const records = asArray(parsed?.DescriptorRecordSet?.DescriptorRecord);
  const terms = [];
  const seenIds = new Set();

  for (const record of records) {
    const id = normalizeText(record?.DescriptorUI);
    const term = normalizeText(record?.DescriptorName?.String);
    const definition = pickScopeNote(record);

    if (!id || !term || !definition || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);
    terms.push({
      id,
      term,
      pronunciation: term,
      definition,
      example_sentence: makeExample(term),
      category: 'MeSH',
      difficulty: difficultyFromTerm(term),
      tags: ['mesh'],
    });
  }

  const sorted = terms.sort((a, b) => a.id.localeCompare(b.id));
  if (sorted.length < TARGET_COUNT) {
    throw new Error(
      `MeSH source only produced ${sorted.length} term+definition records. Need at least ${TARGET_COUNT}.`,
    );
  }

  const output = sorted.slice(0, TARGET_COUNT);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        source: path.resolve(process.cwd(), sourcePath),
        output: outPath,
        generated: output.length,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error('[import:mesh] failed:', error?.message ?? error);
  process.exit(1);
});
