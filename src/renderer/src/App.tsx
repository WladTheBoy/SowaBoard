import { useEffect, useState } from 'react'
import Login from './components/Login'

type TicketStatus = 'todo' | 'in-progress' | 'done'
type TicketPriority = 'Niedrig' | 'Mittel' | 'Hoch'

interface Ticket {
  id: string
  projectId: string
  title: string
  description: string
  priority: TicketPriority
  assignee: string
  status: TicketStatus
  label: string
}

interface Project {
  id: string
  name: string
  color: 'violet' | 'orange' | 'cyan'
}

type ProjectDialog =
  | { mode: 'create' }
  | { mode: 'rename'; projectId: string }
  | { mode: 'delete'; projectId: string }
  | null

const TICKETS_STORAGE_KEY = 'flowboard-tickets'
const PROJECTS_STORAGE_KEY = 'flowboard-projects'
const ACTIVE_PROJECT_STORAGE_KEY = 'flowboard-active-project'

interface Profile {
  id: string
  username: string
}

interface AuthState {
  profile: Profile | null
  hasProfiles: boolean
}

const initialProjects: Project[] = [
  { id: 'website-relaunch', name: 'Website Relaunch', color: 'violet' },
  { id: 'mobile-app', name: 'Mobile App', color: 'orange' },
  { id: 'marketing-2025', name: 'Marketing 2025', color: 'cyan' }
]

const initialTickets: Ticket[] = [
  {
    id: 'FLW-12',
    projectId: 'website-relaunch',
    title: 'Projektstruktur aufsetzen',
    description: 'Grundgerüst und Ordnerstruktur für das neue Projekt vorbereiten.',
    priority: 'Hoch',
    assignee: 'Max',
    status: 'todo',
    label: 'Planung'
  },
  {
    id: 'FLW-13',
    projectId: 'website-relaunch',
    title: 'Nutzer-Feedback sammeln',
    description: 'Erste Rückmeldungen aus dem Team zusammentragen.',
    priority: 'Mittel',
    assignee: 'Lisa',
    status: 'todo',
    label: 'Research'
  },
  {
    id: 'FLW-14',
    projectId: 'website-relaunch',
    title: 'Board-Ansicht gestalten',
    description: 'Karten und Status-Spalten für das Kanban-Board entwerfen.',
    priority: 'Hoch',
    assignee: 'Anna',
    status: 'in-progress',
    label: 'Design'
  },
  {
    id: 'FLW-15',
    projectId: 'website-relaunch',
    title: 'Farben abstimmen',
    description: 'Farbpalette für die neue Projektoberfläche finalisieren.',
    priority: 'Niedrig',
    assignee: 'Max',
    status: 'done',
    label: 'Design'
  }
]

const columns: { id: TicketStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'Zu erledigen', color: 'slate' },
  { id: 'in-progress', title: 'In Arbeit', color: 'blue' },
  { id: 'done', title: 'Done', color: 'green' }
]

function isTicket(value: unknown): value is Ticket {
  if (!value || typeof value !== 'object') return false
  const ticket = value as Record<string, unknown>
  return (
    typeof ticket.id === 'string' &&
    (ticket.projectId === undefined || typeof ticket.projectId === 'string') &&
    typeof ticket.title === 'string' &&
    typeof ticket.description === 'string' &&
    (ticket.priority === 'Niedrig' || ticket.priority === 'Mittel' || ticket.priority === 'Hoch') &&
    typeof ticket.assignee === 'string' &&
    (ticket.status === 'todo' || ticket.status === 'in-progress' || ticket.status === 'done') &&
    typeof ticket.label === 'string'
  )
}

function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false
  const project = value as Record<string, unknown>
  return (
    typeof project.id === 'string' &&
    typeof project.name === 'string' &&
    (project.color === 'violet' || project.color === 'orange' || project.color === 'cyan')
  )
}

function getSavedProjects(profileId: string): Project[] {
  try {
    const saved = window.localStorage.getItem(`${PROJECTS_STORAGE_KEY}:${profileId}`)
    if (!saved) return initialProjects
    const parsed: unknown = JSON.parse(saved)
    if (Array.isArray(parsed) && parsed.every(isProject) && parsed.length > 0) return parsed
    console.error('Gespeicherte Projekte haben ein ungültiges Format.')
  } catch (error) {
    console.error('Projekte konnten nicht aus dem lokalen Speicher geladen werden.', error)
  }
  return initialProjects
}

function getSavedTickets(profileId: string): Ticket[] {
  try {
    const saved = window.localStorage.getItem(`${TICKETS_STORAGE_KEY}:${profileId}`)
    if (!saved) return initialTickets
    const parsed: unknown = JSON.parse(saved)
    if (Array.isArray(parsed) && parsed.every(isTicket)) {
      return parsed.map((ticket) => ({
        ...ticket,
        projectId: ticket.projectId ?? 'website-relaunch'
      }))
    }
    console.error('Gespeicherte Tickets haben ein ungültiges Format.')
  } catch (error) {
    console.error('Tickets konnten nicht aus dem lokalen Speicher geladen werden.', error)
  }
  return initialTickets
}

function migrateLegacyData(profileId: string): void {
  try {
    for (const key of [PROJECTS_STORAGE_KEY, TICKETS_STORAGE_KEY, ACTIVE_PROJECT_STORAGE_KEY]) {
      const saved = window.localStorage.getItem(key)
      const profileKey = `${key}:${profileId}`
      if (saved !== null && window.localStorage.getItem(profileKey) === null) {
        window.localStorage.setItem(profileKey, saved)
        window.localStorage.removeItem(key)
      }
    }
  } catch (error) {
    console.error('Bisherige Board-Daten konnten nicht dem ersten Profil zugeordnet werden.', error)
  }
}

function Board({
  profile,
  onLogout
}: {
  profile: Profile
  onLogout: () => void
}): React.JSX.Element {
  const [projects, setProjects] = useState<Project[]>(() => getSavedProjects(profile.id))
  const [activeProjectId, setActiveProjectId] = useState(() => {
    try {
      const savedProjectId = window.localStorage.getItem(
        `${ACTIVE_PROJECT_STORAGE_KEY}:${profile.id}`
      )
      return projects.find((project) => project.id === savedProjectId)?.id ?? projects[0].id
    } catch (error) {
      console.error('Das aktive Projekt konnte nicht geladen werden.', error)
      return projects[0].id
    }
  })
  const [tickets, setTickets] = useState<Ticket[]>(() => getSavedTickets(profile.id))
  const [projectDialog, setProjectDialog] = useState<ProjectDialog>(null)
  const [projectName, setProjectName] = useState('')
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [ticketTitle, setTicketTitle] = useState('')
  const [ticketDescription, setTicketDescription] = useState('')
  const [ticketAssignee, setTicketAssignee] = useState(profile.username)
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>('Mittel')
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>('todo')
  const [ticketLabel, setTicketLabel] = useState('Allgemein')
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null)
  const [dropTargetStatus, setDropTargetStatus] = useState<TicketStatus | null>(null)

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0]
  const projectTickets = tickets.filter((ticket) => ticket.projectId === activeProject.id)

  useEffect(() => {
    try {
      window.localStorage.setItem(`${PROJECTS_STORAGE_KEY}:${profile.id}`, JSON.stringify(projects))
    } catch (error) {
      console.error('Projekte konnten nicht im lokalen Speicher gesichert werden.', error)
    }
  }, [projects, profile.id])

  useEffect(() => {
    try {
      window.localStorage.setItem(`${TICKETS_STORAGE_KEY}:${profile.id}`, JSON.stringify(tickets))
    } catch (error) {
      console.error('Tickets konnten nicht im lokalen Speicher gesichert werden.', error)
    }
  }, [tickets, profile.id])

  useEffect(() => {
    try {
      window.localStorage.setItem(`${ACTIVE_PROJECT_STORAGE_KEY}:${profile.id}`, activeProjectId)
    } catch (error) {
      console.error('Das aktive Projekt konnte nicht gespeichert werden.', error)
    }
  }, [activeProjectId, profile.id])

  const filteredTickets = projectTickets.filter((ticket) => {
    const query = search.trim().toLocaleLowerCase('de')
    return (
      !query ||
      ticket.title.toLocaleLowerCase('de').includes(query) ||
      ticket.description.toLocaleLowerCase('de').includes(query) ||
      ticket.id.toLocaleLowerCase('de').includes(query) ||
      ticket.assignee.toLocaleLowerCase('de').includes(query)
    )
  })

  const createTicket = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const title = ticketTitle.trim()
    if (!title) return

    const ticket: Ticket = {
      id: `FLW-${Date.now().toString().slice(-5)}${tickets.length + 1}`,
      projectId: activeProject.id,
      title,
      description: ticketDescription.trim(),
      priority: ticketPriority,
      assignee: ticketAssignee.trim() || profile.username,
      status: ticketStatus,
      label: ticketLabel.trim() || 'Allgemein'
    }

    setTickets((current) => [ticket, ...current])
    setTicketTitle('')
    setTicketDescription('')
    setTicketAssignee(profile.username)
    setTicketPriority('Mittel')
    setTicketStatus('todo')
    setTicketLabel('Allgemein')
    setIsCreateOpen(false)
  }

  const moveTicket = (ticketId: string, status: TicketStatus): void => {
    setTickets((current) =>
      current.map((ticket) => (ticket.id === ticketId ? { ...ticket, status } : ticket))
    )
  }

  const handleTicketDrop = (event: React.DragEvent<HTMLElement>, status: TicketStatus): void => {
    event.preventDefault()
    const ticketId = event.dataTransfer.getData('text/plain') || draggedTicketId
    if (ticketId) moveTicket(ticketId, status)
    setDraggedTicketId(null)
    setDropTargetStatus(null)
  }

  const deleteTicket = (ticketId: string): void => {
    setTickets((current) => current.filter((ticket) => ticket.id !== ticketId))
  }

  const countForStatus = (status: TicketStatus): number =>
    projectTickets.filter((ticket) => ticket.status === status).length

  const openProjectDialog = (dialog: Exclude<ProjectDialog, null>): void => {
    if (dialog.mode === 'rename') {
      setProjectName(projects.find((project) => project.id === dialog.projectId)?.name ?? '')
    } else {
      setProjectName('')
    }
    setOpenProjectMenuId(null)
    setProjectDialog(dialog)
  }

  const saveProject = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const name = projectName.trim()
    if (!name || !projectDialog) return

    if (projectDialog.mode === 'create') {
      const colors: Project['color'][] = ['violet', 'orange', 'cyan']
      const project: Project = {
        id: crypto.randomUUID(),
        name,
        color: colors[projects.length % colors.length]
      }
      setProjects((current) => [...current, project])
      setActiveProjectId(project.id)
    } else if (projectDialog.mode === 'rename') {
      setProjects((current) =>
        current.map((project) =>
          project.id === projectDialog.projectId ? { ...project, name } : project
        )
      )
    }

    setProjectDialog(null)
    setProjectName('')
  }

  const deleteProject = (projectId: string): void => {
    if (projects.length <= 1) return
    const remainingProjects = projects.filter((project) => project.id !== projectId)
    setProjects(remainingProjects)
    setTickets((current) => current.filter((ticket) => ticket.projectId !== projectId))
    if (activeProjectId === projectId) setActiveProjectId(remainingProjects[0].id)
    setProjectDialog(null)
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="app-brand" href="#board" aria-label="SowaBoard Startseite">
          <span className="brand-symbol">S</span>
          <span>SowaBoard</span>
        </a>

        <nav className="main-nav" aria-label="Hauptnavigation">
          <span className="nav-heading">ARBEITSBEREICH</span>
          <a className="nav-link active" href="#board">
            <span className="nav-icon">▦</span> Board
            <span className="nav-count">{projectTickets.length}</span>
          </a>
        </nav>

        <div className="sidebar-projects">
          <div className="project-heading">
            <span className="nav-heading">PROJEKTE</span>
            <button
              className="icon-button small-icon"
              aria-label="Projekt hinzufügen"
              onClick={() => openProjectDialog({ mode: 'create' })}
              title="Projekt hinzufügen"
            >
              +
            </button>
          </div>
          <div className="project-list">
            {projects.map((project) => (
              <div
                className="project-item"
                key={project.id}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setOpenProjectMenuId(null)
                  }
                }}
              >
                <button
                  className={`project-link${activeProjectId === project.id ? ' selected' : ''}`}
                  onClick={() => {
                    setActiveProjectId(project.id)
                    setOpenProjectMenuId(null)
                  }}
                  aria-current={activeProjectId === project.id ? 'page' : undefined}
                >
                  <span className={`project-dot ${project.color}`} />
                  <span className="project-link-name">{project.name}</span>
                </button>
                <button
                  className="icon-button project-menu-trigger"
                  aria-label={`Menü für ${project.name}`}
                  aria-haspopup="menu"
                  aria-expanded={openProjectMenuId === project.id}
                  onClick={() =>
                    setOpenProjectMenuId((current) => (current === project.id ? null : project.id))
                  }
                >
                  ···
                </button>
                {openProjectMenuId === project.id && (
                  <div className="project-context-menu" role="menu">
                    <button
                      role="menuitem"
                      onClick={() => openProjectDialog({ mode: 'rename', projectId: project.id })}
                    >
                      <span>✎</span> Umbenennen
                    </button>
                    <button
                      className="delete-project-action"
                      role="menuitem"
                      disabled={projects.length <= 1}
                      onClick={() => openProjectDialog({ mode: 'delete', projectId: project.id })}
                      title={
                        projects.length <= 1
                          ? 'Mindestens ein Projekt muss bestehen bleiben'
                          : undefined
                      }
                    >
                      <span>⌫</span> Löschen
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="user-avatar">{profile.username.slice(0, 2).toUpperCase()}</div>
          <div className="user-details">
            <strong>{profile.username}</strong>
            <span>Angemeldetes Profil</span>
          </div>
          <button className="icon-button user-menu" aria-label="Abmelden" onClick={onLogout}>
            ⇥
          </button>
        </div>
      </aside>

      <section className="main-area" id="board">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Board</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{activeProject.name}</strong>
          </div>
          <div className="topbar-actions">
            <div className="user-avatar top-avatar" title={profile.username}>
              {profile.username.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="board-content">
          <section className="project-header">
            <div className="project-title-area">
              <div className="project-title-row">
                <span className="project-title-mark">{activeProject.name.charAt(0).toUpperCase()}</span>
                <h1>{activeProject.name}</h1>
                <span className="private-badge">
                  <span>♢</span> Privat
                </span>
              </div>
              <p>Aufgaben und Fortschritt in deinem persönlichen Board.</p>
            </div>
            <div className="project-header-actions">
              <button className="primary-button" onClick={() => setIsCreateOpen(true)}>
                <span>+</span> Ticket erstellen
              </button>
            </div>
          </section>

          <section className="board-toolbar" aria-label="Board-Werkzeuge">
            <div className="toolbar-actions">
              <label className="search-box">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Tickets suchen..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Tickets suchen"
                />
              </label>
            </div>
          </section>

          <section className="kanban-board" aria-label="Kanban Board">
            {columns.map((column) => {
              const columnTickets = filteredTickets.filter((ticket) => ticket.status === column.id)
              return (
                <section
                  className={`kanban-column${dropTargetStatus === column.id ? ' drag-over' : ''}`}
                  key={column.id}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setDropTargetStatus(column.id)
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setDropTargetStatus(null)
                    }
                  }}
                  onDrop={(event) => handleTicketDrop(event, column.id)}
                >
                  <div className="column-heading">
                    <div className="column-title">
                      <span className={`column-indicator ${column.color}`} />
                      <h2>{column.title}</h2>
                      <span className="column-count">{countForStatus(column.id)}</span>
                    </div>
                    <button
                      className="icon-button column-add"
                      aria-label={`Ticket zu ${column.title} hinzufügen`}
                      onClick={() => setIsCreateOpen(true)}
                    >
                      +
                    </button>
                  </div>

                  <div className="ticket-list">
                    {columnTickets.map((ticket) => (
                      <article
                        className={`ticket-card${draggedTicketId === ticket.id ? ' dragging' : ''}`}
                        key={ticket.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', ticket.id)
                          setDraggedTicketId(ticket.id)
                        }}
                        onDragEnd={() => {
                          setDraggedTicketId(null)
                          setDropTargetStatus(null)
                        }}
                      >
                        <div className="ticket-topline">
                          <span className="ticket-id">{ticket.id}</span>
                          <button
                            className="icon-button ticket-menu"
                            onClick={() => deleteTicket(ticket.id)}
                            aria-label={`Ticket ${ticket.title} löschen`}
                            title="Ticket löschen"
                          >
                            ···
                          </button>
                        </div>
                        <h3>{ticket.title}</h3>
                        {ticket.description && (
                          <p className="ticket-description">{ticket.description}</p>
                        )}
                        <div className="ticket-label-row">
                          <span
                            className={`ticket-label label-${ticket.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                          >
                            <span /> {ticket.label}
                          </span>
                          <span className={`priority priority-${ticket.priority.toLowerCase()}`}>
                            <span>
                              {ticket.priority === 'Hoch'
                                ? '↑'
                                : ticket.priority === 'Niedrig'
                                  ? '↓'
                                  : '→'}
                            </span>
                            {ticket.priority}
                          </span>
                        </div>
                        <div className="ticket-footer">
                          <div className="assignee">
                            <span className="assignee-avatar">
                              {ticket.assignee.slice(0, 2).toUpperCase()}
                            </span>
                            <span>{ticket.assignee}</span>
                          </div>
                          <label className="status-select-label">
                            <span className="sr-only">Status ändern</span>
                            <select
                              value={ticket.status}
                              onChange={(event) =>
                                moveTicket(ticket.id, event.target.value as TicketStatus)
                              }
                              aria-label={`Status von ${ticket.title} ändern`}
                            >
                              {columns.map((status) => (
                                <option key={status.id} value={status.id}>
                                  {status.title}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </article>
                    ))}
                    {columnTickets.length === 0 && (
                      <div className="empty-column">
                        {search ? 'Keine passenden Tickets.' : 'Noch keine Tickets'}
                      </div>
                    )}
                    <button className="add-ticket-inline" onClick={() => setIsCreateOpen(true)}>
                      <span>+</span> Ticket hinzufügen
                    </button>
                  </div>
                </section>
              )
            })}
          </section>
        </div>
      </section>

      {projectDialog && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProjectDialog(null)
          }}
        >
          <section
            className="ticket-modal project-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
          >
            {projectDialog.mode === 'delete' ? (
              <>
                <div className="modal-heading">
                  <div>
                    <span className="modal-eyebrow">PROJEKT LÖSCHEN</span>
                    <h2 id="project-modal-title">Bist du sicher?</h2>
                  </div>
                  <button
                    className="icon-button modal-close"
                    onClick={() => setProjectDialog(null)}
                    aria-label="Dialog schließen"
                  >
                    ×
                  </button>
                </div>
                <p className="project-delete-message">
                  „{projects.find((project) => project.id === projectDialog.projectId)?.name}“ und
                  alle zugehörigen Tickets werden dauerhaft gelöscht.
                </p>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setProjectDialog(null)}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    className="primary-button danger-button"
                    onClick={() => deleteProject(projectDialog.projectId)}
                  >
                    Projekt löschen
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-heading">
                  <div>
                    <span className="modal-eyebrow">PROJEKTVERWALTUNG</span>
                    <h2 id="project-modal-title">
                      {projectDialog.mode === 'create' ? 'Neues Projekt' : 'Projekt umbenennen'}
                    </h2>
                  </div>
                  <button
                    className="icon-button modal-close"
                    onClick={() => setProjectDialog(null)}
                    aria-label="Dialog schließen"
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={saveProject}>
                  <label className="form-field">
                    <span>
                      Projektname <b>*</b>
                    </span>
                    <input
                      autoFocus
                      required
                      maxLength={60}
                      placeholder="Zum Beispiel: Website Relaunch"
                      value={projectName}
                      onChange={(event) => setProjectName(event.target.value)}
                    />
                  </label>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setProjectDialog(null)}
                    >
                      Abbrechen
                    </button>
                    <button type="submit" className="primary-button">
                      {projectDialog.mode === 'create' ? 'Projekt erstellen' : 'Speichern'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      {isCreateOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsCreateOpen(false)
          }}
        >
          <section
            className="ticket-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-heading">
              <div>
                <span className="modal-eyebrow">{activeProject.name.toLocaleUpperCase('de')}</span>
                <h2 id="modal-title">Neues Ticket</h2>
              </div>
              <button
                className="icon-button modal-close"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Dialog schließen"
              >
                ×
              </button>
            </div>
            <form onSubmit={createTicket}>
              <label className="form-field">
                <span>
                  Titel <b>*</b>
                </span>
                <input
                  autoFocus
                  required
                  maxLength={100}
                  placeholder="Was muss erledigt werden?"
                  value={ticketTitle}
                  onChange={(event) => setTicketTitle(event.target.value)}
                />
              </label>
              <label className="form-field">
                <span>Beschreibung</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Weitere Details zum Ticket..."
                  value={ticketDescription}
                  onChange={(event) => setTicketDescription(event.target.value)}
                />
              </label>
              <div className="form-row">
                <label className="form-field">
                  <span>Zugewiesen an</span>
                  <input
                    placeholder="Name"
                    maxLength={40}
                    value={ticketAssignee}
                    onChange={(event) => setTicketAssignee(event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Priorität</span>
                  <select
                    value={ticketPriority}
                    onChange={(event) => setTicketPriority(event.target.value as TicketPriority)}
                  >
                    <option>Niedrig</option>
                    <option>Mittel</option>
                    <option>Hoch</option>
                  </select>
                </label>
              </div>
              <label className="form-field">
                <span>Status</span>
                <select
                  value={ticketStatus}
                  onChange={(event) => setTicketStatus(event.target.value as TicketStatus)}
                >
                  {columns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Label</span>
                <input
                  maxLength={24}
                  value={ticketLabel}
                  onChange={(event) => setTicketLabel(event.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Abbrechen
                </button>
                <button type="submit" className="primary-button">
                  Ticket erstellen
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

function App(): React.JSX.Element {
  const [authState, setAuthState] = useState<AuthState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let isMounted = true
    window.api.auth
      .getState()
      .then((state) => {
        if (isMounted) setAuthState(state)
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setAuthError(
            error instanceof Error ? error.message : 'Profile konnten nicht geladen werden.'
          )
          setAuthState({ profile: null, hasProfiles: true })
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  if (isLoading) {
    return <main className="login-screen"><p className="login-loading">SowaBoard wird geladen...</p></main>
  }

  if (!authState?.profile) {
    return (
      <Login
        hasProfiles={authState?.hasProfiles ?? false}
        initialError={authError}
        onAuthenticated={(profile) => {
          if (!authState?.hasProfiles) migrateLegacyData(profile.id)
          setAuthError('')
          setAuthState({ profile, hasProfiles: true })
        }}
      />
    )
  }

  const logout = async (): Promise<void> => {
    try {
      await window.api.auth.logout()
      setAuthError('')
      setAuthState({ profile: null, hasProfiles: true })
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Abmelden ist fehlgeschlagen.')
      window.alert(`Abmelden ist fehlgeschlagen: ${error instanceof Error ? error.message : error}`)
    }
  }

  return <Board profile={authState.profile} onLogout={() => void logout()} />
}

export default App
