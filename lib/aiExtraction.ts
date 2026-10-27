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

// How long to wait on the NER model (download + inference) before giving up
// and returning whatever regex already found. Without this, a slow/blocked
// model load (flaky network, a CDN the browser can't reach, an ONNX runtime
// init that silently never resolves — observed in at least one headless
// Chromium environment) loses the email/phone regex already matched above,
// since the function was awaiting the model before returning anything at
// all. 8s covers a cold model download on a normal connection; this is a
// best-effort enhancement on top of regex, never the only source of truth.
const NER_TIMEOUT_MS = 8000

export async function extractLeadFields(text: string): Promise<ExtractedLeadFields> {
  const result: ExtractedLeadFields = {}
  const trimmed = text.trim()
  if (!trimmed) return result

  const emailMatch = trimmed.match(EMAIL_RE)
  if (emailMatch) result.email = emailMatch[0]

  const phoneMatch = trimmed.match(PHONE_RE)
  if (phoneMatch) result.phone = phoneMatch[0].trim()

  try {
    const entities = await Promise.race([
      getNerPipeline().then((ner) => ner(trimmed)).then(mergeEntities),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('NER model timed out')), NER_TIMEOUT_MS)),
    ])

    const org = entities.find((e) => e.type === 'ORG')
    const person = entities.find((e) => e.type === 'PER')
    if (org) result.company = org.text
    if (person) result.poc = person.text
  } catch {
    // Model failed to load/run or timed out — the caller still gets
    // whatever regex found above (email/phone), rather than nothing.
  }

  return result
}

export interface ExtractedLinks {
  linkedin?: string
  other: string[]
}

// Matches a bare domain ("acme.com", "www.acme.com/team") or a full
// https?:// URL, whichever appears first in the scanned text — global so
// every URL-shaped token on the card is found, not just the first.
const URL_RE = /https?:\/\/\S+|(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/\S*)?/gi

// LinkedIn is reliably detectable by domain alone — every other match goes
// into `other` rather than being guessed at (e.g. "is this the company's
// website?"): nothing on a printed card distinguishes a company site from
// a personal portfolio or any other link, so labelling anything beyond
// LinkedIn would be a guess dressed up as a fact. Purely regex, no model —
// runs synchronously, same deterministic-first-pass spirit as the
// email/phone regex above.
export function extractLinks(text: string): ExtractedLinks {
  const result: ExtractedLinks = { other: [] }
  const trimmed = text.trim()
  if (!trimmed) return result

  // Strip email addresses first — otherwise a bare-domain match like
  // "acme.com" fires on the domain half of "jane@acme.com" too, surfacing
  // someone's email provider as if it were a found website link. EMAIL_RE
  // itself has no /g flag (its other use is a single match()), so a fresh
  // global copy is used here to strip every email, not just the first.
  const withoutEmails = trimmed.replace(new RegExp(EMAIL_RE.source, 'g'), ' ')

  const matches = withoutEmails.match(URL_RE) ?? []
  const seen = new Set<string>()
  for (const raw of matches) {
    const url = raw.replace(/[.,;:)\]]+$/, '') // trailing punctuation from running card text, not part of the URL
    if (seen.has(url.toLowerCase())) continue
    seen.add(url.toLowerCase())

    if (/linkedin\.com/i.test(url)) {
      if (!result.linkedin) result.linkedin = url
    } else {
      result.other.push(url)
    }
  }

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
