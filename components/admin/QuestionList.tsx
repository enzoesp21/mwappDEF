'use client'

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import type { ExamQuestion } from '@/lib/types'
import { cn } from '@/lib/utils'

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const

interface QuestionListProps {
  questions: ExamQuestion[]
  onReorder: (questions: ExamQuestion[]) => void
  onDelete: (id: string) => void
  onEdit: (question: ExamQuestion) => void
}

export default function QuestionList({ questions, onReorder, onDelete, onEdit }: QuestionListProps) {
  function handleDragEnd(result: DropResult) {
    if (!result.destination) return
    if (result.destination.index === result.source.index) return

    const reordered = Array.from(questions)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)

    onReorder(reordered.map((q, i) => ({ ...q, order: i })))
  }

  if (questions.length === 0) {
    return (
      <div className="border border-dashed border-brand-border rounded-xl p-8 text-center">
        <p className="text-sm text-brand-muted">Aún no hay preguntas. Agrega la primera abajo.</p>
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="questions">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-2"
          >
            {questions.map((q, index) => (
              <Draggable key={q.id} draggableId={q.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-xl border transition-colors duration-200',
                      snapshot.isDragging
                        ? 'bg-brand-card-hover border-brand-accent/40 shadow-lg'
                        : 'bg-brand-card border-brand-border'
                    )}
                  >
                    {/* Drag handle */}
                    <div
                      {...provided.dragHandleProps}
                      className="mt-0.5 cursor-grab active:cursor-grabbing text-brand-muted hover:text-brand-text transition-colors duration-200 flex-shrink-0"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Number */}
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-bold flex items-center justify-center mt-0.5">
                      {index + 1}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-brand-text font-medium line-clamp-2 mb-2">
                        {q.question}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {q.options.map((opt, i) => (
                          <span
                            key={i}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs max-w-[140px]',
                              i === q.correct_option
                                ? 'bg-brand-success/15 text-brand-success border border-brand-success/20'
                                : 'bg-brand-card-hover text-brand-muted'
                            )}
                          >
                            <span className="font-bold">{OPTION_LABELS[i]}.</span>
                            <span className="truncate">{opt}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => onEdit(q)}
                        className="p-2 rounded-lg text-brand-muted hover:text-brand-accent hover:bg-brand-accent/10 transition-colors duration-200 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="Editar pregunta"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(q.id)}
                        className="p-2 rounded-lg text-brand-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors duration-200 cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title="Eliminar pregunta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
