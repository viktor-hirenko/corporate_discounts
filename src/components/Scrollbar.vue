<script setup lang="ts">
import { ref, onUnmounted, watch } from 'vue'

interface Props {
  containerRef: HTMLElement | null
  parentRef?: HTMLElement | null
}

const props = defineProps<Props>()

const scrollbarRef = ref<HTMLElement | null>(null)
const thumbRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragStartY = ref(0)
const dragStartScrollTop = ref(0)

const scrollTop = ref(0)
const scrollHeight = ref(0)
const clientHeight = ref(0)

const thumbHeight = ref(0)
const thumbTop = ref(0)

const THUMB_MIN_HEIGHT = 20

function updateScrollbar() {
  if (!props.containerRef) return

  const container = props.containerRef
  scrollTop.value = container.scrollTop
  scrollHeight.value = container.scrollHeight
  clientHeight.value = container.clientHeight

  // Вычисляем высоту thumb
  const scrollableHeight = scrollHeight.value - clientHeight.value
  if (scrollableHeight <= 0) {
    thumbHeight.value = 0
    return
  }

  const visibleRatio = clientHeight.value / scrollHeight.value
  thumbHeight.value = Math.max(THUMB_MIN_HEIGHT, clientHeight.value * visibleRatio)

  // Вычисляем позицию thumb
  const scrollRatio = scrollTop.value / scrollableHeight
  thumbTop.value = (clientHeight.value - thumbHeight.value) * scrollRatio
}

function handleScroll() {
  updateScrollbar()
}

function handleThumbMouseDown(event: MouseEvent) {
  if (!props.containerRef || !thumbRef.value) return

  isDragging.value = true
  dragStartY.value = event.clientY
  dragStartScrollTop.value = props.containerRef.scrollTop

  document.addEventListener('mousemove', handleThumbMouseMove)
  document.addEventListener('mouseup', handleThumbMouseUp)
  event.preventDefault()
}

function handleThumbMouseMove(event: MouseEvent) {
  if (!isDragging.value || !props.containerRef) return

  const container = props.containerRef
  const deltaY = event.clientY - dragStartY.value
  const scrollableHeight = scrollHeight.value - clientHeight.value
  const thumbMaxTop = clientHeight.value - thumbHeight.value
  const scrollRatio = deltaY / thumbMaxTop

  container.scrollTop = dragStartScrollTop.value + scrollRatio * scrollableHeight
}

function handleThumbMouseUp() {
  isDragging.value = false
  document.removeEventListener('mousemove', handleThumbMouseMove)
  document.removeEventListener('mouseup', handleThumbMouseUp)
}

function handleTrackClick(event: MouseEvent) {
  if (!props.containerRef || !scrollbarRef.value) return

  const container = props.containerRef
  const rect = scrollbarRef.value.getBoundingClientRect()
  const clickY = event.clientY - rect.top
  const clickRatio = clickY / clientHeight.value

  const scrollableHeight = scrollHeight.value - clientHeight.value
  container.scrollTop = clickRatio * scrollableHeight
}

let resizeObserver: ResizeObserver | null = null

function setupObservers() {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  if (props.containerRef) {
    props.containerRef.addEventListener('scroll', handleScroll)

    resizeObserver = new ResizeObserver(() => {
      updateScrollbar()
    })
    resizeObserver.observe(props.containerRef)
    if (props.parentRef) {
      resizeObserver.observe(props.parentRef)
    }

    updateScrollbar()
  }
}

function cleanupObservers() {
  if (props.containerRef) {
    props.containerRef.removeEventListener('scroll', handleScroll)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
}

watch(
  () => props.containerRef,
  (newContainer, oldContainer) => {
    if (oldContainer) {
      cleanupObservers()
    }
    if (newContainer) {
      setupObservers()
    }
  },
  { immediate: true },
)

watch(
  () => props.parentRef,
  () => {
    if (props.containerRef) {
      cleanupObservers()
      setupObservers()
    }
  },
)

onUnmounted(() => {
  if (props.containerRef) {
    props.containerRef.removeEventListener('scroll', handleScroll)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  document.removeEventListener('mousemove', handleThumbMouseMove)
  document.removeEventListener('mouseup', handleThumbMouseUp)
})
</script>

<template>
  <div
    v-if="scrollHeight > clientHeight && parentRef"
    ref="scrollbarRef"
    class="scrollbar"
    :style="{
      height: `${parentRef.clientHeight}px`,
    }"
    @click="handleTrackClick"
  >
    <div
      ref="thumbRef"
      class="scrollbar__thumb"
      :style="{
        height: `${thumbHeight}px`,
        top: `${thumbTop}px`,
      }"
      @mousedown="handleThumbMouseDown"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/utils/functions' as *;

.scrollbar {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
  width: to-rem(8);
  background-color: var(--color-neutral-400);
  cursor: pointer;

  &__thumb {
    position: absolute;
    left: 0;
    width: 100%;
    border-radius: to-rem(4);
    background-color: #0927f2;
    transition: background-color 0.2s ease;
    cursor: grab;

    &:active {
      background-color: #0719c4;
      cursor: grabbing;
    }
  }
}
</style>
