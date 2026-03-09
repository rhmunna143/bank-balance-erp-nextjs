"use client";

import { formatDate } from '@/utils/dateHelpers';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { ROLES } from '@/utils/constants';
import { Trash2, Shield, User } from 'lucide-react';

export function UserTable({ members, users, currentUserId, onRemove, onRoleChange }) {
  const data = members || users || [];
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-[var(--color-text-muted)]">
        No members found
      </div>
    );
  }

  // Determine if current user is admin/owner
  const currentMember = data.find((m) => m.user_id === currentUserId);
  const isCurrentAdmin = currentMember?.role === 'admin' || currentMember?.role === 'owner';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Name</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Email</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Phone</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Role</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--color-text-muted)]">Joined</th>
            <th className="text-right py-3 px-4 font-medium text-[var(--color-text-muted)]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((member) => {
            const isCurrentUser = member.user_id === currentUserId;
            const isAdmin = member.role === 'admin';
            const isOwner = member.role === 'owner';

            return (
              <tr key={member.id} className="border-b border-border">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {member.profiles?.full_name?.[0]?.toUpperCase() || member.profiles?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="font-medium">{member.profiles?.full_name || member.profiles?.email || 'Unknown'}</span>
                    {isCurrentUser && (
                      <span className="text-xs text-[var(--color-text-muted)]">(you)</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-[var(--color-text-muted)]">
                  {member.profiles?.email || '-'}
                </td>
                <td className="py-3 px-4 text-[var(--color-text-muted)]">
                  {member.profiles?.phone || '-'}
                </td>
                <td className="py-3 px-4">
                  {isCurrentAdmin && !isCurrentUser && !isOwner ? (
                    <Select
                      value={member.role}
                      onValueChange={(val) => onRoleChange?.(member.id, val)}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLES)
                          .filter(([key]) => key !== 'owner')
                          .map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                      isAdmin || isOwner ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-[var(--color-secondary)]'
                    }`}>
                      {isAdmin || isOwner ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {member.role}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-[var(--color-text-muted)]">
                  {formatDate(member.created_at)}
                </td>
                <td className="py-3 px-4 text-right">
                  {!isCurrentUser && !isOwner && isCurrentAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove?.(member.id)}
                      className="text-danger hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
