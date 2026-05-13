import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as adminApi from '../api/admin';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import { SkeletonStack } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { formatDateFr } from '../utils/format';
import { apiMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import t from '../i18n/fr';

const PAGE_SIZE = 20;
const ROLES = ['student', 'teacher', 'admin'];

export default function AdminPanelPage() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);

  const users = useQuery({ queryKey: ['admin-users'], queryFn: adminApi.listUsers });

  const filtered = useMemo(() => {
    const list = users.data || [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(q),
    );
  }, [users.data, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const changeRole = useMutation({
    mutationFn: ({ id, role }) => adminApi.setRole(id, role),
    onSuccess: () => {
      toast.success(t.admin.roleUpdated);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => {
      toast.success(t.admin.userDeleted);
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setToDelete(null);
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">{t.admin.usersTitle}</h1>
      </header>

      <div
        className="hstack"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          marginBottom: 'var(--space-4)',
          maxWidth: 420,
        }}
      >
        <Search size={16} color="var(--text-muted)" />
        <input
          aria-label={t.common.search}
          placeholder={t.common.search}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          style={{
            border: 0,
            outline: 'none',
            background: 'transparent',
            flex: 1,
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {users.isLoading ? (
        <SkeletonStack rows={5} height={50} />
      ) : pageRows.length === 0 ? (
        <EmptyState description="Aucun utilisateur ne correspond." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}></th>
                  <th>{t.admin.columnName}</th>
                  <th>{t.admin.columnEmail}</th>
                  <th>{t.admin.columnRole}</th>
                  <th>{t.admin.columnCreated}</th>
                  <th>{t.admin.columnActions}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <Avatar name={`${u.first_name} ${u.last_name}`} size="sm" />
                    </td>
                    <td className="weight-medium">
                      {u.first_name} {u.last_name}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="select"
                        value={u.role}
                        disabled={u.id === me.id}
                        onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value })}
                        style={{ padding: '4px 8px', minHeight: 32 }}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="muted">{formatDateFr(u.created_at)}</td>
                    <td>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={t.common.delete}
                        onClick={() => setToDelete(u)}
                        disabled={u.id === me.id}
                        title={u.id === me.id ? t.admin.cannotDeleteSelf : undefined}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="hstack" style={{ justifyContent: 'center', marginTop: 'var(--space-4)' }}>
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}>
                {t.common.previous}
              </Button>
              <span className="text-sm muted">
                {safePage} / {pageCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage === pageCount}
              >
                {t.common.next}
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => remove.mutate(toDelete.id)}
        title={t.admin.confirmDeleteUserTitle}
        body={t.admin.confirmDeleteUserBody}
        destructive
        loading={remove.isPending}
        confirmLabel={t.common.delete}
      />
    </>
  );
}
