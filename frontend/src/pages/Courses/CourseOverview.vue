
<template>
	<SkeletonLoader v-if="!course.data" variant="course-page" />

	<div v-else class="course-overview p-5">
		<!-- PORTADA PANORÁMICA -->
		<section class="course-overview__hero">
			<img
				v-if="course.data.image"
				:src="safeUrl(course.data.image)"
				:alt="course.data.title"
				class="course-overview__hero-image"
			/>

			<div class="course-overview__hero-overlay"></div>

			<div class="course-overview__hero-content">
				<div
					v-if="course.data.category"
					class="course-overview__category"
				>
					<span class="lucide-sparkles size-4" aria-hidden="true" />
					{{ course.data.category }}
				</div>

				<h1>{{ course.data.title }}</h1>

				<p
					v-if="course.data.short_introduction"
					class="course-overview__hero-description"
				>
					{{ course.data.short_introduction }}
				</p>

				<div class="course-overview__hero-meta">
					<router-link
						v-if="course.data.category"
						:to="{
							name: 'Courses',
							query: { category: course.data.category },
						}"
						class="course-overview__meta-item"
					>
						<span class="lucide-tag size-4" />
						{{ course.data.category }}
					</router-link>

					<div
						v-if="course.data.enrollments"
						class="course-overview__meta-item"
					>
						<span class="lucide-users-round size-4" />
						{{ formatAmount(course.data.enrollments) }}
						{{ __('estudiantes') }}
					</div>

					<div
						v-if="course.data.instructors?.length"
						class="course-overview__instructors"
					>
						<span
							class="h-6 me-1"
							:class="{
								'avatar-group overlap':
									course.data.instructors.length > 1,
							}"
						>
							<UserAvatar
								v-for="instructor in course.data.instructors"
								:key="instructor.name"
								:user="instructor"
							/>
						</span>

						<CourseInstructors
							:instructors="course.data.instructors"
						/>
					</div>
				</div>

				<div
					v-if="course.data.tags"
					class="course-overview__tags"
				>
					<Badge
						v-for="tag in course.data.tags.split(', ')"
						:key="tag"
						theme="gray"
						size="lg"
					>
						{{ tag }}
					</Badge>
				</div>
			</div>
		</section>

		<!-- MATRÍCULA PARA MÓVILES -->
		<div class="course-overview__mobile-enrollment">
			<CourseCardOverlay :course="course" />
		</div>

		<!-- CONTENIDO Y MATRÍCULA LATERAL -->
		<div class="course-overview__layout">
			<main class="course-overview__main">
				<!-- CONTENIDO DEL CURSO -->
				<section class="course-overview__panel">
					<div
						class="flex flex-wrap items-baseline justify-between gap-4 mb-4"
					>
						<h2>{{ __('Contenido del curso') }}</h2>

						<div class="text-base text-ink-gray-6">
							{{ outlineStats }}
						</div>
					</div>

					<div class="course-overview__outline border rounded-5 p-2">
						<SkeletonLoader
							v-if="outline.loading && !outline.data"
							variant="course-outline"
							:count="10"
						/>

						<div
							v-else-if="!hasCourseContent"
							class="flex items-center justify-center px-4 py-10 text-center"
						>
							<span class="text-sm text-ink-gray-6">
								{{
									__('El contenido de este curso estará disponible pronto.')
								}}
							</span>
						</div>

						<CourseOutline
							v-else
							:courseName="course.data.name"
							:getProgress="course.data.membership ? true : false"
							:editorLinks="isCourseAdmin"
						/>
					</div>
				</section>

				<!-- DESCRIPCIÓN -->
				<section
					v-if="course.data.description"
					class="course-overview__panel space-y-3"
				>
					<h2>{{ __('Sobre este curso') }}</h2>

					<div
						v-safe-html:rich="course.data.description"
						class="ProseMirror prose prose-sm max-w-none !whitespace-normal prose-table:table-fixed prose-td:p-2 prose-th:p-2 prose-td:border prose-th:border prose-td:border-outline-gray-2 prose-th:border-outline-gray-2 prose-td:relative prose-th:relative prose-th:bg-surface-gray-2"
					/>
				</section>

				<!-- DOCUMENTOS -->
				<CourseDocuments
					:courseName="course.data.name"
					:canManage="isCourseAdmin"
				/>
			</main>

			<!-- MATRÍCULA PARA ESCRITORIO -->
			<aside class="course-overview__sidebar">
				<CourseCardOverlay :course="course" />

				<CourseCreatorCard
					:instructors="course.data.instructors || []"
				/>
			</aside>
		</div>
	</div>
</template>

<script setup lang="ts">
import { safeUrl } from '@/utils/safeUrl'
import { computed, inject, watch } from 'vue'
import { createResource, Badge } from 'frappe-ui'
import { formatAmount } from '@/utils/'
import type {
	CourseDetails,
	OutlineChapter,
	Resource,
	SessionUser,
} from '@/types'
import CourseCardOverlay from '@/components/CourseCardOverlay.vue'
import CourseOutline from '@/components/CourseOutline.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import CourseInstructors from '@/components/CourseInstructors.vue'
import CourseCreatorCard from '@/components/CourseCreatorCard.vue'
import CourseDocuments from '@/components/Courses/CourseDocuments.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const props = defineProps<{
	course: Resource<CourseDetails | null>
}>()

const user = inject<SessionUser>('$user')

const isCourseInstructor = computed<boolean>(() =>
	(props.course.data?.instructors || []).some(
		(i) => i.name === user?.data?.name
	)
)

const isCourseAdmin = computed<boolean>(
	() => Boolean(user?.data?.is_moderator) || isCourseInstructor.value
)

const outline = createResource({
	url: 'lms.lms.utils.get_course_outline',
	makeParams() {
		return { course: props.course.data?.name, progress: false }
	},
	auto: false,
}) as Resource<OutlineChapter[]>

watch(
	() => props.course.data?.name,
	(name) => {
		if (name) outline.fetch()
	},
	{ immediate: true }
)

const outlineStats = computed(() => {
	const chapters = outline.data || []
	const lessonCount = chapters.reduce(
		(acc, c) => acc + (c.lessons?.length || 0),
		0
	)
	const parts: string[] = []

	if (chapters.length) {
		parts.push(
			`${chapters.length} ${chapters.length === 1 ? 'sección' : 'secciones'}`
		)
	}

	if (lessonCount) {
		parts.push(`${lessonCount} ${lessonCount === 1 ? 'lección' : 'lecciones'}`)
	}

	return parts.join(' · ')
})

const hasCourseContent = computed(() => {
	const chapters = outline.data || []
	const lessonCount = chapters.reduce(
		(acc, c) => acc + (c.lessons?.length || 0),
		0
	)

	return chapters.length > 0 && lessonCount > 0
})
</script>

<style scoped>
.course-overview {
	width: min(100%, 82rem);
	margin-inline: auto;
}

/* PORTADA */
.course-overview__hero {
	position: relative;
	isolation: isolate;
	display: flex;
	align-items: flex-end;
	min-height: 350px;
	overflow: hidden;
	padding: clamp(1.5rem, 4vw, 3.5rem);
	border-radius: 1.4rem;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background: linear-gradient(120deg, #102f59, #2563a8 65%, #38a4d8);
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	box-shadow: 0 16px 40px rgb(15 49 89 / 14%);
	/* token-exempt-end */
}

.course-overview__hero-image {
	position: absolute;
	z-index: -1;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	object-position: center;
}

.course-overview__hero-overlay {
	position: absolute;
	z-index: 0;
	inset: 0;
	background: linear-gradient(
		90deg,
		/* token-exempt-start: color literal original del diseño; conservar sin alterar */
		rgb(9 30 58 / 94%) 0%,
		/* token-exempt-end */
		/* token-exempt-start: color literal original del diseño; conservar sin alterar */
		rgb(13 45 82 / 82%) 48%,
		/* token-exempt-end */
		/* token-exempt-start: color literal original del diseño; conservar sin alterar */
		rgb(13 45 82 / 25%) 100%
		/* token-exempt-end */
	);
}

.course-overview__hero-content {
	position: relative;
	z-index: 1;
	width: 100%;
	max-width: 760px;
	color: white;
}

.course-overview__category {
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	padding: 0.45rem 0.85rem;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border: 1px solid rgb(255 255 255 / 30%);
	/* token-exempt-end */
	border-radius: 999px;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background: rgb(255 255 255 / 13%);
	/* token-exempt-end */
	color: white;
	font-size: 0.78rem;
	font-weight: 700;
	backdrop-filter: blur(8px);
}

.course-overview__hero h1 {
	max-width: 720px;
	margin-top: 1rem;
	color: white;
	font-size: clamp(2rem, 4vw, 3.4rem);
	font-weight: 800;
	letter-spacing: -0.045em;
	line-height: 1.08;
}

.course-overview__hero-description {
	max-width: 650px;
	margin-top: 1rem;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: rgb(255 255 255 / 88%);
	/* token-exempt-end */
	font-size: 1rem;
	line-height: 1.7;
}

.course-overview__hero-meta {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 1rem 1.5rem;
	margin-top: 1.5rem;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: rgb(255 255 255 / 90%);
	/* token-exempt-end */
	font-size: 0.88rem;
}

.course-overview__meta-item {
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	color: inherit;
}

.course-overview__meta-item:hover {
	color: white;
	text-decoration: underline;
}

.course-overview__instructors {
	display: flex;
	align-items: center;
	gap: 0.4rem;
}

.course-overview__tags {
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin-top: 1.25rem;
}

.course-overview__tags :deep(*) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border-color: rgb(255 255 255 / 25%);
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background: rgb(255 255 255 / 13%);
	/* token-exempt-end */
	color: white;
}

/* DISTRIBUCIÓN */
.course-overview__layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 320px;
	align-items: start;
	gap: 2rem;
	margin-top: 2rem;
}

.course-overview__main {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: 1.5rem;
}

.course-overview__sidebar {
	position: sticky;
	top: 1.25rem;
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: 1.5rem;
}

.course-overview__mobile-enrollment {
	display: none;
}

/* PANELES */
.course-overview__panel {
	padding: 1.5rem;
	border: 1px solid var(--outline-gray-2);
	border-radius: 1.1rem;
	background: var(--surface-base);
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	box-shadow: 0 8px 24px rgb(25 65 110 / 5%);
	/* token-exempt-end */
}

.course-overview__panel h2 {
	color: var(--ink-gray-9);
	font-size: 1.35rem;
	font-weight: 700;
	letter-spacing: -0.025em;
}

.course-overview__outline {
	border-color: var(--outline-gray-2);
	background: var(--surface-base);
}

/* TABLET */
@media (min-width: 768px) and (max-width: 900px) {
	.course-overview__layout {
		grid-template-columns: minmax(0, 1fr) 290px;
		gap: 1.25rem;
	}
}

/* MÓVIL */
@media (max-width: 767px) {
	.course-overview {
		padding: 1rem;
	}

	.course-overview__hero {
		min-height: 320px;
		padding: 1.5rem;
		border-radius: 1rem;
	}

	.course-overview__hero-overlay {
		background: linear-gradient(
			0deg,
			/* token-exempt-start: color literal original del diseño; conservar sin alterar */
			rgb(9 30 58 / 95%) 0%,
			/* token-exempt-end */
			/* token-exempt-start: color literal original del diseño; conservar sin alterar */
			rgb(13 45 82 / 65%) 70%,
			/* token-exempt-end */
			/* token-exempt-start: color literal original del diseño; conservar sin alterar */
			rgb(13 45 82 / 25%) 100%
			/* token-exempt-end */
		);
	}

	.course-overview__hero h1 {
		font-size: clamp(1.8rem, 7vw, 2.5rem);
	}

	.course-overview__hero-description {
		font-size: 0.9rem;
	}

	.course-overview__hero-meta {
		gap: 0.75rem 1rem;
		font-size: 0.8rem;
	}

	.course-overview__layout {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		margin-top: 1.25rem;
	}

	.course-overview__main {
		width: 100%;
	}

	.course-overview__sidebar {
		display: none;
	}

	.course-overview__mobile-enrollment {
		display: block;
		margin-top: 1.25rem;
	}

	.course-overview__panel {
		padding: 1rem;
		border-radius: 0.9rem;
	}

	.course-overview__panel h2 {
		font-size: 1.2rem;
	}
}
</style>
