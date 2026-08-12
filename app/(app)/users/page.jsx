"use client";

import { useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useBank } from "@/hooks/useBank";
import { useAuth } from "@/hooks/useAuth";
import { UserTable } from "@/components/tables/UserTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import * as userService from "@/services/userService";
import { ROLES } from "@/utils/constants";
import { Users, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

export default function UserManagementPage() {
  const { users, loading, invite, updateRole, removeMember } = useUsers();
  const { bank } = useBank();
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("operator");
  const [submitting, setSubmitting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error("Enter an email address");
      return;
    }
    setSubmitting(true);
    try {
      await invite(inviteEmail, inviteRole);
      toast.success("Invitation sent!");
      setShowInvite(false);
      setInviteEmail("");
      setInviteRole("operator");
    } catch (error) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateRole(userId, newRole);
      toast.success("Role updated!");
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await removeMember(userId);
      toast.success("Member removed");
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const handleResetClick = (member) => {
    setResetTarget(member);
    setNewPassword("");
    setResetOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTarget?.user_id) return;
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setResetting(true);
    try {
      await userService.resetMemberPassword(resetTarget.user_id, newPassword);
      toast.success("Password reset successful");
      setResetOpen(false);
      setResetTarget(null);
      setNewPassword("");
    } catch (error) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <LoadingSpinner className="h-64" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Manage team members and their roles
          </p>
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Invite Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {users.length} Member{users.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No Members"
              description="Invite team members to start collaborating."
              action={() => setShowInvite(true)}
              actionLabel="Invite Member"
            />
          ) : (
            <UserTable
              users={users}
              currentUserId={user?.id}
              onRoleChange={handleRoleChange}
              onRemove={handleRemove}
              onResetPassword={handleResetClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="member@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLES)
                    .filter(([key]) => key !== "owner")
                    .map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Member Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Set a new password for {resetTarget?.profiles?.full_name || resetTarget?.profiles?.email || "this user"}.
            </p>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={resetting}>
                {resetting ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
