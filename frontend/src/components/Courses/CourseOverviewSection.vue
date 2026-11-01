<template>
	<section class="space-y-4 border-t pt-5">
		<div class="text-base-semibold text-ink-gray-9">
			{{ __('Resumen del curso') }}
		</div>
		<div class="space-y-1.5">
			<InputLabel
				:id="descriptionLabelId"
				:for-id="descriptionId"
				:label="__('Descripción del curso')"
				:required="true"
			/>
			<div
				class="rounded-t-6 rounded-b-5 outline-none transition-[box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
			>
				<RichTextEditor
					:id="descriptionId"
					:ariaLabelledby="descriptionLabelId"
					:content="doc.description"
					@change="
						(val) => {
							doc.description = val
							markDirty()
						}
					"
					:editable="true"
					:fixedMenu="true"
					minHeight="10rem"
				/>
			</div>
		</div>
	</section>

	<section class="space-y-4 border-t pt-5">
		<div>
			<div class="text-base-semibold text-ink-gray-9">
				{{ __('Datos para buscadores') }}
			</div>
			<div class="mt-1 text-p-sm text-ink-gray-6">
				{{
					__(
						'Estos datos ayudan a describir el curso en los resultados de búsqueda.'
					)
				}}
			</div>
		</div>
		<div class="course-seo-grid">
  <div class="course-seo-field">
    <FormControl
			v-model="meta.description"
			:label="__('Descripción para buscadores')"
			type="textarea"
			:placeholder="
				__(
					'Escribe un resumen breve del curso para los resultados de búsqueda.'
				)
			"
			variant="outline"
			@input="markDirty()"
		/>
  </div>
  <div class="course-seo-field">
    <FormControl
			v-model="meta.keywords"
			:label="__('Palabras clave')"
			type="textarea"
			:placeholder="__('Palabras clave separadas por comas')"
			variant="outline"
			@input="markDirty()"
		/>
  </div>
</div>
	</section>
</template>

<script setup lang="ts">
import { FormControl } from 'frappe-ui'
import { computed, inject, useId } from 'vue'
import type { CourseFormContext } from '@/types'
import RichTextEditor from '@/components/RichTextEditor.vue'
import { InputLabel } from 'frappe-ui/experimental'

const { resource, meta, markDirty } = inject<CourseFormContext>('courseForm')!
const doc = computed(() => resource.doc)
const descriptionId = useId()
const descriptionLabelId = useId()
</script>


<style scoped>
.course-seo-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 1rem;
    width: 100%;
}

.course-seo-field {
    min-width: 0;
}

.course-seo-field :deep(textarea) {
    height: 4rem;
    min-height: 4rem;
    max-height: 6rem;
    resize: vertical;
}

@media (max-width: 640px) {
    .course-seo-grid {
        grid-template-columns: minmax(0, 1fr);
        gap: 0.75rem;
    }
}
</style>
