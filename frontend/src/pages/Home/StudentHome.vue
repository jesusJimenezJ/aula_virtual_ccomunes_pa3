
<template>
	<div class="student-home">
		<!-- Clases en vivo -->
		<section
			v-if="myLiveClasses?.data?.length"
			class="student-home__section"
		>
			<div class="student-home__section-heading">
				<div>
					<span class="student-home__section-eyebrow">AGENDA</span>
					<h2 class="student-home__section-title">
						Mis próximas clases en vivo
					</h2>
				</div>
			</div>

			<div class="student-home__grid">
				<article
					v-for="cls in myLiveClasses.data"
					:key="cls.name"
					class="student-home__class-card"
				>
					<div class="student-home__class-icon">
						<span class="lucide-video size-5" aria-hidden="true" />
					</div>

					<div class="student-home__class-content">
						<h3 class="student-home__card-title">
							{{ cls.title }}
						</h3>

						<p
							v-if="cls.description"
							class="student-home__description"
						>
							{{ cls.description }}
						</p>

						<div class="student-home__details">
							<div class="student-home__detail">
								<span class="lucide-calendar size-4" aria-hidden="true" />
								<span>
									{{ dayjs(cls.date).format('DD MMMM YYYY') }}
								</span>
							</div>

							<div class="student-home__detail">
								<span class="lucide-clock size-4" aria-hidden="true" />
								<span>
									{{ formatTime(cls.time) }}
									-
									{{ dayjs(getClassEnd(cls)).format('HH:mm') }}
								</span>
							</div>
						</div>
					</div>

					<a
						v-if="canAccessClass(cls) && cls.join_url"
						:href="safeUrl(cls.join_url)"
						v-external
						class="student-home__join"
					>
						<span class="lucide-video size-4" aria-hidden="true" />
						Unirme a la clase
					</a>

					<div
						v-else-if="hasClassEnded(cls)"
						class="student-home__status student-home__status--ended"
					>
						<span class="lucide-info size-4" aria-hidden="true" />
						Clase finalizada
					</div>

					<div
						v-else
						class="student-home__status student-home__status--pending"
					>
						<span class="lucide-clock size-4" aria-hidden="true" />
						Clase programada
					</div>
				</article>
			</div>
		</section>

		<!-- Cursos -->
		<section
			v-if="myCourses.data?.length"
			class="student-home__section"
		>
			<div class="student-home__section-heading">
				<div>
					<span class="student-home__section-eyebrow">
						FORMACIÓN
					</span>

					<h2 class="student-home__section-title">
						{{
							myCourses.data[0].membership
								? __('Mis cursos')
								: __('Cursos destacados')
						}}
					</h2>
				</div>

				<router-link
					:to="{ name: 'Courses' }"
					class="student-home__view-all"
				>
					Ver todos
					<span class="lucide-arrow-right size-4" aria-hidden="true" />
				</router-link>
			</div>

			<div class="student-home__grid">
				<CourseCard
					v-for="course in myCourses.data"
					:key="course.name"
					:course="course"
					:to="{
						name: 'CourseDetail',
						params: { courseName: course.name },
					}"
				/>
			</div>
		</section>

		<!-- Grupos -->
		<section
			v-if="myBatches.data?.length"
			class="student-home__section"
		>
			<div class="student-home__section-heading">
				<div>
					<span class="student-home__section-eyebrow">
						COMUNIDAD
					</span>

					<h2 class="student-home__section-title">
						Mis próximos grupos
					</h2>
				</div>

				<router-link
					:to="{ name: 'Batches' }"
					class="student-home__view-all"
				>
					Ver todos
					<span class="lucide-arrow-right size-4" aria-hidden="true" />
				</router-link>
			</div>

			<div class="student-home__grid">
				<router-link
					v-for="batch in myBatches.data"
					:key="batch.name"
					:to="{
						name: 'BatchDetail',
						params: { batchName: batch.name },
					}"
					class="student-home__batch-link"
				>
					<BatchCard :batch="batch" />
				</router-link>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import { createResource } from 'frappe-ui'
import { inject } from 'vue'

import { formatTime } from '@/utils'
import { safeUrl } from '@/utils/safeUrl'
import CourseCard from '@/components/CourseCard.vue'
import BatchCard from '@/pages/Batches/components/BatchCard.vue'

const dayjs = inject<any>('$dayjs')

const props = defineProps<{
	myLiveClasses?: {
		data?: any[]
	}
}>()

const myLiveClasses = props.myLiveClasses

const myCourses = createResource({
	url: 'lms.lms.api.get_my_courses',
	auto: true,
})

const myBatches = createResource({
	url: 'lms.lms.api.get_my_batches',
	auto: true,
})

function getClassEnd(cls: any) {
	return dayjs(`${cls.date} ${cls.time}`).add(
		cls.duration || 0,
		'minutes'
	)
}

function canAccessClass(cls: any) {
	const now = dayjs()
	const start = dayjs(`${cls.date} ${cls.time}`)
	const end = getClassEnd(cls)

	return (
		now.isAfter(start.subtract(15, 'minutes')) &&
		now.isBefore(end)
	)
}

function hasClassEnded(cls: any) {
	return dayjs().isAfter(getClassEnd(cls))
}
</script>

<style scoped>
.student-home {
	width: 100%;
	padding-bottom: 2.5rem;
	color: var(--ink-blue-9);
}

.student-home__welcome {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 2rem;
	overflow: hidden;
	margin-top: 0.5rem;
	padding: clamp(1.5rem, 4vw, 2.5rem);
	border: 1px solid var(--surface-blue-3);
	border-radius: 1.25rem;
	background:
		radial-gradient(
			circle at 90% 15%,
			color-mix(in srgb, white 75%, transparent),
			transparent 30%
		),
		linear-gradient(115deg, var(--surface-blue-2) 0%, var(--surface-blue-2) 60%, var(--surface-base) 100%);
}

.student-home__welcome-content {
	position: relative;
	z-index: 1;
}

.student-home__eyebrow {
	display: inline-block;
	color: var(--ink-blue-5);
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.13em;
}

.student-home__welcome h2 {
	margin: 0.65rem 0 0.5rem;
	color: var(--ink-blue-9);
	font-size: clamp(1.5rem, 3vw, 2.1rem);
	font-weight: 800;
	letter-spacing: -0.04em;
	line-height: 1.2;
}

.student-home__welcome p {
	max-width: 38rem;
	margin: 0;
	color: var(--ink-gray-6);
	font-size: 0.95rem;
	line-height: 1.65;
}

.student-home__browse {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	gap: 0.6rem;
	min-height: 2.9rem;
	padding: 0.8rem 1.2rem;
	border: 1px solid var(--ink-blue-5);
	border-radius: 0.75rem;
	background: var(--ink-blue-5);
	color: white;
	font-size: 0.875rem;
	font-weight: 700;
	text-decoration: none;
	transition:
		background 160ms ease,
		transform 160ms ease,
		box-shadow 160ms ease;
}

.student-home__browse:hover {
	transform: translateY(-2px);
	background: var(--ink-blue-7);
	box-shadow: 0 7px 18px color-mix(in srgb, var(--ink-blue-5) 20%, transparent);
}

.student-home__section {
	margin-top: 2.5rem;
}

.student-home__section-heading {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: 1.1rem;
}

.student-home__section-eyebrow {
	display: block;
	margin-bottom: 0.35rem;
	color: var(--ink-blue-5);
	font-size: 0.68rem;
	font-weight: 800;
	letter-spacing: 0.12em;
}

.student-home__section-title {
	margin: 0;
	color: var(--ink-blue-9);
	font-size: clamp(1.1rem, 2vw, 1.3rem);
	font-weight: 750;
	letter-spacing: -0.025em;
}

.student-home__view-all {
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	flex-shrink: 0;
	color: var(--ink-blue-5);
	font-size: 0.82rem;
	font-weight: 700;
	text-decoration: none;
}

.student-home__view-all:hover {
	color: var(--ink-blue-9);
}

.student-home__grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(100%, 25rem), 1fr));
	gap: 1.4rem;
        align-items: stretch;
}

.student-home__class-card {
	display: flex;
	min-width: 0;
	flex-direction: column;
	padding: 1.25rem;
	border: 1px solid var(--outline-gray-2);
	border-radius: 1rem;
	background: var(--surface-base);
	box-shadow: 0 3px 14px color-mix(in srgb, var(--ink-blue-9) 3.5%, transparent);
	transition:
		border-color 160ms ease,
		box-shadow 160ms ease,
		transform 160ms ease;
}

.student-home__class-card:hover {
	transform: translateY(-3px);
	border-color: var(--surface-blue-3);
	box-shadow: 0 10px 24px color-mix(in srgb, var(--ink-blue-9) 8%, transparent);
}

.student-home__class-icon {
	display: flex;
	width: 2.65rem;
	height: 2.65rem;
	align-items: center;
	justify-content: center;
	margin-bottom: 1rem;
	border-radius: 0.8rem;
	background: var(--surface-blue-2);
	color: var(--ink-blue-5);
}

.student-home__class-content {
	flex: 1;
}

.student-home__card-title {
	margin: 0 0 0.55rem;
	color: var(--ink-blue-9);
	font-size: 1rem;
	font-weight: 750;
	line-height: 1.4;
}

.student-home__description {
	margin: 0 0 1rem;
	color: var(--ink-gray-6);
	font-size: 0.85rem;
	line-height: 1.55;
}

.student-home__details {
	display: flex;
	flex-direction: column;
	gap: 0.7rem;
	margin: 1rem 0;
	color: var(--ink-gray-6);
	font-size: 0.82rem;
}

.student-home__detail {
	display: flex;
	align-items: flex-start;
	gap: 0.55rem;
}

.student-home__detail span:first-child {
	flex-shrink: 0;
	color: var(--ink-blue-5);
}

.student-home__join {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	width: 100%;
	min-height: 2.6rem;
	margin-top: auto;
	padding: 0.65rem 0.8rem;
	border-radius: 0.65rem;
	background: var(--ink-blue-5);
	color: white;
	font-size: 0.84rem;
	font-weight: 700;
	text-decoration: none;
	transition: background 150ms ease;
}

.student-home__join:hover {
	background: var(--ink-blue-7);
}

.student-home__status {
	display: flex;
	align-items: center;
	gap: 0.45rem;
	margin-top: auto;
	padding-top: 0.75rem;
	font-size: 0.8rem;
	font-weight: 650;
}

.student-home__status--ended {
	color: var(--ink-gray-4);
}

.student-home__status--pending {
	color: var(--ink-blue-5);
}

.student-home__batch-link {
	display: block;
	min-width: 0;
	text-decoration: none;
}

@media (max-width: 1024px) {
	.student-home__grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

@media (max-width: 640px) {
	.student-home__welcome {
		align-items: flex-start;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.4rem;
	}

	.student-home__browse {
		width: 100%;
	}

	.student-home__section {
		margin-top: 2rem;
	}

	.student-home__grid {
		grid-template-columns: minmax(0, 1fr);
		gap: 1rem;
	}

	.student-home__section-heading {
		align-items: flex-start;
	}

	.student-home__section-title {
		font-size: 1.05rem;
	}
}

@media (prefers-reduced-motion: reduce) {
	.student-home__browse,
	.student-home__class-card {
		transition: none;
	}

	.student-home__browse:hover,
	.student-home__class-card:hover {
		transform: none;
	}
}
</style>
