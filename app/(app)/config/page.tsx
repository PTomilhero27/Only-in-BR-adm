import { Users, CalendarDays } from 'lucide-react'
import { ConfigSectionsAccordion } from './components/config-sections-accordion'
import { UsersAdminSection } from './sections/users-admin-section'
import { FairsAdminSection } from './sections/fairs-admin-section'
import { RoleGuard } from '@/app/shared/http/components/role-guard'
import { AppBreadcrumb } from '@/components/breadcrumb/app-breadcrumb'


/**
 * Página de Configurações (Admin).
 * Responsabilidade:
 * - Centralizar as configurações administrativas do sistema.
 * - Expor seções colapsáveis para: Usuários, Feiras e Formulários.
 *
 * Decisão arquitetural:
 * - Esta página fica no route group (app) e exige autenticação.
 * - Além disso, aplicamos RoleGuard para restringir ao ADMIN.
 */
export default function ConfigPage() {
    return (
        <RoleGuard
            allowedRoles={['ADMIN']}
        >
            <div className="space-y-6 p-6">
                <header className="space-y-2">
                    <AppBreadcrumb
                        items={[
                            { label: "Dashboard", href: "/dashboard" },
                            { label: "Configurações" },
                        ]}
                    />

                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Configurações
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Administração do sistema: usuários, feiras, formulários e permissões.
                        </p>
                    </div>
                </header>


                <ConfigSectionsAccordion
                    sections={[
                        {
                            key: 'users',
                            title: 'Usuários e permissões',
                            description: 'Cadastro, edição, roles e acessos.',
                            icon: <Users className="h-5 w-5" />,
                            accentClassName: 'border-l-blue-500',
                            content: <UsersAdminSection />,
                        },
                        {
                            key: 'fairs',
                            title: 'Feiras',
                            description: 'Criação e edição básica de feiras.',
                            icon: <CalendarDays className="h-5 w-5" />,
                            accentClassName: 'border-l-emerald-500',
                            content: <FairsAdminSection />,
                        },
                    ]}
                />

            </div>
        </RoleGuard>
    )
}
