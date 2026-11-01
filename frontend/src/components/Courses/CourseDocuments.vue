<template>
	<section class="course-documents">
		<div class="course-documents__heading">
			<div>
				<p class="course-documents__eyebrow">{{ __('Material académico') }}</p>
				<h2>{{ __('Sílabo y cronograma') }}</h2>
				<p class="course-documents__description">
					{{ __('Consulta o descarga los documentos PDF de este curso.') }}
				</p>
				<p v-if="canManage" class="course-documents__visibility-note">
					{{
						__(
							'Los PDF se publican para que puedan consultarse desde el catálogo del curso.'
						)
					}}
				</p>
			</div>
			<span class="lucide-files size-5 text-ink-gray-6" aria-hidden="true" />
		</div>

		<div class="course-documents__grid">
			<article
				v-for="kind in documentKinds"
				:key="kind.field"
				class="course-documents__card"
			>
				<div class="course-documents__card-heading">
					<span class="course-documents__icon" aria-hidden="true">
						<span :class="kind.icon" class="size-5" />
					</span>
					<div>
						<h3>{{ kind.label }}</h3>
						<p>{{ __('Documento PDF') }}</p>
					</div>
				</div>

				<div
					v-if="documentsFor(kind.field).length"
					class="course-documents__files"
				>
					<a
						v-for="file in documentsFor(kind.field)"
						:key="file.name"
						:href="safeUrl(file.file_url)"
						v-external
						rel="noopener noreferrer"
						class="course-documents__file"
					>
						<span class="lucide-file-text size-4 shrink-0" aria-hidden="true" />
						<span class="min-w-0 flex-1 truncate">{{ file.file_name }}</span>
						<span
							class="lucide-arrow-down-to-line size-4 shrink-0"
							aria-hidden="true"
						/>
					</a>
				</div>
				<p v-else class="course-documents__empty">
					{{ __('Aún no se ha agregado este documento.') }}
				</p>

				<FileUploader
					v-if="canManage"
					:fileTypes="['.pdf']"
					:private="false"
					doctype="LMS Course"
					:docname="courseName"
					:fieldname="kind.field"
					@success="(file) => onUploaded(file.file_name)"
					@failure="onUploadFailure"
				>
					<template #default="{ openFileSelector, uploading }">
						<Button
							class="course-documents__upload"
							:loading="uploading"
							@click="openFileSelector"
						>
							<span class="lucide-upload size-4" aria-hidden="true" />
							{{ uploading ? __('Subiendo…') : __('Agregar PDF') }}
						</Button>
					</template>
				</FileUploader>
			</article>
		</div>
	</section>
</template>

<script setup lang="ts">
import {
	Button,
	FileUploader,
	UploadError,
	createResource,
	toast,
} from 'frappe-ui'
import { computed, watch } from 'vue'
import { resourceErrorMessage } from '@/utils/resource'
import { safeUrl } from '@/utils/safeUrl'

interface CourseFile {
	name: string
	file_name: string
	file_url: string
	attached_to_field: string
	creation: string
}

const props = defineProps<{
	courseName: string
	canManage?: boolean
}>()

const documentKinds = [
	{
		field: 'syllabus_pdf',
		label: __('Sílabo'),
		icon: 'lucide-book-open-check',
	},
	{
		field: 'schedule_pdf',
		label: __('Cronograma'),
		icon: 'lucide-calendar-days',
	},
]

const files = createResource({
	url: 'frappe.client.get_list',
	auto: false,
	onError(error) {
		toast.error(
			resourceErrorMessage(
				error,
				__('No se pudieron cargar los documentos del curso')
			)
		)
	},
	makeParams() {
		return {
			doctype: 'File',
			fields: [
				'name',
				'file_name',
				'file_url',
				'attached_to_field',
				'creation',
			],
			filters: {
				attached_to_doctype: 'LMS Course',
				attached_to_name: props.courseName,
				attached_to_field: ['in', documentKinds.map((kind) => kind.field)],
				is_private: 0,
			},
			order_by: 'creation desc',
			limit_page_length: 100,
		}
	},
})

const documents = computed<CourseFile[]>(
	() => (files.data || []) as CourseFile[]
)

watch(
	() => props.courseName,
	(courseName) => {
		if (courseName) files.reload()
	},
	{ immediate: true }
)

function documentsFor(field: string): CourseFile[] {
	return documents.value.filter((file) => file.attached_to_field === field)
}

function onUploaded(fileName: string) {
	toast.success(`${fileName} ${__('se agregó al curso')}`)
	files.reload()
}

function onUploadFailure(error: unknown) {
	const message =
		error instanceof UploadError ? error.message : __('No se pudo subir el PDF')
	toast.error(resourceErrorMessage(error, message))
}
</script>

<style scoped>
.course-documents {
        min-width: 0;
        padding: 1rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border: 1px solid #D8E5F0;
        /* token-exempt-end */
        border-radius: 14px;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: #FFFFFF;
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        box-shadow: 0 3px 12px rgb(23 50 77 / 4%);
        /* token-exempt-end */
}

.course-documents__heading,
.course-documents__card-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
}

.course-documents__eyebrow {
        margin: 0 0 0.2rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #1769AA;
        /* token-exempt-end */
        font-size: 0.7rem;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
}

.course-documents__heading h2 {
        margin: 0;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #17324D;
        /* token-exempt-end */
        font-size: 1.05rem;
        font-weight: 700;
}

.course-documents__description,
.course-documents__card-heading p {
        margin: 0.2rem 0 0;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #647B91;
        /* token-exempt-end */
        font-size: 0.8rem;
}

.course-documents__visibility-note {
        margin: 0.35rem 0 0;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #247DBB;
        /* token-exempt-end */
        font-size: 0.76rem;
}

.course-documents__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.75rem;
        margin-top: 0.85rem;
}

.course-documents__card {
        min-width: 0;
        padding: 0.8rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border: 1px solid #D8E5F0;
        /* token-exempt-end */
        border-radius: 11px;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: #F8FBFF;
        /* token-exempt-end */
}

.course-documents__card-heading {
        justify-content: flex-start;
        align-items: center;
        gap: 0.65rem;
}

.course-documents__icon {
        display: grid;
        width: 2.15rem;
        height: 2.15rem;
        place-items: center;
        flex: none;
        border-radius: 0.65rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: #EAF4FF;
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #1769AA;
        /* token-exempt-end */
}

.course-documents__card-heading h3 {
        margin: 0;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #17324D;
        /* token-exempt-end */
        font-size: 0.9rem;
        font-weight: 700;
}

.course-documents__files {
        display: grid;
        gap: 0.4rem;
        margin-top: 0.65rem;
}

.course-documents__file {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;
        padding: 0.55rem 0.65rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border: 1px solid #D8E5F0;
        /* token-exempt-end */
        border-radius: 8px;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: #FFFFFF;
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #1769AA;
        /* token-exempt-end */
        font-size: 0.8rem;
        text-decoration: none;
        transition: border-color 160ms ease, background-color 160ms ease;
}

.course-documents__file:hover {
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border-color: #247DBB;
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: #EAF4FF;
        /* token-exempt-end */
}

.course-documents__empty {
        margin: 0.65rem 0;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #647B91;
        /* token-exempt-end */
        font-size: 0.8rem;
}

.course-documents__upload {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        margin-top: 0.6rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border: 1px solid #1769AA !important;
        /* token-exempt-end */
        border-radius: 8px !important;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: #1769AA !important;
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #FFFFFF !important;
        /* token-exempt-end */
        font-size: 0.8rem;
        transition: background-color 160ms ease;
}

.course-documents__upload:hover {
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: #247DBB !important;
        /* token-exempt-end */
}

@media (max-width: 640px) {
        .course-documents {
                padding: 0.8rem;
        }

        .course-documents__grid {
                grid-template-columns: 1fr;
                gap: 0.65rem;
        }

        .course-documents__card {
                padding: 0.75rem;
        }
}

/* COURSE-DOCUMENTS-LAYOUT-FIX-V2 */
.course-documents {
    width: 100%;
    min-width: 0;
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    background: #ffffff;
    /* token-exempt-end */
}

.course-documents__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: stretch;
    gap: 0.85rem;
    width: 100%;
}

.course-documents__card {
    display: flex;
    min-width: 0;
    min-height: 190px;
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;
    padding: 0.9rem;
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    border: 1px solid #d8e5f0;
    /* token-exempt-end */
    border-radius: 12px;
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    background: #f8fbff;
    /* token-exempt-end */
}

.course-documents__card-heading {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    min-width: 0;
    gap: 0.65rem;
}

.course-documents__card-heading > div {
    min-width: 0;
}

.course-documents__files {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 0.45rem;
}

.course-documents__file {
    display: flex;
    width: 100%;
    min-width: 0;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.65rem;
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    border: 1px solid #d8e5f0;
    /* token-exempt-end */
    border-radius: 8px;
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    background: #ffffff;
    /* token-exempt-end */
}

.course-documents__empty {
    margin: 0.35rem 0;
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    color: #647b91;
    /* token-exempt-end */
    font-size: 0.8rem;
    line-height: 1.45;
}

.course-documents__upload {
    display: inline-flex;
    width: 100%;
    min-height: 2.4rem;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    margin-top: auto;
    white-space: nowrap;
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    border: 1px solid #1769aa !important;
    /* token-exempt-end */
    border-radius: 8px !important;
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    background: #1769aa !important;
    /* token-exempt-end */
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    color: #ffffff !important;
    /* token-exempt-end */
    font-size: 0.8rem;
}

.course-documents__upload:hover {
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    background: #104f85 !important;
    /* token-exempt-end */
}

@media (max-width: 640px) {
    .course-documents__grid {
        grid-template-columns: minmax(0, 1fr);
    }

    .course-documents__card {
        min-height: 0;
    }
}
/* END COURSE-DOCUMENTS-LAYOUT-FIX-V2 */

</style>
