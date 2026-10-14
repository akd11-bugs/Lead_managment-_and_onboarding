// Free, client-side small models (transformers.js/onnxruntime-web) — never
// touches our server, so this costs nothing per use. Every model here is
// dynamically imported and lazily instantiated so pages that never use an
// AI feature never download the library or any model weights; once loaded,
// each pipeline is cached as a module-level singleton (and the model file
// itself is cached by the browser) so repeat calls are instant.
//
// This is explicitly NOT an LLM — no prompting, no "reasoning." Each
// function below is a narrow, deterministic classification/extraction task
// a <100MB model handles well, the same category of tool as a spell-checker
// or a barcode scanner, not a chat assistant.

type NerEntity = {
  entity: string // BIO tag, e.g. "B-ORG", "I-PER"
  score: number
  word: string
}

type TokenClassificationPipeline = (text: string) => Promise<NerEntity[]>
type ZeroShotPipeline = (
  text: string,
  labels: string[],
) => Promise<{ labels: string[]; scores: number[] }>
type FeatureExtractionPipeline = (
  text: string,
  options: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array }>

// Every pipeline follows the same shape: dynamic-import the library, build
// the pipeline once, cache the in-flight/resolved promise so a second call
// (even one racing the first, before it resolves) reuses it instead of
// triggering a second download. One generic instead of three near-copies.
function lazyPipeline<T>(task: string, model: string): () => Promise<T> {
  let promise: Promise<T> | null = null
  return () => {
    if (!promise) {
      promise = import('@huggingface/transformers').then(({ pipeline }) =>
        pipeline(task as never, model, { dtype: 'q8' }),
      ) as Promise<T>
    }
    return promise
  }
}

const getNerPipeline = lazyPipeline<TokenClassificationPipeline>('token-classification', 'Xenova/bert-base-NER')
const getZeroShotPipeline = lazyPipeline<ZeroShotPipeline>('zero-shot-classification', 'Xenova/nli-deberta-v3-xsmall')
const getEmbeddingPipeline = lazyPipeline<FeatureExtractionPipeline>('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

// Merges BERT's wordpiece-tokenized, BIO-tagged output ("B-ORG"/"I-ORG" etc,
// continuation subwords prefixed "##") back into whole entity strings.
// A "##"-prefixed subword is *always* a continuation of the previous token
// — it's never a new word, let alone a new entity — regardless of what BIO
// prefix the model happened to tag it with; the quantized model is
// occasionally inconsistent here (observed: "Priya" tokenized as "P" /
// "##riya", tagged B-PER / B-PER, not the "expected" B-PER / I-PER). Only a
// non-subword token's own prefix decides whether it starts a fresh entity:
// "B-" (or a type change, or nothing in progress) starts one, "I-" extends
// the current one.
function mergeEntities(tokens: NerEntity[]): { type: string; text: string }[] {
  const merged: { type: string; text: string }[] = []
  let current: { type: string; words: string[] } | null = null

  for (const tok of tokens) {
    const [prefix, type] = tok.entity.split('-')
    if (!type) continue
    const isSubword = tok.word.startsWith('##')
    const word = isSubword ? tok.word.slice(2) : tok.word

    if (isSubword && current) {
      current.words[current.words.length - 1] += word
    } else if (prefix === 'B' || !current || current.type !== type) {
      if (current) merged.push({ type: current.type, text: current.words.join(' ') })
      current = { type, words: [word] }
    } else {
      current.words.push(word)
    }
  }
  if (current) merged.push({ type: current.type, text: current.words.join(' ') })
  return merged
}

export interface ExtractedLeadFields {
  company?: string
  poc?: string
  email?: string
  phone?: string
}

// Deterministic regex extraction needs no model and runs instantly —
// applied first so it never waits on (or gets overridden by) the NER model
// below, which only contributes the two things regex can't find: a
// person's name and a company name.
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
// A bare 7-digit local number ("555-0142") is 8 characters total — the
// quantifier has to allow for that minimum, not just longer full numbers.
const PHONE_RE = /(\+?\d[\d\s().-]{5,}\d)/

export async function extractLeadFields(text: string): Promise<ExtractedLeadFields> {
  const result: ExtractedLeadFields = {}
  const trimmed = text.trim()
  if (!trimmed) return result

  const emailMatch = trimmed.match(EMAIL_RE)
  if (emailMatch) result.email = emailMatch[0]

  const phoneMatch = trimmed.match(PHONE_RE)
  if (phoneMatch) result.phone = phoneMatch[0].trim()

  const ner = await getNerPipeline()
  const tokens = await ner(trimmed)
  const entities = mergeEntities(tokens)

  const org = entities.find((e) => e.type === 'ORG')
  const person = entities.find((e) => e.type === 'PER')
  if (org) result.company = org.text
  if (person) result.poc = person.text

  return result
}

export interface StageSuggestion {
  stageKey: string
  confidence: number
}

// candidateLabels and candidateKeys must line up index-for-index (the model
// only ever sees/returns human labels — "Proposal Sent", not "proposal" —
// since those read as natural language to the zero-shot model; the caller
// maps the winning label back to its real stage key).
export async function suggestStage(
  text: string,
  candidateKeys: string[],
  candidateLabels: string[],
): Promise<StageSuggestion | null> {
  const trimmed = text.trim()
  if (!trimmed || candidateLabels.length === 0) return null

  const classifier = await getZeroShotPipeline()
  const result = await classifier(trimmed, candidateLabels)
  const topLabel = result.labels[0]
  const topIndex = candidateLabels.indexOf(topLabel)
  if (topIndex === -1) return null

  return { stageKey: candidateKeys[topIndex], confidence: result.scores[0] }
}

// Mean-pooled, L2-normalized sentence embedding — two normalized vectors'
// dot product IS their cosine similarity, so callers doing client-side
// semantic search over already-loaded rows just need a plain dot product,
// not a separate similarity function.
export async function embedText(text: string): Promise<Float32Array> {
  const embedder = await getEmbeddingPipeline()
  const output = await embedder(text.trim(), { pooling: 'mean', normalize: true })
  return output.data
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}
