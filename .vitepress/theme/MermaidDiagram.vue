<script setup>
import { onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

const props = defineProps({
  code: {
    type: String,
    required: true
  }
})

const { isDark } = useData()
const diagram = ref('')
const error = ref('')

async function renderDiagram() {
  try {
    const mermaid = (await import('mermaid')).default
    const id = `mermaid-${Math.random().toString(36).slice(2)}`

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'loose',
      theme: isDark.value ? 'dark' : 'default'
    })

    const result = await mermaid.render(id, props.code)
    diagram.value = result.svg
    error.value = ''
  } catch (err) {
    diagram.value = ''
    error.value = err instanceof Error ? err.message : String(err)
  }
}

onMounted(renderDiagram)
watch(isDark, renderDiagram)
watch(() => props.code, renderDiagram)
</script>

<template>
  <div class="mermaid-diagram">
    <div v-if="diagram" v-html="diagram"></div>
    <pre v-else class="mermaid-error"><code>{{ error || code }}</code></pre>
  </div>
</template>
