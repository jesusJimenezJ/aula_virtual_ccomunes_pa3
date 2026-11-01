
<template>
	<main class="home-page">
		<header class="home-heading">
			<div class="home-heading__copy">
				<div class="home-heading__eyebrow">
					<span class="lucide-sparkles size-4" aria-hidden="true" />
					CCOMUNES · AULA VIRTUAL
				</div>

				<h1>¡Hola, {{ firstName }}!</h1>

				<p>
					{{
						isInstructor || isAdministrator ? 'Este es tu espacio para gestionar la plataforma y consultar los cursos.'
							: 'Continúa aprendiendo a tu ritmo. Tus cursos te esperan.'
					}}
				</p>
			</div>

			<div class="home-heading__actions">
				<span class="home-heading__role">
        <span class="lucide-user-round size-4" aria-hidden="true"></span>
        {{ isAdministrator ? 'Administración' : isInstructor ? 'Espacio docente' : 'Espacio de estudiante' }}
</span>

				<router-link
					:to="{ name: 'Courses' }"
					class="home-heading__link"
				>
					{{ isInstructor || isAdministrator ? 'Ver cursos' : 'Explorar cursos' }}
					<span class="lucide-arrow-up-right size-4" aria-hidden="true" />
				</router-link>
                                <router-link
                                        v-if="isInstructor"
                                        :to="{ name: 'NewCourse' }"
                                        class="home-heading__create-course"
                                >
                                        <span class="lucide-plus size-4" aria-hidden="true" />
                                        Crear curso
                                </router-link>
			</div>
		</header>

		<AdminHome
			v-if="isInstructor || isAdministrator"
			:live-classes="adminLiveClasses"
			:evals="adminEvals"
		/>

		<StudentHome v-else :my-live-classes="myLiveClasses" />
	</main>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import { createResource, usePageMeta } from 'frappe-ui'

import StudentHome from '@/pages/Home/StudentHome.vue'
import AdminHome from '@/pages/Home/AdminHome.vue'

const user = inject<any>('$user')

const isInstructor = computed(() =>
        Boolean(
                user?.data?.is_moderator ||
                user?.data?.is_instructor ||
                user?.data?.is_evaluator
        )
)

const isAdministrator = computed(() =>
        Boolean(user?.data?.is_administrator || user?.data?.is_system_manager)
)

const firstName = computed(() => {
	const name = user?.data?.full_name?.trim()
	return name ? name.split(/\s+/)[0] : 'estudiante'
})

// Clases en vivo del estudiante
const myLiveClasses = createResource({
	url: 'lms.lms.api.get_my_live_classes',
	auto: true,
})

// Clases en vivo del docente
const adminLiveClasses = createResource({
	url: 'lms.lms.api.get_admin_live_classes',
	auto: true,
})

// Evaluaciones próximas del docente
const adminEvals = createResource({
	url: 'lms.lms.api.get_admin_evals',
	auto: true,
})

usePageMeta(() => ({
	title: __('Inicio'),
}))
</script>

<style scoped>
.home-page {
	width: 100%;
	max-width: 90rem;
	min-height: 100%;
	margin-inline: auto;
	padding: clamp(1rem, 2.5vw, 2rem);
}

.home-heading {
	position: relative;
	isolation: isolate;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 2rem;
	overflow: hidden;
	min-height: 19rem;
	margin-bottom: 1.25rem;
	padding: clamp(2.5rem, 4vw, 4rem) clamp(2rem, 4vw, 4.2rem);
	/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
	border: 1px solid rgba(255, 255, 255, 0.13);
	/* token-exempt-end */
	border-radius: 1.75rem;
	background: linear-gradient(
		112deg,
		/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
		#07365f 0%,
		/* token-exempt-end */
		/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
		#07558f 48%,
		/* token-exempt-end */
		/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
		#1689ca 100%
		/* token-exempt-end */
	);
	/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
	box-shadow: 0 18px 40px rgba(7, 54, 95, 0.14);
	/* token-exempt-end */
}

.home-heading::before {
	position: absolute;
	z-index: -1;
	top: -8rem;
	right: -5rem;
	width: 26rem;
	height: 26rem;
	/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
	border: 1px solid rgba(255, 255, 255, 0.14);
	/* token-exempt-end */
	border-radius: 50%;
	content: "";
}

.home-heading::after {
	position: absolute;
	z-index: -1;
	right: -1rem;
	bottom: -13rem;
	width: 29rem;
	height: 29rem;
	border-radius: 50%;
	/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
	background: rgba(76, 183, 244, 0.16);
	/* token-exempt-end */
	content: "";
}

.home-heading__copy,
.home-heading__actions {
	position: relative;
	z-index: 1;
}

.home-heading__copy {
	max-width: 65%;
}

.home-heading__eyebrow {
	display: inline-flex;
	align-items: center;
	gap: 0.55rem;
	margin-bottom: 1.1rem;
	/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
	color: #d6edff;
	/* token-exempt-end */
	font-size: 0.78rem;
	font-weight: 800;
	letter-spacing: 0.12em;
	text-transform: uppercase;
}

.home-heading h1 {
	margin: 0;
	/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
	color: #ffffff;
	/* token-exempt-end */
	font-size: clamp(2.3rem, 3.5vw, 3.5rem);
	font-weight: 850;
	letter-spacing: -0.055em;
	line-height: 1.12;
}

.home-heading p {
	max-width: 40rem;
	margin: 0.8rem 0 0;
	/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
	color: rgba(255, 255, 255, 0.88);
	/* token-exempt-end */
	font-size: clamp(1rem, 1.5vw, 1.25rem);
	line-height: 1.65;
}

.home-heading__actions {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;
}





.home-heading__link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.65rem;
        min-height: 3.5rem;
        padding: 0.9rem 1.65rem;
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        border: 1px solid rgba(255, 255, 255, 0.55);
        /* token-exempt-end */
        border-radius: 1rem;
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        background: rgba(255, 255, 255, 0.12);
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        color: #ffffff;
        /* token-exempt-end */
        font-size: 1rem;
        font-weight: 800;
        text-decoration: none;
        backdrop-filter: blur(8px);
        transition: background-color 180ms ease, color 180ms ease,
                    transform 180ms ease, box-shadow 180ms ease;
}

.home-heading__link:hover {
        transform: translateY(-2px);
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        border-color: #ffffff;
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        background: #ffffff;
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        color: #07558f;
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        box-shadow: 0 10px 24px rgba(0, 30, 60, 0.16);
        /* token-exempt-end */
}

.home-heading__link:hover {
	transform: translateY(-2px);
	/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
	background: #eaf6ff;
	/* token-exempt-end */
	/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
	box-shadow: 0 12px 26px rgba(0, 30, 60, 0.2);
	/* token-exempt-end */
}

.home-heading__link:focus-visible {
	/* token-exempt-start: valor CSS de marca original; se conserva exactamente */
	outline: 3px solid #ffffff;
	/* token-exempt-end */
	outline-offset: 4px;
}

@media (max-width: 900px) {
	.home-heading {
		min-height: 17rem;
		padding: 2.5rem;
	}

	.home-heading__copy {
		max-width: 60%;
	}
}

@media (max-width: 640px) {
	.home-page {
		padding: 1rem;
	}

	.home-heading {
		align-items: flex-start;
		flex-direction: column;
		gap: 1.5rem;
		min-height: auto;
		padding: 2rem 1.5rem;
		border-radius: 1.25rem;
	}

	.home-heading__copy {
		max-width: 100%;
	}

	.home-heading h1 {
		font-size: clamp(2rem, 8vw, 2.6rem);
	}

	.home-heading__actions {
		align-items: flex-start;
		width: 100%;
	}

	.home-heading__link {
		width: 100%;
	}

	.home-heading::before {
		right: -14rem;
	}
}

@media (prefers-reduced-motion: reduce) {
        .home-heading__role,
        .home-heading__link,
        .home-heading__create-course {
                transition: none;
        }

        .home-heading__role:hover,
        .home-heading__link:hover,
        .home-heading__create-course:hover {
                transform: none;
        }
}

.home-heading__create-course {
        display: inline-flex;
        min-height: 3.5rem;
        align-items: center;
        justify-content: center;
        gap: 0.65rem;
        padding: 0.9rem 1.65rem;
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        border: 1px solid rgba(255, 255, 255, 0.55);
        /* token-exempt-end */
        border-radius: 1rem;
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        background: rgba(255, 255, 255, 0.12);
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        color: #ffffff;
        /* token-exempt-end */
        font-size: 1rem;
        font-weight: 800;
        text-decoration: none;
        backdrop-filter: blur(8px);
        transition: background-color 180ms ease, color 180ms ease,
                    transform 180ms ease, box-shadow 180ms ease;
}

.home-heading__create-course:hover {
        transform: translateY(-2px);
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        border-color: #ffffff;
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        background: #ffffff;
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        color: #07558f;
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        box-shadow: 0 10px 24px rgba(0, 30, 60, 0.16);
        /* token-exempt-end */
}

.home-heading__create-course:hover {
        transform: translateY(-2px);
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        background: rgba(255, 255, 255, 0.23);
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        color: #ffffff;
        /* token-exempt-end */
}

.home-heading__create-course:focus-visible {
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        outline: 3px solid #ffffff;
        /* token-exempt-end */
        outline-offset: 3px;
}


/* HOME-HOVER-FINAL-FIX */

/* Espacio docente: etiqueta compacta */


/* Crear curso: mismo comportamiento visual que Ver cursos */
.home-heading__actions .home-heading__create-course {
        min-height: 3.5rem;
        padding: 0.9rem 1.65rem;
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        border: 1px solid rgba(255, 255, 255, 0.55);
        /* token-exempt-end */
        border-radius: 1rem;
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        background: rgba(255, 255, 255, 0.12);
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        color: #ffffff;
        /* token-exempt-end */
        box-shadow: none;
        transition:
                background-color 180ms ease,
                color 180ms ease,
                border-color 180ms ease,
                transform 180ms ease,
                box-shadow 180ms ease;
}

.home-heading__actions .home-heading__create-course:hover {
        transform: translateY(-2px);
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        border-color: #ffffff;
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        background: #ffffff !important;
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        color: #07558f !important;
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        box-shadow: 0 10px 24px rgba(0, 30, 60, 0.16);
        /* token-exempt-end */
}

.home-heading__actions .home-heading__create-course:hover span,
.home-heading__actions .home-heading__create-course:hover svg {
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        color: #07558f !important;
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        stroke: #07558f;
        /* token-exempt-end */
}

.home-heading__create-course:focus-visible {
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        outline: 3px solid #ffffff;
        /* token-exempt-end */
        outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
        .home-heading__create-course {
                transition: none;
        }

        .home-heading__create-course:hover {
                transform: none;
        }
}


/* ESPACIO DOCENTE - ETIQUETA COMPACTA Y ESTATICA */
.home-heading__role {
        display: inline-flex;
        width: fit-content;
        min-height: 2.25rem;
        align-items: center;
        justify-content: center;
        gap: 0.45rem;
        padding: 0.4rem 0.85rem;
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        border: 1px solid rgba(255, 255, 255, 0.38);
        /* token-exempt-end */
        border-radius: 999px;
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        background: rgba(255, 255, 255, 0.12);
        /* token-exempt-end */
        /* token-exempt-start: valor CSS de marca original; se conserva exactamente */
        color: #ffffff;
        /* token-exempt-end */
        font-size: 0.82rem;
        font-weight: 700;
        line-height: 1.2;
        white-space: nowrap;
        cursor: default;
        box-shadow: none;
        transition: none;
        backdrop-filter: blur(8px);
}

.home-heading__role .lucide-user-round {
        width: 1rem;
        height: 1rem;
        flex-shrink: 0;
}

</style>
