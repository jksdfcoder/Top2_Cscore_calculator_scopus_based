import { analyze, parseText, type Analysis, type ParsedFile } from '../lib/cscore'
import { reference } from '../lib/reference'

export function useAnalysis() {
  const files = shallowRef<ParsedFile[]>([])
  const selectedAuthor = ref('')
  const decisions = ref<Record<string, string>>({})
  const analysis = shallowRef<Analysis | null>(null)
  const busy = ref(false)
  const error = ref('')
  const isDemo = ref(false)
  let generation = 0

  const authors = computed(() => {
    const counts = new Map<string, number>()
    for (const paper of files.value.flatMap((f) => f.papers)) {
      for (const id of new Set(paper.authorIds)) counts.set(id, (counts.get(id) || 0) + 1)
    }
    return [...counts]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([value, count]) => ({
        value,
        label: `${value} · ${count.toLocaleString()} publications`,
      }))
  })

  function invalidate() {
    analysis.value = null
  }
  watch(selectedAuthor, () => {
    decisions.value = {}
    invalidate()
  })

  async function importFiles(incoming: File[]) {
    const job = ++generation
    busy.value = true
    error.value = ''
    invalidate()
    decisions.value = {}
    try {
      const parsed: ParsedFile[] = []
      for (const file of incoming) {
        if (file.size > 30 * 1024 * 1024)
          throw new Error(
            `${file.name}: please split exports larger than 30 MB into smaller batches.`,
          )
        const text = await file.text()
        if (generation !== job) return
        const parsedFile = parseText(file.name, text)
        const oldId = parsedFile.id
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
        if (generation !== job) return
        parsedFile.id = `sha256:${Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')}`
        for (const issue of parsedFile.issues)
          if (issue.fileId === oldId) issue.fileId = parsedFile.id
        parsed.push(parsedFile)
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
      if (generation !== job) return
      files.value = [
        ...new Map([...files.value, ...parsed].map((file) => [file.id, file])).values(),
      ]
      isDemo.value = false
      if (!selectedAuthor.value && authors.value.length)
        selectedAuthor.value = authors.value[0]!.value
    } catch (cause) {
      if (generation === job)
        error.value =
          cause instanceof Error
            ? cause.message
            : 'Could not read these files. Try exporting CSV again.'
    } finally {
      if (generation === job) busy.value = false
    }
  }

  function removeFile(id: string) {
    files.value = files.value.filter((f) => f.id !== id)
    decisions.value = {}
    invalidate()
  }
  function calculate() {
    error.value = ''
    try {
      analysis.value = analyze(
        files.value,
        selectedAuthor.value
          .trim()
          .split(/[;,\s]+/)
          .filter(Boolean),
        reference,
        decisions.value,
      )
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Please check the supplied files.'
    }
  }
  function resolve(key: string, eid: string) {
    decisions.value = { ...decisions.value, [key]: eid }
    invalidate()
  }
  function clear() {
    generation++
    busy.value = false
    files.value = []
    selectedAuthor.value = ''
    decisions.value = {}
    analysis.value = null
    error.value = ''
    isDemo.value = false
  }
  async function loadDemo() {
    clear()
    const job = generation
    busy.value = true
    try {
      const names = ['publications.csv', 'including.csv', 'excluding.csv']
      const demoFiles = await Promise.all(
        names.map(async (name) => {
          const response = await fetch(`/demo/${name}`)
          if (!response.ok) throw new Error('Could not load the example. Please try again.')
          return new File([await response.text()], name, { type: 'text/csv' })
        }),
      )
      if (generation !== job) return
      await importFiles(demoFiles)
      if (generation !== job + 1) return
      selectedAuthor.value = '123'
      // Flush the author watcher before calculating, so results remain visible.
      await nextTick()
      isDemo.value = true
      calculate()
    } catch (cause) {
      if (generation === job)
        error.value = cause instanceof Error ? cause.message : 'Could not load the example.'
    } finally {
      if (generation === job || generation === job + 1) busy.value = false
    }
  }
  return {
    files,
    selectedAuthor,
    authors,
    decisions,
    analysis,
    busy,
    error,
    isDemo,
    importFiles,
    removeFile,
    calculate,
    resolve,
    clear,
    loadDemo,
  }
}
import { computed, shallowRef, ref, watch, nextTick } from 'vue'
