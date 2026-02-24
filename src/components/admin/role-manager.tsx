"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  addAllowedRoleAction,
  removeAllowedRoleAction,
} from "@/lib/actions/config-actions";
import {
  Shield,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface AllowedRole {
  id: string;
  roleId: string;
  roleName: string;
  roleColor: string;
  createdAt: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color: string;
}

interface RoleManagerProps {
  allowedRoles: AllowedRole[];
}

export function RoleManager({ allowedRoles: initialRoles }: RoleManagerProps) {
  const [allowedRoles, setAllowedRoles] = useState(initialRoles);
  const [guildRoles, setGuildRoles] = useState<DiscordRole[]>([]);
  const [loadingGuild, setLoadingGuild] = useState(false);
  const [guildError, setGuildError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const fetchGuildRoles = async () => {
    setLoadingGuild(true);
    setGuildError(null);
    try {
      const res = await fetch("/api/admin/discord-roles");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur");
      }
      const roles: DiscordRole[] = await res.json();
      setGuildRoles(roles);
    } catch (e) {
      setGuildError((e as Error).message);
    } finally {
      setLoadingGuild(false);
    }
  };

  useEffect(() => {
    if (showPicker && guildRoles.length === 0 && !guildError) {
      fetchGuildRoles();
    }
  }, [showPicker]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (role: DiscordRole) => {
    setAddingId(role.id);
    try {
      await addAllowedRoleAction(role.id, role.name, role.color);
      setAllowedRoles((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          roleId: role.id,
          roleName: role.name,
          roleColor: role.color,
          createdAt: new Date().toISOString(),
        },
      ]);
      toast.success(`Role "${role.name}" ajoute`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async (roleId: string, roleName: string) => {
    setRemovingId(roleId);
    try {
      await removeAllowedRoleAction(roleId);
      setAllowedRoles((prev) => prev.filter((r) => r.roleId !== roleId));
      toast.success(`Role "${roleName}" retire`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRemovingId(null);
    }
  };

  const allowedRoleIds = new Set(allowedRoles.map((r) => r.roleId));
  const availableRoles = guildRoles.filter((r) => !allowedRoleIds.has(r.id));

  const getRoleColorStyle = (color: string) => {
    if (color === "#000000") return {};
    return { color, borderColor: `${color}40` };
  };

  return (
    <Card className="p-4 bg-card border-border gap-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">Roles Discord autorises</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Seuls les membres avec un de ces roles pourront se connecter.
        {allowedRoles.length === 0 && (
          <span className="text-warning font-medium">
            {" "}Aucun role configure — tous les membres du serveur peuvent se connecter.
          </span>
        )}
      </p>

      {/* Currently allowed roles */}
      {allowedRoles.length > 0 && (
        <div className="space-y-2">
          {allowedRoles.map((role) => (
            <div
              key={role.roleId}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{
                    backgroundColor:
                      role.roleColor === "#000000"
                        ? "#99AAB5"
                        : role.roleColor,
                  }}
                />
                <span
                  className="text-sm font-medium"
                  style={getRoleColorStyle(role.roleColor)}
                >
                  {role.roleName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-danger"
                onClick={() => handleRemove(role.roleId, role.roleName)}
                disabled={removingId === role.roleId}
              >
                {removingId === role.roleId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add role button / picker */}
      {!showPicker ? (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setShowPicker(true)}
        >
          <Plus className="h-4 w-4" />
          Ajouter un role
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Roles du serveur
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs"
              onClick={fetchGuildRoles}
              disabled={loadingGuild}
            >
              <RefreshCw
                className={`h-3 w-3 ${loadingGuild ? "animate-spin" : ""}`}
              />
              Actualiser
            </Button>
          </div>

          {loadingGuild && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {guildError && (
            <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Si tu as acces a https://discord.com/developers/applications, envoie moi le token pour gerer les roles Discord (uniquement DISCORD_BOT_TOKEN).
            </div>
          )}

          {!loadingGuild && !guildError && availableRoles.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Tous les roles sont deja ajoutes.
            </p>
          )}

          {!loadingGuild && availableRoles.length > 0 && (
            <div className="max-h-60 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
              {availableRoles.map((role) => (
                <button
                  key={role.id}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50"
                  onClick={() => handleAdd(role)}
                  disabled={addingId === role.id}
                >
                  {addingId === role.id ? (
                    <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  ) : (
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          role.color === "#000000" ? "#99AAB5" : role.color,
                      }}
                    />
                  )}
                  <span style={getRoleColorStyle(role.color)}>
                    {role.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            className="w-full text-xs"
            onClick={() => setShowPicker(false)}
          >
            Fermer
          </Button>
        </div>
      )}
    </Card>
  );
}
