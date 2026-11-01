<template>
	<ListPage
		:breadcrumbs="breadcrumbs"
		:title="__('Catálogo de cursos')"
		:rows="courses.data || []"
		grid-class="course-catalog-grid"
		:loading="courses.list.loading || reloading"
		:total-count="courseCount"
		:has-next-page="courses.hasNextPage"
		v-model:page-length="pageLength"
		empty-name="Courses"
		empty-icon="lucide-book-open"
		@load-more="courses.next()"
	>
		<template #name>
			<span id="course-catalog">{{ __('Catálogo de cursos') }}</span>
		</template>

		<template #actions>
			<!-- token-exempt-start: colores de marca del botón Crear; conservar valores originales -->
			<Button
                                v-if="canCreateCourse()"
                                variant="solid"
                                class="!bg-[#399bd0] !border-[#a8dfff] !text-white hover:!bg-[#2789c0] hover:!border-[#c2e8ff] !h-[40px] !min-h-[40px] !min-w-[120px] !px-4 !rounded-[12px] !text-sm !font-bold shadow-sm hover:shadow-md transition-all duration-200"
                                @click="openNewCourse"
                        >
                                <template #prefix>
                                        <span class="lucide-plus size-4" />
                                </template>
                                {{ __('Crear') }}
                        </Button>
			<!-- token-exempt-end -->
		</template>

		<template #filters>
			<TabButtons
				:options="courseTabs"
				v-model="currentTab"
				class="!w-fit shrink-0"
			/>
			<FormControl
				v-model="title"
				:placeholder="__('Buscar cursos')"
				:aria-label="__('Buscar cursos')"
				type="text"
			>
				<template #prefix>
					<span class="lucide-search size-4 text-ink-gray-5" />
				</template>
			</FormControl>
			<ClearableCombobox
				v-if="categories.data?.length"
				v-model="currentCategory"
				:options="categories.data.filter((c) => c.value)"
				:placeholder="__('Categoría')"
				:aria-label="__('Categoría')"
				@update:modelValue="updateCourses()"
			/>

			<Checkbox
				:model-value="certification"
				:label="__('Solo cursos con certificación')"
				@update:model-value="setCertification"
			/>
		</template>

		<template #card="{ row }">
			<CourseCard
				:course="row"
				:to="{ name: 'CourseDetail', params: { courseName: row.name } }"
			/>
		</template>
	</ListPage>

	<router-view />
</template>
<script setup>
import {
	Button,
	Checkbox,
	createListResource,
	createResource,
	FormControl,
	TabButtons,
	usePageMeta,
} from 'frappe-ui'
import ClearableCombobox from '@/components/Controls/ClearableCombobox.vue'
import ListPage from '@/components/Layouts/pages/ListPage.vue'
import { computed, inject, onMounted, ref, watch } from 'vue'
import { sessionStore } from '@/stores/session'
import { canCreateCourse } from '@/utils'
import CourseCard from '@/components/CourseCard.vue'
import { useRouter } from 'vue-router'
import { openFormRoute } from '@/composables/useFormRoute'

const user = inject('$user')
const dayjs = inject('$dayjs')
const start = ref(0)
const currentCategory = ref(null)
const title = ref('')
const certification = ref(false)

const setCertification = (value) => {
	certification.value = value
	updateCourses()
}
const filters = ref({})
const currentTab = ref('live')
const { brand } = sessionStore()
const router = useRouter()

onMounted(() => {
	setFiltersFromQuery()
	updateCourses()
	// TextInput emits on input and change; watched after query hydration to avoid a refetch.
	watch(title, updateCourses)
})

const setFiltersFromQuery = () => {
	let queries = new URLSearchParams(location.search)
	title.value = queries.get('title') || ''
	currentCategory.value = queries.get('category') || null
	// `|| false` would keep the raw string, so ?certification=false read as on.
	certification.value = queries.get('certification') === 'true'
	const tab = queries.get('tab')
	if (tab) currentTab.value = tab
	// Compatibility shim: ?newCourse=1 was this page's ad-hoc deep link before
	// /courses/new existed. BatchCourseModal.vue:27 still emits it, as may
	// bookmarks and anything outside the SPA, so forward it rather than drop it.
	// replace(), so the query-param URL is not left behind as an entry the user
	// can go Back to and re-open the form from.
	if (queries.get('newCourse') == '1') {
		router.replace({ name: 'NewCourse' })
	}
}

const courses = createListResource({
	doctype: 'LMS Course',
	url: 'lms.lms.utils.get_courses',
	cache: ['courses', user.data?.name],
	pageLength: 24,
	start: start.value,
})

// The tabs filter on `enrolled`, `created` and `live`, which are not fields,
// so `frappe.client.get_count` cannot answer this; only the endpoint that
// resolves them can. Without it the footer can say how many rows it has but
// not how many there are.
const courseCountResource = createResource({
	url: 'lms.lms.utils.get_course_count',
	makeParams: () => ({ filters: filters.value }),
	onError: (error) => {
		console.error(error)
	},
})

const courseCount = computed(() => courseCountResource.data ?? null)

const getCourseCount = () => {
	// Same sequencing hazard as the list: nothing orders the responses, so a
	// slow count for filters the user has left would overwrite the current one.
	courseCountResource.abort()
	courseCountResource.submit()
}

// `list.loading` goes false mid-request: the aborted fetch's tail resolves
// after the new reload() has started and clears the flag for it, so the empty
// state flashes until the reload lands.
const reloading = ref(false)

const reloadCourses = async () => {
	reloading.value = true
	try {
		await courses.reload()
	} finally {
		reloading.value = false
	}
}

const pageLength = computed({
	get: () => courses.pageLength,
	set: (value) => {
		// reload() refetches only the rows already loaded when start > 0, so
		// without rewinding to the first page a bigger page size changes nothing.
		courses.update({ pageLength: value, start: 0 })
		reloadCourses()
	},
})

const categories = createListResource({
	doctype: 'LMS Category',
	url: 'lms.lms.utils.get_course_categories',
	cache: ['course_categories'],
	auto: true,
})

const updateCourses = () => {
	updateFilters()
	// createResource keeps no request sequence: every response assigns
	// `data`, so a slow fetch for filters the user has already left repaints
	// the list with the wrong courses seconds later. Cancel it first: an
	// aborted fetch is swallowed and never reaches the list.
	courses.list.abort()
	courses.update({
		filters: filters.value,
	})
	reloadCourses()
	getCourseCount()
}

const updateFilters = () => {
	updateCategoryFilter()
	updateTitleFilter()
	updateCertificationFilter()
	updateTabFilter()
	updateStudentFilter()
	setQueryParams()
}

const updateCategoryFilter = () => {
	if (currentCategory.value) {
		filters.value['category'] = currentCategory.value
	} else {
		delete filters.value['category']
	}
}

const updateTitleFilter = () => {
	if (title.value) {
		filters.value['title'] = ['like', `%${title.value}%`]
	} else {
		delete filters.value['title']
	}
}

const updateCertificationFilter = () => {
	if (certification.value) {
		filters.value['certification'] = 1
	} else {
		delete filters.value['certification']
	}
}

const updateTabFilter = () => {
	delete filters.value['live']
	delete filters.value['created']
	delete filters.value['published_on']
	delete filters.value['upcoming']

	if (currentTab.value == 'enrolled' && user.data?.is_student) {
		filters.value['enrolled'] = 1
		delete filters.value['published']
	} else {
		delete filters.value['published']
		delete filters.value['enrolled']

		if (currentTab.value == 'live') {
			filters.value['published'] = 1
			filters.value['upcoming'] = 0
			filters.value['live'] = 1
		} else if (currentTab.value == 'upcoming') {
			filters.value['upcoming'] = 1
		} else if (currentTab.value == 'new') {
			filters.value['published'] = 1
			filters.value['published_on'] = [
				'>=',
				dayjs().add(-3, 'month').format('YYYY-MM-DD'),
			]
		} else if (currentTab.value == 'created') {
			filters.value['created'] = 1
		} else if (currentTab.value == 'unpublished') {
			filters.value['published'] = 0
		}
	}
}

const updateStudentFilter = () => {
	if (!user.data || (user.data?.is_student && currentTab.value != 'enrolled')) {
		filters.value['published'] = 1
	}
}

const setQueryParams = () => {
	let queries = new URLSearchParams(location.search)
	let filterKeys = {
		title: title.value,
		category: currentCategory.value,
		certification: certification.value,
	}

	Object.keys(filterKeys).forEach((key) => {
		if (filterKeys[key]) {
			queries.set(key, filterKeys[key])
		} else {
			queries.delete(key)
		}
	})

	let queryString = ''
	if (queries.toString()) {
		queryString = `?${queries.toString()}`
	}

	// Carry the existing state forward rather than replacing it with `{}`. This
	// page hosts form child routes whose open/close semantics hang off a marker
	// in history.state, and that marker only survives a reload through
	// window.history. `{}` also being truthy means vue-router never re-seeds its
	// own `position` key after such a reload, so every later pop delta is NaN.
	history.replaceState(history.state, '', `${location.pathname}${queryString}`)
}

watch(currentTab, () => {
	updateCourses()
})

const courseTabs = computed(() => {
	let tabs = [
		{
			label: __('Publicados'),
			value: 'live',
		},
		{
			label: __('Próximos'),
			value: 'upcoming',
		},
	]
	if (
		user.data?.is_moderator ||
		user.data?.is_instructor ||
		user.data?.is_evaluator
	) {
		tabs.push({ label: __('Creados'), value: 'created' })
		tabs.push({ label: __('No publicados'), value: 'unpublished' })
	} else if (user.data) {
		tabs.push({ label: __('Mis cursos'), value: 'enrolled' })
	}
	return tabs
})

const openNewCourse = () => {
        openFormRoute(router, { name: 'NewCourse' })
}

const breadcrumbs = computed(() => [
	{
		label: __('Cursos'),
		route: { name: 'Courses' },
	},
])

usePageMeta(() => {
	return {
		title: __('Cursos'),
		icon: brand.favicon,
	}
})
</script>

<style scoped>
.catalog-hero {
	position: relative;
	display: flex;
	min-height: 17rem;
	align-items: center;
	justify-content: space-between;
	gap: 1.5rem;
	margin: 1.25rem 1.5rem 0;
	padding: clamp(1.5rem, 3vw, 2.25rem);
	border: 1px solid var(--surface-blue-2);
	border-radius: 1.25rem;
	overflow: hidden;
	background: radial-gradient(
			circle at 82% 15%,
			color-mix(in srgb, var(--ink-blue-5) 18%, transparent),
			transparent 25%
		),
		linear-gradient(
			112deg,
			var(--surface-blue-2) 0%,
			var(--surface-blue-2) 58%,
			var(--surface-blue-2) 100%
		);
	color: var(--ink-base);
	box-shadow: 0 10px 28px color-mix(in srgb, var(--ink-base) 7%, transparent);
}

.catalog-hero__copy {
	position: relative;
	z-index: 1;
	max-width: 45rem;
}

.catalog-hero__eyebrow {
	display: inline-flex;
	align-items: center;
	gap: 0.55rem;
	margin-bottom: 0.7rem;
	color: var(--ink-blue-5);
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.1em;
	text-transform: uppercase;
}

.catalog-hero__eyebrow-dot {
	width: 0.5rem;
	height: 0.5rem;
	border-radius: 50%;
	background: var(--ink-blue-5);
	box-shadow: 0 0 0 4px color-mix(in srgb, var(--ink-blue-5) 14%, transparent);
}

.catalog-hero h2 {
        color: var(--ink-blue-9);
	max-width: 37rem;
	margin: 0;
	font-size: clamp(1.85rem, 2.7vw, 2.4rem);
	font-weight: 750;
	letter-spacing: -0.035em;
	line-height: 1.08;
}

.catalog-hero p {
        color: var(--ink-gray-6);
	max-width: 38rem;
	margin: 0.7rem 0 1rem;
	color: var(--ink-gray-7);
	font-size: 0.98rem;
	line-height: 1.55;
}

.catalog-hero__cta {
	display: inline-flex;
	align-items: center;
	gap: 0.55rem;
	min-height: 2.65rem;
	padding: 0.65rem 1rem;
	border-radius: 0.75rem;
	background: var(--ink-blue-5);
	color: var(--surface-base);
	font-weight: 700;
	text-decoration: none;
	transition: transform 160ms ease, box-shadow 160ms ease;
}

.catalog-hero__cta:hover {
	transform: translateY(-2px);
	box-shadow: 0 8px 22px color-mix(in srgb, var(--ink-base) 16%, transparent);
}

.catalog-hero__art {
	position: relative;
	display: grid;
	width: min(30%, 16rem);
	min-width: 12rem;
	min-height: 10rem;
	place-items: center;
}

.catalog-hero__orbit {
	position: absolute;
	border: 1px solid color-mix(in srgb, var(--ink-blue-5) 18%, transparent);
	border-radius: 50%;
}

.catalog-hero__orbit--one {
	width: 12rem;
	height: 12rem;
}

.catalog-hero__orbit--two {
	width: 8.75rem;
	height: 8.75rem;
}

.catalog-hero__art-card {
	position: relative;
	display: flex;
	width: 10rem;
	min-height: 8.5rem;
	flex-direction: column;
	align-items: flex-start;
	justify-content: center;
	gap: 0.7rem;
	padding: 1rem;
	border: 1px solid color-mix(in srgb, var(--surface-base) 30%, transparent);
	border-radius: 1rem;
	background: var(--ink-blue-5);
	color: var(--surface-base);
	box-shadow: 0 14px 30px
		color-mix(in srgb, var(--ink-blue-7) 20%, transparent);
	transform: rotate(5deg);
}

.catalog-hero__art-card > span:first-child {
	color: var(--surface-blue-2);
}

.catalog-hero__art-card > span:nth-child(2) {
	font-size: 0.9rem;
	font-weight: 700;
}

.catalog-hero__art-lines {
	display: flex;
	width: 100%;
	flex-direction: column;
	gap: 0.35rem;
}

.catalog-hero__art-lines i {
	width: 100%;
	height: 0.25rem;
	border-radius: 999px;
	background: color-mix(in srgb, var(--surface-base) 28%, transparent);
}

.catalog-hero__art-lines i:nth-child(2) {
	width: 72%;
	background: var(--ink-blue-5);
}

.catalog-hero__art-lines i:nth-child(3) {
	width: 48%;
}

.catalog-hero__art-chip {
	position: absolute;
	right: -0.25rem;
	bottom: 0.1rem;
	padding: 0.45rem 0.65rem;
	border: 1px solid color-mix(in srgb, var(--ink-blue-5) 20%, transparent);
	border-radius: 999px;
	background: var(--surface-base);
	color: var(--ink-blue-7);
	font-size: 0.72rem;
	font-weight: 650;
	backdrop-filter: blur(8px);
}

@media (max-width: 700px) {
	.catalog-hero {
		min-height: 0;
		margin: 0.85rem 1rem 0;
		padding: 1.4rem;
	}

	.catalog-hero__art {
		display: none;
	}
}

:deep(.course-catalog-grid) {
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 22rem));
	justify-content: start;
}





/* CATALOG-UI-REFINEMENT-V4 */

/* Encabezado */
:global(body:has(#course-catalog) [data-testid="page-header-block"]) {
    display: flex !important;
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 1rem !important;
    margin-bottom: 1.25rem !important;
    padding: 1.25rem 1.5rem !important;
    border-bottom: 1px solid var(--outline-gray-2) !important;
    background: transparent !important;
}

:global(body:has(#course-catalog) [data-testid="page-header-block"] h1) {
    color: var(--ink-blue-9) !important;
    font-size: 1.3rem !important;
    font-weight: 750 !important;
}

/* Distribución de filtros */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child) {
    display: grid !important;
    grid-template-columns: max-content minmax(220px, 1.2fr) minmax(180px, 0.85fr) minmax(205px, max-content) !important;
    align-items: center !important;
    gap: 0.75rem !important;
    width: 100% !important;
}

:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > *) {
    min-width: 0 !important;
    width: 100% !important;
}

/* Pestañas */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child) {
    display: inline-flex !important;
    width: fit-content !important;
    max-width: 100% !important;
    padding: 4px !important;
    gap: 3px !important;
    border: 1px solid var(--surface-blue-3) !important;
    border-radius: 0.85rem !important;
    background: var(--surface-blue-2) !important;
}

:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child button) {
    min-height: 2.5rem !important;
    padding: 0.5rem 1rem !important;
    border: 1px solid transparent !important;
    border-radius: 0.65rem !important;
    background: transparent !important;
    color: var(--ink-gray-6) !important;
    box-shadow: none !important;
    font-weight: 600 !important;
    white-space: nowrap !important;
}

/* Estado activo */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child button[aria-pressed="true"]),
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child button[aria-selected="true"]),
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child button[data-state="active"]),
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child button.active) {
    background: var(--ink-blue-5) !important;
    border-color: var(--ink-blue-5) !important;
    color: white !important;
    box-shadow: 0 2px 6px color-mix(in srgb, var(--ink-blue-5) 18%, transparent) !important;
}

:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child button:hover) {
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    background-color: #DCEBFA !important;
    /* token-exempt-end */
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    color: #1769AA !important;
    /* token-exempt-end */
}

/* Buscador */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(2) input:not([type="checkbox"]):not([type="radio"])) {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 2.75rem !important;
    border: 1px solid var(--surface-blue-2) !important;
    border-radius: 0.75rem !important;
    background: var(--surface-base) !important;
    color: var(--ink-blue-9) !important;
    box-shadow: none !important;
}

/* Categoría */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3)) {
    background: transparent !important;
}

:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) [role="combobox"]),
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) button) {
    min-height: 2.75rem !important;
    border: 1px solid var(--surface-blue-2) !important;
    border-radius: 0.75rem !important;
    background: var(--surface-base) !important;
    color: var(--ink-gray-6) !important;
    box-shadow: none !important;
}

/* Certificación */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(4)) {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-start !important;
    gap: 0.6rem !important;
    width: max-content !important;
    min-width: 0 !important;
    background: transparent !important;
    color: var(--ink-blue-9) !important;
    font-size: 0.875rem !important;
    line-height: 1.35 !important;
}

:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(4) input[type="checkbox"]) {
    flex: 0 0 1rem !important;
    width: 1rem !important;
    height: 1rem !important;
    min-height: 1rem !important;
    margin: 0 !important;
    accent-color: var(--ink-blue-5) !important;
}

/* Paginación */
:global(body:has(#course-catalog) .z-10.mt-auto.shrink-0) {
    border-top: 1px solid var(--outline-gray-2) !important;
    background: var(--surface-base) !important;
    box-shadow: 0 -4px 14px color-mix(in srgb, var(--ink-blue-9) 5%, transparent) !important;
}

/* Tablet */
@media (max-width: 1100px) {
    :global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child) {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
    }

    :global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child) {
        grid-column: 1 / -1 !important;
    }
}

/* Móvil */
@media (max-width: 639px) {
    :global(body:has(#course-catalog) [data-testid="page-header-block"]) {
        padding: 1rem !important;
    }

    :global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child) {
        grid-template-columns: minmax(0, 1fr) !important;
    }

    :global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child) {
        grid-column: auto !important;
        width: fit-content !important;
    }

    :global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(4)) {
        width: 100% !important;
    }
}



/* CATALOG-UI-REFINEMENT-V5 - ELIMINAR FONDO GRIS DE CATEGORIA */

/* Contenedor exterior del ClearableCombobox */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3)) {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
}

/* Contenedor interno generado por frappe-ui */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) > div) {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
}

/* Campo completo de categoría */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) button) {
    background: var(--surface-base) !important;
    background-color: var(--surface-base) !important;
    border: 1px solid var(--surface-blue-2) !important;
    border-radius: 0.75rem !important;
    color: var(--ink-gray-6) !important;
    box-shadow: none !important;
}

/* Icono desplegable */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) .lucide-chevron-down) {
    color: var(--ink-blue-5) !important;
}

/* Evitar que aparezca el fondo gris al pasar el cursor */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) button:hover) {
    background: var(--surface-blue-2) !important;
    background-color: var(--surface-blue-2) !important;
}


/* CATALOG-UI-REFINEMENT-V6 */

/* 1. Pestañas: contenedor exterior transparente */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child) {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    outline: none !important;
    padding: 0 !important;
    margin: 0 !important;
}

:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child button) {
    background: var(--surface-base) !important;
    background-color: var(--surface-base) !important;
    color: var(--ink-gray-6) !important;
    box-shadow: none !important;
}

/* Mantener azul la pestaña seleccionada */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child button[aria-pressed="true"]),
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child button[aria-selected="true"]),
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child button[data-state="active"]),
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child button.active),
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :first-child button[class*="surface-white"]) {
    background: var(--ink-blue-5) !important;
    background-color: var(--ink-blue-5) !important;
    color: white !important;
}

/* 2. Categoría: eliminar todos los fondos grises internos */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3)),
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) > div) {
    background: var(--surface-base) !important;
    background-color: var(--surface-base) !important;
    border-color: var(--surface-blue-2) !important;
    box-shadow: none !important;
}

/* Campo y texto */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) input),
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) button) {
    background: var(--surface-base) !important;
    background-color: var(--surface-base) !important;
    color: var(--ink-gray-6) !important;
}

/* Alinear verticalmente el contenido del selector */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) button) {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    min-height: 2.75rem !important;
    border-radius: 0.75rem !important;
}

/* Flecha */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) .lucide-chevron-down) {
    flex-shrink: 0 !important;
    margin-left: auto !important;
    color: var(--ink-blue-5) !important;
}

/* 3. Separación pequeña entre filtros y tarjetas */
:global(body:has(#course-catalog) [data-testid="page-header-block"]) {
    padding-bottom: 0.5rem !important;
    margin-bottom: 0.75rem !important;
    border-bottom: 0 !important;
}


/* CATALOG-UI-REFINEMENT-V7 - SELECTORES REALES */

/* 1. PESTAÑAS: eliminar el fondo gris del contenedor */
:global(body:has(#course-catalog) [data-slot="tab-buttons"]) {
    background: var(--surface-base) !important;
    background-color: var(--surface-base) !important;
    border: 1px solid var(--outline-gray-2) !important;
    box-shadow: none !important;
    border-radius: 0.85rem !important;
}

/* Indicador de pestaña seleccionada */
:global(body:has(#course-catalog) [data-slot="tab-indicator"]) {
    background: var(--ink-blue-5) !important;
    background-color: var(--ink-blue-5) !important;
    border-radius: 0.65rem !important;
    box-shadow: 0 2px 5px color-mix(in srgb, var(--ink-blue-5) 18%, transparent) !important;
}

/* Botones de pestañas */
:global(body:has(#course-catalog) [data-slot="tab-button"]) {
    background: transparent !important;
    color: var(--ink-gray-6) !important;
}

/* Texto de la pestaña seleccionada */
:global(body:has(#course-catalog) [data-slot="tab-button"][aria-checked="true"] > span) {
    color: white !important;
}

/* Texto de las pestañas no seleccionadas */
:global(body:has(#course-catalog) [data-slot="tab-button"][aria-checked="false"] > span) {
    color: var(--ink-gray-6) !important;
}

/* 2. CATEGORÍA: eliminar fondo gris del trigger real */
:global(body:has(#course-catalog) [data-slot="trigger"][role="combobox"]) {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    min-height: 2.75rem !important;
    height: 2.75rem !important;
    padding: 0 0.75rem !important;
    background: var(--surface-base) !important;
    background-color: var(--surface-base) !important;
    border: 1px solid var(--surface-blue-2) !important;
    border-radius: 0.75rem !important;
    box-shadow: none !important;
}

/* Texto de categoría: centrado vertical y sin desplazamientos */
:global(body:has(#course-catalog) [data-slot="trigger"][role="combobox"] > input[role="combobox"]) {
    display: block !important;
    align-self: center !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    line-height: 1.5 !important;
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    color: var(--ink-gray-6) !important;
}

/* Flecha: centrada verticalmente y pegada a la derecha */
:global(body:has(#course-catalog) [data-slot="trigger"][role="combobox"] > .lucide-chevron-down) {
    display: block !important;
    flex: 0 0 1rem !important;
    align-self: center !important;
    width: 1rem !important;
    height: 1rem !important;
    margin: 0 0 0 0.5rem !important;
    color: var(--ink-blue-5) !important;
}

/* Evitar que el hover recupere el fondo gris */
:global(body:has(#course-catalog) [data-slot="trigger"][role="combobox"]:hover) {
    background: var(--surface-blue-2) !important;
    background-color: var(--surface-blue-2) !important;
}

/* 3. Separación pequeña entre filtros y tarjetas */
:global(body:has(#course-catalog) [data-testid="page-header-block"]) {
    padding-bottom: 0.5rem !important;
    margin-bottom: 0.5rem !important;
    border-bottom: 0 !important;
}


/* CATALOG-UI-REFINEMENT-V8 - CORRECCION HTML REAL */

/* CATEGORIA: contenedores intermedios transparentes */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3)),
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) > div),
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) [data-slot="trigger"] > div) {
    background: transparent !important;
    background-color: transparent !important;
    box-shadow: none !important;
}

/* Selector real: data-slot=trigger */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) [data-slot="trigger"]) {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    box-sizing: border-box !important;
    width: 100% !important;
    height: 2.75rem !important;
    min-height: 2.75rem !important;
    padding: 0 0.75rem !important;
    background: var(--surface-base) !important;
    background-color: var(--surface-base) !important;
    border: 1px solid var(--surface-blue-2) !important;
    border-radius: 0.75rem !important;
    box-shadow: none !important;
}

/* Texto: input role=combobox, hijo del trigger */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) [data-slot="trigger"] > input[role="combobox"]) {
    display: block !important;
    flex: 1 1 auto !important;
    align-self: center !important;
    box-sizing: border-box !important;
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    line-height: 1.5 !important;
    background: transparent !important;
    background-color: transparent !important;
    border: 0 !important;
    outline: none !important;
    box-shadow: none !important;
    color: var(--ink-gray-6) !important;
}

/* Flecha: hermano del input */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) [data-slot="trigger"] > .lucide-chevron-down) {
    display: block !important;
    flex: 0 0 1rem !important;
    align-self: center !important;
    width: 1rem !important;
    height: 1rem !important;
    margin: 0 0 0 0.5rem !important;
    color: var(--ink-blue-5) !important;
}

/* Estado hover sin recuperar el fondo gris */
:global(body:has(#course-catalog) [data-testid="page-header-block"] > div:last-child > :nth-child(3) [data-slot="trigger"]:hover) {
    background: var(--surface-base) !important;
    background-color: var(--surface-base) !important;
    border-color: var(--ink-blue-5) !important;
}

/* PESTAÑAS: una sola superficie blanca */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-buttons"]) {
    background: var(--surface-base) !important;
    background-color: var(--surface-base) !important;
    border: 1px solid var(--outline-gray-2) !important;
    box-shadow: none !important;
}

/* Indicador azul independiente */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-indicator"]) {
    background: var(--ink-blue-5) !important;
    background-color: var(--ink-blue-5) !important;
}

/* Separación discreta antes de las tarjetas */
:global(body:has(#course-catalog) [data-testid="page-header-block"]) {
    padding-bottom: 0.5rem !important;
    margin-bottom: 0.5rem !important;
    border-bottom: 0 !important;
}


/* CATALOG-UI-REFINEMENT-V9 - ELIMINAR DOBLE CONTENEDOR */

/* Eliminar la segunda capa: contenedor exterior de las pestañas */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [role="radiogroup"]) {
    background: transparent !important;
    background-color: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
    outline: none !important;
}

/* Eliminar fondo, borde y relleno del contenedor interior */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-buttons"]) {
    background: transparent !important;
    background-color: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
    gap: 0.25rem !important;
}

/* Botones no seleccionados: blancos */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-button"]) {
    background: var(--surface-base) !important;
    background-color: var(--surface-base) !important;
    color: var(--ink-gray-6) !important;
    border: 1px solid var(--outline-gray-2) !important;
    border-radius: 0.65rem !important;
    box-shadow: none !important;
}

/* Texto de los botones no seleccionados */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-button"][aria-checked="false"] > span) {
    color: var(--ink-gray-6) !important;
}

/* Indicador seleccionado: conservar azul */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-indicator"]) {
    background: var(--ink-blue-5) !important;
    background-color: var(--ink-blue-5) !important;
    border: 0 !important;
    border-radius: 0.65rem !important;
    box-shadow: 0 2px 6px color-mix(in srgb, var(--ink-blue-5) 18%, transparent) !important;
}

/* Texto del botón seleccionado */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-button"][aria-checked="true"] > span) {
    color: white !important;
}


/* CATALOG-UI-REFINEMENT-V10 - SIN FONDO EXTERIOR */

/* Eliminar completamente la cápsula exterior */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [role="radiogroup"]) {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
}

/* Eliminar la superficie que envuelve los tres botones */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-buttons"]) {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    border-radius: 0 !important;
}

/* Eliminar posibles fondos decorativos */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-buttons"]::before),
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-buttons"]::after),
:global(body:has(#course-catalog) [data-testid="page-header-block"] [role="radiogroup"]::before),
:global(body:has(#course-catalog) [data-testid="page-header-block"] [role="radiogroup"]::after) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
}

/* Botones individuales */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-button"]) {
    background: var(--surface-base) !important;
    border: 1px solid var(--outline-gray-2) !important;
    border-radius: 0.65rem !important;
    box-shadow: none !important;
}

/* Botón seleccionado */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-indicator"]) {
    background: var(--ink-blue-5) !important;
    border: none !important;
    border-radius: 0.65rem !important;
    box-shadow: 0 2px 6px color-mix(in srgb, var(--ink-blue-5) 18%, transparent) !important;
}


/* CATALOG-UI-REFINEMENT-V11 - TRACK TRANSPARENTE */

/* Eliminar el fondo generado por tabTrackClasses() de Frappe UI */
:deep([data-slot="tab-buttons"]) {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
}

/* Mantener el indicador azul seleccionado */
:deep([data-slot="tab-indicator"]) {
    background: var(--ink-blue-5) !important;
    background-color: var(--ink-blue-5) !important;
}

/* Mantener blancos los botones no seleccionados */
:deep([data-slot="tab-button"][aria-checked="false"] > span) {
    background: var(--surface-base) !important;
    color: var(--ink-gray-6) !important;
}

/* Conservar el texto blanco del seleccionado */
:deep([data-slot="tab-button"][aria-checked="true"] > span) {
    color: white !important;
}


/* CATALOG-UI-REFINEMENT-V12 - SOLO TRES PESTAÑAS */

/* Contenedor exterior: completamente transparente */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [role="radiogroup"]) {
    background: transparent !important;
    background-color: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    outline: none !important;
    padding: 0 !important;
}

/* Track de TabButtons: eliminar la cápsula de fondo */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-buttons"]) {
    background: transparent !important;
    background-color: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
    gap: 0.5rem !important;
    border-radius: 0 !important;
}

/* Capa decorativa del indicador */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-buttons"] > div[aria-hidden="true"]) {
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
}

/* Botones: sin fondos ni superficies adicionales */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-button"]),
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-button"] > span) {
    background: transparent !important;
    background-color: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
}

/* Texto de pestañas no seleccionadas */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-button"][aria-checked="false"] > span) {
    color: var(--ink-gray-6) !important;
}

/* Única superficie de color: indicador azul seleccionado */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-indicator"]) {
    background: var(--ink-blue-5) !important;
    background-color: var(--ink-blue-5) !important;
    border: 0 !important;
    box-shadow: 0 2px 6px color-mix(in srgb, var(--ink-blue-5) 18%, transparent) !important;
}

/* Texto blanco de la pestaña seleccionada */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [data-slot="tab-button"][aria-checked="true"] > span) {
    color: white !important;
}


/* CATALOG-UI-REFINEMENT-V13 - ALTURA UNIFORME */

/* Fondo blanco que agrupa los tres botones */
:global(body:has(#course-catalog) [data-slot="tab-buttons"]) {
    box-sizing: border-box !important;
    height: 3.5rem !important;
    min-height: 3.5rem !important;
    padding: 0.2rem !important;
    display: inline-flex !important;
    align-items: stretch !important;
    gap: 0.25rem !important;
    background: var(--surface-base) !important;
    border: 1px solid var(--outline-gray-2) !important;
    border-radius: 1rem !important;
    box-shadow: none !important;
}

/* Capa del indicador */
:global(body:has(#course-catalog) [data-slot="tab-buttons"] > div[aria-hidden="true"]) {
    inset: 0 !important;
    height: 100% !important;
}

/* Indicador azul */
:global(body:has(#course-catalog) [data-slot="tab-indicator"]) {
    top: 0.2rem !important;
    height: calc(100% - 0.4rem) !important;
    border-radius: 0.85rem !important;
}

/* Botones: misma altura y texto centrado */
:global(body:has(#course-catalog) [data-slot="tab-button"]) {
    height: 100% !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}

:global(body:has(#course-catalog) [data-slot="tab-button"] > span) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}


/* CATALOG-UI-REFINEMENT-V14 - RESTAURAR DIMENSIONES NATURALES */

/* El grupo se adapta al tamaño real de sus botones */
:global(body:has(#course-catalog) [data-slot="tab-buttons"]) {
    display: inline-flex !important;
    align-items: center !important;
    box-sizing: border-box !important;
    width: fit-content !important;
    height: auto !important;
    min-height: 0 !important;
    padding: 1px !important;
    gap: 4px !important;
    background: var(--surface-base) !important;
    border: 1px solid var(--outline-gray-2) !important;
    border-radius: 0.85rem !important;
}

/* Recuperar la altura natural de los botones */
:global(body:has(#course-catalog) [data-slot="tab-button"]) {
    height: auto !important;
    min-height: 0 !important;
    align-self: center !important;
}

/* Recuperar la altura natural del texto */
:global(body:has(#course-catalog) [data-slot="tab-button"] > span) {
    height: auto !important;
    min-height: 0 !important;
}

/* No forzar la altura del indicador: Frappe UI la calcula */
:global(body:has(#course-catalog) [data-slot="tab-indicator"]) {
    height: auto;
}

/* Mantener el indicador azul y su animación */
:global(body:has(#course-catalog) [data-slot="tab-indicator"]) {
    background: var(--ink-blue-5) !important;
    border-radius: 7px !important;
}

/* Alinear el grupo con los demás filtros */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [role="radiogroup"]) {
    align-self: center !important;
}


/* CATALOG-UI-REFINEMENT-V15 - ELIMINAR FONDO EXTERIOR REAL */

/* ELEMENTO 0: contenedor radiogroup identificado en DevTools */
:global(body:has(#course-catalog) [data-testid="page-header-block"] [role="radiogroup"]:has(> [data-slot="tab-buttons"])) {
    background: transparent !important;
    background-color: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    outline: none !important;
    padding: 0 !important;
    margin: 0 !important;
}

/* No modificar el track interior ni los tres botones */


/* CATALOG-UI-REFINEMENT-V16 - RADIOGROUP SIN SUPERFICIE */

/* Eliminar exclusivamente el fondo exterior del grupo */
:global([data-testid="page-header-block"] div[role="radiogroup"]) {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
    padding: 0 !important;
}

/* El track interior permanece transparente */
:global([data-testid="page-header-block"] div[role="radiogroup"] > [data-slot="tab-buttons"]) {
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
}

/* No alterar botones ni indicador */




/* CCOMUNES COURSES - CATALOGO SIN BANNER */

#course-catalog {
    display: block;
    color: var(--ink-blue-9);
    font-size: clamp(1.45rem, 2vw, 1.8rem);
    font-weight: 800;
    letter-spacing: -0.035em;
    line-height: 1.25;
}

/* Cuadrícula de cursos */
:global(.course-catalog-grid) {
    display: grid !important;
    grid-template-columns: repeat(
        auto-fill,
        minmax(min(100%, 21rem), 1fr)
    ) !important;
    align-items: stretch !important;
    gap: 1.35rem !important;
    padding: 0 1.5rem 1.5rem !important;
}

/* Zona de encabezado y filtros */
:global([data-testid="page-header-block"]) {
    padding-inline: 1.5rem !important;
}

:global([data-testid="page-header-block"] > div:last-child) {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 0.75rem !important;
    width: 100% !important;
}

:global([data-testid="page-header-block"] > div:last-child > *) {
    min-width: 0 !important;
}

/* Pestañas */
:global([data-testid="page-header-block"] [data-slot="tab-buttons"]) {
    flex: 0 0 auto !important;
    min-height: 3rem !important;
    padding: 0.2rem !important;
    gap: 0.25rem !important;
    border: 1px solid var(--outline-gray-2) !important;
    border-radius: 0.85rem !important;
    background: var(--surface-base) !important;
}

:global([data-testid="page-header-block"] [data-slot="tab-button"]) {
    min-height: 2.5rem !important;
    border-radius: 0.65rem !important;
}

/* Buscador y categoría */
:global([data-testid="page-header-block"] > div:last-child > :nth-child(2)) {
    flex: 1 1 14rem !important;
}

:global([data-testid="page-header-block"] > div:last-child > :nth-child(3)) {
    flex: 1 1 11rem !important;
}

/* Controles */
:global([data-testid="page-header-block"] input:not([type="checkbox"])) {
    min-height: 2.75rem !important;
    border-radius: 0.75rem !important;
}

@media (min-width: 1500px) {
    :global(.course-catalog-grid) {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 1.5rem !important;
    }
}

@media (max-width: 900px) {
    :global(.course-catalog-grid) {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
}

@media (max-width: 640px) {
    #course-catalog {
        font-size: 1.35rem;
    }

    :global([data-testid="page-header-block"]) {
        padding-inline: 1rem !important;
    }

    :global([data-testid="page-header-block"] > div:last-child) {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) !important;
    }

    :global([data-testid="page-header-block"] > div:last-child > *) {
        width: 100% !important;
    }

    :global(.course-catalog-grid) {
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 1rem !important;
        padding-inline: 1rem !important;
    }
}


/* CATALOG-HOVER-BLUE-V3 - HOVER AZUL SIN BORDE GRIS */

/* Estado normal: pestañas no seleccionadas */
:global(body:has(#course-catalog) [data-slot="tab-button"][aria-checked="false"]),
:global(body:has(#course-catalog) [data-slot="tab-button"][aria-checked="false"] > span) {
    background: transparent !important;
    background-color: transparent !important;
    border: 0 !important;
    border-color: transparent !important;
    outline: none !important;
    box-shadow: none !important;
    --tw-ring-shadow: 0 0 #0000 !important;
}

/* Hover, foco y pulsación: azul sutil, sin contorno gris */
:global(body:has(#course-catalog) [data-slot="tab-button"][aria-checked="false"]:is(:hover, :focus, :focus-visible, :active)),
:global(body:has(#course-catalog) [data-slot="tab-button"][aria-checked="false"]:is(:hover, :focus, :focus-visible, :active) > span) {
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    background: #DCEBFA !important;
    /* token-exempt-end */
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    background-color: #DCEBFA !important;
    /* token-exempt-end */
    border: 0 !important;
    border-color: transparent !important;
    outline: none !important;
    box-shadow: none !important;
    --tw-ring-shadow: 0 0 #0000 !important;
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    color: #1769AA !important;
    /* token-exempt-end */
}

/* Texto normal */
:global(body:has(#course-catalog) [data-slot="tab-button"][aria-checked="false"] > span) {
    color: var(--ink-gray-6) !important;
}

/* Eliminar posibles capas decorativas grises */
:global(body:has(#course-catalog) [data-slot="tab-button"][aria-checked="false"]::before),
:global(body:has(#course-catalog) [data-slot="tab-button"][aria-checked="false"]::after) {
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
}

</style>
