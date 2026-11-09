import { useCallback, useEffect, useState } from 'react'
import {
  api,
  apiErrorMessage,
  clearAccessToken,
  requireApiData,
  setUnauthorizedHandler,
  throwOnApiError
} from './api/client'
import type { paths } from './api/generated/schema'
import logo from './assets/logo.svg'
import Login from './components/Login'
import PageEditor, { type Page } from './components/PageEditor'

type Project = paths['/projects']['get']['responses']['200']['content']['application/json'][number]
type Ticket = paths['/tickets']['get']['responses']['200']['content']['application/json'][number]
type User = paths['/users']['get']['responses']['200']['content']['application/json'][number]
type AuthenticatedUser = paths['/auth/me']['get']['responses']['200']['content']['application/json']
type TicketStatus = Ticket['status']
type TicketPriority = Ticket['priority']

type ProjectDialog =
  | { mode: 'create' }
  | { mode: 'rename'; projectId: string }
  | { mode: 'delete'; projectId: string }
  | null

const columns: { id: TicketStatus; title: string; color: string }[] = [
  { id: 'todo', title: 'Zu erledigen', color: 'slate' },
  { id: 'in-progress', title: 'In Arbeit', color: 'blue' },
  { id: 'done', title: 'Done', color: 'green' }
]

function Board({
  user,
  onLogout
}: {
  user: AuthenticatedUser
  onLogout: () => void
}): React.JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [activeProjectId, setActiveProjectId] = useState('')
  const [selectedPageId, setSelectedPageId] = useState('')
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [apiError, setApiError] = useState('')
  const [pageError, setPageError] = useState('')
  const [pagesLoadError, setPagesLoadError] = useState('')
  const [projectDialog, setProjectDialog] = useState<ProjectDialog>(null)
  const [projectName, setProjectName] = useState('')
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null)
  const [openTicketMenuId, setOpenTicketMenuId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null)
  const [ticketTitle, setTicketTitle] = useState('')
  const [ticketDescription, setTicketDescription] = useState('')
  const [ticketAssignee, setTicketAssignee] = useState('')
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>('Mittel')
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>('todo')
  const [ticketLabel, setTicketLabel] = useState('Allgemein')
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null)
  const [dropTargetStatus, setDropTargetStatus] = useState<TicketStatus | null>(null)

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null
  const selectedPage = pages.find((page) => page.id === selectedPageId) ?? null
  const projectTickets = activeProject
    ? tickets.filter((ticket) => ticket.projectId === activeProject.id)
    : []

  const loadBoard = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setApiError('')
    try {
      const pagesPromise = api.GET('/pages').then(
        (result) => ({ status: 'fulfilled' as const, result }),
        (error: unknown) => ({ status: 'rejected' as const, error })
      )
      const [projectsResult, ticketsResult, usersResult, pagesOutcome] = await Promise.all([
        api.GET('/projects'),
        api.GET('/tickets'),
        api.GET('/users'),
        pagesPromise
      ])
      const loadedProjects = requireApiData(
        projectsResult.data,
        projectsResult.error,
        'Projekte konnten nicht geladen werden.'
      )
      const loadedTickets = requireApiData(
        ticketsResult.data,
        ticketsResult.error,
        'Tickets konnten nicht geladen werden.'
      )
      const loadedUsers = requireApiData(
        usersResult.data,
        usersResult.error,
        'Benutzer konnten nicht geladen werden.'
      ).filter((user) => !user.isDeleted)
      setProjects(loadedProjects)
      setTickets(loadedTickets)
      setUsers(loadedUsers)
      if (pagesOutcome.status === 'fulfilled') {
        try {
          setPages(
            requireApiData(
              pagesOutcome.result.data,
              pagesOutcome.result.error,
              'Dokumentationsseiten konnten nicht geladen werden.'
            )
          )
          setPagesLoadError('')
        } catch (error) {
          setPagesLoadError(
            apiErrorMessage(error, 'Dokumentationsseiten konnten nicht geladen werden.')
          )
        }
      } else {
        setPagesLoadError(
          apiErrorMessage(pagesOutcome.error, 'Dokumentationsseiten konnten nicht geladen werden.')
        )
      }
      setActiveProjectId((current) =>
        loadedProjects.some((project) => project.id === current)
          ? current
          : (loadedProjects[0]?.id ?? '')
      )
      setTicketAssignee((current) => current || loadedUsers[0]?.username || '')
    } catch (error) {
      setApiError(apiErrorMessage(error, 'Daten konnten nicht vom Backend geladen werden.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBoard()
  }, [loadBoard])

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

  const createTicket = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const title = ticketTitle.trim()
    if (!title || !activeProject) return

    setApiError('')
    setIsMutating(true)
    try {
      const body = {
        projectId: activeProject.id,
        title,
        description: ticketDescription.trim(),
        priority: ticketPriority,
        assignee: ticketAssignee.trim(),
        status: ticketStatus,
        label: ticketLabel.trim() || 'Allgemein'
      }
      if (editingTicketId) {
        const { data, error } = await api.PATCH('/tickets/{id}', {
          params: { path: { id: editingTicketId } },
          body
        })
        const ticket = requireApiData(data, error, 'Ticket konnte nicht gespeichert werden.')
        setTickets((current) =>
          current.map((currentTicket) => (currentTicket.id === ticket.id ? ticket : currentTicket))
        )
      } else {
        const { data, error } = await api.POST('/tickets', { body })
        const ticket = requireApiData(data, error, 'Ticket konnte nicht erstellt werden.')
        setTickets((current) => [ticket, ...current])
      }
      setTicketTitle('')
      setTicketDescription('')
      setTicketAssignee(users[0]?.username ?? '')
      setTicketPriority('Mittel')
      setTicketStatus('todo')
      setTicketLabel('Allgemein')
      setEditingTicketId(null)
      setIsCreateOpen(false)
    } catch (error) {
      setApiError(
        apiErrorMessage(
          error,
          editingTicketId
            ? 'Ticket konnte nicht gespeichert werden.'
            : 'Ticket konnte nicht erstellt werden.'
        )
      )
    } finally {
      setIsMutating(false)
    }
  }

  const moveTicket = async (ticketId: string, status: TicketStatus): Promise<void> => {
    const ticket = tickets.find((item) => item.id === ticketId)
    if (!ticket || ticket.status === status) return
    setApiError('')
    try {
      const { data, error } = await api.PATCH('/tickets/{id}', {
        params: { path: { id: ticketId } },
        body: { status }
      })
      const updatedTicket = requireApiData(
        data,
        error,
        'Ticketstatus konnte nicht geändert werden.'
      )
      setTickets((current) => current.map((item) => (item.id === ticketId ? updatedTicket : item)))
    } catch (error) {
      setApiError(apiErrorMessage(error, 'Ticketstatus konnte nicht geändert werden.'))
    }
  }

  const handleTicketDrop = (event: React.DragEvent<HTMLElement>, status: TicketStatus): void => {
    event.preventDefault()
    const ticketId = event.dataTransfer.getData('text/plain') || draggedTicketId
    if (ticketId) void moveTicket(ticketId, status)
    setDraggedTicketId(null)
    setDropTargetStatus(null)
  }

  const deleteTicket = async (ticketId: string): Promise<void> => {
    setOpenTicketMenuId(null)
    setApiError('')
    try {
      const { error } = await api.DELETE('/tickets/{id}', {
        params: { path: { id: ticketId } }
      })
      throwOnApiError(error, 'Ticket konnte nicht gelöscht werden.')
      setTickets((current) => current.filter((ticket) => ticket.id !== ticketId))
    } catch (error) {
      setApiError(apiErrorMessage(error, 'Ticket konnte nicht gelöscht werden.'))
    }
  }

  const openTicketEditor = (ticket: Ticket): void => {
    setOpenTicketMenuId(null)
    setEditingTicketId(ticket.id)
    setTicketTitle(ticket.title)
    setTicketDescription(ticket.description)
    setTicketAssignee(ticket.assignee)
    setTicketPriority(ticket.priority)
    setTicketStatus(ticket.status)
    setTicketLabel(ticket.label)
    setIsCreateOpen(true)
  }

  const openTicketCreator = (): void => {
    setEditingTicketId(null)
    setTicketTitle('')
    setTicketDescription('')
    setTicketAssignee(users[0]?.username ?? '')
    setTicketPriority('Mittel')
    setTicketStatus('todo')
    setTicketLabel('Allgemein')
    setIsCreateOpen(true)
  }

  const closeTicketDialog = (): void => {
    setIsCreateOpen(false)
    setEditingTicketId(null)
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

  const saveProject = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const name = projectName.trim()
    if (!name || !projectDialog) return

    setApiError('')
    setIsMutating(true)
    try {
      if (projectDialog.mode === 'create') {
        const colors: Project['color'][] = ['violet', 'orange', 'cyan']
        const { data, error } = await api.POST('/projects', {
          body: { name, color: colors[projects.length % colors.length] }
        })
        const project = requireApiData(data, error, 'Projekt konnte nicht erstellt werden.')
        setProjects((current) => [...current, project])
        setActiveProjectId(project.id)
      } else if (projectDialog.mode === 'rename') {
        const { data, error } = await api.PATCH('/projects/{id}', {
          params: { path: { id: projectDialog.projectId } },
          body: { name }
        })
        const project = requireApiData(data, error, 'Projekt konnte nicht umbenannt werden.')
        setProjects((current) => current.map((item) => (item.id === project.id ? project : item)))
      }
      setProjectDialog(null)
      setProjectName('')
    } catch (error) {
      setApiError(apiErrorMessage(error, 'Projekt konnte nicht gespeichert werden.'))
    } finally {
      setIsMutating(false)
    }
  }

  const deleteProject = async (projectId: string): Promise<void> => {
    setApiError('')
    setIsMutating(true)
    try {
      if (pagesLoadError) {
        throw new Error(
          'Dokumentationsseiten konnten nicht geprüft werden. Lade die Daten erneut, bevor du das Projekt löschst.'
        )
      }
      if (pages.some((page) => page.projectId === projectId)) {
        throw new Error('Lösche zuerst die Dokumentationsseiten dieses Projekts.')
      }
      const relatedTickets = tickets.filter((ticket) => ticket.projectId === projectId)
      for (const ticket of relatedTickets) {
        const { error } = await api.DELETE('/tickets/{id}', {
          params: { path: { id: ticket.id } }
        })
        throwOnApiError(error, `Ticket „${ticket.title}“ konnte nicht gelöscht werden.`)
        setTickets((current) => current.filter((item) => item.id !== ticket.id))
      }
      const { error } = await api.DELETE('/projects/{id}', {
        params: { path: { id: projectId } }
      })
      throwOnApiError(error, 'Projekt konnte nicht gelöscht werden.')
      const remainingProjects = projects.filter((project) => project.id !== projectId)
      setProjects(remainingProjects)
      setActiveProjectId((current) =>
        current === projectId ? (remainingProjects[0]?.id ?? '') : current
      )
      setProjectDialog(null)
    } catch (error) {
      setApiError(apiErrorMessage(error, 'Projekt konnte nicht gelöscht werden.'))
    } finally {
      setIsMutating(false)
    }
  }

  const toggleProjectPages = (projectId: string): void => {
    setExpandedProjectIds((current) => {
      const next = new Set(current)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return next
    })
  }

  const createPage = async (projectId: string, parentId: string | null = null): Promise<void> => {
    setPageError('')
    try {
      const siblingCount = pages.filter(
        (page) => page.projectId === projectId && page.parentId === parentId
      ).length
      const { data, error } = await api.POST('/pages', {
        body: {
          projectId,
          title: 'Neue Seite',
          content: '',
          parentId,
          order: siblingCount
        }
      })
      const page = requireApiData(data, error, 'Seite konnte nicht erstellt werden.')
      setPages((current) => [...current, page])
      setSelectedPageId(page.id)
      setActiveProjectId(projectId)
      setExpandedProjectIds((current) => new Set(current).add(projectId))
    } catch (error) {
      setPageError(apiErrorMessage(error, 'Seite konnte nicht erstellt werden.'))
    }
  }

  const savePage = useCallback(
    async (pageId: string, title: string, content: string): Promise<void> => {
      const { data, error } = await api.PATCH('/pages/{id}', {
        params: { path: { id: pageId } },
        body: { title, content }
      })
      const page = requireApiData(data, error, 'Seite konnte nicht gespeichert werden.')
      setPages((current) => current.map((item) => (item.id === page.id ? page : item)))
    },
    []
  )

  const deletePage = async (pageId: string): Promise<void> => {
    setPageError('')
    try {
      const { error } = await api.DELETE('/pages/{id}', {
        params: { path: { id: pageId } }
      })
      throwOnApiError(error, 'Seite konnte nicht gelöscht werden.')
      setPages((current) => current.filter((page) => page.id !== pageId))
      setSelectedPageId('')
    } catch (error) {
      setPageError(apiErrorMessage(error, 'Seite konnte nicht gelöscht werden.'))
    }
  }

  const renderPageTree = (
    projectId: string,
    parentId: string | null,
    depth = 0,
    ancestors = new Set<string>()
  ): React.JSX.Element[] => {
    const children = pages
      .filter((page) => page.projectId === projectId && page.parentId === parentId)
      .sort((left, right) => left.order - right.order)

    return children.flatMap((page) => {
      if (ancestors.has(page.id)) return []
      const nextAncestors = new Set(ancestors).add(page.id)
      return [
        <button
          aria-current={selectedPageId === page.id ? 'page' : undefined}
          className={`page-nav-link${selectedPageId === page.id ? ' selected' : ''}`}
          key={page.id}
          onClick={() => {
            setActiveProjectId(projectId)
            setSelectedPageId(page.id)
            setPageError('')
          }}
          style={{ paddingLeft: `${10 + depth * 14}px` }}
          type="button"
        >
          <span aria-hidden="true">{page.icon || '▤'}</span>
          <span className="page-nav-title">{page.title || 'Unbenannte Seite'}</span>
        </button>,
        ...renderPageTree(projectId, page.id, depth + 1, nextAncestors)
      ]
    })
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="app-brand" href="#board" aria-label="SowaBoard Startseite">
          <img alt="" className="brand-logo" src={logo} />
          <span>SowaBoard</span>
        </a>

        <nav className="main-nav" aria-label="Hauptnavigation">
          <span className="nav-heading">ARBEITSBEREICH</span>
          <a
            className={`nav-link${selectedPage ? '' : ' active'}`}
            href="#board"
            onClick={(event) => {
              event.preventDefault()
              setSelectedPageId('')
            }}
          >
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
              <div className="project-group" key={project.id}>
                <div
                  className={`project-item${activeProjectId === project.id ? ' is-active' : ''}${expandedProjectIds.has(project.id) ? ' is-expanded' : ''}`}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setOpenProjectMenuId(null)
                    }
                  }}
                >
                  <button
                    className={`project-link${activeProjectId === project.id && !selectedPage ? ' selected' : ''}`}
                    onClick={() => {
                      setActiveProjectId(project.id)
                      setSelectedPageId('')
                      setOpenProjectMenuId(null)
                    }}
                    aria-current={
                      activeProjectId === project.id && !selectedPage ? 'page' : undefined
                    }
                    type="button"
                  >
                    <span className={`project-dot ${project.color}`} />
                    <span className="project-link-name">{project.name}</span>
                  </button>
                  <button
                    aria-label={`${expandedProjectIds.has(project.id) ? 'Dokumentationen einklappen für' : 'Dokumentationen aufklappen für'} ${project.name}`}
                    aria-expanded={expandedProjectIds.has(project.id)}
                    className="icon-button project-expand"
                    onClick={() => toggleProjectPages(project.id)}
                    title="Dokumentationen ein- oder ausklappen"
                    type="button"
                  >
                    <span aria-hidden="true" className="project-expand-chevron" />
                  </button>
                  <button
                    className="icon-button project-menu-trigger"
                    aria-label={`Menü für ${project.name}`}
                    aria-haspopup="menu"
                    aria-expanded={openProjectMenuId === project.id}
                    onClick={() =>
                      setOpenProjectMenuId((current) =>
                        current === project.id ? null : project.id
                      )
                    }
                    type="button"
                  >
                    ···
                  </button>
                  {openProjectMenuId === project.id && (
                    <div className="project-context-menu" role="menu">
                      <button
                        role="menuitem"
                        onClick={() => openProjectDialog({ mode: 'rename', projectId: project.id })}
                        type="button"
                      >
                        <span>✎</span> Umbenennen
                      </button>
                      <button
                        className="delete-project-action"
                        role="menuitem"
                        onClick={() => openProjectDialog({ mode: 'delete', projectId: project.id })}
                        type="button"
                      >
                        <span>⌫</span> Löschen
                      </button>
                    </div>
                  )}
                </div>
                {expandedProjectIds.has(project.id) && (
                  <div className="project-pages">
                    {renderPageTree(project.id, null)}
                    <button
                      className="page-create-link"
                      onClick={() => void createPage(project.id)}
                      type="button"
                    >
                      <span aria-hidden="true">+</span> Neue Seite
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="user-avatar">{user.username.slice(0, 2).toUpperCase()}</div>
          <div className="user-details">
            <strong>{user.username}</strong>
            <span>Angemeldet</span>
          </div>
          <button
            className="icon-button user-menu"
            aria-label="Abmelden"
            onClick={onLogout}
            title="Abmelden"
            type="button"
          >
            ⇥
          </button>
        </div>
      </aside>

      <section className="main-area" id="board">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Board</span>
            <span className="breadcrumb-divider">/</span>
            <strong>
              {selectedPage?.title ?? activeProject?.name ?? 'Kein Projekt ausgewählt'}
            </strong>
          </div>
        </header>

        <div className="board-content">
          {pageError && (
            <p className="login-error" role="alert">
              {pageError}
            </p>
          )}
          {pagesLoadError && (
            <p className="login-error" role="alert">
              {pagesLoadError}{' '}
              <button type="button" onClick={() => void loadBoard()}>
                Erneut laden
              </button>
            </p>
          )}
          {apiError && (
            <p className="login-error" role="alert">
              {apiError}{' '}
              <button type="button" onClick={() => void loadBoard()}>
                Erneut laden
              </button>
            </p>
          )}
          {isLoading ? (
            <div className="empty-column">Daten werden vom Backend geladen...</div>
          ) : !activeProject && apiError ? (
            <div className="empty-column">Backend-Daten konnten nicht geladen werden.</div>
          ) : !activeProject ? (
            <section className="project-header">
              <div className="project-title-area">
                <h1>Noch keine Projekte</h1>
                <p>Erstelle ein Projekt, um Tickets im Backend zu verwalten.</p>
              </div>
              <div className="project-header-actions">
                <button
                  className="primary-button"
                  onClick={() => openProjectDialog({ mode: 'create' })}
                >
                  <span>+</span> Projekt erstellen
                </button>
              </div>
            </section>
          ) : selectedPage ? (
            <PageEditor
              key={selectedPage.id}
              onCreateChild={(page) => createPage(page.projectId, page.id)}
              onDelete={deletePage}
              onSave={savePage}
              page={selectedPage}
              projectName={activeProject.name}
            />
          ) : (
            <>
              <section className="project-header">
                <div className="project-title-area">
                  <div className="project-title-row">
                    <span className="project-title-mark">
                      {activeProject.name.charAt(0).toUpperCase()}
                    </span>
                    <h1>{activeProject.name}</h1>
                    <span className="private-badge">
                      <span>♢</span> Gemeinsames Board
                    </span>
                  </div>
                  <p>Projekte und Aufgaben werden mit dem Backend synchronisiert.</p>
                </div>
                <div className="project-header-actions">
                  <button className="primary-button" onClick={openTicketCreator}>
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
                  const columnTickets = filteredTickets.filter(
                    (ticket) => ticket.status === column.id
                  )
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
                          onClick={openTicketCreator}
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
                            <div
                              className="ticket-topline"
                              onBlur={(event) => {
                                if (
                                  !event.currentTarget.contains(event.relatedTarget as Node | null)
                                ) {
                                  setOpenTicketMenuId(null)
                                }
                              }}
                            >
                              <span className="ticket-id">{ticket.id}</span>
                              <button
                                className="icon-button ticket-menu"
                                onClick={() =>
                                  setOpenTicketMenuId((current) =>
                                    current === ticket.id ? null : ticket.id
                                  )
                                }
                                aria-label={`Aktionen für Ticket ${ticket.title}`}
                                aria-haspopup="menu"
                                aria-expanded={openTicketMenuId === ticket.id}
                                title="Ticketaktionen"
                                type="button"
                              >
                                ···
                              </button>
                              {openTicketMenuId === ticket.id && (
                                <div className="ticket-context-menu" role="menu">
                                  <button
                                    role="menuitem"
                                    onClick={() => openTicketEditor(ticket)}
                                    type="button"
                                  >
                                    <span aria-hidden="true">✎</span> Bearbeiten
                                  </button>
                                  <button
                                    className="delete-ticket-action"
                                    role="menuitem"
                                    onClick={() => void deleteTicket(ticket.id)}
                                    type="button"
                                  >
                                    <span aria-hidden="true">⌫</span> Löschen
                                  </button>
                                </div>
                              )}
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
                              <span
                                className={`priority priority-${ticket.priority.toLowerCase()}`}
                              >
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
                                    void moveTicket(ticket.id, event.target.value as TicketStatus)
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
                        <button className="add-ticket-inline" onClick={openTicketCreator}>
                          <span>+</span> Ticket hinzufügen
                        </button>
                      </div>
                    </section>
                  )
                })}
              </section>
            </>
          )}
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
                  {pages.some((page) => page.projectId === projectDialog.projectId) &&
                    ' Lösche zuerst die Dokumentationsseiten dieses Projekts.'}
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
                    disabled={isMutating}
                    onClick={() => void deleteProject(projectDialog.projectId)}
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
                    <button type="submit" className="primary-button" disabled={isMutating}>
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
            if (event.target === event.currentTarget) closeTicketDialog()
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
                <span className="modal-eyebrow">{activeProject?.name.toLocaleUpperCase('de')}</span>
                <h2 id="modal-title">{editingTicketId ? 'Ticket bearbeiten' : 'Neues Ticket'}</h2>
              </div>
              <button
                className="icon-button modal-close"
                onClick={closeTicketDialog}
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
                    list="backend-users"
                    required
                    value={ticketAssignee}
                    onChange={(event) => setTicketAssignee(event.target.value)}
                  />
                  <datalist id="backend-users">
                    {users.map((user) => (
                      <option key={user.id} value={user.username} />
                    ))}
                  </datalist>
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
                <button type="button" className="secondary-button" onClick={closeTicketDialog}>
                  Abbrechen
                </button>
                <button type="submit" className="primary-button" disabled={isMutating}>
                  {editingTicketId ? 'Änderungen speichern' : 'Ticket erstellen'}
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
  const [user, setUser] = useState<AuthenticatedUser | null>(null)

  const handleUnauthorized = useCallback(() => {
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized)
    return () => setUnauthorizedHandler(() => {})
  }, [handleUnauthorized])

  const logout = (): void => {
    clearAccessToken()
    setUser(null)
  }

  if (!user) return <Login onAuthenticated={setUser} />
  return <Board key={user.id} user={user} onLogout={logout} />
}

export default App
