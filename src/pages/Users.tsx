import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pencil, Plus, UserX } from "lucide-react";
import { toast } from "sonner";

import AppNavigation from "@/components/AppNavigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { authApiRequest, getStoredSession, signOut } from "@/lib/auth";

type RoleRecord = {
  id: number;
  nombre: string;
  descripcion: string | null;
};

type UserRecord = {
  id: number;
  username: string;
  email: string;
  is_active: number;
  rol_id: number;
  role_name: string;
  last_login_at: string | null;
  created_at: string;
};

type UsersListResponse = {
  ok: boolean;
  users: UserRecord[];
};

type RolesListResponse = {
  ok: boolean;
  roles: RoleRecord[];
};

const initialCreateForm = {
  username: "",
  email: "",
  password: "",
  rol_id: "",
};

const initialEditForm = {
  id: 0,
  username: "",
  email: "",
  password: "",
  rol_id: "",
  is_active: "1",
};


// Crea usuario usando el endpoint PHP (action en la URL, datos en body)
async function createUserPHP({ email, username, password, rol_id }: { email: string; username: string; password: string; rol_id: string }) {
  const res = await fetch("https://app.cupertino.uy/api/user.php?action=users-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, username, password, rol_id }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.message || "No se pudo crear el usuario");
  return data;
}

export default function Users() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [editForm, setEditForm] = useState(initialEditForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        authApiRequest<UsersListResponse>("users/list", {}),
        authApiRequest<RolesListResponse>("roles/list", {}),
      ]);

      setUsers(usersResponse.users ?? []);
      setRoles(rolesResponse.roles ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar la gestión de usuarios";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) {
      return users;
    }

    return users.filter((user) =>
      [user.username, user.email, user.role_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q))
    );
  }, [search, users]);

  const handleLogout = async () => {
    const result = await signOut();
    if (!result.ok) {
      toast.error(result.message);
    } else {
      toast("Sesión cerrada");
    }
    navigate("/login", { replace: true });
  };

  const handleCreateUser = async () => {
    const email = createForm.email.trim().toLowerCase();
    const username = createForm.username.trim();
    const password = createForm.password;
    const rol_id = createForm.rol_id;

    if (!username || !email || !rol_id || !password) {
      toast.error("Completá username, email, contraseña y rol");
      return;
    }

    setSaving(true);
    try {
      await createUserPHP({ email, username, password, rol_id });
      toast.success("Usuario creado correctamente.");
      setCreateOpen(false);
      setCreateForm(initialCreateForm);
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "No se pudo crear el usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (user: UserRecord) => {
    setEditForm({
      id: user.id,
      username: user.username,
      email: user.email,
      password: "",
      rol_id: String(user.rol_id),
      is_active: String(user.is_active),
    });
    setEditOpen(true);
  };

  const handleUpdateUser = async () => {
    const email = editForm.email.trim().toLowerCase();

    if (!editForm.id || !editForm.username.trim() || !email || !editForm.rol_id || editForm.is_active === "") {
      toast.error("Faltan datos para actualizar");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Ingresá un email válido");
      return;
    }

    if (editForm.password && editForm.password.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    setSaving(true);
    try {
      await authApiRequest<{ ok: boolean; message?: string }>("users/update", {
        id: editForm.id,
        username: editForm.username.trim(),
        email,
        rol_id: Number(editForm.rol_id),
        is_active: Number(editForm.is_active),
        password: editForm.password,
      });

      toast.success("Usuario actualizado");
      setEditOpen(false);
      setEditForm(initialEditForm);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el usuario";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <AppNavigation
        email={session?.email}
        isAdmin={(session?.role || "").toLowerCase() === "administrador"}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-6xl space-y-5 px-3 py-5 sm:px-4 md:py-7">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Administración de usuarios</h1>
            <p className="text-sm text-muted-foreground">Alta, baja y modificación de usuarios del sistema.</p>
          </div>

          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por username, email o rol"
            />
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando usuarios...
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between gap-3 text-base">
                    <span>{user.username}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.is_active === 1 ? "default" : "secondary"}>
                        {user.is_active === 1 ? "Activo" : "Inactivo"}
                      </Badge>
                      <Badge variant="outline">{user.role_name}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{user.email}</p>
                    <p>Último login: {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Sin registros"}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => handleOpenEdit(user)}>
                      <Pencil className="h-4 w-4" />
                      Modificar
                    </Button>
                    <Button
                      variant={user.is_active === 1 ? "destructive" : "secondary"}
                      className="gap-2"
                      onClick={() => {
                        setEditForm({
                          id: user.id,
                          username: user.username,
                          email: user.email,
                          password: "",
                          rol_id: String(user.rol_id),
                          is_active: user.is_active === 1 ? "0" : "1",
                        });
                        setEditOpen(true);
                      }}
                    >
                      <UserX className="h-4 w-4" />
                      {user.is_active === 1 ? "Dar de baja" : "Dar de alta"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!filteredUsers.length && (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">No se encontraron usuarios.</CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear usuario</DialogTitle>
            <DialogDescription>Completá los datos para dar de alta un nuevo usuario.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="create-username">Username</Label>
              <Input
                id="create-username"
                value={createForm.username}
                onChange={(event) => setCreateForm((current) => ({ ...current, username: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Contraseña</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={createForm.rol_id} onValueChange={(value) => setCreateForm((current) => ({ ...current, rol_id: value }))}>
                <SelectTrigger className="h-11 border-white/10 bg-black/30 text-white">
                  <SelectValue placeholder="Seleccioná rol" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950 text-white">
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.nombre.charAt(0).toUpperCase() + role.nombre.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={() => void handleCreateUser()} disabled={saving}>
              {saving ? "Guardando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modificar usuario</DialogTitle>
            <DialogDescription>Editá datos, rol o estado del usuario seleccionado.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={editForm.username}
                onChange={(event) => setEditForm((current) => ({ ...current, username: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-password">Nueva contraseña (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={editForm.rol_id} onValueChange={(value) => setEditForm((current) => ({ ...current, rol_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={String(role.id)}>
                        {role.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={editForm.is_active} onValueChange={(value) => setEditForm((current) => ({ ...current, is_active: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccioná estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Activo</SelectItem>
                    <SelectItem value="0">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={() => void handleUpdateUser()} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
