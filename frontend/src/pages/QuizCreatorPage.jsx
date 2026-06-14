import { useState, useEffect }        from 'react'
import { useNavigate, useParams }     from 'react-router-dom'
import { useForm, useFieldArray }     from 'react-hook-form'
import { zodResolver }                from '@hookform/resolvers/zod'
import { z }                          from 'zod'
import toast                          from 'react-hot-toast'
import axiosInstance                  from '../api/axiosInstance.js'

/* ══════════════════════════════════════════════════════════════════
   ZOD VALIDATION SCHEMA
   Mirrors the backend Quiz model — client-side guard before any
   network request is made.
══════════════════════════════════════════════════════════════════ */
const optionSchema = z.object({
  label: z.enum(['A', 'B', 'C', 'D']),
  text:  z.string().min(1, 'Option text cannot be empty').max(100),
})

const questionSchema = z.object({
  text:          z.string().min(5,  'Question must be at least 5 characters').max(300),
  options:       z.array(optionSchema).length(4, 'Must have exactly 4 options'),
  correctAnswer: z.enum(['A', 'B', 'C', 'D'], {
    errorMap: () => ({ message: 'Select the correct answer' }),
  }),
  explanation:   z.string().max(300).optional().default(''),
})

const quizSchema = z.object({
  title:       z.string().min(5,  'Title must be at least 5 characters').max(100),
  description: z.string().max(200).optional().default(''),
  timeLimit:   z.coerce.number().min(60, 'Minimum 60 seconds').max(7200, 'Maximum 2 hours'),
  questions:   z.array(questionSchema).min(1, 'Add at least one question'),
})

/* ── Blank question template ────────────────────────────────────── */
const blankQuestion = () => ({
  text:          '',
  options: [
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' },
  ],
  correctAnswer: '',
  explanation:   '',
})

/* ══════════════════════════════════════════════════════════════════
   STYLES — local constants so JSX stays readable
══════════════════════════════════════════════════════════════════ */
const S = {
  page: {
    maxWidth: '960px',
    margin:   '0 auto',
    padding:  '2rem 1.5rem 4rem',
  },
  glass: {
    background:     'rgba(255,255,255,0.04)',
    border:         '0.5px solid rgba(255,255,255,0.09)',
    borderRadius:   '14px',
    backdropFilter: 'blur(16px)',
  },
  label: {
    display:       'block',
    fontSize:      '12px',
    fontWeight:    '500',
    color:         'rgba(241,245,249,0.55)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom:  '6px',
  },
  input: {
    width:        '100%',
    background:   'rgba(255,255,255,0.05)',
    border:       '0.5px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding:      '9px 12px',
    fontSize:     '14px',
    color:        '#f1f5f9',
    outline:      'none',
    fontFamily:   'inherit',
  },
  inputErr: {
    border: '0.5px solid rgba(239,68,68,0.5)',
  },
  errText: {
    fontSize:   '12px',
    color:      '#f87171',
    marginTop:  '4px',
  },
  btnPrimary: {
    padding:      '9px 20px',
    borderRadius: '9px',
    background:   'linear-gradient(135deg,#7c3aed,#0891b2)',
    color:        '#fff',
    fontSize:     '13px',
    fontWeight:   '500',
    border:       'none',
    cursor:       'pointer',
  },
  btnSecondary: {
    padding:      '9px 20px',
    borderRadius: '9px',
    background:   'rgba(255,255,255,0.06)',
    color:        'rgba(241,245,249,0.8)',
    fontSize:     '13px',
    border:       '0.5px solid rgba(255,255,255,0.1)',
    cursor:       'pointer',
  },
  btnDanger: {
    padding:      '5px 10px',
    borderRadius: '7px',
    background:   'rgba(239,68,68,0.1)',
    color:        '#f87171',
    fontSize:     '12px',
    border:       '0.5px solid rgba(239,68,68,0.2)',
    cursor:       'pointer',
  },
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
const QuizCreatorPage = () => {
  const navigate         = useNavigate()
  const { id: editId }   = useParams()       // present only on /quiz/:id/edit
  const isEditing        = Boolean(editId)

  const [isSaving,       setIsSaving]       = useState(false)
  const [showAIModal,    setShowAIModal]     = useState(false)
  const [aiPrompt,       setAIPrompt]        = useState('')
  const [aiDifficulty,   setAIDifficulty]    = useState('medium')
  const [isGenerating,   setIsGenerating]    = useState(false)

  /* ── React Hook Form setup ──────────────────────────────────── */
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title:       '',
      description: '',
      timeLimit:   600,
      questions:   [blankQuestion()],
    },
  })

  /* ── useFieldArray manages dynamic question list ────────────── */
  const { fields, append, remove, swap } = useFieldArray({
    control,
    name: 'questions',
  })

  /* ── Load existing quiz data when editing ───────────────────── */
  useEffect(() => {
    if (!isEditing) return

    const load = async () => {
      try {
        const { data } = await axiosInstance.get(`/quizzes/${editId}`)
        const q = data.quiz
        reset({
          title:       q.title,
          description: q.description || '',
          timeLimit:   q.timeLimit,
          questions:   q.questions.map((qu) => ({
            text:          qu.text,
            options:       qu.options,
            correctAnswer: qu.correctAnswer,
            explanation:   qu.explanation || '',
          })),
        })
      } catch {
        toast.error('Could not load quiz for editing')
        navigate('/dashboard')
      }
    }
    load()
  }, [editId, isEditing, reset, navigate])

  /* ══════════════════════════════════════════════════════════════
     SAVE HANDLER
     saveDraft    → status: 'draft'
     savePublish  → status: 'published'
  ══════════════════════════════════════════════════════════════ */
  const save = async (formData, status) => {
    setIsSaving(true)
    try {
      const payload = { ...formData, status }

      if (isEditing) {
        await axiosInstance.put(`/quizzes/${editId}`, payload)
        if (status === 'published') {
          await axiosInstance.patch(`/quizzes/${editId}/publish`)
        }
        toast.success(`Quiz ${status === 'draft' ? 'saved as draft' : 'published'} ✓`)
      } else {
        const { data } = await axiosInstance.post('/quizzes', payload)
        if (status === 'published') {
          await axiosInstance.patch(`/quizzes/${data.quiz._id}/publish`)
        }
        toast.success(`Quiz ${status === 'draft' ? 'saved as draft' : 'published'} ✓`)
        navigate('/dashboard')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  const onSaveDraft   = handleSubmit((data) => save(data, 'draft'))
  const onSavePublish = handleSubmit((data) => save(data, 'published'))

  /* ══════════════════════════════════════════════════════════════
     AI GENERATION HANDLER
  ══════════════════════════════════════════════════════════════ */
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || aiPrompt.trim().length < 10) {
      toast.error('Prompt must be at least 10 characters')
      return
    }
    setIsGenerating(true)
    try {
      const { data } = await axiosInstance.post('/quizzes/generate-ai', {
        prompt:     aiPrompt.trim(),
        difficulty: aiDifficulty,
        timeLimit:  watch('timeLimit') || 600,
      })

      const q = data.quiz
      /* ── Populate the form with AI-generated data ─────────── */
      reset({
        title:       q.title,
        description: q.description || '',
        timeLimit:   q.timeLimit,
        questions:   q.questions.map((qu) => ({
          text:          qu.text,
          options:       qu.options,
          correctAnswer: qu.correctAnswer,
          explanation:   qu.explanation || '',
        })),
      })

      setShowAIModal(false)
      setAIPrompt('')
      toast.success(`AI generated ${q.questions.length} questions — review and publish!`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div style={S.page}>

      {/* ── Page header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#f1f5f9', marginBottom: '4px' }}>
          {isEditing ? 'Edit quiz' : 'Create a new quiz'}
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(241,245,249,0.45)' }}>
          Build manually or{' '}
          <button
            type="button"
            onClick={() => setShowAIModal(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#a78bfa', fontSize: '13px', textDecoration: 'underline',
              padding: 0,
            }}
          >
            generate with AI in one click
          </button>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem', alignItems: 'start' }}>

        {/* ══════════════════════════════════════════════════════
            LEFT — Quiz form
        ══════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Quiz title */}
          <div style={{ ...S.glass, padding: '1.25rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={S.label}>Quiz Title *</label>
              <input
                {...register('title')}
                placeholder="e.g. Chemistry: Periodic Table Basics"
                style={{ ...S.input, ...(errors.title ? S.inputErr : {}) }}
              />
              {errors.title && <p style={S.errText}>{errors.title.message}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '12px' }}>
              <div>
                <label style={S.label}>Description (optional)</label>
                <input
                  {...register('description')}
                  placeholder="Short description of the quiz"
                  style={S.input}
                />
              </div>
              <div>
                <label style={S.label}>Time Limit (secs)</label>
                <input
                  {...register('timeLimit')}
                  type="number"
                  min={60}
                  max={7200}
                  style={{ ...S.input, ...(errors.timeLimit ? S.inputErr : {}) }}
                />
                {errors.timeLimit && <p style={S.errText}>{errors.timeLimit.message}</p>}
              </div>
            </div>
          </div>

          {/* ── Question cards ─────────────────────────────────── */}
          {fields.map((field, qIdx) => (
            <QuestionCard
              key={field.id}
              qIdx={qIdx}
              total={fields.length}
              register={register}
              errors={errors}
              watch={watch}
              setValue={setValue}
              onRemove={() => remove(qIdx)}
              onMoveUp={() => qIdx > 0 && swap(qIdx, qIdx - 1)}
              onMoveDown={() => qIdx < fields.length - 1 && swap(qIdx, qIdx + 1)}
            />
          ))}

          {/* ── Add question button ────────────────────────────── */}
          <button
            type="button"
            onClick={() => append(blankQuestion())}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            '6px',
              padding:        '12px',
              borderRadius:   '12px',
              background:     'rgba(124,58,237,0.06)',
              border:         '0.5px dashed rgba(124,58,237,0.35)',
              color:          '#a78bfa',
              fontSize:       '13px',
              cursor:         'pointer',
              width:          '100%',
            }}
          >
            + Add question
          </button>

          {/* Top-level questions error */}
          {errors.questions?.root && (
            <p style={S.errText}>{errors.questions.root.message}</p>
          )}
          {typeof errors.questions?.message === 'string' && (
            <p style={S.errText}>{errors.questions.message}</p>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════
            RIGHT — Sidebar
        ══════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* AI generate card */}
          <div style={{ ...S.glass, padding: '1.25rem' }}>
            <p style={{ ...S.label, marginBottom: '10px' }}>
              ✦ AI generate
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(241,245,249,0.45)', marginBottom: '12px', lineHeight: 1.6 }}>
              Describe the quiz you want and AI will build it instantly.
            </p>
            <button
              type="button"
              onClick={() => setShowAIModal(true)}
              style={{ ...S.btnPrimary, width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ✦ Generate with AI
            </button>
          </div>

          {/* Save actions card */}
          <div style={{ ...S.glass, padding: '1.25rem' }}>
            <p style={{ ...S.label, marginBottom: '12px' }}>Save options</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isSaving}
                style={{
                  ...S.btnSecondary,
                  width: '100%',
                  opacity: isSaving ? 0.6 : 1,
                  borderColor: 'rgba(245,158,11,0.3)',
                  color: '#fbbf24',
                }}
              >
                {isSaving ? 'Saving…' : '📋 Save as Draft'}
              </button>

              <button
                type="button"
                onClick={onSavePublish}
                disabled={isSaving}
                style={{
                  ...S.btnPrimary,
                  width:   '100%',
                  opacity: isSaving ? 0.6 : 1,
                }}
              >
                {isSaving ? 'Publishing…' : '🚀 Publish Quiz'}
              </button>
            </div>

            <p style={{ fontSize: '11px', color: 'rgba(241,245,249,0.3)', marginTop: '10px', lineHeight: 1.5 }}>
              Drafts are only visible to you. Published quizzes appear on the browse page.
            </p>
          </div>

          {/* Question count summary */}
          <div style={{ ...S.glass, padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'rgba(241,245,249,0.5)' }}>Questions</span>
              <span style={{ fontSize: '20px', fontWeight: '500', color: '#a78bfa' }}>{fields.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '13px', color: 'rgba(241,245,249,0.5)' }}>Time limit</span>
              <span style={{ fontSize: '13px', color: '#f1f5f9' }}>
                {Math.floor((watch('timeLimit') || 600) / 60)} min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          AI GENERATE MODAL
      ══════════════════════════════════════════════════════════ */}
      {showAIModal && (
        <AIModal
          prompt={aiPrompt}
          difficulty={aiDifficulty}
          isGenerating={isGenerating}
          onPromptChange={setAIPrompt}
          onDifficultyChange={setAIDifficulty}
          onGenerate={handleAIGenerate}
          onClose={() => { setShowAIModal(false); setAIPrompt('') }}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   QUESTION CARD — extracted for readability
══════════════════════════════════════════════════════════════════ */
const QuestionCard = ({
  qIdx, total, register, errors, watch, setValue,
  onRemove, onMoveUp, onMoveDown,
}) => {
  const qErrors      = errors.questions?.[qIdx]
  const correctAnswer = watch(`questions.${qIdx}.correctAnswer`)

  const optionLabels = ['A', 'B', 'C', 'D']
  const optionColours = {
    A: { bg: 'rgba(124,58,237,0.25)', color: '#a78bfa' },
    B: { bg: 'rgba(8,145,178,0.25)',  color: '#22d3ee' },
    C: { bg: 'rgba(5,150,105,0.25)', color: '#34d399' },
    D: { bg: 'rgba(239,68,68,0.25)', color: '#f87171' },
  }

  return (
    <div
      style={{
        background:   'rgba(255,255,255,0.04)',
        border:       '0.5px solid rgba(255,255,255,0.09)',
        borderRadius: '12px',
        padding:      '1.25rem',
      }}
    >
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', fontWeight: '500', color: '#a78bfa' }}>
          Question {qIdx + 1}
        </span>
        <div style={{ display: 'flex', gap: '5px' }}>
          {/* Move up */}
          <IconBtn onClick={onMoveUp} disabled={qIdx === 0} title="Move up">↑</IconBtn>
          {/* Move down */}
          <IconBtn onClick={onMoveDown} disabled={qIdx === total - 1} title="Move down">↓</IconBtn>
          {/* Delete */}
          {total > 1 && (
            <button type="button" onClick={onRemove} style={S.btnDanger}>
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Question text */}
      <div style={{ marginBottom: '12px' }}>
        <label style={S.label}>Question *</label>
        <textarea
          {...register(`questions.${qIdx}.text`)}
          placeholder="Enter your question here…"
          rows={2}
          style={{
            ...S.input,
            resize:     'vertical',
            lineHeight: '1.5',
            ...(qErrors?.text ? S.inputErr : {}),
          }}
        />
        {qErrors?.text && <p style={S.errText}>{qErrors.text.message}</p>}
      </div>

      {/* Options grid */}
      <div style={{ marginBottom: '12px' }}>
        <label style={S.label}>Answer Options *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {optionLabels.map((label, oIdx) => {
            const isCorrect = correctAnswer === label
            const colours   = optionColours[label]
            return (
              <div
                key={label}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '8px',
                  padding:      '6px 10px',
                  borderRadius: '8px',
                  border:       isCorrect
                    ? '0.5px solid rgba(16,185,129,0.45)'
                    : '0.5px solid rgba(255,255,255,0.07)',
                  background: isCorrect
                    ? 'rgba(16,185,129,0.08)'
                    : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                }}
                onClick={() => setValue(`questions.${qIdx}.correctAnswer`, label, { shouldValidate: true })}
              >
                {/* Label badge */}
                <div
                  style={{
                    width:           '22px',
                    height:          '22px',
                    borderRadius:    '5px',
                    flexShrink:      0,
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    fontSize:        '11px',
                    fontWeight:      '600',
                    background:      isCorrect ? 'rgba(16,185,129,0.35)' : colours.bg,
                    color:           isCorrect ? '#34d399' : colours.color,
                  }}
                >
                  {isCorrect ? '✓' : label}
                </div>

                <input
                  {...register(`questions.${qIdx}.options.${oIdx}.text`)}
                  placeholder={`Option ${label}`}
                  style={{
                    flex:       1,
                    background: 'transparent',
                    border:     'none',
                    outline:    'none',
                    fontSize:   '13px',
                    color:      '#f1f5f9',
                    fontFamily: 'inherit',
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                {/* Hidden field keeps the label value in form state */}
                <input type="hidden" {...register(`questions.${qIdx}.options.${oIdx}.label`)} value={label} />
              </div>
            )
          })}
        </div>

        {/* Correct answer hint */}
        <p style={{ fontSize: '11px', color: 'rgba(241,245,249,0.35)', marginTop: '6px' }}>
          {correctAnswer
            ? `✓ Option ${correctAnswer} is set as correct answer — click a different option to change`
            : '☝ Click an option to mark it as the correct answer'}
        </p>
        {qErrors?.correctAnswer && <p style={S.errText}>{qErrors.correctAnswer.message}</p>}
        {qErrors?.options && <p style={S.errText}>Fill in all 4 option texts</p>}
      </div>

      {/* Explanation */}
      <div>
        <label style={S.label}>Explanation (shown after quiz)</label>
        <input
          {...register(`questions.${qIdx}.explanation`)}
          placeholder="Why is this the correct answer? (optional but recommended)"
          style={S.input}
        />
      </div>
    </div>
  )
}

/* ── Small icon button ──────────────────────────────────────────── */
const IconBtn = ({ onClick, disabled, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      width:        '28px',
      height:       '28px',
      borderRadius: '6px',
      background:   disabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
      border:       '0.5px solid rgba(255,255,255,0.08)',
      color:        disabled ? 'rgba(241,245,249,0.2)' : 'rgba(241,245,249,0.6)',
      cursor:       disabled ? 'not-allowed' : 'pointer',
      fontSize:     '13px',
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </button>
)

/* ══════════════════════════════════════════════════════════════════
   AI MODAL
══════════════════════════════════════════════════════════════════ */
const AIModal = ({
  prompt, difficulty, isGenerating,
  onPromptChange, onDifficultyChange,
  onGenerate, onClose,
}) => {
  const difficulties = [
    { value: 'easy',   label: 'Easy',   colour: '#34d399' },
    { value: 'medium', label: 'Medium', colour: '#fbbf24' },
    { value: 'hard',   label: 'Hard',   colour: '#f87171' },
  ]

  const examplePrompts = [
    '10 chemistry questions for graduation level',
    '8 easy general knowledge questions for kids aged 8-10',
    '5 advanced JavaScript interview questions for senior developers',
    '6 questions about the Indian independence movement',
    '7 medium difficulty questions on human anatomy',
  ]

  return (
    /* ── Backdrop ──────────────────────────────────────────────── */
    <div
      onClick={onClose}
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(3,7,18,0.8)',
        backdropFilter: 'blur(8px)',
        zIndex:         100,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '1rem',
      }}
    >
      {/* ── Modal card ─────────────────────────────────────────── */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width:          '100%',
          maxWidth:       '540px',
          background:     '#0f172a',
          border:         '0.5px solid rgba(124,58,237,0.3)',
          borderRadius:   '16px',
          padding:        '1.75rem',
          boxShadow:      '0 24px 80px rgba(124,58,237,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '500', color: '#f1f5f9', marginBottom: '4px' }}>
              ✦ AI Quiz Generator
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(241,245,249,0.45)' }}>
              Describe the quiz — AI will build all questions with options and explanations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border:     '0.5px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color:      'rgba(241,245,249,0.6)',
              width:      '32px',
              height:     '32px',
              cursor:     'pointer',
              fontSize:   '16px',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Prompt textarea */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={S.label}>Your prompt *</label>
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="e.g. 10 chemistry questions for graduation level students"
            rows={3}
            style={{
              ...S.input,
              resize:     'vertical',
              lineHeight: '1.5',
            }}
          />
          <p style={{ fontSize: '11px', color: 'rgba(241,245,249,0.3)', marginTop: '4px' }}>
            {prompt.length} / 500 characters
          </p>
        </div>

        {/* Difficulty */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={S.label}>Difficulty</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {difficulties.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => onDifficultyChange(d.value)}
                style={{
                  flex:         1,
                  padding:      '7px',
                  borderRadius: '8px',
                  fontSize:     '12px',
                  fontWeight:   '500',
                  cursor:       'pointer',
                  border:       difficulty === d.value
                    ? `0.5px solid ${d.colour}66`
                    : '0.5px solid rgba(255,255,255,0.08)',
                  background: difficulty === d.value
                    ? `${d.colour}18`
                    : 'rgba(255,255,255,0.04)',
                  color: difficulty === d.value ? d.colour : 'rgba(241,245,249,0.5)',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Example prompts */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={S.label}>Examples — click to use</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {examplePrompts.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => onPromptChange(ex)}
                style={{
                  textAlign:    'left',
                  padding:      '6px 10px',
                  borderRadius: '7px',
                  background:   prompt === ex
                    ? 'rgba(124,58,237,0.15)'
                    : 'rgba(255,255,255,0.03)',
                  border: prompt === ex
                    ? '0.5px solid rgba(124,58,237,0.35)'
                    : '0.5px solid rgba(255,255,255,0.06)',
                  color:     prompt === ex ? '#a78bfa' : 'rgba(241,245,249,0.5)',
                  fontSize:  '12px',
                  cursor:    'pointer',
                  lineHeight: '1.4',
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ ...S.btnSecondary, flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating || prompt.trim().length < 10}
            style={{
              ...S.btnPrimary,
              flex:    2,
              display: 'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:     '7px',
              opacity: (isGenerating || prompt.trim().length < 10) ? 0.6 : 1,
              cursor:  (isGenerating || prompt.trim().length < 10) ? 'not-allowed' : 'pointer',
            }}
          >
            {isGenerating ? (
              <>
                <span
                  style={{
                    width: '14px', height: '14px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTop: '2px solid #fff',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }}
                />
                Generating…
              </>
            ) : (
              '✦ Generate Quiz'
            )}
          </button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )
}

export default QuizCreatorPage