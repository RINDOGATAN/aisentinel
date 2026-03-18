import Link from "next/link";
import {
  Crown,
  ShieldCheck,
  Gavel,
  Users,
  Eye,
  Check,
  X,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "Roles y Permisos — AI SENTINEL Docs",
  description:
    "Conoce los cinco roles de usuario en AI SENTINEL y las acciones que puede realizar cada uno en los m\u00f3dulos de gobernanza.",
};

const roles = [
  {
    key: "OWNER",
    name: "Propietario",
    icon: Crown,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    summary: "Control total de la plataforma. Facturaci\u00f3n, gesti\u00f3n de equipo y todas las operaciones de gobernanza.",
    capabilities: [
      "Gestionar facturaci\u00f3n y suscripci\u00f3n",
      "Invitar y eliminar miembros",
      "Cambiar roles de miembros",
      "Todas las capacidades de Administrador",
    ],
  },
  {
    key: "ADMIN",
    name: "Administrador",
    icon: ShieldCheck,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    summary: "Gesti\u00f3n de la organizaci\u00f3n y acceso completo a la gobernanza, sin control de facturaci\u00f3n.",
    capabilities: [
      "Invitar y eliminar miembros",
      "Configurar ajustes de la organizaci\u00f3n",
      "Todas las capacidades de Responsable de IA",
    ],
  },
  {
    key: "AI_OFFICER",
    name: "Responsable de IA",
    icon: Gavel,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    summary: "Autoridad de gobernanza. Aprueba evaluaciones, publica pol\u00edticas y decide en los puntos de control.",
    capabilities: [
      "Aprobar o rechazar evaluaciones",
      "Publicar versiones de pol\u00edticas",
      "Tomar decisiones en puntos de control",
      "Aprobar pol\u00edticas",
      "Todas las capacidades de Miembro",
    ],
  },
  {
    key: "MEMBER",
    name: "Miembro",
    icon: Users,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
    summary: "Trabajo diario de gobernanza. Crea registros, env\u00eda evaluaciones e informa de incidentes.",
    capabilities: [
      "Registrar sistemas de IA",
      "Crear evaluaciones y enviarlas para revisi\u00f3n",
      "Informar de incidentes",
      "Crear puntos de control",
      "Gestionar proveedores y pol\u00edticas",
      "Informar sobre uso de Shadow AI",
    ],
  },
  {
    key: "VIEWER",
    name: "Lector",
    icon: Eye,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    border: "border-gray-400/20",
    summary: "Acceso de solo lectura. Puede consultar todos los paneles, registros e informes, pero no puede realizar cambios.",
    capabilities: [
      "Ver el panel ejecutivo",
      "Consultar el registro de IA y clasificaciones de riesgo",
      "Ver evaluaciones, incidentes y pol\u00edticas",
      "Acceder a los informes de cumplimiento normativo",
      "Ver informaci\u00f3n de proveedores y puntos de control",
    ],
  },
];

const permissionMatrix = [
  { action: "Ver paneles y registros", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: true, VIEWER: true },
  { action: "Crear y editar registros", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: true, VIEWER: false },
  { action: "Eliminar registros", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: true, VIEWER: false },
  { action: "Aprobar evaluaciones", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: false, VIEWER: false },
  { action: "Publicar pol\u00edticas", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: false, VIEWER: false },
  { action: "Decidir en puntos de control", OWNER: true, ADMIN: true, AI_OFFICER: true, MEMBER: false, VIEWER: false },
  { action: "Invitar y eliminar miembros", OWNER: true, ADMIN: true, AI_OFFICER: false, MEMBER: false, VIEWER: false },
  { action: "Cambiar roles de miembros", OWNER: true, ADMIN: false, AI_OFFICER: false, MEMBER: false, VIEWER: false },
  { action: "Gestionar facturaci\u00f3n", OWNER: true, ADMIN: false, AI_OFFICER: false, MEMBER: false, VIEWER: false },
];

export default function RolesDocsPageES() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl sm:text-4xl font-display tracking-tight">
            Roles y Permisos
          </h1>
          <Link
            href="/docs/roles"
            className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            English <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
          AI SENTINEL utiliza cinco roles para controlar el acceso a las operaciones de gobernanza.
          Todas las acciones se verifican en el servidor: la interfaz se adapta para mostrar
          solo lo que tu rol permite.
        </p>
      </section>

      {/* Role Hierarchy */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Jerarqu&iacute;a de Roles</h2>
        <div className="flex flex-col items-center gap-0">
          {roles.map((role, i) => {
            const Icon = role.icon;
            return (
              <div key={role.key} className="w-full max-w-xl">
                <div
                  className={`rounded-xl border ${role.border} bg-card p-5 flex items-start gap-4 relative`}
                  style={{ marginLeft: `${i * 16}px` }}
                >
                  <div className={`w-10 h-10 rounded-lg ${role.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${role.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{role.name}</h3>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${role.bg} ${role.color}`}>
                        {role.key === "AI_OFFICER" ? "AI Officer" : role.key}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{role.summary}</p>
                  </div>
                </div>
                {i < roles.length - 1 && (
                  <div className="flex justify-center py-1" style={{ marginLeft: `${i * 16 + 20}px` }}>
                    <div className="w-px h-4 bg-border" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Cada rol hereda todas las capacidades de los roles inferiores.
        </p>
      </section>

      {/* What Each Role Can Do */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Capacidades de Cada Rol</h2>
        <div className="grid gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <div key={role.key} className={`rounded-xl border ${role.border} bg-card p-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${role.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${role.color}`} />
                  </div>
                  <h3 className="font-semibold">{role.name}</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {role.capabilities.map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className={`w-3.5 h-3.5 shrink-0 ${role.color}`} />
                      {cap}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Permissions Matrix */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Matriz de Permisos</h2>
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 font-medium text-muted-foreground">Acci&oacute;n</th>
                {roles.map((r) => (
                  <th key={r.key} className="p-3 text-center font-medium whitespace-nowrap">
                    <span className={r.color}>{r.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((row) => (
                <tr key={row.action} className="border-b border-border last:border-0">
                  <td className="p-3 text-muted-foreground">{row.action}</td>
                  {roles.map((r) => (
                    <td key={r.key} className="p-3 text-center">
                      {row[r.key as keyof typeof row] ? (
                        <Check className="w-4 h-4 text-emerald-400 inline-block" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/30 inline-block" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Default Role */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Asignaci&oacute;n de Roles</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-2">Creador de la organizaci&oacute;n</h3>
            <p className="text-sm text-muted-foreground">
              El usuario que crea una organizaci&oacute;n recibe autom&aacute;ticamente el rol de
              <span className="text-amber-400 font-medium"> Propietario</span>.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-2">Usuarios invitados o auto-registrados</h3>
            <p className="text-sm text-muted-foreground">
              Los usuarios que se unen por invitaci&oacute;n o por coincidencia de dominio de correo reciben el rol de
              <span className="text-violet-400 font-medium"> Miembro</span> por defecto. Un Propietario puede cambiar su rol en cualquier momento.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-2">Acceso de Lector</h3>
            <p className="text-sm text-muted-foreground">
              El rol de Lector se asigna expl&iacute;citamente por un Propietario o Administrador. Los Lectores ven una
              interfaz de solo lectura: los botones de crear y editar se ocultan, no simplemente se desactivan.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold mb-2">Cambios de rol</h3>
            <p className="text-sm text-muted-foreground">
              Solo el Propietario de la organizaci&oacute;n puede cambiar los roles de los miembros.
              Todos los cambios de rol quedan registrados en el registro de auditor&iacute;a.
            </p>
          </div>
        </div>
      </section>

      {/* Server-Side Enforcement */}
      <section>
        <h2 className="text-2xl font-display tracking-tight mb-6">Verificaci&oacute;n en el Servidor</h2>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Todos los permisos se verifican en el servidor, no solo en la interfaz.
            Aunque un usuario realice una solicitud directa a la API, el servidor comprueba
            su rol y pertenencia a la organizaci&oacute;n antes de procesar cualquier operaci&oacute;n.
            Esto significa que la seguridad no depende de lo que el navegador muestre u oculte.
          </p>
        </div>
      </section>
    </div>
  );
}
