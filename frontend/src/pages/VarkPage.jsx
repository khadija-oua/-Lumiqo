import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
import * as varkApi from '../api/vark';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import Spinner from '../components/Spinner';
import { apiMessage } from '../api/client';
import t from '../i18n/fr';

export default function VarkPage() {
  const navigate = useNavigate();
  const questions = useQuery({ queryKey: ['vark-questions'], queryFn: varkApi.getQuestions });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionIndex]: ['V','R'] }
  const [submitting, setSubmitting] = useState(false);

  const total = questions.data?.length || 0;
  const current = questions.data?.[index];
  const selected = current ? answers[current.index] || [] : [];

  const toggle = (style) => {
    if (!current) return;
    const cur = new Set(answers[current.index] || []);
    if (cur.has(style)) cur.delete(style);
    else cur.add(style);
    setAnswers((a) => ({ ...a, [current.index]: Array.from(cur) }));
  };

  const next = () => {
    if (selected.length === 0) {
      toast.error(t.vark.selectAtLeastOne);
      return;
    }
    if (index < total - 1) setIndex((i) => i + 1);
  };
  const previous = () => setIndex((i) => Math.max(0, i - 1));

  const submit = async () => {
    if (selected.length === 0) {
      toast.error(t.vark.selectAtLeastOne);
      return;
    }
    setSubmitting(true);
    try {
      const responses = (questions.data || []).map((q) => ({
        questionIndex: q.index,
        selectedStyles: answers[q.index] || [],
      }));
      await varkApi.submit(responses);
      toast.success(t.vark.submitted);
      navigate('/profile');
    } catch (e) {
      toast.error(apiMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (questions.isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="vark-shell">
      <header className="page-header">
        <h1 className="page-title">{t.vark.title}</h1>
        <p className="page-subtitle">{t.vark.subtitle}</p>
      </header>

      <div className="hstack-between" style={{ marginBottom: 'var(--space-3)' }}>
        <span className="muted text-sm">{t.vark.progress(index + 1, total)}</span>
        <span className="muted text-sm">{t.vark.multiSelect}</span>
      </div>
      <ProgressBar value={((index + 1) / total) * 100} />

      {current && (
        <div className="card card-padded" style={{ marginTop: 'var(--space-6)' }}>
          <div className="text-lg weight-semibold" style={{ marginBottom: 'var(--space-4)' }}>
            {current.prompt}
          </div>
          <div className="stack-sm">
            {current.options.map((opt, i) => {
              const isSelected = selected.includes(opt.style);
              return (
                <button
                  key={i}
                  type="button"
                  className={`vark-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggle(opt.style)}
                  aria-pressed={isSelected}
                >
                  <span className="vark-checkbox">
                    {isSelected ? <Check size={14} /> : null}
                  </span>
                  <span>{opt.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="hstack-between" style={{ marginTop: 'var(--space-6)' }}>
        <Button variant="ghost" onClick={previous} disabled={index === 0}>
          {t.common.previous}
        </Button>
        {index < total - 1 ? (
          <Button onClick={next} disabled={selected.length === 0}>
            {t.common.next}
          </Button>
        ) : (
          <Button onClick={submit} loading={submitting}>
            {t.vark.seeProfile}
          </Button>
        )}
      </div>
    </div>
  );
}
