<template>
	<div class="ccomunes-sidebar h-full"
        :class="{ 'is-collapsed': sidebarStore.isSidebarCollapsed }">
		<Sidebar
			:collapsed="sidebarStore.isSidebarCollapsed"
			width="13.5rem"
			collapsedWidth="4.25rem"
			:ariaLabel="__('Main')"
			:class="[
                'ccomunes-sidebar-panel border-e',
                { 'ccomunes-sidebar-collapsed': sidebarStore.isSidebarCollapsed },
            ]"
			@update:collapsed="setCollapsed"
		>
			<UserDropdown />

			<div
				v-if="!sidebarStore.isSidebarCollapsed"
				class="ccomunes-navigation-heading"
			>
				Navegación principal
			</div>

			<div class="ccomunes-navigation min-h-0 flex-1 overflow-y-auto px-2 pt-2">
				<div v-if="sidebarSettings.data" class="flex flex-col gap-0.5">
					<template v-for="row in sidebarRows" :key="row.key">
						<div
							v-if="row.kind === 'gap'"
							class="h-2.5"
							aria-hidden="true"
						/>

						<SidebarSection
							v-else-if="row.kind === 'accordion'"
							:label="__(row.label)"
							collapsible
							:collapsed="!sidebarStore.isGroupOpen(row.key)"
							@update:collapsed="sidebarStore.toggleGroup(row.key)"
						>
							<SidebarLink
								v-for="item in row.items"
								:key="item.key"
								:link="item.link"
							/>
						</SidebarSection>

						<SidebarLink v-else :link="row.link" />
					</template>
				</div>
			</div>

			<div class="ccomunes-sidebar-footer mt-auto flex flex-col gap-1 px-2 pb-2">
				<span v-if="readOnlyMode" class="sr-only">
					{{ readOnlyNotice }}
				</span>

				<div
					v-if="readOnlyMode && !sidebarStore.isSidebarCollapsed"
					class="ccomunes-readonly-notice"
				>
					{{ readOnlyNotice }}
				</div>

				<template v-if="isStudent && !profileIsComplete">
					<SidebarItem
						v-if="sidebarStore.isSidebarCollapsed"
						class="ccomunes-profile-shortcut"
						:label="__('Completa tu perfil')"
						icon="lucide-user"
						:route="profileRoute"
						:active="false"
					/>

					<SidebarCard
						v-else
						class="ccomunes-profile-card"
						:title="__('Completa tu perfil')"
						:description="
							__('Destaca lo que te hace único y muestra tus habilidades.')
						"
						icon="lucide-user"
						:action="{
							label: __('Mi perfil'),
							route: profileRoute,
							iconLeft: 'lucide-chevrons-right',
						}"
					/>
				</template>

				<SidebarCollapseToggle
					class="ccomunes-collapse-toggle mt-1"
					:aria-label="
						sidebarStore.isSidebarCollapsed ? __('Expand') : __('Collapse')
					"
				/>
			</div>
		</Sidebar>
	</div>
</template>

<script setup>
import { getSidebarLinks } from '@/utils'
import { usersStore } from '@/stores/user'
import { useSidebar } from '@/stores/sidebar'
import { useSettings } from '@/stores/settings'

import {
	Sidebar,
	SidebarCard,
	SidebarCollapseToggle,
	SidebarItem,
	SidebarSection,
} from 'frappe-ui'

import { buildSidebarRows } from '@/utils/sidebarRows'

import {
	ref,
	onMounted,
	inject,
	watch,
	onUnmounted,
	computed,
} from 'vue'

import UserDropdown from '@/components/Sidebar/UserDropdown.vue'
import SidebarLink from '@/components/Sidebar/SidebarLink.vue'

import {
	loadUnreadCount,
	unreadCount,
	unreadNotifications,
} from '@/stores/notifications'

const { userResource } = usersStore()

const sidebarStore = useSidebar()
const socket = inject('$socket')

const sidebarLinks = ref(null)

const { sidebarSettings, loadSidebarSettings } = useSettings()
const settingsStore = useSettings()

const readOnlyMode = window.read_only_mode

const readOnlyNotice = __(
	'El sitio está en mantenimiento. No podrás realizar cambios hasta que se restablezca el acceso.'
)

onMounted(() => {
	updateSidebarLinks()
	loadUnreadCount()

	socket.on('publish_lms_notifications', () => {
		unreadNotifications.reload()
	})
})

watch(unreadCount, () => updateUnreadCount())

const sidebarRows = computed(() =>
	buildSidebarRows(sidebarLinks.value ?? [], sidebarSettings.data)
)

const updateUnreadCount = () => {
	sidebarLinks.value?.forEach((link) => {
		link.items.forEach((item) => {
			if (item.label === 'Notificaciones') {
				item.count = unreadCount.value || 0
			}
		})
	})
}

const setCollapsed = (collapsed) => {
	sidebarStore.isSidebarCollapsed = collapsed
	localStorage.setItem('isSidebarCollapsed', JSON.stringify(collapsed))
}

watch(userResource, async () => {
	await userResource.promise
	updateSidebarLinks()
})

watch(settingsStore.settings, () => {
	updateSidebarLinks()
})

watch(
	() => sidebarSettings.data,
	() => updateSidebarLinks(),
	{ deep: true }
)

const updateSidebarLinks = () => {
	sidebarLinks.value = getSidebarLinks()
	loadSidebarSettings()
	updateUnreadCount()
}

const isStudent = computed(() => userResource.data?.is_student)

const profileRoute = computed(() => ({
	name: 'Profile',
	params: { username: userResource.data?.username },
}))

const profileIsComplete = computed(
	() =>
		userResource.data?.user_image &&
		userResource.data?.headline &&
		userResource.data?.bio
)

onUnmounted(() => {
	socket.off('publish_lms_notifications')
})
</script>

<style scoped>
.ccomunes-sidebar {
	height: 100%;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background: #081a30;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #e8f1fc;
	/* token-exempt-end */
}

.ccomunes-sidebar-panel {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background: linear-gradient(180deg, #081a30 0%, #102640 100%);
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border-color: #203b58;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #e8f1fc;
	/* token-exempt-end */
}

.ccomunes-navigation-heading {
	padding: 0.75rem 0.7rem 0.45rem;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #91a8c2;
	/* token-exempt-end */
	font-size: 0.68rem;
	font-weight: 700;
	letter-spacing: 0.09em;
	text-transform: uppercase;
}

.ccomunes-navigation {
	scrollbar-width: thin;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	scrollbar-color: #36516d transparent;
	/* token-exempt-end */
}

/* Elementos de navegación */
.ccomunes-sidebar-panel :deep(.ccomunes-sidebar-link) {
	display: flex;
	min-height: 2.45rem;
	margin: 0.15rem 0;
	border: 1px solid transparent;
	border-radius: 0.7rem;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #d5e2f1;
	/* token-exempt-end */
	transition:
		background 160ms ease,
		color 160ms ease,
		border-color 160ms ease;
}

.ccomunes-sidebar-panel :deep(.ccomunes-sidebar-link:hover),
:deep(.ccomunes-profile-shortcut:hover),
:deep(.ccomunes-collapse-toggle:hover) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background: #193957;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #ffffff;
	/* token-exempt-end */
}

.ccomunes-sidebar-panel :deep(.ccomunes-sidebar-link--active) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border-color: rgb(69 161 224 / 18%);
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background: linear-gradient(90deg, #0878bd, #155b91);
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #ffffff;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	box-shadow: 0 3px 10px rgb(0 0 0 / 14%);
	/* token-exempt-end */
}

/* Aviso de mantenimiento */
.ccomunes-readonly-notice {
	z-index: 10;
	margin: 0.4rem;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border: 1px solid #385875;
	/* token-exempt-end */
	border-radius: 0.7rem;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background: #142f49;
	/* token-exempt-end */
	padding: 0.65rem 0.7rem;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #dceafa;
	/* token-exempt-end */
	font-size: 0.75rem;
	line-height: 1.5;
}

/* Tarjeta de perfil blanca */
.ccomunes-sidebar-panel :deep(.ccomunes-profile-card) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	border: 1px solid #e5e7eb;
	/* token-exempt-end */
	border-radius: 0.85rem;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background: #ffffff !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #111827 !important;
	/* token-exempt-end */
}

.ccomunes-sidebar-panel :deep(.ccomunes-profile-card *) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #111827 !important;
	/* token-exempt-end */
}

/* =====================================================
   BOTÓN MI PERFIL - AZUL CLARO Y TEXTO BLANCO
   Solo afecta a la acción de la tarjeta de perfil.
===================================================== */

.ccomunes-sidebar-panel
:deep(.ccomunes-profile-card button),
.ccomunes-sidebar-panel
:deep(.ccomunes-profile-card a),
.ccomunes-sidebar-panel
:deep(.ccomunes-profile-card [role="button"]) {
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    background: #1685c5 !important;
    /* token-exempt-end */
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    background-color: #1685c5 !important;
    /* token-exempt-end */
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    border: 1px solid #1685c5 !important;
    /* token-exempt-end */
    border-radius: 0.65rem !important;
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    color: #ffffff !important;
    /* token-exempt-end */
}

/* Texto e icono de Mi perfil */
.ccomunes-sidebar-panel
:deep(.ccomunes-profile-card button *),
.ccomunes-sidebar-panel
:deep(.ccomunes-profile-card a *),
.ccomunes-sidebar-panel
:deep(.ccomunes-profile-card [role="button"] *) {
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    color: #ffffff !important;
    /* token-exempt-end */
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    stroke: #ffffff !important;
    /* token-exempt-end */
}

/* Efecto hover */
.ccomunes-sidebar-panel
:deep(.ccomunes-profile-card button:hover),
.ccomunes-sidebar-panel
:deep(.ccomunes-profile-card a:hover),
.ccomunes-sidebar-panel
:deep(.ccomunes-profile-card [role="button"]:hover) {
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    background: #1176b1 !important;
    /* token-exempt-end */
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    background-color: #1176b1 !important;
    /* token-exempt-end */
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    border-color: #1176b1 !important;
    /* token-exempt-end */
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    color: #ffffff !important;
    /* token-exempt-end */
}

/* =====================================================
   ICONOS DE NAVEGACIÓN: BLANCOS EN TODOS LOS ESTADOS
===================================================== */

.ccomunes-sidebar-panel :deep(.ccomunes-navigation svg),
.ccomunes-sidebar-panel :deep(.ccomunes-navigation svg *),
.ccomunes-sidebar-panel :deep(.ccomunes-navigation .text-ink-gray-6),
.ccomunes-sidebar-panel :deep(.ccomunes-navigation .text-ink-gray-8),
.ccomunes-sidebar-panel :deep(.ccomunes-navigation .text-ink-gray-5) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #ffffff !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	stroke: #ffffff !important;
	/* token-exempt-end */
}

/* =====================================================
   PERFIL CONTRAÍDO: CORREGIR EL FONDO BLANCO DEL HOVER
===================================================== */

.ccomunes-sidebar-panel :deep(.ccomunes-profile-shortcut) {
	background: transparent !important;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #ffffff !important;
	/* token-exempt-end */
}

.ccomunes-sidebar-panel :deep(.ccomunes-profile-shortcut:hover),
.ccomunes-sidebar-panel :deep(.ccomunes-profile-shortcut:focus),
.ccomunes-sidebar-panel :deep(.ccomunes-profile-shortcut:active) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background: #193957 !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #ffffff !important;
	/* token-exempt-end */
}

.ccomunes-sidebar-panel :deep(.ccomunes-profile-shortcut svg),
.ccomunes-sidebar-panel :deep(.ccomunes-profile-shortcut svg *),
.ccomunes-sidebar-panel :deep(.ccomunes-profile-shortcut .text-ink-gray-6),
.ccomunes-sidebar-panel :deep(.ccomunes-profile-shortcut .text-ink-gray-8),
.ccomunes-sidebar-panel :deep(.ccomunes-profile-shortcut .text-ink-gray-5) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #ffffff !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	stroke: #ffffff !important;
	/* token-exempt-end */
}

/* =====================================================
   COLLAPSE: CENTRAR EL CONTROL Y CONSERVAR EL ICONO BLANCO
   En Frappe UI el icono es un span, no un SVG.
===================================================== */

.ccomunes-sidebar-panel :deep(.ccomunes-collapse-toggle) {
	display: flex;
	width: 100%;
	justify-content: center;
	align-items: center;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #ffffff !important;
	/* token-exempt-end */
}

.ccomunes-sidebar-panel :deep(.ccomunes-collapse-toggle [data-slot="sidebar-item"]) {
	display: flex;
	width: 100%;
	justify-content: center !important;
	align-items: center !important;
	background: transparent !important;
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #ffffff !important;
	/* token-exempt-end */
}

.ccomunes-sidebar-panel :deep(.ccomunes-collapse-toggle [data-slot="sidebar-item"]:hover) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	background: #193957 !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #ffffff !important;
	/* token-exempt-end */
}

.ccomunes-sidebar-panel :deep(.ccomunes-collapse-toggle [data-slot="sidebar-item"] > *) {
	display: flex;
	width: 100%;
	justify-content: center !important;
	align-items: center !important;
}

.ccomunes-sidebar-panel :deep(.ccomunes-collapse-toggle .lucide-panel-right-open),
.ccomunes-sidebar-panel :deep(.ccomunes-collapse-toggle .text-ink-gray-6),
.ccomunes-sidebar-panel :deep(.ccomunes-collapse-toggle .text-ink-gray-8),
.ccomunes-sidebar-panel :deep(.ccomunes-collapse-toggle .text-ink-gray-5) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #ffffff !important;
	/* token-exempt-end */
}

/* Mantener oscuros los iconos de la tarjeta blanca */
.ccomunes-sidebar-panel :deep(.ccomunes-profile-card svg),
.ccomunes-sidebar-panel :deep(.ccomunes-profile-card svg *) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	color: #111827 !important;
	/* token-exempt-end */
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	stroke: #111827 !important;
	/* token-exempt-end */
}

/* Accesibilidad */
.ccomunes-sidebar-panel :deep(button:focus-visible) {
	/* token-exempt-start: color literal original del diseño; conservar sin alterar */
	outline: 2px solid #38a8f5;
	/* token-exempt-end */
	outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
	.ccomunes-sidebar-panel * {
		transition: none !important;
	}
}





/* ============================================================
   CENTRADO EXACTO DE LOS CUATRO ICONOS
   Inicio | Cursos | Perfil | Collapse
============================================================ */

/*
 * Frappe UI genera:
 * [data-slot="sidebar-item"] como contenedor raíz.
 * Dentro coloca un enlace o botón con el icono en span.grid.
 *
 * Se centra el icono respecto al ancho completo del control.
 */

.ccomunes-sidebar.is-collapsed
    :deep([data-slot="sidebar-item"]) {
    position: relative !important;
    width: 100% !important;
    min-width: 0 !important;
}

/* El enlace o botón ocupa todo el ancho disponible */
.ccomunes-sidebar.is-collapsed
    :deep([data-slot="sidebar-item"] > a),
.ccomunes-sidebar.is-collapsed
    :deep([data-slot="sidebar-item"] > button) {
    position: relative !important;
    display: flex !important;
    width: 100% !important;
    min-width: 0 !important;
    justify-content: center !important;
    align-items: center !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
}

/* Icono centrado geométricamente en el 50% del control */
.ccomunes-sidebar.is-collapsed
    :deep([data-slot="sidebar-item"] span.grid) {
    position: absolute !important;
    left: 50% !important;
    top: 50% !important;
    right: auto !important;
    margin: 0 !important;
    transform: translate(-50%, -50%) !important;
    display: grid !important;
    place-items: center !important;
}

/* Evitar que el texto altere el eje del icono */
.ccomunes-sidebar.is-collapsed
    :deep([data-slot="sidebar-item"] .truncate) {
    display: none !important;
}

/* Perfil y Collapse utilizan el mismo ancho del menú */
.ccomunes-sidebar.is-collapsed
    :deep(.ccomunes-sidebar-footer [data-slot="sidebar-item"]) {
    width: 100% !important;
}

/* Icono Collapse: Frappe UI utiliza un span */
.ccomunes-sidebar.is-collapsed
    :deep(.ccomunes-collapse-toggle .lucide-panel-right-open) {
    position: absolute !important;
    left: 50% !important;
    top: 50% !important;
    margin: 0 !important;
    transform: translate(-50%, -50%) !important;
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    color: #ffffff !important;
    /* token-exempt-end */
}

/* Conservar el color blanco de los iconos */
.ccomunes-sidebar.is-collapsed
    :deep([data-slot="sidebar-item"] svg),
.ccomunes-sidebar.is-collapsed
    :deep([data-slot="sidebar-item"] svg *) {
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    color: #ffffff !important;
    /* token-exempt-end */
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    stroke: #ffffff !important;
    /* token-exempt-end */
}

/* Mantener oscuro el icono de la tarjeta blanca expandida */
.ccomunes-sidebar
    :deep(.ccomunes-profile-card svg),
.ccomunes-sidebar
    :deep(.ccomunes-profile-card svg *) {
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    color: #111827 !important;
    /* token-exempt-end */
    /* token-exempt-start: color literal original del diseño; conservar sin alterar */
    stroke: #111827 !important;
    /* token-exempt-end */
}




/* PERFIL: AZUL SOLO AL PASAR EL MOUSE O ESTAR ACTIVO */
:deep(.ccomunes-profile-shortcut:hover),
:deep(.ccomunes-profile-shortcut:hover > a),
:deep(.ccomunes-profile-shortcut:hover > button),
:deep(.ccomunes-profile-shortcut[data-state="active"]),
:deep(.ccomunes-profile-shortcut[data-state="active"] > a),
:deep(.ccomunes-profile-shortcut[data-state="active"] > button) {
  /* token-exempt-start: color literal original del diseño; conservar sin alterar */
  background-color: #1685c5 !important;
  /* token-exempt-end */
  /* token-exempt-start: color literal original del diseño; conservar sin alterar */
  color: #ffffff !important;
  /* token-exempt-end */
  /* token-exempt-start: color literal original del diseño; conservar sin alterar */
  border-color: #1685c5 !important;
  /* token-exempt-end */
}

:deep(.ccomunes-profile-shortcut span),
:deep(.ccomunes-profile-shortcut svg),
:deep(.ccomunes-profile-shortcut i) {
  /* token-exempt-start: color literal original del diseño; conservar sin alterar */
  color: #ffffff !important;
  /* token-exempt-end */
  /* token-exempt-start: color literal original del diseño; conservar sin alterar */
  stroke: #ffffff !important;
  /* token-exempt-end */
}

</style>