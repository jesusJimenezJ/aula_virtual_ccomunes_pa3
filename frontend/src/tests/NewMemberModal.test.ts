import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const { callMock, closeMock } = vi.hoisted(() => ({
	callMock: vi.fn(),
	closeMock: vi.fn(),
}))

// Aislar el componente de la cadena Members.vue -> MemberForm.vue.
// Se representan únicamente los tres perfiles funcionales visibles.
vi.mock('@/components/Settings/Members/members', () => ({
	ROLE_ROWS: [
		{
			key: 'lms_student',
			role: 'LMS Student',
			label: () => 'Estudiante',
			description: () =>
				'Accede a cursos y realiza actividades académicas',
		},
		{
			key: 'course_creator',
			role: 'Course Creator',
			label: () => 'Docente',
			description: () =>
				'Gestiona cursos, contenidos y actividades académicas',
		},
		{
			key: 'moderator',
			role: 'Moderator',
			label: () => 'Personal de soporte',
			description: () =>
				'Administra el aula virtual según sus permisos',
		},
	],
	noRoles: () => ({
		lms_student: false,
		course_creator: false,
		moderator: false,
	}),
}))

vi.mock('frappe-ui', () => ({
	call: callMock,
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
	Dialog: {
		props: ['open', 'title', 'actions'],
		setup() {
			return { closeMock }
		},
		template: `
			<div v-if="open">
				<div data-testid="title">{{ title }}</div>
				<slot />
				<button
					v-for="action in actions"
					:key="action.label"
					:data-testid="'action-' + action.label"
					@click="action.onClick({ close: closeMock })"
				>{{ action.label }}</button>
			</div>
		`,
	},
	FormControl: {
		props: ['modelValue', 'label', 'type', 'disabled', 'required'],
		emits: ['update:modelValue'],
		template: `
			<input
				:data-testid="'field-' + label"
				:type="type"
				:disabled="disabled"
				:data-required="required ? 'true' : 'false'"
				:value="modelValue"
				@input="$emit('update:modelValue', $event.target.value)"
			/>
		`,
	},
}))

vi.mock('@/utils', () => ({
	cleanError: (error: unknown) => error,
}))

vi.stubGlobal('__', (value: string) => value)

import NewMemberModal from '@/components/Modals/NewMemberModal.vue'

const mountModal = (props: Record<string, unknown> = {}) =>
	mount(NewMemberModal, {
		props: { modelValue: false, ...props },
		global: { mocks: { __: (value: string) => value } },
	})

const open = async (wrapper: ReturnType<typeof mountModal>) => {
	await wrapper.setProps({ modelValue: true })
	await flushPromises()
}

const clickAction = async (
	wrapper: ReturnType<typeof mountModal>,
	label: string,
) => {
	await wrapper.get(`[data-testid="action-${label}"]`).trigger('click')
	await flushPromises()
}

const roleRow = (
	wrapper: ReturnType<typeof mountModal>,
	label: string,
) => {
	const row = wrapper
		.findAll('[data-testid="role-row"]')
		.find((candidate) => candidate.text().includes(label))

	if (!row) {
		throw new Error(`No se encontró el perfil visible: ${label}`)
	}

	return row
}

const saveRoleCalls = () =>
	callMock.mock.calls.filter(
		(call) => call[0] === 'lms.lms.api.save_role',
	)

const editMember = (roles: string[] = []) => ({
	name: 'mod@x.com',
	full_name: 'Mod X',
	roles,
})

beforeEach(() => {
	callMock.mockReset()
	callMock.mockResolvedValue(true)
	closeMock.mockReset()
})

describe('NewMemberModal: agregar miembro', () => {
	it('muestra el título, los campos y el correo obligatorio', async () => {
		const wrapper = mountModal()
		await open(wrapper)

		expect(wrapper.get('[data-testid="title"]').text()).toBe(
			'Agregar miembro',
		)
		expect(wrapper.find('[data-testid="action-Agregar"]').exists()).toBe(
			true,
		)
		expect(
			wrapper.find('[data-testid="field-Primer nombre"]').exists(),
		).toBe(true)

		const email = wrapper.get(
			'[data-testid="field-Correo electrónico"]',
		)
		expect(email.attributes('disabled')).toBeUndefined()
		expect(email.attributes('data-required')).toBe('true')
	})

	it('muestra solamente los tres perfiles funcionales', async () => {
		const wrapper = mountModal()
		await open(wrapper)

		const rows = wrapper.findAll('[data-testid="role-row"]')
		expect(rows).toHaveLength(3)

		const labels = rows.map((row) => row.text())
		expect(labels.some((label) => label.includes('Estudiante'))).toBe(true)
		expect(labels.some((label) => label.includes('Docente'))).toBe(true)
		expect(
			labels.some((label) => label.includes('Personal de soporte')),
		).toBe(true)
		expect(labels.some((label) => label.includes('Batch Evaluator'))).toBe(
			false,
		)
	})

	it('impide agregar un miembro si el correo está vacío', async () => {
		const wrapper = mountModal()
		await open(wrapper)
		await clickAction(wrapper, 'Agregar')

		expect(wrapper.text()).toContain(
			'Escribe un correo electrónico para continuar.',
		)
		expect(callMock).not.toHaveBeenCalled()
		expect(closeMock).not.toHaveBeenCalled()
	})

	it('crea el usuario y asigna solamente el perfil seleccionado', async () => {
		const wrapper = mountModal()
		await open(wrapper)

		callMock.mockResolvedValueOnce({ name: 'jane@doe.com' })

		await wrapper
			.get('[data-testid="field-Correo electrónico"]')
			.setValue('jane@doe.com')
		await roleRow(wrapper, 'Personal de soporte').trigger('click')
		await clickAction(wrapper, 'Agregar')

		expect(callMock).toHaveBeenCalledWith('frappe.client.insert', {
			doc: {
				doctype: 'User',
				email: 'jane@doe.com',
				first_name: undefined,
				last_name: undefined,
			},
		})

		expect(saveRoleCalls()).toHaveLength(1)
		expect(saveRoleCalls()[0][1]).toEqual({
			user: 'jane@doe.com',
			role: 'Moderator',
			value: 1,
		})
		expect(wrapper.emitted('created')?.[0]?.[0]).toEqual({
			name: 'jane@doe.com',
		})
		expect(closeMock).toHaveBeenCalled()
	})

	it('permite asignar más de un perfil funcional', async () => {
		const wrapper = mountModal()
		await open(wrapper)

		callMock.mockResolvedValueOnce({ name: 'x@y.com' })

		await wrapper
			.get('[data-testid="field-Correo electrónico"]')
			.setValue('x@y.com')
		await roleRow(wrapper, 'Personal de soporte').trigger('click')
		await roleRow(wrapper, 'Estudiante').trigger('click')
		await clickAction(wrapper, 'Agregar')

		const roles = saveRoleCalls().map((call) => call[1].role)
		expect(roles).toContain('Moderator')
		expect(roles).toContain('LMS Student')
		expect(saveRoleCalls().every((call) => call[1].value === 1)).toBe(true)
	})

	it('aplica los perfiles predeterminados al abrir el formulario', async () => {
		const wrapper = mountModal({ defaultRoles: ['lms_student'] })
		await open(wrapper)

		expect(roleRow(wrapper, 'Estudiante').attributes('aria-pressed')).toBe(
			'true',
		)
		expect(
			roleRow(wrapper, 'Personal de soporte').attributes('aria-pressed'),
		).toBe('false')
	})

	it('muestra el error de inserción y no cierra el formulario', async () => {
		const wrapper = mountModal()
		await open(wrapper)

		callMock.mockRejectedValueOnce({ messages: ['boom'] })

		await wrapper
			.get('[data-testid="field-Correo electrónico"]')
			.setValue('a@b.com')
		await clickAction(wrapper, 'Agregar')

		expect(wrapper.text()).toContain('boom')
		expect(closeMock).not.toHaveBeenCalled()
	})
})

describe('NewMemberModal: editar miembro', () => {
	it('muestra el título de edición y bloquea el correo', async () => {
		const wrapper = mountModal({
			editMember: editMember(['Moderator']),
		})
		await open(wrapper)

		expect(wrapper.get('[data-testid="title"]').text()).toBe(
			'Editar miembro',
		)
		expect(
			wrapper.find('[data-testid="action-Guardar cambios"]').exists(),
		).toBe(true)
		expect(
			wrapper.find('[data-testid="field-Primer nombre"]').exists(),
		).toBe(false)

		const email = wrapper.get(
			'[data-testid="field-Correo electrónico"]',
		)
		expect(email.attributes('disabled')).toBeDefined()
		expect((email.element as HTMLInputElement).value).toBe('mod@x.com')
	})

	it('refleja los perfiles funcionales y mantiene oculto Batch Evaluator', async () => {
		const wrapper = mountModal({
			editMember: editMember(['Moderator', 'Batch Evaluator']),
		})
		await open(wrapper)

		expect(
			roleRow(wrapper, 'Personal de soporte').attributes('aria-pressed'),
		).toBe('true')
		expect(roleRow(wrapper, 'Docente').attributes('aria-pressed')).toBe(
			'false',
		)
		expect(wrapper.findAll('[data-testid="role-row"]')).toHaveLength(3)
		expect(wrapper.text()).not.toContain('Batch Evaluator')
	})

	it('guarda sin llamadas de red cuando no hay cambios', async () => {
		const wrapper = mountModal({
			editMember: editMember(['Moderator']),
		})
		await open(wrapper)
		await clickAction(wrapper, 'Guardar cambios')

		expect(saveRoleCalls()).toHaveLength(0)
		expect(wrapper.emitted('updated')).toBeTruthy()
		expect(closeMock).toHaveBeenCalled()
	})

	it('agrega un perfil mediante una única llamada save_role', async () => {
		const wrapper = mountModal({
			editMember: editMember(['Moderator']),
		})
		await open(wrapper)

		await roleRow(wrapper, 'Docente').trigger('click')
		await clickAction(wrapper, 'Guardar cambios')

		expect(saveRoleCalls()).toHaveLength(1)
		expect(saveRoleCalls()[0][1]).toEqual({
			user: 'mod@x.com',
			role: 'Course Creator',
			value: 1,
		})
	})

	it('elimina un perfil mediante save_role con valor cero', async () => {
		const wrapper = mountModal({
			editMember: editMember(['Moderator']),
		})
		await open(wrapper)

		await roleRow(wrapper, 'Personal de soporte').trigger('click')
		await clickAction(wrapper, 'Guardar cambios')

		expect(saveRoleCalls()).toHaveLength(1)
		expect(saveRoleCalls()[0][1]).toEqual({
			user: 'mod@x.com',
			role: 'Moderator',
			value: 0,
		})
	})

	it('aplica solamente los cambios realizados en varios perfiles', async () => {
		const wrapper = mountModal({
			editMember: editMember(['Moderator']),
		})
		await open(wrapper)

		await roleRow(wrapper, 'Personal de soporte').trigger('click')
		await roleRow(wrapper, 'Docente').trigger('click')
		await clickAction(wrapper, 'Guardar cambios')

		const changes = Object.fromEntries(
			saveRoleCalls().map((call) => [call[1].role, call[1].value]),
		)
		expect(changes).toEqual({
			Moderator: 0,
			'Course Creator': 1,
		})
	})

	it('conserva Batch Evaluator al modificar los perfiles funcionales', async () => {
		const wrapper = mountModal({
			editMember: editMember(['Moderator', 'Batch Evaluator']),
		})
		await open(wrapper)

		await roleRow(wrapper, 'Docente').trigger('click')
		await clickAction(wrapper, 'Guardar cambios')

		expect(saveRoleCalls()).toHaveLength(1)
		expect(saveRoleCalls()[0][1]).toEqual({
			user: 'mod@x.com',
			role: 'Course Creator',
			value: 1,
		})
		expect(
			saveRoleCalls().some((call) => call[1].role === 'Batch Evaluator'),
		).toBe(false)
	})

	it('muestra el error al guardar y mantiene abierto el formulario', async () => {
		const wrapper = mountModal({
			editMember: editMember(['Moderator']),
		})
		await open(wrapper)

		callMock.mockRejectedValueOnce({ messages: ['nope'] })

		await roleRow(wrapper, 'Docente').trigger('click')
		await clickAction(wrapper, 'Guardar cambios')

		expect(wrapper.text()).toContain('nope')
		expect(closeMock).not.toHaveBeenCalled()
	})

	it('trata LMS Student como un perfil funcional normal al editar', async () => {
		const wrapper = mountModal({
			editMember: editMember(['LMS Student', 'Moderator']),
		})
		await open(wrapper)

		expect(roleRow(wrapper, 'Estudiante').attributes('aria-pressed')).toBe(
			'true',
		)

		await roleRow(wrapper, 'Estudiante').trigger('click')
		await clickAction(wrapper, 'Guardar cambios')

		expect(saveRoleCalls()).toHaveLength(1)
		expect(saveRoleCalls()[0][1]).toEqual({
			user: 'mod@x.com',
			role: 'LMS Student',
			value: 0,
		})
	})
})

describe('NewMemberModal: aislamiento de estado', () => {
	it('restablece el formulario al pasar de edición a agregar', async () => {
		const wrapper = mountModal({
			editMember: editMember(['Moderator']),
		})
		await open(wrapper)

		expect(wrapper.get('[data-testid="title"]').text()).toBe(
			'Editar miembro',
		)

		await wrapper.setProps({ modelValue: false })
		await wrapper.setProps({ editMember: null })
		await open(wrapper)

		expect(wrapper.get('[data-testid="title"]').text()).toBe(
			'Agregar miembro',
		)
		expect(
			wrapper.find('[data-testid="field-Primer nombre"]').exists(),
		).toBe(true)
		expect(
			roleRow(wrapper, 'Personal de soporte').attributes('aria-pressed'),
		).toBe('false')

		const email = wrapper.get(
			'[data-testid="field-Correo electrónico"]',
		)
		expect((email.element as HTMLInputElement).value).toBe('')
		expect(email.attributes('disabled')).toBeUndefined()
	})

	it('impide enviar un correo compuesto solo por espacios', async () => {
		const wrapper = mountModal()
		await open(wrapper)

		await wrapper
			.get('[data-testid="field-Correo electrónico"]')
			.setValue('   ')
		await clickAction(wrapper, 'Agregar')

		expect(wrapper.text()).toContain(
			'Escribe un correo electrónico para continuar.',
		)
		expect(callMock).not.toHaveBeenCalled()
	})

	it('evita enviar dos veces los mismos cambios', async () => {
		const wrapper = mountModal({
			editMember: editMember(['Moderator']),
		})
		await open(wrapper)

		await roleRow(wrapper, 'Docente').trigger('click')

		const button = wrapper.get(
			'[data-testid="action-Guardar cambios"]',
		)
		const firstClick = button.trigger('click')
		const secondClick = button.trigger('click')

		await Promise.all([firstClick, secondClick])
		await flushPromises()

		expect(saveRoleCalls()).toHaveLength(1)
	})
})
