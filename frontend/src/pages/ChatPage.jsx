import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Plus, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as chatApi from '../api/chat';
import * as enrollmentsApi from '../api/enrollments';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Select from '../components/Select';
import Textarea from '../components/Textarea';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import { relativeTimeFr } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { apiMessage } from '../api/client';
import t from '../i18n/fr';

export default function ChatPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [sessionId, setSessionId] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [input, setInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const threadRef = useRef(null);

  const sessions = useQuery({ queryKey: ['chat-sessions'], queryFn: chatApi.listSessions });
  const session = useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: () => chatApi.getSession(sessionId),
    enabled: !!sessionId,
  });
  const enrolled = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: enrollmentsApi.myEnrollments,
  });

  // Optimistic messages — added before the server responds, swapped in when the
  // real bot reply arrives.
  const [pending, setPending] = useState(null); // {studentText, awaitingBot}

  // Auto-scroll on new messages.
  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [session.data?.messages?.length, pending]);

  const send = useMutation({
    mutationFn: (body) => chatApi.sendMessage(body),
    onSuccess: (data) => {
      setPending(null);
      setSessionId(data.sessionId);
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      qc.invalidateQueries({ queryKey: ['chat-session', data.sessionId] });
    },
    onError: (e) => {
      setPending(null);
      toast.error(apiMessage(e));
    },
  });

  const onSend = () => {
    const text = input.trim();
    if (!text || send.isPending) return;
    setInput('');
    setPending({ studentText: text, awaitingBot: true });
    send.mutate({
      sessionId: sessionId || null,
      courseId: courseId ? Number(courseId) : null,
      message: text,
    });
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const remove = useMutation({
    mutationFn: (id) => chatApi.deleteSession(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['chat-sessions'] });
      if (sessionId === id) {
        setSessionId(null);
        setCourseId('');
      }
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  const newSession = () => {
    setSessionId(null);
    setPending(null);
    setInput('');
  };

  const messages = useMemo(() => {
    const real = session.data?.messages || [];
    if (pending && pending.studentText) {
      return [
        ...real,
        { id: 'pending-user', sender: 'student', content: pending.studentText },
        { id: 'pending-bot', sender: 'bot', content: '', isTyping: true },
      ];
    }
    return real;
  }, [session.data, pending]);

  return (
    <div className="chat-shell">
      <aside className="chat-rail" aria-label="Discussions">
        <div className="chat-rail-header">
          <Button variant="primary" size="sm" onClick={newSession} style={{ width: '100%' }}>
            <Plus size={16} /> {t.chat.newConversation}
          </Button>
        </div>
        <div className="chat-rail-list">
          {sessions.data?.length ? (
            sessions.data.map((s) => (
              <div
                key={s.id}
                className={`chat-rail-item ${sessionId === s.id ? 'active' : ''}`}
                onClick={() => {
                  setSessionId(s.id);
                  setCourseId(s.course_id || '');
                  setPending(null);
                }}
              >
                <div className="chat-rail-item-preview">
                  {s.preview || t.common.untitled}
                </div>
                <div className="chat-rail-item-time hstack-between">
                  <span>{relativeTimeFr(s.last_message_at)}</span>
                  <button
                    className="btn btn-ghost btn-icon-only"
                    style={{ minHeight: 0, minWidth: 0, padding: 2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(s.id);
                    }}
                    aria-label={t.common.delete}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="muted text-sm" style={{ padding: 'var(--space-3)' }}>
              {t.chat.emptySessions}
            </div>
          )}
        </div>
      </aside>

      <section className="chat-panel">
        <div className="chat-panel-header">
          <div className="weight-medium">{t.chat.title}</div>
          {!sessionId && (
            <Select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={{ maxWidth: 220 }}
              aria-label={t.chat.courseContextLabel}
            >
              <option value="">{t.chat.noCourse}</option>
              {(enrolled.data || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div ref={threadRef} className="chat-thread">
          {messages.length === 0 && (
            <EmptyState title={t.chat.emptyTitle} description={t.chat.emptyDesc} />
          )}
          {messages.map((m) => (
            <div key={m.id} className={`chat-row ${m.sender === 'student' ? 'student' : 'bot'}`}>
              {m.sender === 'bot' && <Avatar overrideInitials="L" color="var(--color-brand)" size="sm" />}
              <div
                className={`chat-bubble ${m.sender} ${m.refused ? 'refused' : ''}`}
              >
                {m.isTyping ? (
                  <span className="typing-dots" aria-label={t.chat.typing}>
                    <span /> <span /> <span />
                  </span>
                ) : (
                  m.content
                )}
                {m.refused && (
                  <div className="text-xs muted hstack" style={{ marginTop: 4 }}>
                    <AlertTriangle size={12} /> <span>{t.chat.noteRefused}</span>
                  </div>
                )}
              </div>
              {m.sender === 'student' && (
                <Avatar name={`${user.first_name} ${user.last_name}`} size="sm" />
              )}
            </div>
          ))}
        </div>

        <div className="chat-input-bar">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={t.chat.placeholder}
            autoExpand
            rows={1}
          />
          <Button onClick={onSend} disabled={!input.trim()} loading={send.isPending} aria-label={t.chat.send}>
            <Send size={16} />
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => remove.mutate(confirmDelete)}
        title={t.chat.confirmDeleteTitle}
        body={t.chat.confirmDeleteBody}
        destructive
        loading={remove.isPending}
        confirmLabel={t.common.delete}
      />
    </div>
  );
}
