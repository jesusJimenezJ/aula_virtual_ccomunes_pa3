
<template>
	<div class="flex flex-col gap-2.5">
		<button
			v-for="row in ROLE_ROWS"
			:key="row.key"
			type="button"
			data-testid="role-row"
			:aria-pressed="modelValue[row.key]"
			@click="emit('toggle', row.key, !modelValue[row.key])"
			class="group flex w-full items-center gap-3 rounded-6 border-2 px-4 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:focus-ring-blue"
			:class="
				modelValue[row.key]
					? 'border-outline-blue-6 bg-surface-blue-1 text-ink-blue-7'
					: 'border-outline-gray-2 bg-surface-base text-ink-gray-8 hover:border-outline-blue-2 hover:bg-surface-blue-1/40'
			"
		>
			<!-- Selector circular -->
			<span
				class="flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
				:class="
					modelValue[row.key]
						? 'border-outline-blue-6'
						: 'border-outline-gray-3 group-hover:border-outline-blue-3'
				"
			>
				<span
					v-if="modelValue[row.key]"
					class="size-2.5 rounded-full bg-surface-blue-7"
				/>
			</span>

			<!-- Información del perfil -->
			<span class="flex min-w-0 flex-col gap-0.5">
				<span
					class="text-sm font-semibold"
					:class="modelValue[row.key] ? 'text-ink-blue-7' : 'text-ink-gray-9'"
				>
					{{ row.label() }}
				</span>

				<span class="text-sm leading-5 text-ink-gray-6">
					{{ row.description() }}
				</span>
			</span>
		</button>
	</div>
</template>

<script setup lang="ts">
import {
	ROLE_ROWS,
	type MemberRoleKey,
	type MemberRoles,
} from '@/components/Settings/Members/members'

defineProps<{ modelValue: MemberRoles }>()

const emit = defineEmits<{
	toggle: [key: MemberRoleKey, value: boolean]
}>()
</script>
