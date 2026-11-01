
<template>
	<article v-if="course.title" class="course-card group">
		<div
			class="course-card__cover"
			:style="
				course.image
					? { backgroundImage: `url('${encodeURI(course.image)}')` }
					: { backgroundImage: gradientColor }
			"
		>
			<div class="course-card__cover-shade" />

			<span v-if="course.category" class="course-card__category">
				{{ course.category }}
			</span>

			<div
				v-if="!course.image"
				class="course-card__cover-mark"
				aria-hidden="true"
			>
				<span class="lucide-book-open size-8" aria-hidden="true" />
			</div>
		</div>

		<div class="course-card__body">
			<div class="course-card__stats">
				<Tooltip
					v-if="course.lessons"
					:text="__('Cantidad de lecciones del curso')"
				>
					<span class="course-card__stat">
						<span class="lucide-book-open size-4" aria-hidden="true" />
						<span aria-hidden="true">
							{{ course.lessons }} {{ __('lecciones') }}
						</span>
						<span class="sr-only">{{ lessonCount }}</span>
					</span>
				</Tooltip>

				<span v-if="course.rating != null" class="course-card__stat">
					<span class="lucide-star size-4" aria-hidden="true" />
					<span aria-hidden="true">
						{{ Number(course.rating).toFixed(1) }}
					</span>
					<span class="sr-only">
						{{
							__('Valoración: {0} de 5').format(
								(Math.round(Number(course.rating) * 10) / 10).toFixed(1)
							)
						}}
					</span>
				</span>

				<span v-if="course.featured" class="course-card__stat">
					<span class="lucide-badge-check size-4" aria-hidden="true" />
					<span class="sr-only">{{ __('Curso destacado') }}</span>
				</span>

				<span v-if="course.enable_certification" class="course-card__stat">
					<span class="lucide-award size-4" aria-hidden="true" />
					<span class="sr-only">{{ __('Certificación disponible') }}</span>
				</span>

				<Tooltip
					v-if="course.enrollments"
					:text="__('Cantidad de estudiantes matriculados')"
				>
					<span class="course-card__stat">
						<span class="lucide-users-round size-4" aria-hidden="true" />
						<span aria-hidden="true">
							{{ formatAmount(course.enrollments) }}
						</span>
						<span class="sr-only">
							{{
								__('Estudiantes matriculados: {0}').format(
									course.enrollments
								)
							}}
						</span>
					</span>
				</Tooltip>
			</div>

			<h3 class="course-card__title">
				<CardLink :to="to" :external="external">
					{{ course.title }}
				</CardLink>
			</h3>

			<p
				v-if="course.short_introduction"
				class="course-card__summary"
			>
				{{ course.short_introduction }}
			</p>

			<div
				v-if="user && course.membership"
				class="course-card__progress"
			>
				<ProgressBar
					:progress="course.membership.progress"
					:label="__('Course progress')"
				/>
				<span>
					{{ Math.ceil(course.membership.progress) }}%
					{{ __('completado') }}
				</span>
			</div>

			<div class="course-card__footer">
				<div
					v-if="course.instructors?.length"
					class="course-card__instructor"
				>
					<div class="course-card__avatars">
						<UserAvatar
							v-for="instructor in course.instructors"
							:key="instructor.username || instructor.name"
							:user="instructor"
						/>
					</div>

					<CourseInstructors :instructors="course.instructors" />
				</div>

				<div v-if="course.paid_course" class="course-card__price">
					{{ course.price }}
				</div>
			</div>
		</div>
	</article>
</template>

<script setup>
import { sessionStore } from '@/stores/session'
import { formatAmount } from '@/utils'
import { Tooltip } from 'frappe-ui'
import { computed } from 'vue'

import CardLink from '@/components/CardLink.vue'
import CourseInstructors from '@/components/CourseInstructors.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import ProgressBar from '@/components/ProgressBar.vue'

const { user } = sessionStore()

const props = defineProps({
	course: {
		type: Object,
		default: null,
	},
	to: {
		type: [Object, String],
		default: null,
	},
	external: {
		type: Boolean,
		default: false,
	},
})

const lessonCount = computed(() =>
	props.course.lessons == 1
		? __('1 lección')
		: __('{0} lecciones').format(props.course.lessons)
)

const gradientColor = computed(() => {
	let color = props.course.card_gradient?.toLowerCase() || 'blue'

	// La imagen decorativa conserva su comportamiento original.
	return `linear-gradient(to top right, black, var(--${color}-400))`
})
</script>

<style>
.course-card {
        position: relative;
        display: flex;
        min-height: 100%;
        flex-direction: column;
        overflow: hidden;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border: 1px solid #e5e7eb;
        /* token-exempt-end */
        border-radius: 1.25rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: #ffffff;
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #111827;
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        box-shadow: 0 4px 12px rgb(15 23 42 / 4%);
        /* token-exempt-end */
        transition:
                border-color 220ms ease,
                box-shadow 220ms ease,
                transform 220ms ease;
}

.course-card:hover {
        transform: translateY(-5px);
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border-color: #cbd5e1;
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        box-shadow: 0 18px 40px rgb(15 23 42 / 10%);
        /* token-exempt-end */
}

.course-card__cover {
        position: relative;
        display: flex;
        min-height: 15rem;
        flex-direction: column;
        justify-content: flex-end;
        overflow: hidden;
        background-position: center;
        background-size: cover;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background-color: #e5e7eb;
        /* token-exempt-end */
}

.course-card__cover-shade {
        position: absolute;
        inset: 0;
        background: linear-gradient(
                180deg,
                /* token-exempt-start: color literal original del diseño; conservar sin alterar */
                rgb(15 23 42 / 0%) 20%,
                /* token-exempt-end */
                /* token-exempt-start: color literal original del diseño; conservar sin alterar */
                rgb(15 23 42 / 38%) 100%
                /* token-exempt-end */
        );
        transition: opacity 220ms ease;
}

.course-card:hover .course-card__cover-shade {
        opacity: 0.82;
}

.course-card__category {
        position: absolute;
        top: 1rem;
        left: 1rem;
        max-width: calc(100% - 2rem);
        padding: 0.45rem 0.85rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border: 1px solid rgb(255 255 255 / 75%);
        /* token-exempt-end */
        border-radius: 999px;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: rgb(255 255 255 / 96%);
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #111827;
        /* token-exempt-end */
        font-size: 0.72rem;
        font-weight: 700;
        line-height: 1.2;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
        /* token-exempt-end */
}

.course-card__cover-mark {
        position: absolute;
        top: 50%;
        left: 50%;
        display: grid;
        width: 4.8rem;
        height: 4.8rem;
        place-items: center;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border: 1px solid rgb(255 255 255 / 45%);
        /* token-exempt-end */
        border-radius: 1.5rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        background: rgb(255 255 255 / 16%);
        /* token-exempt-end */
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #ffffff;
        /* token-exempt-end */
        transform: translate(-50%, -58%) rotate(-5deg);
        backdrop-filter: blur(8px);
}

.course-card__body {
        display: flex;
        flex: 1;
        flex-direction: column;
        padding: 1.25rem 1.35rem 1.3rem;
}

.course-card__stats {
        display: flex;
        min-height: 1.6rem;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #52525b;
        /* token-exempt-end */
        font-size: 0.82rem;
        font-weight: 500;
}

.course-card__stat {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
}

.course-card__stat svg {
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #71717a;
        /* token-exempt-end */
        stroke-width: 1.7;
}

.course-card__title {
        margin: 0.8rem 0 0;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #111827;
        /* token-exempt-end */
        font-size: 1.25rem;
        font-weight: 750;
        letter-spacing: -0.035em;
        line-height: 1.35;
}

.course-card__title a {
        color: inherit;
        text-decoration: none;
        transition: color 180ms ease;
}

.course-card__title a:hover {
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #0878c9;
        /* token-exempt-end */
        text-decoration: none;
}

.course-card__summary {
        display: -webkit-box;
        min-height: 3.4rem;
        margin: 0.55rem 0 1.2rem;
        overflow: hidden;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #4b5563;
        /* token-exempt-end */
        font-size: 0.94rem;
        line-height: 1.65;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
}

.course-card__progress {
        margin: auto 0 1.1rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #52525b;
        /* token-exempt-end */
        font-size: 0.82rem;
}

.course-card__progress > span {
        display: block;
        margin-top: 0.45rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #52525b;
        /* token-exempt-end */
        font-weight: 500;
}

.course-card__footer {
        display: flex;
        min-height: 2.5rem;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-top: auto;
        padding-top: 1rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        border-top: 1px solid #f0f0f0;
        /* token-exempt-end */
}

.course-card__instructor,
.course-card__avatars {
        display: flex;
        min-width: 0;
        align-items: center;
}

.course-card__instructor {
        gap: 0.65rem;
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #27272a;
        /* token-exempt-end */
        font-size: 0.86rem;
        font-weight: 650;
}

.course-card__avatars {
        flex-shrink: 0;
}

.course-card__avatars > * + * {
        margin-inline-start: -0.45rem;
}

.course-card__price {
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        color: #111827;
        /* token-exempt-end */
        font-size: 1rem;
        font-weight: 750;
}

.avatar-group {
        display: inline-flex;
        align-items: center;
}

.avatar-group .avatar {
        transition: margin 0.1s ease-in-out;
}

.avatar-group.overlap .avatar + .avatar {
        margin-inline-start: -8px;
}

/* Compatibilidad con el tema oscuro */
html[data-theme='dark'] .course-card {
        border-color: var(--outline-gray-2);
        background: var(--surface-gray-1);
        color: var(--ink-base);
        /* token-exempt-start: color literal original del diseño; conservar sin alterar */
        box-shadow: 0 5px 18px rgb(0 0 0 / 18%);
        /* token-exempt-end */
}

html[data-theme='dark'] .course-card__title,
html[data-theme='dark'] .course-card__price {
        color: var(--ink-base);
}

html[data-theme='dark'] .course-card__summary,
html[data-theme='dark'] .course-card__stats,
html[data-theme='dark'] .course-card__progress,
html[data-theme='dark'] .course-card__progress > span,
html[data-theme='dark'] .course-card__instructor {
        color: var(--ink-gray-3);
}

html[data-theme='dark'] .course-card__footer {
        border-color: var(--outline-gray-2);
}

html[data-theme='dark'] .course-card__stat svg {
        color: var(--ink-gray-4);
}
</style>
