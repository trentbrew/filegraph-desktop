/**
 * Agent Tools — Barrel
 *
 * Composes all tool domain files into AGENT_TOOLS and delegates executeToolCall.
 *
 * Domain files:
 *   helpers.ts        — Shared utilities (getVaultPath, readDataFile, EAV store, etc.)
 *   vault-tools.ts    — Entity CRUD, file I/O, TQL graph queries
 *   canvas-tools.ts   — Home canvas nodes, edges, layout, history
 *   ui-tools.ts       — App switching, file preview, layout, panels
 *   shell-tools.ts    — Shell commands, terminal I/O, dev workspaces
 *   calendar-tools.ts — Calendar events (local + Google Calendar)
 *   media-tools.ts    — Vision analysis, image generation
 *   system-tools.ts   — System state, device info, entity traversal
 *   memory-tools.ts   — Long-term agent memory, user profile
 *   search-tools.ts   — Web search, deep research (Gemini-powered)
 *   widget-tools.ts   — Timer, widget enable/disable
 */

// ─────────────────────────────────────────────────────────────────────────────
// Domain imports — definitions
// ─────────────────────────────────────────────────────────────────────────────

import { VAULT_TOOL_DEFINITIONS } from './vault-tools'
import { CANVAS_TOOL_DEFINITIONS } from './canvas-tools'
import { UI_TOOL_DEFINITIONS } from './ui-tools'
import { SHELL_TOOL_DEFINITIONS } from './shell-tools'
import { CALENDAR_TOOL_DEFINITIONS } from './calendar-tools'
import { MEDIA_TOOL_DEFINITIONS } from './media-tools'
import { SYSTEM_TOOL_DEFINITIONS } from './system-tools'
import { MEMORY_TOOL_DEFINITIONS } from './memory-tools'
import { SEARCH_TOOL_DEFINITIONS } from './search-tools'
import { WIDGET_TOOL_DEFINITIONS } from './widget-tools'

// ─────────────────────────────────────────────────────────────────────────────
// Domain imports — handlers
// ─────────────────────────────────────────────────────────────────────────────

import {
  getEntity, listEntities, getBacklinks, searchVault, readFile, writeFile, editFile,
  getVaultStats, getRelatedEntities, readNoteContent, resolveEntity, queryGraph,
} from './vault-tools'
import {
  getHomeCanvas, addHomeNode, removeHomeNode, updateHomeNode, addHomeEdge, removeHomeEdge,
  autoLayoutHomeCanvas, gridLayoutHomeCanvas, alignHomeNodes, distributeHomeNodes,
  createHomeGroup, ungroupHomeNodes, updateHomeNodeContent, editHomeTable,
  undoCanvasAction, redoCanvasAction, getCanvasHistory, focusHomeNode, toggleCanvasFullscreen,
} from './canvas-tools'
import {
  handle_switch_app, handle_preview_file, handle_open_file, handle_navigate_to_directory,
  handle_set_layout_mode, handle_toggle_panel, handle_set_zoom, handle_open_terminal,
  handle_close_editor_tab, handle_set_search, handle_toggle_dotfiles,
} from './ui-tools'
import { runCommand, readTerminalOutput, writeToTerminal, getAvailablePort, setupDevWorkspace, verifyDevProject } from './shell-tools'
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './calendar-tools'
import { analyzeCanvasMedia, generateImage } from './media-tools'
import { getSystemState, getDeviceInfo, exploreEntity } from './system-tools'
import { saveMemory, getMemories, getUserProfile, deleteMemory } from './memory-tools'
import { webSearch, deepResearch } from './search-tools'
import {
  handle_get_timer_state, handle_start_timer, handle_pause_timer, handle_resume_timer,
  handle_stop_timer, handle_get_enabled_widgets, handle_enable_widget, handle_disable_widget,
} from './widget-tools'

// ─────────────────────────────────────────────────────────────────────────────
// Composed tool definitions
// ─────────────────────────────────────────────────────────────────────────────

export const AGENT_TOOLS = [
  ...VAULT_TOOL_DEFINITIONS,
  ...SYSTEM_TOOL_DEFINITIONS,
  ...UI_TOOL_DEFINITIONS,
  ...CANVAS_TOOL_DEFINITIONS,
  ...SEARCH_TOOL_DEFINITIONS,
  ...MEMORY_TOOL_DEFINITIONS,
  ...CALENDAR_TOOL_DEFINITIONS,
  ...WIDGET_TOOL_DEFINITIONS,
  ...MEDIA_TOOL_DEFINITIONS,
  ...SHELL_TOOL_DEFINITIONS,
]

// ─────────────────────────────────────────────────────────────────────────────
// Tool call router
// ─────────────────────────────────────────────────────────────────────────────

export async function executeToolCall(name: string, args: Record<string, any>): Promise<any> {
  switch (name) {
    // ── Vault tools ──────────────────────────────────────────────────────────
    case 'get_entity': return await getEntity(args.entityId)
    case 'list_entities': return await listEntities(args.namespace, args.limit)
    case 'get_backlinks': return await getBacklinks(args.targetId)
    case 'search_vault': return await searchVault(args.query, args.namespace)
    case 'read_file': return await readFile(args.path)
    case 'write_file': return await writeFile(args.path, args.content, args.createDirectories)
    case 'edit_file': return await editFile(args.path, args.old_string, args.new_string, args.replace_all)
    case 'get_vault_stats': return await getVaultStats()
    case 'get_related_entities': return await getRelatedEntities(args.entityId)
    case 'resolve_entity': return await resolveEntity(args.name, args.namespace)
    case 'read_note_content': return await readNoteContent(args.noteId)
    case 'query_graph': return await queryGraph(args as Parameters<typeof queryGraph>[0])
    // ── System tools ─────────────────────────────────────────────────────────
    case 'get_system_state': return getSystemState()
    case 'get_device_info': return await getDeviceInfo()
    case 'explore_entity': return await exploreEntity(args.entityId, args.expand, args.depth, args.filter)
    // ── UI tools ─────────────────────────────────────────────────────────────
    case 'switch_app': return await handle_switch_app(args as any)
    case 'preview_file': return await handle_preview_file(args as any)
    case 'open_file': return await handle_open_file(args as any)
    case 'navigate_to_directory': return await handle_navigate_to_directory(args as any)
    case 'set_layout_mode': return await handle_set_layout_mode(args as any)
    case 'toggle_panel': return await handle_toggle_panel(args as any)
    case 'set_zoom': return await handle_set_zoom(args as any)
    case 'open_terminal': return await handle_open_terminal(args as any)
    case 'close_editor_tab': return await handle_close_editor_tab(args as any)
    case 'set_search': return await handle_set_search(args as any)
    case 'toggle_dotfiles': return await handle_toggle_dotfiles(args as any)
    // ── Canvas tools ─────────────────────────────────────────────────────────
    case 'get_home_canvas': return await getHomeCanvas(args.includeData)
    case 'add_home_node': return await addHomeNode(args.nodeType, args.position, args.label, args.data)
    case 'remove_home_node': return await removeHomeNode(args.nodeId)
    case 'update_home_node': return await updateHomeNode(args.nodeId, args.position, args.dimensions, args.data)
    case 'add_home_edge': return await addHomeEdge(args.sourceId, args.targetId, args.label)
    case 'remove_home_edge': return await removeHomeEdge(args.edgeId, args.sourceId, args.targetId)
    case 'auto_layout_home_canvas': return await autoLayoutHomeCanvas(args.nodeIds, args.direction, args.nodeSpacing, args.rankSpacing)
    case 'grid_layout_home_canvas': return await gridLayoutHomeCanvas(args.nodeIds, args.columns, args.gapX, args.gapY)
    case 'align_home_nodes': return await alignHomeNodes(args.nodeIds, args.alignment)
    case 'distribute_home_nodes': return await distributeHomeNodes(args.nodeIds, args.direction)
    case 'create_home_group': return await createHomeGroup(args.nodeIds, args.label)
    case 'ungroup_home_nodes': return await ungroupHomeNodes(args.groupId)
    case 'update_home_node_content': return await updateHomeNodeContent(args.nodeId, args.content, args.color)
    case 'edit_home_table': return await editHomeTable(args.nodeId, args.operation, args.rowIndex, args.colIndex, args.value, args.header, args.index, args.values)
    case 'undo_canvas_action': return await undoCanvasAction()
    case 'redo_canvas_action': return await redoCanvasAction()
    case 'get_canvas_history': return await getCanvasHistory(args.limit)
    case 'focus_home_node': return await focusHomeNode(args.nodeId, args.nodeType)
    case 'toggle_canvas_fullscreen': return toggleCanvasFullscreen(args.nodeId, args.action)
    // ── Search tools ─────────────────────────────────────────────────────────
    case 'web_search': return await webSearch(args.query)
    case 'deep_research': return await deepResearch(args.query)
    // ── Memory tools ─────────────────────────────────────────────────────────
    case 'save_memory': return await saveMemory(args.content, args.category, args.importance, args.tags)
    case 'get_memories': return await getMemories(args.query, args.category, args.limit)
    case 'get_user_profile': return await getUserProfile()
    case 'delete_memory': return await deleteMemory(args.memoryId)
    // ── Calendar tools ───────────────────────────────────────────────────────
    case 'get_calendar_events': return await getCalendarEvents(args.date, args.startDate, args.endDate, args.includeAllDay)
    case 'create_calendar_event': return await createCalendarEvent(args as any)
    case 'update_calendar_event': return await updateCalendarEvent(args as any)
    case 'delete_calendar_event': return await deleteCalendarEvent(args.eventId)
    // ── Widget tools ─────────────────────────────────────────────────────────
    case 'get_timer_state': return handle_get_timer_state()
    case 'start_timer': return handle_start_timer(args as any)
    case 'pause_timer': return handle_pause_timer()
    case 'resume_timer': return handle_resume_timer()
    case 'stop_timer': return handle_stop_timer()
    case 'get_enabled_widgets': return handle_get_enabled_widgets()
    case 'enable_widget': return handle_enable_widget(args as any)
    case 'disable_widget': return handle_disable_widget(args as any)
    // ── Media tools ──────────────────────────────────────────────────────────
    case 'analyze_canvas_media': return await analyzeCanvasMedia(args.nodeId, args.search, args.prompt)
    case 'generate_image': return await generateImage(args.prompt, args.label, args.model, args.aspectRatio, args.imageSize, args.addToCanvas, args.subdirectory, args.position)
    // ── Shell tools ──────────────────────────────────────────────────────────
    case 'run_command': return await runCommand(args.command, args.cwd, args.timeout)
    case 'read_terminal_output': return await readTerminalOutput(args.nodeId, args.lastNLines)
    case 'write_to_terminal': return await writeToTerminal(args.nodeId, args.command, args.pressEnter)
    case 'get_available_port': return await getAvailablePort()
    case 'setup_dev_workspace': return await setupDevWorkspace(args as any)
    case 'verify_dev_project': return await verifyDevProject(args.projectPath, args.port, args.terminalNodeId)
    // ── Fallback ─────────────────────────────────────────────────────────────
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

// Expose executeToolCall globally for console testing
if (typeof window !== 'undefined') {
  ;(window as any).__agentTools = { executeToolCall }
}
