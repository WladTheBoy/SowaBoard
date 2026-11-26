import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from '@tiptap/markdown'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useEffect, useRef, useState } from 'react'
import { apiErrorMessage } from '../api/client'
import type { paths } from '../api/generated/schema'

export type Page = paths['/pages']['get']['responses']['200']['content']['application/json'][number]

interface PageEditorProps {
  page: Page
  projectName: string
  onSave: (pageId: string, title: string, content: string) => Promise<void>
  onDelete: (pageId: string) => Promise<void>
  onCreateChild: (page: Page) => Promise<void>
}

type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error'

function PageEditor({
  page,
  projectName,
  onSave,
  onDelete,
  onCreateChild
}: PageEditorProps): React.JSX.Element {
  const [title, setTitle] = useState(page.title)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [saveError, setSaveError] = useState('')
  const [revision, setRevision] = useState(0)
  const titleRef = useRef(title)
  const contentRef = useRef(page.content ?? '')
  const dirtyRef = useRef(false)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Markdown,
        Placeholder.configure({ placeholder: 'Beginne deine Dokumentation zu schreiben…' })
      ],
      content: page.content ?? '',
      contentType: 'markdown',
      immediatelyRender: false,
      onUpdate: ({ editor: currentEditor }) => {
        contentRef.current = currentEditor.getMarkdown()
        dirtyRef.current = true
        setSaveStatus('unsaved')
        setRevision((current) => current + 1)
      }
    },
    [page.id]
  )

  const save = useCallback((): Promise<void> => {
    if (!dirtyRef.current) return saveQueueRef.current

    const snapshot = {
      title: titleRef.current.trim() || 'Unbenannte Seite',
      content: contentRef.current
    }
    if (snapshot.title !== titleRef.current) {
      titleRef.current = snapshot.title
      setTitle(snapshot.title)
    }

    const task = saveQueueRef.current
      .catch(() => {})
      .then(async () => {
        setSaveStatus('saving')
        setSaveError('')
        try {
          await onSaveRef.current(page.id, snapshot.title, snapshot.content)
          if (titleRef.current === snapshot.title && contentRef.current === snapshot.content) {
            dirtyRef.current = false
            setSaveStatus('saved')
          }
        } catch (error) {
          if (titleRef.current === snapshot.title && contentRef.current === snapshot.content) {
            setSaveStatus('error')
            setSaveError(apiErrorMessage(error, 'Seite konnte nicht gespeichert werden.'))
          }
        }
      })
    saveQueueRef.current = task
    return task
  }, [page.id])

  useEffect(() => {
    if (revision === 0 || !dirtyRef.current) return
    const timeout = window.setTimeout(() => {
      void save()
    }, 800)
    return () => window.clearTimeout(timeout)
  }, [revision, save])

  const updateTitle = (value: string): void => {
    titleRef.current = value
    setTitle(value)
    dirtyRef.current = true
    setSaveError('')
    setSaveStatus('unsaved')
    setRevision((current) => current + 1)
  }

  const statusLabel = {
    saved: 'Alle Änderungen gespeichert',
    unsaved: 'Ungespeicherte Änderungen',
    saving: 'Speichert…',
    error: 'Speichern fehlgeschlagen'
  }[saveStatus]

  return (
    <section
      aria-label="Dokumentation bearbeiten"
      className="page-editor"
      onBlurCapture={(event) => {
        const target = event.relatedTarget
        if (!(target instanceof Node && event.currentTarget.contains(target))) {
          void save()
        }
      }}
    >
      <header className="page-editor-header">
        <div className="page-editor-breadcrumb">
          <span>{projectName}</span>
          <span aria-hidden="true">/</span>
          <span>Dokumentation</span>
        </div>
        <div className="page-editor-actions">
          <span className={`page-save-status ${saveStatus}`} role="status">
            {statusLabel}
          </span>
          <button
            className="secondary-button"
            disabled={saveStatus === 'saved' || saveStatus === 'saving'}
            onClick={() => void save()}
            type="button"
          >
            Jetzt speichern
          </button>
          <button
            className="secondary-button"
            onClick={() => void onCreateChild(page)}
            type="button"
          >
            Unterseite
          </button>
          <button
            className="page-delete-button"
            onClick={() => {
              if (window.confirm(`„${page.title}“ wirklich löschen?`)) {
                void onDelete(page.id)
              }
            }}
            type="button"
          >
            Löschen
          </button>
        </div>
      </header>

      <section className="page-editor-content">
        <input
          aria-label="Seitentitel"
          className="page-title-input"
          maxLength={200}
          onChange={(event) => updateTitle(event.target.value)}
          placeholder="Seitentitel"
          value={title}
        />
        <div className="markdown-hint">Markdown wird beim Speichern beibehalten.</div>
        <div className="tiptap-toolbar" role="toolbar" aria-label="Textformatierung">
          <button
            aria-label="Überschrift 1"
            aria-pressed={editor?.isActive('heading', { level: 1 }) ?? false}
            className={editor?.isActive('heading', { level: 1 }) ? 'active' : ''}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            type="button"
          >
            H1
          </button>
          <button
            aria-label="Überschrift 2"
            aria-pressed={editor?.isActive('heading', { level: 2 }) ?? false}
            className={editor?.isActive('heading', { level: 2 }) ? 'active' : ''}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            type="button"
          >
            H2
          </button>
          <span className="toolbar-divider" />
          <button
            aria-label="Fett"
            aria-pressed={editor?.isActive('bold') ?? false}
            className={editor?.isActive('bold') ? 'active' : ''}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            type="button"
          >
            <strong>B</strong>
          </button>
          <button
            aria-label="Kursiv"
            aria-pressed={editor?.isActive('italic') ?? false}
            className={editor?.isActive('italic') ? 'active' : ''}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            type="button"
          >
            <em>I</em>
          </button>
          <span className="toolbar-divider" />
          <button
            aria-label="Aufzählung"
            aria-pressed={editor?.isActive('bulletList') ?? false}
            className={editor?.isActive('bulletList') ? 'active' : ''}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            type="button"
          >
            • Liste
          </button>
          <button
            aria-label="Nummerierte Liste"
            aria-pressed={editor?.isActive('orderedList') ?? false}
            className={editor?.isActive('orderedList') ? 'active' : ''}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            type="button"
          >
            1. Liste
          </button>
          <button
            aria-label="Zitat"
            aria-pressed={editor?.isActive('blockquote') ?? false}
            className={editor?.isActive('blockquote') ? 'active' : ''}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            type="button"
          >
            Zitat
          </button>
          <button
            aria-label="Codeblock"
            aria-pressed={editor?.isActive('codeBlock') ?? false}
            className={editor?.isActive('codeBlock') ? 'active' : ''}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            type="button"
          >
            {'</>'}
          </button>
        </div>
        {saveError && (
          <p className="page-save-error" role="alert">
            {saveError}
          </p>
        )}
        <EditorContent editor={editor} className="tiptap-editor" />
      </section>
    </section>
  )
}

export default PageEditor
