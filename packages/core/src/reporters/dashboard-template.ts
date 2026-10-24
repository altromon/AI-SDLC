/**
 * AI-SDLC: Dashboard Static Assets (CSS and Client-side JS)
 * Module-level constants isolated to maintain high Maintainability Index across reporters.
 */

export const DASHBOARD_CSS = `
    :root {
      --bg-dark: #0f172a;
      --panel-bg: #1e293b;
      --card-bg: #334155;
      --accent-cyan: #38bdf8;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #ef4444;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border-color: #475569;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: var(--bg-dark); color: var(--text-main); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    
    header { background: var(--panel-bg); border-bottom: 1px solid var(--border-color); padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand h1 { font-size: 1.15rem; font-weight: 700; color: var(--accent-cyan); letter-spacing: -0.025em; }
    .badge { padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge-green { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; }
    .badge-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; }
    .badge-blue { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid #38bdf8; }
    .badge-rose { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; }
    .mode-row { cursor: pointer; transition: background 0.15s; }
    .mode-row:hover { background: rgba(56, 189, 248, 0.08) !important; }
    .accordion-indicator { display: inline-block; transition: transform 0.2s ease; margin-right: 6px; font-size: 0.75rem; color: var(--accent-cyan); }
    .accordion-indicator.open { transform: rotate(90deg); }
    .autonomy-tasks-panel { background: rgba(15, 23, 42, 0.75); }
    .autonomy-tasks-panel > td { padding: 16px 20px !important; border-bottom: 2px solid var(--border-color) !important; }
    .autonomy-tasks-container { display: flex; flex-direction: column; gap: 12px; }
    .autonomy-tasks-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .autonomy-tasks-title { font-weight: 700; font-size: 0.85rem; color: var(--accent-cyan); display: flex; align-items: center; gap: 8px; }
    .filter-btn-group { display: flex; gap: 6px; align-items: center; }
    .filter-btn { background: var(--card-bg); border: 1px solid var(--border-color); color: var(--text-muted); padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
    .filter-btn:hover { color: var(--text-main); background: #475569; }
    .filter-btn.active { background: var(--accent-cyan); color: #0f172a; border-color: var(--accent-cyan); font-weight: 700; }
    .sub-data-table { width: 100%; border-collapse: collapse; background: #0f172a; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color); font-size: 0.8rem; }
    .sub-data-table th, .sub-data-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid rgba(71, 85, 105, 0.4); }
    .sub-data-table th { background: #182234; color: var(--text-muted); font-weight: 700; font-size: 0.72rem; text-transform: uppercase; }
    .sub-data-table tr.task-row { transition: background 0.15s; cursor: pointer; }
    .sub-data-table tr.task-row:hover { background: rgba(56, 189, 248, 0.12) !important; }
    .task-file-link { color: #7dd3fc; text-decoration: underline; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.75rem; }
    .task-file-link:hover { color: #bae6fd; }

    /* Task Details Slide-Over Sidebar */
    .task-sidebar {
      position: fixed;
      top: 0;
      right: -480px;
      width: 460px;
      max-width: 90vw;
      height: 100vh;
      background: var(--panel-bg);
      border-left: 1px solid var(--border-color);
      box-shadow: -8px 0 30px rgba(0, 0, 0, 0.65);
      z-index: 10001;
      display: flex;
      flex-direction: column;
      transition: right 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .task-sidebar.open {
      right: 0;
    }
    .task-sidebar-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #182234;
    }
    .task-sidebar-header h2 {
      font-size: 1rem;
      color: var(--accent-cyan);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .task-sidebar-close {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      border-radius: 4px;
      width: 28px;
      height: 28px;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
    }
    .task-sidebar-close:hover {
      background: #475569;
      color: var(--text-main);
      border-color: var(--accent-cyan);
    }
    .task-sidebar-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .task-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(2px);
      z-index: 10000;
    }

    nav.tabs { display: flex; background: var(--panel-bg); border-bottom: 1px solid var(--border-color); padding: 0 24px; gap: 8px; }
    .tab-btn { background: transparent; border: none; color: var(--text-muted); padding: 10px 16px; font-weight: 600; font-size: 0.875rem; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
    .tab-btn:hover { color: var(--text-main); }
    .tab-btn.active { color: var(--accent-cyan); border-bottom-color: var(--accent-cyan); }

    main { flex: 1; position: relative; overflow: hidden; display: flex; }
    .tab-panel { display: none; width: 100%; height: 100%; overflow: auto; }
    .tab-panel.active { display: flex; }

    /* Cytoscape View */
    #graph-view { position: relative; flex: 1; height: 100%; display: flex; }
    #cy { flex: 1; height: 100%; background: #0b1120; }
    .graph-toolbar { position: absolute; top: 16px; left: 16px; z-index: 10; display: flex; flex-direction: column; gap: 8px; background: rgba(30, 41, 59, 0.85); backdrop-filter: blur(8px); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); box-shadow: 0 8px 16px rgba(0,0,0,0.4); max-width: 300px; }
    .tool-row { display: flex; gap: 6px; align-items: center; }
    .tool-btn { background: var(--card-bg); border: 1px solid var(--border-color); color: var(--text-main); padding: 6px 10px; border-radius: 4px; font-size: 0.75rem; cursor: pointer; font-weight: 600; transition: background 0.2s; }
    .tool-btn:hover { background: #475569; }
    .tool-select, .tool-input { background: var(--card-bg); border: 1px solid var(--border-color); color: var(--text-main); padding: 6px 8px; border-radius: 4px; font-size: 0.75rem; width: 100%; }
    
    .sidebar { width: 340px; background: var(--panel-bg); border-left: 1px solid var(--border-color); padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
    .sidebar h2 { font-size: 1rem; color: var(--accent-cyan); border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
    .sidebar-field { font-size: 0.8rem; line-height: 1.4; }
    .sidebar-field strong { color: var(--text-muted); display: block; font-size: 0.7rem; text-transform: uppercase; margin-bottom: 2px; }
    .sidebar-field pre { background: var(--card-bg); padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 0.75rem; color: #a5f3fc; }

    /* Tables & Cards View */
    .content-container { padding: 24px; width: 100%; max-width: 1300px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
    .grid-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .metric-card { background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px; display: flex; flex-direction: column; gap: 6px; }
    .metric-card .title { font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .metric-card .value { font-size: 1.8rem; font-weight: 800; color: var(--text-main); }
    .metric-card .subtitle { font-size: 0.75rem; color: var(--accent-cyan); }

    .data-table { width: 100%; border-collapse: collapse; background: var(--panel-bg); border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); font-size: 0.85rem; }
    .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border-color); }
    .data-table th { background: #182234; color: var(--text-muted); font-weight: 700; text-transform: uppercase; font-size: 0.75rem; }
    .data-table tr:hover { background: rgba(255,255,255,0.03); }

    /* Timeline & KPI Historical */
    .chart-container { background: var(--panel-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 20px; }
    .chart-container h3 { font-size: 0.9rem; color: var(--accent-cyan); margin-bottom: 16px; }
    
    /* REQUIREMENT HOVER TOOLTIP */
    .req-tooltip {
      position: fixed;
      z-index: 10000;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid var(--accent-cyan);
      border-radius: 6px;
      padding: 8px 12px;
      max-width: 280px;
      font-size: 0.75rem;
      line-height: 1.35;
      color: var(--text-main);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      animation: tooltipFadeIn 0.12s ease-out;
    }

    @keyframes tooltipFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .tooltip-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 3px;
    }

    .tooltip-id {
      font-weight: 700;
      color: var(--accent-cyan);
      font-size: 0.75rem;
      font-family: ui-monospace, SFMono-Regular, monospace;
    }

    .tooltip-title {
      font-size: 0.7rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tooltip-body {
      font-size: 0.7rem;
      color: #cbd5e1;
      max-height: 80px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
    }

    /* GRAPH NODE TYPOLOGIES LEGEND */
    .graph-legend {
      position: absolute;
      bottom: 16px;
      left: 16px;
      z-index: 10;
      background: rgba(30, 41, 59, 0.9);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
      font-size: 0.72rem;
      max-width: 520px;
    }
    .legend-header {
      font-weight: 700;
      text-transform: uppercase;
      color: var(--accent-cyan);
      margin-bottom: 6px;
      font-size: 0.68rem;
      letter-spacing: 0.05em;
    }
    .legend-items {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 12px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #e2e8f0;
      font-size: 0.72rem;
      cursor: pointer;
      user-select: none;
      padding: 3px 6px;
      border-radius: 4px;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .legend-item:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
    }
    .legend-item.active {
      background: rgba(56, 189, 248, 0.2);
      border-color: var(--accent-cyan);
      color: #ffffff;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.35);
    }
    .graph-legend.has-filter .legend-item:not(.active) {
      opacity: 0.45;
    }
    .graph-legend.has-filter .legend-item:not(.active):hover {
      opacity: 0.85;
    }
    .legend-dot {
      width: 12px;
      height: 12px;
      display: inline-block;
      border-radius: 2px;
      flex-shrink: 0;
    }
`;

export const DASHBOARD_CLIENT_SCRIPT = `
    var cy = null;

    function showManual(id) {
      var manual = manualsData.find(function(m) { return m.id === id; });
      var container = document.getElementById('manual-viewer-container');
      if (!manual || !container) return;
      document.getElementById('manual-viewer-title').textContent = manual.id + ' — ' + manual.title;
      document.getElementById('manual-viewer').innerHTML = renderMarkdown(manual.body);
      container.style.display = 'block';
      container.scrollIntoView({ behavior: 'smooth' });
    }

    var reqHoverTimer = null;
    var currentHoverNodeId = null;
    var tableHoverTimer = null;
    var tableHoverId = null;
    var lastMouseX = 0;
    var lastMouseY = 0;

    function renderMarkdown(md) {
      if (!md || !md.trim()) {
        return '<p style="color: var(--text-muted); font-style: italic;">Sin contenido detallado en el cuerpo del requisito.</p>';
      }
      try {
        var text = md
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        // Code blocks (triple backticks)
        var tick = String.fromCharCode(96);
        var codeBlockRe = new RegExp(tick + '{3}([a-z]*)[\\\\r\\\\n]+([\\\\s\\\\S]*?)' + tick + '{3}', 'g');
        text = text.replace(codeBlockRe, function(_, lang, code) {
          return '<pre><code>' + code.trim() + '</code></pre>';
        });

        // Inline code (single backtick)
        var inlineCodeRe = new RegExp(tick + '([^' + tick + ']+)' + tick, 'g');
        text = text.replace(inlineCodeRe, '<code>$1</code>');

        // Headers (h3, h2, h1)
        text = text.replace(/^### (.*$)/gim, '<h4>$1</h4>');
        text = text.replace(/^## (.*$)/gim, '<h3>$1</h3>');
        text = text.replace(/^# (.*$)/gim, '<h2>$1</h2>');

        // Bold & italic
        text = text.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
        text = text.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');

        // Unordered lists
        text = text.replace(/^\\s*[-*]\\s+(.*$)/gim, '<li>$1</li>');
        text = text.replace(/(<li>[\\s\\S]*?<\\/li>(?:\\r?\\n)*)+/g, function(match) {
          return '<ul>' + match + '</ul>';
        });

        // Paragraph line breaks
        text = text.replace(/\\r?\\n\\r?\\n/g, '<br/><br/>');

        return text;
      } catch (err) {
        return '<div style="white-space: pre-wrap; font-family: monospace;">' +
          md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
          '</div>';
      }
    }

    function showTooltip(data, x, y) {
      var tooltip = document.getElementById('req-tooltip');
      if (!tooltip) return;
      document.getElementById('tooltip-id').textContent = data.id;
      document.getElementById('tooltip-title').textContent = data.title || data.label || '';
      var bodyEl = document.getElementById('tooltip-body');
      var desc = data.content ? data.content.trim() : (data.title || data.id) + ' [' + (data.layer || data.type || 'NODE').toUpperCase() + ']';
      bodyEl.textContent = desc;

      tooltip.style.display = 'block';
      positionTooltip(tooltip, x, y);
    }

    function positionTooltip(tooltip, x, y) {
      var pad = 15;
      var left = x + pad;
      var top = y + pad;
      var rect = tooltip.getBoundingClientRect();
      if (left + rect.width > window.innerWidth - 10) {
        left = Math.max(10, x - rect.width - pad);
      }
      if (top + rect.height > window.innerHeight - 10) {
        top = Math.max(10, y - rect.height - pad);
      }
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    }

    function updateTooltipPosition(x, y) {
      var tooltip = document.getElementById('req-tooltip');
      if (tooltip && tooltip.style.display !== 'none') {
        positionTooltip(tooltip, x, y);
      }
    }

    function hideTooltip() {
      var tooltip = document.getElementById('req-tooltip');
      if (tooltip) {
        tooltip.style.display = 'none';
      }
    }

    function startRowTooltip(event, id) {
      tableHoverId = id;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      clearTimeout(tableHoverTimer);
      tableHoverTimer = setTimeout(function() {
        if (tableHoverId === id) {
          var nodeData = null;
          if (cy) {
            var n = cy.getElementById(id);
            if (n && n.length > 0) nodeData = n.data();
          }
          if (!nodeData) {
            var el = elements.find(function(e) { return e.data && e.data.id === id; });
            if (el) nodeData = el.data;
          }
          if (nodeData) {
            showTooltip(nodeData, lastMouseX, lastMouseY);
          }
        }
      }, 1000);
    }

    function updateRowTooltipPos(event) {
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      updateTooltipPosition(lastMouseX, lastMouseY);
    }

    function cancelRowTooltip() {
      clearTimeout(tableHoverTimer);
      tableHoverId = null;
      hideTooltip();
    }

    function initCytoscape() {
      if (typeof cytoscape === 'undefined') {
        console.error('Cytoscape library not loaded');
        return;
      }
      try {
        var validNodeIds = new Set();
        (elements || []).forEach(function(el) {
          if (el && el.group === 'nodes' && el.data && el.data.id) {
            validNodeIds.add(el.data.id);
          }
        });
        var safeElements = (elements || []).filter(function(el) {
          if (!el || !el.data) return false;
          if (el.group === 'edges') {
            return validNodeIds.has(el.data.source) && validNodeIds.has(el.data.target);
          }
          return true;
        });

        cy = cytoscape({
          container: document.getElementById('cy'),
          elements: safeElements,
        boxSelectionEnabled: false,
        autoungrabify: true,
        style: [
          {
            selector: 'node',
            style: {
              'label': 'data(label)',
              'color': '#f8fafc',
              'font-size': '10px',
              'text-valign': 'center',
              'text-halign': 'center',
              'width': 65,
              'height': 35,
              'background-color': '#1e293b',
              'border-width': 2,
              'border-color': '#64748b',
              'text-wrap': 'ellipsis',
              'text-max-width': '65px'
            }
          },
          {
            selector: 'node.layer-product',
            style: { 'shape': 'diamond', 'background-color': '#0e7490', 'border-color': '#38bdf8', 'width': 50, 'height': 50 }
          },
          {
            selector: 'node.layer-architecture',
            style: { 'shape': 'hexagon', 'background-color': '#4338ca', 'border-color': '#818cf8', 'width': 60, 'height': 45 }
          },
          {
            selector: 'node.type-architecture-introduction',
            style: {
              'shape': 'round-rectangle',
              'background-color': '#0f766e',
              'border-color': '#2dd4bf',
              'border-width': 3,
              'width': 92,
              'height': 44,
              'font-weight': 'bold',
              'text-max-width': '86px'
            }
          },
          {
            selector: 'node.type-journey',
            style: {
              'shape': 'round-rectangle',
              'background-color': '#581c87',
              'border-color': '#c084fc',
              'border-width': 3,
              'width': 85,
              'height': 42,
              'font-weight': 'bold',
              'text-max-width': '80px'
            }
          },
          {
            selector: 'node.type-actor',
            style: {
              'shape': 'ellipse',
              'background-color': '#065f46',
              'border-color': '#34d399',
              'border-width': 2.5,
              'width': 54,
              'height': 54,
              'font-weight': 'bold'
            }
          },
          {
            selector: 'node.type-threat-actor',
            style: {
              'shape': 'ellipse',
              'background-color': '#4c0519',
              'border-color': '#fb7185',
              'border-width': 2.5,
              'border-style': 'dashed',
              'width': 54,
              'height': 54
            }
          },
          {
            selector: 'node.type-usecase, node.type-use-case',
            style: {
              'shape': 'round-rectangle',
              'background-color': '#0369a1',
              'border-color': '#38bdf8',
              'border-width': 2,
              'width': 70,
              'height': 38
            }
          },
          {
            selector: 'node.type-rule, node.type-business-rule',
            style: {
              'shape': 'diamond',
              'background-color': '#b45309',
              'border-color': '#fbbf24',
              'border-width': 2,
              'width': 58,
              'height': 58
            }
          },
          {
            selector: 'node.type-abuse-case',
            style: {
              'shape': 'octagon',
              'background-color': '#881337',
              'border-color': '#f43f5e',
              'border-width': 2.5,
              'width': 64,
              'height': 46
            }
          },
          {
            selector: 'node.type-data-asset',
            style: {
              'shape': 'barrel',
              'background-color': '#134e4a',
              'border-color': '#5eead4',
              'border-width': 2.5,
              'width': 68,
              'height': 42
            }
          },
          {
            selector: 'node.type-privacy-ropa',
            style: {
              'shape': 'round-rectangle',
              'background-color': '#1e3a8a',
              'border-color': '#60a5fa',
              'border-width': 2.5,
              'width': 72,
              'height': 40
            }
          },
          {
            selector: 'node.type-bounded-context',
            style: {
              'shape': 'round-rectangle',
              'background-color': '#4338ca',
              'border-color': '#a5b4fc',
              'border-width': 2.5,
              'width': 75,
              'height': 42,
              'font-weight': 'bold',
              'text-max-width': '70px'
            }
          },
          {
            selector: 'node.type-security-enclave',
            style: {
              'shape': 'hexagon',
              'background-color': '#3b0764',
              'border-color': '#a855f7',
              'border-width': 2,
              'width': 65,
              'height': 45
            }
          },
          {
            selector: 'node.type-requirement, node.type-security-requirement, node.type-privacy-requirement',
            style: {
              'shape': 'round-rectangle',
              'background-color': '#1e293b',
              'border-color': '#64748b',
              'border-width': 2.5,
              'width': 68,
              'height': 36
            }
          },
          {
            selector: 'node.type-component, node.type-adr',
            style: {
              'shape': 'hexagon',
              'background-color': '#312e81',
              'border-color': '#818cf8',
              'border-width': 2,
              'width': 60,
              'height': 45
            }
          },
          {
            selector: 'node.type-bdd-feature, node.type-code-test, node.layer-test',
            style: {
              'shape': 'round-rectangle',
              'background-color': '#047857',
              'border-color': '#10b981',
              'border-width': 2,
              'width': 65,
              'height': 32
            }
          },
          {
            selector: 'node.status-conforme, node.status-compliant',
            style: { 'border-color': '#10b981' }
          },
          {
            selector: 'node.status-orphan, node.status-drift, node.status-huerfano',
            style: { 'border-color': '#ef4444', 'background-color': '#7f1d1d' }
          },
          {
            selector: 'edge',
            style: {
              'width': 1.5,
              'line-color': '#475569',
              'target-arrow-color': '#475569',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'arrow-scale': 0.8
            }
          },
          {
            selector: 'edge.relation-identifies, edge.relation-envisions, edge.relation-defines-goal',
            style: { 'line-color': '#2dd4bf', 'target-arrow-color': '#2dd4bf', 'width': 2 }
          },
          {
            selector: 'edge.relation-pursues',
            style: { 'line-color': '#c084fc', 'target-arrow-color': '#c084fc', 'width': 2 }
          },
          {
            selector: 'edge.relation-decomposes-into',
            style: { 'line-color': '#a855f7', 'target-arrow-color': '#a855f7', 'width': 2 }
          },
          {
            selector: 'edge.relation-initiates',
            style: { 'line-color': '#34d399', 'target-arrow-color': '#34d399', 'width': 1.8 }
          },
          {
            selector: 'edge.relation-governs',
            style: { 'line-color': '#fbbf24', 'target-arrow-color': '#fbbf24', 'line-style': 'dashed', 'width': 1.8 }
          },
          {
            selector: 'edge.relation-mitigated-by, edge.relation-mitigates',
            style: { 'line-color': '#f43f5e', 'target-arrow-color': '#f43f5e', 'line-style': 'dashed', 'width': 1.8 }
          },
          {
            selector: 'edge.relation-threatens',
            style: { 'line-color': '#e11d48', 'target-arrow-color': '#e11d48', 'line-style': 'dotted', 'width': 2 }
          },
          {
            selector: 'edge.relation-derives-from',
            style: { 'line-color': '#38bdf8', 'target-arrow-color': '#38bdf8', 'width': 1.8 }
          },
          {
            selector: 'edge.relation-satisfies',
            style: { 'line-color': '#818cf8', 'target-arrow-color': '#818cf8', 'width': 1.8 }
          },
          {
            selector: 'edge.relation-verified-by',
            style: { 'line-color': '#10b981', 'target-arrow-color': '#10b981', 'width': 1.8 }
          },
          {
            selector: 'edge.relation-encompasses',
            style: { 'line-color': '#a5b4fc', 'target-arrow-color': '#a5b4fc', 'width': 2 }
          },
          {
            selector: 'edge.relation-depends-on',
            style: { 'line-color': '#c084fc', 'target-arrow-color': '#c084fc', 'line-style': 'dashed', 'width': 1.8 }
          },
          {
            selector: 'node.highlighted',
            style: {
              'border-width': 4,
              'border-color': '#38bdf8',
              'underlay-color': '#38bdf8',
              'underlay-padding': 4,
              'underlay-opacity': 0.4
            }
          },
          {
            selector: 'edge.highlighted',
            style: {
              'line-color': '#38bdf8',
              'target-arrow-color': '#38bdf8',
              'width': 3,
              'z-index': 99
            }
          },
          {
            selector: 'node.dimmed, edge.dimmed',
            style: {
              'opacity': 0.15
            }
          }
        ],
        layout: {
          name: 'breadthfirst',
          directed: true,
          padding: 30,
          spacingFactor: 1.25
        }
      });

      cy.on('tap', 'node', function(evt) {
        var node = evt.target;
        var data = node.data();
        highlightCriticalPath(node);
        showNodeDetails(data);
      });

      cy.on('tap', function(evt) {
        if (evt.target === cy) {
          resetHighlight();
        }
      });

      cy.on('mouseover', 'node', function(evt) {
        var node = evt.target;
        var data = node.data();

        currentHoverNodeId = data.id;
        clearTimeout(reqHoverTimer);

        var rect = document.getElementById('cy').getBoundingClientRect();
        var clientX = (evt.originalEvent && evt.originalEvent.clientX) || (rect.left + evt.renderedPosition.x);
        var clientY = (evt.originalEvent && evt.originalEvent.clientY) || (rect.top + evt.renderedPosition.y);

        reqHoverTimer = setTimeout(function() {
          if (currentHoverNodeId === data.id) {
            showTooltip(data, clientX, clientY);
          }
        }, 1000);
      });

      cy.on('mousemove', 'node', function(evt) {
        if (evt.originalEvent) {
          updateTooltipPosition(evt.originalEvent.clientX, evt.originalEvent.clientY);
        }
      });

      cy.on('mouseout', 'node', function(evt) {
        clearTimeout(reqHoverTimer);
        currentHoverNodeId = null;
        hideTooltip();
      });
    } catch (err) {
      console.error('Error initializing Cytoscape:', err);
    }
  }

    function highlightCriticalPath(node) {
      cy.elements().removeClass('highlighted dimmed');
      var predecessors = node.predecessors();
      var successors = node.successors();
      var criticalPath = node.union(predecessors).union(successors);
      
      criticalPath.addClass('highlighted');
      cy.elements().difference(criticalPath).addClass('dimmed');
    }

    function resetHighlight() {
      if (!cy) return;
      cy.elements().removeClass('highlighted dimmed');
      var sidebar = document.getElementById('sidebar-content');
      sidebar.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">Click on any graph node to inspect its critical path and full traceability.</p>';
    }

    function showNodeDetails(data) {
      try {
        var sidebar = document.getElementById('sidebar-content');
        if (!sidebar) return;
        var isConform = data.status === 'COMPLIANT' || data.status === 'CONFORME';
        var typeName = (data.type || data.layer || 'node').toLowerCase();
        var typeBadgeColor = '#334155';
        var typeTitle = (data.type || data.layer || 'NODE').toUpperCase();
        var typologyKey = 'requirement';
        if (typeName === 'architecture-introduction') {
          typeBadgeColor = '#0f766e';
          typeTitle = 'VISION & GOALS (ARCH-INTRO)';
          typologyKey = 'architecture-introduction';
        } else if (typeName === 'journey') {
          typeBadgeColor = '#581c87';
          typeTitle = 'JOURNEY (JRN)';
          typologyKey = 'journey';
        } else if (typeName === 'actor') {
          typeBadgeColor = '#065f46';
          typeTitle = 'ACTOR (ACT)';
          typologyKey = 'actor';
        } else if (typeName === 'threat-actor') {
          typeBadgeColor = '#4c0519';
          typeTitle = 'THREAT ACTOR (ACT-THREAT)';
          typologyKey = 'actor';
        } else if (typeName === 'use-case' || typeName === 'usecase') {
          typeBadgeColor = '#0369a1';
          typeTitle = 'USE CASE (UC)';
          typologyKey = 'use-case';
        } else if (typeName === 'business-rule' || typeName === 'rule') {
          typeBadgeColor = '#b45309';
          typeTitle = 'BUSINESS RULE (BR)';
          typologyKey = 'business-rule';
        } else if (typeName === 'abuse-case') {
          typeBadgeColor = '#881337';
          typeTitle = 'ABUSE CASE (ABUSE)';
          typologyKey = 'abuse-case';
        } else if (typeName === 'data-asset') {
          typeBadgeColor = '#134e4a';
          typeTitle = 'DATA ASSET (DATA-ASSET)';
          typologyKey = 'data-asset';
        } else if (typeName === 'privacy-ropa') {
          typeBadgeColor = '#1e3a8a';
          typeTitle = 'PRIVACY ROPA (PRIV-ROPA)';
          typologyKey = 'privacy-ropa';
        } else if (typeName === 'requirement' || typeName === 'security-requirement' || typeName === 'privacy-requirement') {
          typeBadgeColor = '#1e293b';
          typeTitle = 'REQUIREMENT (' + (data.id.split('-')[0] || 'REQ') + ')';
          typologyKey = 'requirement';
        } else if (typeName === 'component' || typeName === 'adr' || typeName === 'security-enclave') {
          typeBadgeColor = '#312e81';
          typeTitle = 'ARCHITECTURE (' + (data.id.split('-')[0] || 'ARCH') + ')';
          typologyKey = 'architecture';
        } else if (typeName === 'bdd-feature' || typeName === 'code-test') {
          typeBadgeColor = '#047857';
          typeTitle = 'TEST VERIFICATION';
          typologyKey = 'test';
        }

        var html = '<div class="sidebar-field"><strong>ID / Identifier:</strong> <code>' + data.id + '</code></div>';
        html += '<div class="sidebar-field"><strong>Title:</strong> ' + (data.title || data.label || data.id) + '</div>';
        html += '<div class="sidebar-field"><strong>Typology:</strong> <span class="badge" onclick="handleTypologyClick(event, \\'' + typologyKey + '\\')" title="Click to filter by ' + typologyKey + ' (Ctrl+Click for multi)" style="background:' + typeBadgeColor + '; border:1px solid rgba(255,255,255,0.2); cursor:pointer;">' + typeTitle + '</span></div>';
        html += '<div class="sidebar-field"><strong>Status:</strong> <span class="badge ' + (isConform ? 'badge-green' : 'badge-amber') + '">' + (data.status || 'UNKNOWN') + '</span></div>';
        if (data.filePath) {
          var cleanMetaPath = data.filePath.split('\\\\').join('/');
          if (cleanMetaPath.indexOf('./') === 0) cleanMetaPath = cleanMetaPath.substring(2);
          var metaHref = (cleanMetaPath.indexOf('http://') === 0 || cleanMetaPath.indexOf('https://') === 0 || cleanMetaPath.indexOf('file://') === 0) ? cleanMetaPath : '../' + cleanMetaPath;
          html += '<div class="sidebar-field"><strong>Physical File:</strong> <a href="' + metaHref + '" target="_blank" rel="noopener noreferrer" style="color: #7dd3fc; text-decoration: underline;" title="Open file: ' + cleanMetaPath + '"><code>' + cleanMetaPath + ' ↗</code></a></div>';
        }
        if (data.upstream && data.upstream.length > 0) {
          html += '<div class="sidebar-field"><strong>Upstream Traces (Product):</strong> ' + data.upstream.join(', ') + '</div>';
        }
        if (data.downstream && data.downstream.length > 0) {
          html += '<div class="sidebar-field"><strong>Downstream Traces (Arch/Test):</strong> ' + data.downstream.join(', ') + '</div>';
        }
        if (data.content && data.content.trim()) {
          html += '<div class="sidebar-field" style="margin-top: 4px;"><strong>File Content / Specification:</strong>';
          html += '<div class="sidebar-content-preview" style="margin-top: 6px; max-height: 280px; overflow-y: auto; background: rgba(11, 17, 32, 0.75); padding: 10px 12px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.74rem; line-height: 1.45; color: #cbd5e1;">';
          html += renderMarkdown(data.content);
          html += '</div></div>';
        }
        sidebar.innerHTML = html;
      } catch (err) {
        console.error('Error showing node details:', err);
      }
    }

    function applyLayout(name) {
      if (!cy) return;
      cy.layout({ name: name, directed: true, padding: 30, animate: true, animationDuration: 400 }).run();
    }

    var TYPOLOGY_SELECTORS = {
      'architecture-introduction': '.type-architecture-introduction',
      'journey': '.type-journey',
      'actor': '.type-actor, .type-threat-actor',
      'use-case': '.type-use-case, .type-usecase',
      'business-rule': '.type-business-rule, .type-rule',
      'bounded-context': '.type-bounded-context',
      'abuse-case': '.type-abuse-case, .type-threat-actor',
      'data-asset': '.type-data-asset',
      'privacy-ropa': '.type-privacy-ropa',
      'requirement': '.type-requirement, .type-security-requirement, .type-privacy-requirement, .layer-requirement',
      'architecture': '.type-component, .type-adr, .type-security-enclave, .layer-architecture',
      'test': '.type-bdd-feature, .type-code-test, .layer-test'
    };

    var activeTypologies = new Set();

    function handleTypologyClick(evt, type) {
      var isMulti = evt && (evt.ctrlKey || evt.metaKey);
      if (isMulti) {
        if (activeTypologies.has(type)) {
          activeTypologies.delete(type);
        } else {
          activeTypologies.add(type);
        }
      } else {
        if (activeTypologies.has(type)) {
          activeTypologies.delete(type);
        } else {
          activeTypologies.clear();
          activeTypologies.add(type);
        }
      }
      applyTypologyFilter();
    }

    function applyTypologyFilter() {
      if (!cy) return;
      var legendEl = document.querySelector('.graph-legend');
      var legendItems = document.querySelectorAll('.legend-item');
      var typeSelect = document.getElementById('type-filter');

      if (activeTypologies.size === 0) {
        if (legendEl) legendEl.classList.remove('has-filter');
        legendItems.forEach(function(item) { item.classList.remove('active'); });
        if (typeSelect) typeSelect.value = 'all';
        cy.elements().show();
      } else {
        if (legendEl) legendEl.classList.add('has-filter');
        legendItems.forEach(function(item) {
          var t = item.getAttribute('data-type');
          if (t && activeTypologies.has(t)) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });

        if (typeSelect) {
          if (activeTypologies.size === 1) {
            var single = Array.from(activeTypologies)[0];
            typeSelect.value = single;
          } else {
            typeSelect.value = 'all';
          }
        }

        var selectors = [];
        activeTypologies.forEach(function(t) {
          selectors.push(TYPOLOGY_SELECTORS[t] || ('.type-' + t));
        });
        var matchedNodes = cy.nodes(selectors.join(', '));
        cy.elements().hide();
        matchedNodes.show();
        matchedNodes.edgesWith(matchedNodes).show();
      }
      cy.fit(30);
    }

    function filterType(type) {
      if (!cy) return;
      if (type === 'all') {
        activeTypologies.clear();
      } else {
        activeTypologies.clear();
        activeTypologies.add(type);
      }
      applyTypologyFilter();
    }

    function filterLayer(layer) {
      if (!cy) return;
      if (layer === 'all') {
        cy.elements().show();
      } else {
        cy.elements().hide();
        var nodes = cy.nodes('.layer-' + layer);
        nodes.show();
        nodes.connectedEdges().show();
      }
      cy.fit(30);
    }

    function filterStatus(status) {
      if (!cy) return;
      if (status === 'all') {
        cy.elements().show();
      } else if (status === 'COMPLIANT' || status === 'CONFORME') {
        cy.elements().hide();
        var nodes = cy.nodes('.status-compliant, .status-conforme');
        nodes.show();
        nodes.connectedEdges().show();
      } else {
        cy.elements().hide();
        var nodes = cy.nodes('.status-orphan, .status-huerfano, .status-drift');
        nodes.show();
        nodes.connectedEdges().show();
      }
      cy.fit(30);
    }

    function searchNode(text) {
      if (!cy) return;
      if (!text || text.trim() === '') {
        resetHighlight();
        return;
      }
      var q = text.trim().toLowerCase();
      var matched = cy.nodes().filter(function(ele) {
        return ele.data('id').toLowerCase().includes(q) || (ele.data('title') && ele.data('title').toLowerCase().includes(q));
      });
      if (matched.length > 0) {
        highlightCriticalPath(matched[0]);
        showNodeDetails(matched[0].data());
        cy.center(matched[0]);
      }
    }

    function focusNode(id) {
      cancelRowTooltip();
      switchTab('graph');
      setTimeout(function() {
        if (!cy) return;
        var node = cy.getElementById(id);
        if (node && node.length > 0) {
          highlightCriticalPath(node);
          showNodeDetails(node.data());
          cy.center(node);
          cy.zoom(1.2);
        }
      }, 100);
    }

    function cyZoom(val) {
      if (!cy) return;
      cy.zoom(cy.zoom() + val);
    }

    function switchTab(name) {
      hideTooltip();
      document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('onclick') === "switchTab('" + name + "')");
      });
      document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
      var p = document.getElementById('tab-' + name);
      if (p) p.classList.add('active');
      if (name === 'graph' && cy) {
        cy.resize();
        cy.fit(30);
      }
    }

    function toggleAutonomyTasks(mode) {
      var panel = document.getElementById('tasks-row-' + mode);
      var icon = document.getElementById('toggle-icon-' + mode);
      if (!panel) return;
      var isHidden = panel.style.display === 'none' || panel.style.display === '';
      if (isHidden) {
        panel.style.display = 'table-row';
        if (icon) icon.classList.add('open');
      } else {
        panel.style.display = 'none';
        if (icon) icon.classList.remove('open');
      }
    }

    function filterAutonomyTasks(mode, filter, event) {
      if (event) {
        event.stopPropagation();
      }
      var panel = document.getElementById('tasks-row-' + mode);
      if (!panel) return;

      var btns = panel.querySelectorAll('.filter-btn');
      btns.forEach(function(b) { b.classList.remove('active'); });
      var activeBtn = document.getElementById('btn-filter-' + mode + '-' + filter);
      if (activeBtn) activeBtn.classList.add('active');

      var allRows = panel.querySelectorAll('.task-item');
      var visibleCount = 0;
      allRows.forEach(function(row) {
        if (filter === 'all') {
          row.style.display = '';
          visibleCount++;
        } else if (filter === 'open') {
          if (row.classList.contains('task-item-open')) {
            row.style.display = '';
            visibleCount++;
          } else {
            row.style.display = 'none';
          }
        } else if (filter === 'closed') {
          if (row.classList.contains('task-item-closed')) {
            row.style.display = '';
            visibleCount++;
          } else {
            row.style.display = 'none';
          }
        }
      });

      var tableEl = panel.querySelector('.sub-data-table');
      var emptyMsg = document.getElementById('tasks-empty-' + mode);
      if (emptyMsg) {
        if (visibleCount === 0) {
          emptyMsg.textContent = filter === 'open'
            ? 'No hay tareas abiertas para este modo.'
            : (filter === 'closed' ? 'No hay tareas cerradas para este modo.' : 'No hay tareas registradas para este modo.');
          emptyMsg.style.display = 'block';
          if (tableEl) tableEl.style.display = 'none';
        } else {
          emptyMsg.style.display = 'none';
          if (tableEl) tableEl.style.display = 'table';
        }
      }
    }

    function showTaskSidebar(index) {
      if (typeof govTasks === 'undefined' || !govTasks[index]) return;
      var t = govTasks[index];
      var task = t.task || {};
      var sidebar = document.getElementById('task-sidebar');
      var backdrop = document.getElementById('task-backdrop');
      var contentEl = document.getElementById('task-sidebar-content');
      if (!sidebar || !contentEl) return;

      var rawStatus = (task.status || 'PENDING').toUpperCase();
      var isClosed = rawStatus === 'COMPLETED';
      var badgeClass = 'badge-amber';
      var badgeText = rawStatus + ' (Abierta)';
      if (rawStatus === 'COMPLETED') {
        badgeClass = 'badge-green';
        badgeText = 'COMPLETED (Cerrada)';
      } else if (rawStatus === 'IN_PROGRESS') {
        badgeClass = 'badge-blue';
        badgeText = 'IN_PROGRESS (Abierta)';
      } else if (rawStatus === 'BLOCKED') {
        badgeClass = 'badge-rose';
        badgeText = 'BLOCKED (Abierta)';
      }

      var cleanPath = (t.file || '').split(String.fromCharCode(92)).join('/');
      if (cleanPath.indexOf('./') === 0) cleanPath = cleanPath.substring(2);
      var metaHref = cleanPath;
      if (cleanPath.indexOf('http://') === 0 || cleanPath.indexOf('https://') === 0 || cleanPath.indexOf('file://') === 0) {
        metaHref = cleanPath;
      } else if (cleanPath.indexOf(':') === 1 || cleanPath.indexOf('/') === 0) {
        metaHref = 'file:///' + cleanPath.replace(/^[/]+/, '');
      } else {
        metaHref = '../' + cleanPath;
      }

      var html = '';
      html += '<div class="sidebar-field"><strong>ID de la Tarea:</strong> <code style="font-size: 0.95rem; color: var(--accent-cyan); font-weight: 700;">' + (task.id || 'TSK-UNKNOWN') + '</code></div>';
      html += '<div class="sidebar-field"><strong>Título:</strong> <span style="font-size: 0.9rem; font-weight: 600; color: var(--text-main);">' + (task.title || 'Sin título') + '</span></div>';
      html += '<div class="sidebar-field"><strong>Estado:</strong> <span class="badge ' + badgeClass + '">' + badgeText + '</span></div>';
      html += '<div class="sidebar-field"><strong>Modo de Autonomía:</strong> <code>' + (task.autonomyMode || 'UNKNOWN') + '</code></div>';
      if (task.riskLevel) {
        html += '<div class="sidebar-field"><strong>Nivel de Riesgo:</strong> <span class="badge" style="background:#334155;">' + task.riskLevel + '</span></div>';
      }
      if (task.complexity) {
        html += '<div class="sidebar-field"><strong>Complejidad:</strong> <span class="badge" style="background:#334155;">' + task.complexity + '</span></div>';
      }
      html += '<div class="sidebar-field"><strong>Asignada a:</strong> <code>' + (task.assignedTo || 'agent-developer') + '</code></div>';

      var criteria = (task.verification && task.verification.criteria) || 'No especificado';
      var method = (task.verification && task.verification.method) || 'N/A';
      html += '<div class="sidebar-field"><strong>Método de Verificación:</strong> <code>' + method + '</code></div>';
      html += '<div class="sidebar-field"><strong>Criterio / Comando de Aceptación:</strong><pre><code>' + criteria + '</code></pre></div>';

      if (task.blockingReason) {
        html += '<div class="sidebar-field"><strong style="color: var(--accent-rose);">Motivo de Bloqueo:</strong> <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid var(--accent-rose); border-radius: 4px; padding: 8px; color: #fca5a5;">' + task.blockingReason + '</div></div>';
      }

      html += '<div class="sidebar-field"><strong>Gobernanza y Validación:</strong>';
      html += '<div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px; font-size: 0.75rem;">';
      html += '<div>Verificación ejecutable: ' + (t.hasVerification ? '✅ Sí' : '❌ Falta') + '</div>';
      html += '<div>Modo de autonomía válido: ' + (t.validAutonomy ? '✅ Sí' : '⚠️ Inválido') + '</div>';
      html += '<div>Anomalías de seguridad/riesgo: ' + (t.riskAnomaly ? '⚠️ Detectadas' : '✅ Ninguna') + '</div>';
      html += '</div></div>';

      html += '<div class="sidebar-field" style="margin-top: 8px; border-top: 1px solid var(--border-color); padding-top: 12px;"><strong>Fichero de Especificación (.md):</strong>';
      html += '<div style="margin-top: 4px;"><a href="' + metaHref + '" target="_blank" rel="noopener noreferrer" style="color: #7dd3fc; text-decoration: underline; font-family: monospace; font-size: 0.8rem;" title="Abrir archivo original"><code>' + cleanPath + ' ↗</code></a></div>';
      html += '</div>';

      contentEl.innerHTML = html;
      sidebar.classList.add('open');
      if (backdrop) backdrop.style.display = 'block';
    }

    function filterTelemetryByBranch(branchKey) {
      if (typeof telemetryData === 'undefined' || !telemetryData) return;
      var data = telemetryData[branchKey] || null;
      if (!data) return;

      var isTotal = branchKey === '__total__';
      var label = isTotal ? 'Totalizador' : branchKey;
      var badgeText = isTotal ? 'Vista: Totalizador Global' : ('Rama: ' + branchKey);

      var cardBranchLabel = document.getElementById('card-branch-label');
      if (cardBranchLabel) cardBranchLabel.textContent = label;

      var tableBranchLabel = document.getElementById('table-branch-label');
      if (tableBranchLabel) tableBranchLabel.textContent = isTotal ? 'Totalizador (Todas las ramas)' : branchKey;

      var badgeElem = document.getElementById('telemetry-badge-container');
      if (badgeElem) {
        badgeElem.innerHTML = '<span class="badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid #38bdf8; font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 4px;">' + badgeText + '</span>';
      }

      var elCommits = document.getElementById('card-commits');
      if (elCommits) elCommits.textContent = data.totalCommits;
      var elLines = document.getElementById('card-lines');
      if (elLines) elLines.textContent = '+' + data.linesAdded + ' / -' + data.linesDeleted + ' lines';

      var elTime = document.getElementById('card-time');
      if (elTime) elTime.textContent = Math.round(data.totalActiveTimeSeconds / 60) + 'm';
      var elTimeSec = document.getElementById('card-time-seconds');
      if (elTimeSec) elTimeSec.textContent = data.totalActiveTimeSeconds + 's accumulated';

      var elTokens = document.getElementById('card-tokens');
      if (elTokens) elTokens.textContent = Number(data.totalTokens).toLocaleString('en-US');
      var elTokensDetail = document.getElementById('card-tokens-detail');
      if (elTokensDetail) elTokensDetail.textContent = 'In: ' + Number(data.totalPromptTokens).toLocaleString('en-US') + ' | Out: ' + Number(data.totalCompletionTokens).toLocaleString('en-US');

      var elCost = document.getElementById('card-cost');
      if (elCost) elCost.textContent = '$' + Number(data.estimatedCostUsd).toFixed(2);

      var tbody = document.getElementById('telemetry-table-tbody');
      if (tbody) {
        var html = '';
        if (data.humanSummary && data.humanSummary.commits > 0) {
          html += '<tr>' +
            '<td><strong>Human (Developer)</strong></td>' +
            '<td><span class="badge" style="background:#334155;">HUMAN</span></td>' +
            '<td>' + data.humanSummary.commits + '</td>' +
            '<td>+' + data.humanSummary.linesAdded + ' / -' + data.humanSummary.linesDeleted + '</td>' +
            '<td>' + Math.round(data.humanSummary.activeTimeSeconds / 60) + 'm</td>' +
            '<td>0</td><td>—</td>' +
            '</tr>';
        }
        if (data.byModel) {
          var models = Object.keys(data.byModel);
          for (var i = 0; i < models.length; i++) {
            var m = models[i];
            var summary = data.byModel[m];
            var safeModel = String(m).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += '<tr>' +
              '<td><strong><code>' + safeModel + '</code></strong></td>' +
              '<td><span class="badge badge-green">AGENT</span></td>' +
              '<td>' + summary.commits + '</td>' +
              '<td>+' + summary.linesAdded + ' / -' + summary.linesDeleted + '</td>' +
              '<td>' + Math.round(summary.activeTimeSeconds / 60) + 'm</td>' +
              '<td>' + (summary.promptTokens + summary.completionTokens).toLocaleString('en-US') + '</td>' +
              '<td>$' + Number(summary.estimatedCostUsd).toFixed(2) + '</td>' +
              '</tr>';
          }
        }
        html += '<tr style="font-weight: bold; background: rgba(255,255,255,0.05);">' +
          '<td>' + (isTotal ? 'TOTAL REPOSITORIO' : 'TOTAL RAMA') + '</td><td>—</td>' +
          '<td>' + data.totalCommits + '</td>' +
          '<td>+' + data.linesAdded + ' / -' + data.linesDeleted + '</td>' +
          '<td>' + Math.round(data.totalActiveTimeSeconds / 60) + 'm</td>' +
          '<td>' + Number(data.totalTokens).toLocaleString('en-US') + '</td>' +
          '<td>$' + Number(data.estimatedCostUsd).toFixed(2) + ' USD</td>' +
          '</tr>';
        tbody.innerHTML = html;
      }
    }

    function closeTaskSidebar() {
      var sidebar = document.getElementById('task-sidebar');
      var backdrop = document.getElementById('task-backdrop');
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.style.display = 'none';
    }

    window.addEventListener('keydown', function(evt) {
      if (evt.key === 'Escape' || evt.key === 'Esc') {
        hideTooltip();
        closeTaskSidebar();
      }
    });

    window.addEventListener('DOMContentLoaded', function() {
      initCytoscape();
    });
`;
