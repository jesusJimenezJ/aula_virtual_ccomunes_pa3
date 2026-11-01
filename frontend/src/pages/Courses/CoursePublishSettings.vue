<template>
	<div v-if="doc" class="course-publish-settings min-w-0 w-full">
		<CollapsibleSection :label="__('Visibilidad')">
			<div class="flex flex-col gap-y-4">
				<BooleanSwitch
					size="sm"
					v-model="doc.upcoming"
					:label="__('Próximo')"
					:description="__('Las matrículas se abrirán en la fecha programada.')"
					@update:modelValue="markDirty()"
				/>
				<BooleanSwitch
					size="sm"
					v-model="selfEnrollment"
					:label="__('Permitir inscripción directa')"
					:description="
						__('Permitir que los estudiantes se inscriban directamente.')
					"
				/>
				<BooleanSwitch
					size="sm"
					v-model="doc.enforce_lesson_completion"
					:label="__('Requerir completar las lecciones')"
					:description="
						__(
							'Los estudiantes deben completar cada lección antes de abrir la siguiente.'
						)
					"
					@update:modelValue="markDirty()"
				/>
			</div>
		</CollapsibleSection>

		<CollapsibleSection :label="__('Matrícula y pago')">
			<div class="flex flex-col gap-y-4">
				<BooleanSwitch
					size="sm"
					:modelValue="Boolean(doc?.paid_course)"
					:label="__('Curso de pago')"
					:description="
						__('Cobrar una tarifa de matrícula para acceder al curso.')
					"
					@update:modelValue="setPaidCourse"
				/>
				<template v-if="doc?.paid_course">
					<Link
						v-model="doc.currency"
						doctype="Currency"
						:label="__('Moneda')"
						:filters="{ enabled: 1 }"
						:placeholder="__('Selecciona una moneda')"
						variant="outline"
						:required="true"
						@update:modelValue="markDirty()"
					/>
					<FormControl
						v-model="doc.course_price"
						type="number"
						min="0"
						:label="__('Precio del curso')"
						variant="outline"
						:required="true"
						@input="markDirty()"
					/>
				</template>
			</div>
		</CollapsibleSection>
	</div>

	<Dialog
		v-model:open="showPaymentsAppModal"
		:title="__('Se necesita la aplicación de pagos')"
		:actions="[
			{
				label: __('Instalar la aplicación de pagos'),
				variant: 'solid',
				onClick: ({ close }: any) => {
					openPaymentsApp()
					close()
				},
			},
		]"
	>
		<template #default>
			<p class="text-p-base text-ink-gray-7">
				{{
					__(
						'Para cobrar por un curso, instala la aplicación de pagos desde Frappe Marketplace y vuelve a activar esta opción.'
					)
				}}
			</p>
		</template>
	</Dialog>
</template>

<script setup lang="ts">
import { Dialog, FormControl } from 'frappe-ui'
import BooleanSwitch from '@/components/Controls/BooleanSwitch.vue'
import { computed, inject, ref } from 'vue'
import CollapsibleSection from '@/components/CollapsibleSection.vue'
import Link from '@/components/Controls/Link.vue'
import { useSettings } from '@/stores/settings'
import type { CourseFormContext } from '@/types'
import { openExternal } from '@/utils/openExternal'

const { resource, markDirty } = inject<CourseFormContext>('courseForm')!

const settingsStore = useSettings()
// Only block when we positively know the app is missing; if settings haven't
// loaded yet, let it through (the backend validation is the hard guard).
const paymentsAppMissing = computed<boolean>(
	() =>
		!!settingsStore.settings.data &&
		!settingsStore.settings.data.is_payments_app_installed
)

const doc = computed(() => resource.doc)
const showPaymentsAppModal = ref<boolean>(false)

const selfEnrollment = computed<boolean>({
	get: () => !resource.doc?.disable_self_learning,
	set: (val: boolean) => {
		if (!resource.doc) return
		resource.doc.disable_self_learning = val ? 0 : 1
		markDirty()
	},
})

function setPaidCourse(val: number | boolean) {
	if (!resource.doc) return
	if (val && paymentsAppMissing.value) {
		showPaymentsAppModal.value = true
		return
	}
	resource.doc.paid_course = val ? 1 : 0
	markDirty()
}

function openPaymentsApp() {
	openExternal('https://frappecloud.com/marketplace/apps/payments')
}
</script>


<style scoped>
.course-publish-settings {
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #17324D;
        /* token-exempt-end */
        overflow-wrap: anywhere;
}

/* Secciones desplegables */
.course-publish-settings :deep(details) {
        overflow: hidden;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border: 1px solid #D8E5F0;
        /* token-exempt-end */
        border-radius: 12px;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: #FFFFFF;
        /* token-exempt-end */
        margin-bottom: 12px;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        box-shadow: 0 1px 3px rgb(23 50 77 / 5%);
        /* token-exempt-end */
}

.course-publish-settings :deep(summary) {
        min-width: 0;
        padding: 16px;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: #EAF4FF;
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #17324D;
        /* token-exempt-end */
        transition: background-color 160ms ease;
}

.course-publish-settings :deep(summary:hover) {
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: #DFEEFC;
        /* token-exempt-end */
}

.course-publish-settings :deep(summary > div:first-child) {
        min-width: 0;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #174F7A;
        /* token-exempt-end */
}

.course-publish-settings :deep(summary span) {
        overflow-wrap: anywhere;
}

.course-publish-settings :deep(details > div:last-child) {
        min-width: 0;
        padding: 16px;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: #FFFFFF;
        /* token-exempt-end */
}

/* Switches: solo los de este panel */
.course-publish-settings :deep([role="switch"]) {
        flex-shrink: 0;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border-color: #B8CCDE !important;
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background-color: #DCE7F0 !important;
        /* token-exempt-end */
        transition: background-color 160ms ease, border-color 160ms ease;
}

.course-publish-settings :deep([role="switch"][data-state="checked"]) {
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border-color: #1769AA !important;
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background-color: #1769AA !important;
        /* token-exempt-end */
}

.course-publish-settings :deep([role="switch"]:focus-visible) {
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        outline: 2px solid #247DBB;
        /* token-exempt-end */
        outline-offset: 3px;
}

.course-publish-settings :deep([role="switch"]:disabled) {
        opacity: 0.55;
}

/* Campos y controles del panel */
.course-publish-settings :deep(input),
.course-publish-settings :deep(textarea),
.course-publish-settings :deep(select) {
        max-width: 100%;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border-color: #C9D9E7;
        /* token-exempt-end */
        border-radius: 8px;
}

.course-publish-settings :deep(input:focus),
.course-publish-settings :deep(textarea:focus),
.course-publish-settings :deep(select:focus) {
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border-color: #247DBB;
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        outline-color: #247DBB;
        /* token-exempt-end */
}

/* Evitar que los textos largos empujen el panel */
.course-publish-settings :deep(label),
.course-publish-settings :deep(p) {
        overflow-wrap: anywhere;
}

@media (max-width: 767px) {
        .course-publish-settings :deep(summary) {
                padding: 14px;
        }

        .course-publish-settings :deep(details > div:last-child) {
                padding: 14px;
        }
}
</style>
