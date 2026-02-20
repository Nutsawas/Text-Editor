/**
 * Notion-style Text Editor
 * - พิมพ์ # แล้ว space = H1, ## = H2, ### = H3
 * - พิมพ์ / แล้วเลือกคำสั่ง (code, table, ...)
 * - สร้างตารางและ code block ได้
 */

let blocksContainer = document.getElementById('blocks');
let slashMenu = document.getElementById('slash-menu');
let blockMenu = document.getElementById('block-menu');
let blockIdCounter = 2;
let currentSlashBlock = null;
let slashMenuIndex = 0;
let currentBlockMenuBlock = null;
let editorLocked = false;

function ensureDomRefs() {
  if (!blocksContainer) blocksContainer = document.getElementById('blocks');
  if (!slashMenu) slashMenu = document.getElementById('slash-menu');
  if (!blockMenu) blockMenu = document.getElementById('block-menu');
  return !!blocksContainer;
}

// ========== Block creation ==========
function createBlock(type = 'paragraph', content = '', extra = null) {
  const id = blockIdCounter++;
  const block = document.createElement('div');
  block.className = 'block';
  block.dataset.type = type;
  block.dataset.id = String(id);

  const actions = document.createElement('div');
  actions.className = 'block-actions';
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'block-add';
  addBtn.title = 'เพิ่มบรรทัด';
  addBtn.textContent = '+';
  actions.appendChild(addBtn);
  const handle = document.createElement('span');
  handle.className = 'block-handle';
  handle.contentEditable = 'false';
  handle.title = 'ลากเพื่อย้าย • คลิกเปิดเมนู';
  handle.textContent = '⋮⋮';
  actions.appendChild(handle);

  const contentEl = document.createElement('div');
  contentEl.className = 'block-content';
  contentEl.contentEditable = 'true';
  const ph = type === 'paragraph' ? '' : getPlaceholder(type);
  contentEl.dataset.placeholder = ph;

  if (type === 'table') {
    const tableWrap = document.createElement('div');
    tableWrap.className = 'block-table-wrap';
    const rows = extra?.rows ?? 3;
    const cols = extra?.cols ?? 3;
    let html = '<table><thead><tr>';
    for (let c = 0; c < cols; c++) html += '<th contenteditable="true"></th>';
    html += '</tr></thead><tbody>';
    for (let r = 1; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) html += '<td contenteditable="true"></td>';
      html += '</tr>';
    }
    html += '</tbody></table>';
    tableWrap.innerHTML = html;
    const tableToolbar = document.createElement('div');
    tableToolbar.className = 'table-toolbar hidden';
    tableToolbar.innerHTML = `
      <button type="button" class="table-toolbar-btn" data-action="row-above" title="เพิ่มแถวด้านบน"><span class="material-symbols-outlined table-toolbar-icon">add</span> แถวบน</button>
      <button type="button" class="table-toolbar-btn" data-action="row-below" title="เพิ่มแถวด้านล่าง"><span class="material-symbols-outlined table-toolbar-icon">add</span> แถวล่าง</button>
      <button type="button" class="table-toolbar-btn" data-action="col-left" title="เพิ่มคอลัมน์ซ้าย"><span class="material-symbols-outlined table-toolbar-icon">add</span> คอลัมน์ซ้าย</button>
      <button type="button" class="table-toolbar-btn" data-action="col-right" title="เพิ่มคอลัมน์ขวา"><span class="material-symbols-outlined table-toolbar-icon">add</span> คอลัมน์ขวา</button>
      <span class="table-toolbar-divider"></span>
      <button type="button" class="table-toolbar-btn" data-action="delete-row" title="ลบแถว"><span class="material-symbols-outlined table-toolbar-icon">delete</span> ลบแถว</button>
      <button type="button" class="table-toolbar-btn" data-action="delete-col" title="ลบคอลัมน์"><span class="material-symbols-outlined table-toolbar-icon">delete</span> ลบคอลัมน์</button>
    `;
    tableWrap.appendChild(tableToolbar);
    contentEl.appendChild(tableWrap);
    contentEl.contentEditable = 'false';
    contentEl.classList.add('table-block');
    bindTableToolbar(tableWrap);
    const firstCell = tableWrap.querySelector('th, td');
    if (firstCell) setTimeout(() => firstCell.focus(), 0);
  } else if (type === 'divider') {
    contentEl.contentEditable = 'false';
    contentEl.innerHTML = '<div style="height:1px;background:var(--border);"></div>';
  } else if (type === 'checkbox') {
    if (content) contentEl.textContent = content;
  } else if (type === 'callout') {
    if (content) contentEl.textContent = content;
  } else {
    if (content) contentEl.textContent = content;
  }

  if (type === 'checkbox') {
    const checkWrap = document.createElement('div');
    checkWrap.className = 'block-check-wrap';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'block-checkbox';
    checkbox.checked = !!extra?.checked;
    if (checkbox.checked) block.dataset.checked = 'true';
    checkWrap.appendChild(checkbox);
    checkWrap.appendChild(contentEl);
    block.appendChild(actions);
    block.appendChild(checkWrap);
    checkbox.addEventListener('change', () => {
      block.dataset.checked = checkbox.checked ? 'true' : '';
    });
    return block;
  }

  if (type === 'ul' || type === 'ol') {
    const wrap = document.createElement('div');
    wrap.className = 'block-list-wrap';
    const bullet = document.createElement('span');
    bullet.className = 'block-bullet';
    bullet.contentEditable = 'false';
    wrap.appendChild(bullet);
    wrap.appendChild(contentEl);
    block.appendChild(actions);
    block.appendChild(wrap);
  } else {
    block.appendChild(actions);
    block.appendChild(contentEl);
  }
  return block;
}

function getPlaceholder(type) {
  const placeholders = {
    paragraph: '', // ใช้ updateCommandPlaceholder() ให้บรรทัดแรกเท่านั้นแสดง "กด / สำหรับคำสั่ง"
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    ul: 'รายการ',
    ol: 'รายการ',
    code: '// โค้ด',
    quote: 'อ้างอิง',
    checkbox: 'รายการตรวจสอบ',
    callout: 'ข้อความไฮไลต์',
    table: '',
  };
  return placeholders[type] ?? 'พิมพ์...';
}

function getBlockType(block) {
  return block?.dataset?.type || 'paragraph';
}

// ========== Table resize (add/remove rows & columns) ==========
function getTableCellPosition(table, cell) {
  const tag = cell.tagName.toLowerCase();
  const tr = cell.closest('tr');
  if (!tr || !table.contains(tr)) return null;
  const rows = Array.from(table.querySelectorAll('tr'));
  const rowIndex = rows.indexOf(tr);
  const cells = Array.from(tr.querySelectorAll('th, td'));
  const colIndex = cells.indexOf(cell);
  return { rowIndex, colIndex, tr, isHeader: tag === 'th' };
}

function tableAddRowAbove(tableWrap, cell) {
  const table = tableWrap.querySelector('table');
  const { tr } = getTableCellPosition(table, cell);
  if (!tr) return;
  const isHeader = tr.closest('thead');
  const tag = isHeader ? 'th' : 'td';
  const colCount = tr.querySelectorAll('th, td').length;
  const newRow = document.createElement('tr');
  for (let i = 0; i < colCount; i++) {
    const cell = document.createElement(tag);
    cell.contentEditable = 'true';
    newRow.appendChild(cell);
  }
  tr.parentNode.insertBefore(newRow, tr);
  newRow.querySelector(tag).focus();
}

function tableAddRowBelow(tableWrap, cell) {
  const table = tableWrap.querySelector('table');
  const { tr } = getTableCellPosition(table, cell);
  if (!tr) return;
  const isHeader = tr.closest('thead');
  const tag = isHeader ? 'th' : 'td';
  const colCount = tr.querySelectorAll('th, td').length;
  const newRow = document.createElement('tr');
  for (let i = 0; i < colCount; i++) {
    const c = document.createElement(tag);
    c.contentEditable = 'true';
    newRow.appendChild(c);
  }
  tr.parentNode.insertBefore(newRow, tr.nextSibling);
  newRow.querySelector(tag).focus();
}

function tableAddColLeft(tableWrap, cell) {
  const table = tableWrap.querySelector('table');
  const { colIndex } = getTableCellPosition(table, cell);
  if (colIndex === null) return;
  table.querySelectorAll('tr').forEach((tr) => {
    const tag = tr.querySelector('th') ? 'th' : 'td';
    const newCell = document.createElement(tag);
    newCell.contentEditable = 'true';
    const cells = tr.querySelectorAll('th, td');
    const ref = cells[colIndex];
    tr.insertBefore(newCell, ref);
  });
  const rows = table.querySelectorAll('tr');
  const targetRow = cell.closest('tr');
  const targetCells = targetRow.querySelectorAll('th, td');
  const newCell = targetRow.querySelectorAll('th, td')[colIndex];
  if (newCell) newCell.focus();
}

function tableAddColRight(tableWrap, cell) {
  const table = tableWrap.querySelector('table');
  table.querySelectorAll('tr').forEach((tr) => {
    const tag = tr.querySelector('th') ? 'th' : 'td';
    const newCell = document.createElement(tag);
    newCell.contentEditable = 'true';
    tr.appendChild(newCell);
  });
  const targetRow = cell.closest('tr');
  const lastCell = targetRow.querySelector('th:last-child, td:last-child');
  if (lastCell) lastCell.focus();
}

function tableDeleteRow(tableWrap, cell) {
  const table = tableWrap.querySelector('table');
  const rows = table.querySelectorAll('tr');
  if (rows.length <= 1) return;
  const { tr } = getTableCellPosition(table, cell);
  if (!tr) return;
  const next = tr.nextSibling || tr.previousSibling;
  tr.remove();
  const focusCell = next?.querySelector('th, td');
  if (focusCell) focusCell.focus();
}

function tableDeleteCol(tableWrap, cell) {
  const table = tableWrap.querySelector('table');
  const { colIndex, tr } = getTableCellPosition(table, cell);
  if (colIndex === null) return;
  const firstRow = table.querySelector('tr');
  if (firstRow && firstRow.querySelectorAll('th, td').length <= 1) return;
  table.querySelectorAll('tr').forEach((row) => {
    const cells = row.querySelectorAll('th, td');
    if (cells[colIndex]) cells[colIndex].remove();
  });
  const cells = tr.querySelectorAll('th, td');
  const focusIndex = Math.min(colIndex, cells.length - 1);
  if (cells[focusIndex]) cells[focusIndex].focus();
}

function tableIsEmpty(block) {
  const cells = block.querySelectorAll('.block-table-wrap th, .block-table-wrap td');
  for (const c of cells) {
    if ((c.textContent || '').trim() !== '') return false;
  }
  return true;
}

function getPreviousTableCell(block, current) {
  const cells = Array.from(block.querySelectorAll('.block-table-wrap th, .block-table-wrap td'));
  const i = cells.indexOf(current);
  return i > 0 ? cells[i - 1] : null;
}

function bindTableToolbar(tableWrap) {
  const table = tableWrap.querySelector('table');
  const toolbar = tableWrap.querySelector('.table-toolbar');
  let currentCell = null;

  const showToolbar = (cell) => {
    currentCell = cell;
    toolbar.classList.remove('hidden');
    const rect = tableWrap.getBoundingClientRect();
    toolbar.style.left = `${rect.left}px`;
    toolbar.style.top = `${rect.top - 44}px`;
  };

  const hideToolbar = () => {
    if (!tableWrap.contains(document.activeElement)) {
      toolbar.classList.add('hidden');
      currentCell = null;
    }
  };

  tableWrap.querySelectorAll('th, td').forEach((cell) => {
    cell.addEventListener('focus', () => showToolbar(cell));
  });

  tableWrap.addEventListener('focusout', (e) => {
    if (!e.relatedTarget || !tableWrap.contains(e.relatedTarget)) {
      setTimeout(hideToolbar, 100);
    }
  });

  toolbar.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!currentCell) return;
      const action = btn.dataset.action;
      if (action === 'row-above') tableAddRowAbove(tableWrap, currentCell);
      if (action === 'row-below') tableAddRowBelow(tableWrap, currentCell);
      if (action === 'col-left') tableAddColLeft(tableWrap, currentCell);
      if (action === 'col-right') tableAddColRight(tableWrap, currentCell);
      if (action === 'delete-row') tableDeleteRow(tableWrap, currentCell);
      if (action === 'delete-col') tableDeleteCol(tableWrap, currentCell);
      currentCell = tableWrap.querySelector('th:focus, td:focus') || tableWrap.querySelector('th, td');
      if (currentCell) showToolbar(currentCell);
    });
  });
}

function setBlockType(block, type) {
  if (!block || block.dataset.type === type) return;
  const wasList = block.dataset.type === 'ul' || block.dataset.type === 'ol';
  const isList = type === 'ul' || type === 'ol';
  const wasCheckbox = block.dataset.type === 'checkbox';
  const isCheckbox = type === 'checkbox';
  block.dataset.type = type;
  if (!isCheckbox) delete block.dataset.checked;

  const content = block.querySelector('.block-content');
  if (content && !content.classList.contains('table-block')) {
    content.dataset.placeholder = getPlaceholder(type);
  }

  if (!isCheckbox && wasCheckbox) {
    const checkWrap = block.querySelector('.block-check-wrap');
    if (checkWrap && content) {
      checkWrap.parentNode.insertBefore(content, checkWrap);
      checkWrap.remove();
    }
  }
  if (!isList && wasList) {
    const listWrap = block.querySelector('.block-list-wrap');
    if (listWrap && content) {
      listWrap.parentNode.insertBefore(content, listWrap);
      listWrap.remove();
    }
  }
  if (isCheckbox && !wasCheckbox) {
    const checkWrap = block.querySelector('.block-check-wrap');
    if (!checkWrap && content) {
      const wrap = document.createElement('div');
      wrap.className = 'block-check-wrap';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'block-checkbox';
      wrap.appendChild(checkbox);
      content.parentNode.insertBefore(wrap, content);
      wrap.appendChild(content);
      checkbox.addEventListener('change', () => {
        block.dataset.checked = checkbox.checked ? 'true' : '';
      });
    }
  }
  if (isList && !wasList) {
    const listWrap = block.querySelector('.block-list-wrap');
    if (!listWrap && content) {
      const wrap = document.createElement('div');
      wrap.className = 'block-list-wrap';
      const bullet = document.createElement('span');
      bullet.className = 'block-bullet';
      bullet.contentEditable = 'false';
      wrap.appendChild(bullet);
      content.parentNode.insertBefore(wrap, content);
      wrap.appendChild(content);
    }
  }
  updateCommandPlaceholder();
}

function insertBlockAfter(refBlock, type = 'paragraph', content = '', extra = null) {
  const newBlock = createBlock(type, content, extra);
  refBlock.after(newBlock);
  const contentEl = newBlock.querySelector('.block-content');
  if (contentEl && contentEl.contentEditable === 'true') {
    contentEl.focus();
    if (!content) placeCaretEnd(contentEl);
  }
  updateCommandPlaceholder();
  return newBlock;
}

function placeCaretEnd(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function getPreviousBlock(block) {
  let prev = block.previousElementSibling;
  while (prev && !prev.classList.contains('block')) prev = prev.previousElementSibling;
  return prev;
}

function getNextBlock(block) {
  let next = block.nextElementSibling;
  while (next && !next.classList.contains('block')) next = next.nextElementSibling;
  return next;
}

function getAllBlocks() {
  return Array.from(blocksContainer.querySelectorAll('.block'));
}

function setEditorLocked(locked) {
  if (!blocksContainer) return;
  editorLocked = !!locked;
  const container = document.querySelector('.editor-container');
  if (container) {
    if (editorLocked) container.classList.add('editor-locked');
    else container.classList.remove('editor-locked');
  }
  getAllBlocks().forEach((block) => {
    if (block.dataset.type === 'table') {
      block.querySelectorAll('.block-table-wrap th, .block-table-wrap td').forEach((c) => {
        c.contentEditable = editorLocked ? 'false' : 'true';
      });
    } else {
      const el = block.querySelector('.block-content');
      if (el && block.dataset.type !== 'divider') {
        el.contentEditable = editorLocked ? 'false' : 'true';
      }
    }
  });
  const lockBtn = document.getElementById('lock-content-btn');
  if (lockBtn) {
    lockBtn.textContent = editorLocked ? 'Unlock' : 'Lock';
    lockBtn.title = editorLocked ? 'ปลดล็อก (ให้แก้ไขได้)' : 'ล็อกเนื้อหา (อ่านอย่างเดียว)';
  }
  if (slashMenu) slashMenu.classList.add('hidden');
  if (blockMenu) blockMenu.classList.add('hidden');
}

// ส่งออกทุกบล็อกเป็น Markdown แล้วดาวน์โหลดเป็นไฟล์ .md
function exportToMarkdown() {
  const blocks = getAllBlocks();
  const lines = [];
  blocks.forEach((block) => {
    const type = getBlockType(block);
    const text = (raw) => (raw || '').trim();
    if (type === 'paragraph') {
      const el = block.querySelector('.block-content');
      lines.push(text(el && el.textContent) + '\n');
    } else if (type === 'h1') {
      const el = block.querySelector('.block-content');
      lines.push('# ' + text(el && el.textContent) + '\n');
    } else if (type === 'h2') {
      const el = block.querySelector('.block-content');
      lines.push('## ' + text(el && el.textContent) + '\n');
    } else if (type === 'h3') {
      const el = block.querySelector('.block-content');
      lines.push('### ' + text(el && el.textContent) + '\n');
    } else if (type === 'ul') {
      const el = block.querySelector('.block-content');
      lines.push('- ' + text(el && el.textContent) + '\n');
    } else if (type === 'ol') {
      const el = block.querySelector('.block-content');
      lines.push('1. ' + text(el && el.textContent) + '\n');
    } else if (type === 'code') {
      const el = block.querySelector('.block-content');
      const code = text(el && el.textContent);
      lines.push('```\n' + code + (code ? '\n' : '') + '```\n');
    } else if (type === 'quote') {
      const el = block.querySelector('.block-content');
      lines.push('> ' + text(el && el.textContent).replace(/\n/g, '\n> ') + '\n');
    } else if (type === 'checkbox') {
      const el = block.querySelector('.block-content');
      const checked = block.dataset.checked === 'true';
      lines.push((checked ? '- [x] ' : '- [ ] ') + text(el && el.textContent) + '\n');
    } else if (type === 'callout') {
      const el = block.querySelector('.block-content');
      lines.push('> **' + text(el && el.textContent) + '**\n');
    } else if (type === 'divider') {
      lines.push('---\n');
    } else if (type === 'table') {
      const table = block.querySelector('.block-table-wrap table');
          if (!table) return;
          const rows = table.querySelectorAll('tr');
          const cellText = (cell) => (cell.textContent || '').trim().replace(/\|/g, '\\|');
          rows.forEach((tr, i) => {
            const cells = tr.querySelectorAll('th, td');
            const row = Array.from(cells).map(cellText).join(' | ');
            lines.push('| ' + row + ' |\n');
            if (i === 0) {
              const sep = Array.from(cells).map(() => '---').join(' | ');
              lines.push('| ' + sep + ' |\n');
            }
          });
          lines.push('\n');
    }
  });
  const markdown = lines.join('');
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'document.md';
  a.click();
  URL.revokeObjectURL(a.href);
}

// อ่านไฟล์ Markdown แล้วสร้างบล็อกจากเนื้อหา
function parseMarkdownToBlocks(mdText) {
  const blocks = [];
  const lines = (mdText || '').split(/\r?\n/);
  let i = 0;
  const trim = (s) => (s || '').trim();

  while (i < lines.length) {
    const line = lines[i];
    const rest = line.replace(/^#+\s*/, '').trim();

    if (/^```/.test(line)) {
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: 'code', content: codeLines.join('\n'), extra: null });
      continue;
    }

    if (/^---+$/.test(trim(line))) {
      blocks.push({ type: 'divider', content: '', extra: null });
      i++;
      continue;
    }

    if (/^\|.+\|$/.test(line)) {
      const tableRows = [];
      while (i < lines.length && /^\|.+\|$/.test(lines[i])) {
        const row = lines[i];
        if (!/^\|?\s*---+(\s*\|\s*---+)*\s*\|?$/.test(row)) {
          const cells = row.split(/\|/).map((c) => trim(c)).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          tableRows.push(cells);
        }
        i++;
      }
      if (tableRows.length > 0) {
        const cols = Math.max(...tableRows.map((r) => r.length));
        const rows = tableRows.length;
        blocks.push({ type: 'table', content: '', extra: { rows, cols, cells: tableRows } });
      }
      continue;
    }

    if (/^###\s/.test(line)) {
      blocks.push({ type: 'h3', content: rest, extra: null });
      i++;
      continue;
    }
    if (/^##\s/.test(line)) {
      blocks.push({ type: 'h2', content: rest, extra: null });
      i++;
      continue;
    }
    if (/^#\s/.test(line)) {
      blocks.push({ type: 'h1', content: rest, extra: null });
      i++;
      continue;
    }

    const checkboxMatch = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
    if (checkboxMatch) {
      blocks.push({ type: 'checkbox', content: trim(checkboxMatch[2]), extra: { checked: checkboxMatch[1].toLowerCase() === 'x' } });
      i++;
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      blocks.push({ type: 'ul', content: line.replace(/^[-*]\s+/, '').trim(), extra: null });
      i++;
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      blocks.push({ type: 'ol', content: line.replace(/^\d+\.\s+/, '').trim(), extra: null });
      i++;
      continue;
    }

    if (/^>\s*\*\*/.test(line) && /\*\*\s*$/.test(line)) {
      blocks.push({ type: 'callout', content: trim(line.replace(/^>\s*\*\*|\*\*\s*$/g, '')), extra: null });
      i++;
      continue;
    }
    if (/^>\s/.test(line)) {
      blocks.push({ type: 'quote', content: trim(line.replace(/^>\s?/, '')), extra: null });
      i++;
      continue;
    }

    blocks.push({ type: 'paragraph', content: trim(line), extra: null });
    i++;
  }
  return blocks;
}

function importMarkdown(text) {
  if (!blocksContainer) return;
  const specs = parseMarkdownToBlocks(text);
  const blocks = getAllBlocks();
  blocks.forEach((b) => b.remove());
  const dropLine = blocksContainer.querySelector('.block-drop-line');
  if (dropLine) dropLine.remove();

  if (specs.length === 0) {
    const one = createBlock('paragraph', '');
    blocksContainer.appendChild(one);
    one.querySelector('.block-content')?.focus();
  } else {
    specs.forEach(({ type, content, extra }) => {
      if (type === 'table' && extra && extra.cells) {
        const { rows, cols, cells } = extra;
        const tableBlock = createBlock('table', '', { rows: Math.max(rows, 1), cols: Math.max(cols, 1) });
        const table = tableBlock.querySelector('table');
        if (table) {
          const allCells = table.querySelectorAll('th, td');
          const flat = extra.cells.flat();
          flat.forEach((val, idx) => {
            if (allCells[idx]) allCells[idx].textContent = val;
          });
        }
        blocksContainer.appendChild(tableBlock);
      } else {
        const block = createBlock(type, content, extra);
        blocksContainer.appendChild(block);
      }
    });
    const first = blocksContainer.querySelector('.block');
    const focusEl = first?.querySelector('.block-content, .block-table-wrap th, .block-table-wrap td');
    if (focusEl) focusEl.focus();
  }
  updateEmptyState();
  updateCommandPlaceholder();
}

function onUploadMarkdownFile(file) {
  if (!file || !/\.(md|markdown|txt)$/i.test(file.name)) return;
  const reader = new FileReader();
  reader.onload = () => {
    importMarkdown(reader.result || '');
  };
  reader.readAsText(file, 'UTF-8');
}

// เฉพาะบรรทัดที่ Focus อยู่แสดง "กด / สำหรับคำสั่ง" บรรทัดอื่นว่าง
function updateCommandPlaceholder(focusedBlock) {
  const blocks = getAllBlocks();
  const target = focusedBlock || blocksContainer.querySelector('.block.focused');
  blocks.forEach((block) => {
    const content = block.querySelector('.block-content');
    if (!content || !content.contentEditable || content.classList.contains('table-block')) return;
    const isParagraph = (block.dataset.type || 'paragraph') === 'paragraph';
    if (isParagraph) {
      content.dataset.placeholder = (block === target) ? 'กด / สำหรับคำสั่ง' : '';
    }
  });
}

// ========== Markdown shortcuts (at line start) ==========
const MARKDOWN_TRIGGERS = [
  { pattern: /^### $/, type: 'h3' },
  { pattern: /^## $/, type: 'h2' },
  { pattern: /^# $/, type: 'h1' },
  { pattern: /^\- $/, type: 'ul' },
  { pattern: /^\* $/, type: 'ul' },
  { pattern: /^\d+\. $/, type: 'ol' },
  { pattern: /^\- \[ \] $/, type: 'checkbox' },
  { pattern: /^\[\] $/, type: 'checkbox' },
  { pattern: /^```$/, type: 'code' },
  { pattern: /^> $/, type: 'quote' },
];

function tryApplyMarkdownShortcut(block) {
  const contentEl = block.querySelector('.block-content');
  if (!contentEl || contentEl.contentEditable !== 'true') return false;
  const text = contentEl.textContent || '';
  for (const { pattern, type } of MARKDOWN_TRIGGERS) {
    if (pattern.test(text)) {
      contentEl.textContent = '';
      setBlockType(block, type);
      contentEl.focus();
      return true;
    }
  }
  return false;
}

// ========== Slash command ==========
function showSlashMenu(block, query = '') {
  currentSlashBlock = block;
  slashMenu.classList.remove('hidden');
  const items = slashMenu.querySelectorAll('.slash-item');
  const q = query.toLowerCase();
  let firstVisible = 0;
  items.forEach((item, i) => {
    const label = item.textContent.trim().toLowerCase();
    const show = !q || label.includes(q);
    item.classList.toggle('hidden', !show);
    if (show && firstVisible === 0) firstVisible = i;
  });
  items.forEach((item, i) => item.classList.toggle('selected', !item.classList.contains('hidden') && i === firstVisible));
  slashMenuIndex = Array.from(items).findIndex((el) => !el.classList.contains('hidden'));
  if (slashMenuIndex < 0) slashMenuIndex = 0;
  positionSlashMenu(block);
}

function positionSlashMenu(block) {
  const contentEl = block?.querySelector('.block-content');
  if (!contentEl) return;
  const rect = contentEl.getBoundingClientRect();
  slashMenu.style.left = `${rect.left}px`;
  slashMenu.style.top = `${rect.bottom + 4}px`;
}

function hideSlashMenu() {
  slashMenu.classList.add('hidden');
  currentSlashBlock = null;
}

function applySlashCommand(type) {
  if (!currentSlashBlock) return;
  const contentEl = currentSlashBlock.querySelector('.block-content');
  if (type === 'table') {
    const tableBlock = createBlock('table', '', { rows: 4, cols: 3 });
    currentSlashBlock.after(tableBlock);
    currentSlashBlock.remove();
    const firstCell = tableBlock.querySelector('th, td');
    if (firstCell) firstCell.focus();
  } else if (type === 'divider') {
    const divBlock = createBlock('divider');
    const newPara = createBlock('paragraph');
    currentSlashBlock.after(divBlock);
    divBlock.after(newPara);
    currentSlashBlock.remove();
    newPara.querySelector('.block-content')?.focus();
  } else {
    if (contentEl && contentEl.contentEditable === 'true') {
      const text = contentEl.textContent.replace(/^\/\w*\s*/, '').trim();
      contentEl.textContent = text;
    }
    setBlockType(currentSlashBlock, type);
    contentEl?.focus();
    placeCaretEnd(contentEl);
  }
  updateCommandPlaceholder();
  hideSlashMenu();
}

// ========== Keyboard ==========
function onBlockKeyDown(e, block) {
  if (editorLocked) {
    e.preventDefault();
    return;
  }
  const contentEl = block.querySelector('.block-content');
  if (!contentEl) return;

  // Slash menu open: arrow + enter
  if (slashMenu && !slashMenu.classList.contains('hidden')) {
    const items = Array.from(slashMenu.querySelectorAll('.slash-item:not(.hidden)'));
    const currentIndex = items.findIndex((el) => el.classList.contains('selected'));
    const idx = currentIndex >= 0 ? currentIndex : 0;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % items.length;
      items.forEach((el, i) => el.classList.toggle('selected', i === next));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle('selected', i === prev));
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const selected = items[idx];
      if (selected) selected.click();
      return;
    }
    if (e.key === 'Escape') {
      hideSlashMenu();
      return;
    }
  }

  // Enter: new block
  if (e.key === 'Enter' && !e.shiftKey) {
    const isTable = block.dataset.type === 'table';
    if (isTable) return; // table handles its own Enter
    e.preventDefault();
    const text = contentEl.textContent || '';
    const cursor = getCaretOffset(contentEl);
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    contentEl.textContent = before;
    const newBlock = insertBlockAfter(block, 'paragraph', after);
    return;
  }

  // Backspace at start: ตารางลบได้เมื่อข้อมูลในตารางว่างหมดแล้ว, Code block ลบได้เลย
  if (e.key === 'Backspace') {
    const isTable = block.dataset.type === 'table';
    const isCode = block.dataset.type === 'code';
    let cursorAtStart = false;
    let text = '';

    if (isTable) {
      const cell = e.target.matches?.('th, td') && block.contains(e.target) ? e.target : block.querySelector('.block-table-wrap th, .block-table-wrap td');
      if (cell) {
        text = cell.textContent || '';
        cursorAtStart = getCaretOffset(cell) === 0;
      }
    } else if (contentEl) {
      text = contentEl.textContent || '';
      cursorAtStart = getCaretOffset(contentEl) === 0;
    }

    if (cursorAtStart) {
      // List หรือ Checklist: กด Backspace ที่ต้นรายการ → แปลงเป็น paragraph ปกติ
      const isList = block.dataset.type === 'ul' || block.dataset.type === 'ol';
      const isCheckbox = block.dataset.type === 'checkbox';
      if (isList || isCheckbox) {
        e.preventDefault();
        setBlockType(block, 'paragraph');
        contentEl?.focus();
        return;
      }

      // ตาราง: ลบบล็อกได้เฉพาะเมื่อทุกเซลล์ว่าง
      if (isTable) {
        if (!tableIsEmpty(block)) {
          // ยังมีข้อมูลอยู่ → เลื่อนไปเซลล์ก่อนหน้า (หรือไม่ทำอะไร)
          const prevCell = getPreviousTableCell(block, e.target);
          if (prevCell) {
            e.preventDefault();
            placeCaretEnd(prevCell);
            prevCell.focus();
          }
          return;
        }
      }

      e.preventDefault();
      const prev = getPreviousBlock(block);
      if (prev) {
        const prevContent = prev.querySelector('.block-content');
        const canMerge = prevContent?.contentEditable === 'true' && !isTable && !isCode;
        if (canMerge) {
          const prevText = prevContent.textContent || '';
          prevContent.textContent = prevText + text;
        }
        block.remove();
        if (prevContent && prevContent.contentEditable === 'true') {
          placeCaretEnd(prevContent);
          prevContent.focus();
        } else {
          const nextBlock = blocksContainer.querySelector('.block');
          const focusEl = nextBlock?.querySelector('.block-content, .block-table-wrap th, .block-table-wrap td');
          if (focusEl) focusEl.focus();
        }
      }
      return;
    }
  }

  // Space: check markdown shortcut
  if (e.key === ' ') {
    setTimeout(() => {
      if (tryApplyMarkdownShortcut(block)) e.preventDefault();
    }, 0);
  }

  // Typing backtick 3 times for code
  if (e.key === '`') {
    setTimeout(() => {
      const text = contentEl.textContent || '';
      if (text === '```') {
        contentEl.textContent = '';
        setBlockType(block, 'code');
        contentEl.focus();
      }
    }, 0);
  }
}

function getCaretOffset(el) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(el);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  return preCaretRange.toString().length;
}

// ========== Slash typing ==========
function onBlockInput(e, block) {
  const contentEl = block.querySelector('.block-content');
  if (!contentEl || contentEl.contentEditable !== 'true') return;
  const text = contentEl.textContent || '';
  if (text.startsWith('/')) {
    const match = text.match(/^\/(\w*)/);
    showSlashMenu(block, match ? match[1] : '');
  } else {
    if (slashMenu && currentSlashBlock === block) hideSlashMenu();
  }
}

// ========== Event delegation ==========
function attachBlocksListeners() {
  if (!blocksContainer) return;
  blocksContainer.addEventListener('keydown', (e) => {
    const block = e.target.closest('.block');
    if (!block) return;
    const isContent = e.target.classList.contains('block-content');
    const isTableCell = e.target.matches?.('.block-table-wrap th, .block-table-wrap td');
    if (isContent || isTableCell) onBlockKeyDown(e, block);
  });
  blocksContainer.addEventListener('input', (e) => {
    const block = e.target.closest('.block');
    if (block && e.target.classList.contains('block-content')) {
      onBlockInput(e, block);
    }
  });
  blocksContainer.addEventListener('input', () => { updateEmptyState(); updateCommandPlaceholder(); }, true);
  blocksContainer.addEventListener('focusin', (e) => {
    const block = e.target.closest('.block');
    getAllBlocks().forEach(b => b.classList.remove('focused'));
    if (block) {
      block.classList.add('focused');
      updateCommandPlaceholder(block);
    }
  });
  blocksContainer.addEventListener('focusout', () => {
    setTimeout(() => {
      if (blocksContainer && !blocksContainer.contains(document.activeElement)) {
        getAllBlocks().forEach(b => b.classList.remove('focused'));
      }
    }, 0);
  });
}

// Empty state
function updateEmptyState() {
  if (!blocksContainer) return;
  const blocks = getAllBlocks();
  const onlyOne = blocks.length === 1;
  const first = blocks[0];
  const isEmpty = first && first.dataset.type === 'paragraph' && first.querySelector('.block-content') && (first.querySelector('.block-content').textContent || '').trim() === '';
  blocksContainer.dataset.empty = onlyOne && isEmpty ? 'true' : 'false';
}

let editorInitialized = false;
function initEditor() {
  if (editorInitialized) return;
  ensureDomRefs();
  if (!blocksContainer) return;
  editorInitialized = true;
  const saveBtn = document.getElementById('save-markdown-btn');
  if (saveBtn) saveBtn.addEventListener('click', exportToMarkdown);
  const uploadBtn = document.getElementById('upload-markdown-btn');
  const uploadInput = document.getElementById('upload-markdown-input');
  if (uploadBtn && uploadInput) {
    uploadBtn.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', () => {
      const file = uploadInput.files && uploadInput.files[0];
      onUploadMarkdownFile(file);
      uploadInput.value = '';
    });
  }
  const lockBtn = document.getElementById('lock-content-btn');
  if (lockBtn) lockBtn.addEventListener('click', () => setEditorLocked(!editorLocked));
  attachBlocksListeners();
  attachRemainingListeners();
  attachDragListeners();
  attachMenuListeners();
  updateEmptyState();
  updateCommandPlaceholder();
}
document.addEventListener('DOMContentLoaded', initEditor);
if (document.readyState !== 'loading') initEditor();

// ========== Block ลบและย้าย (แบบ Notion) ==========
function deleteBlock(block) {
  const prev = getPreviousBlock(block);
  const next = getNextBlock(block);
  block.remove();
  updateEmptyState();
  updateCommandPlaceholder();
  if (prev) {
    const focusEl = prev.querySelector('.block-content, .block-table-wrap th, .block-table-wrap td');
    if (focusEl) focusEl.focus();
  } else if (next) {
    const focusEl = next.querySelector('.block-content, .block-table-wrap th, .block-table-wrap td');
    if (focusEl) focusEl.focus();
  }
}

// ปุ่ม + เพิ่มบรรทัด (แทรกหลังบรรทัดนั้น)
function attachRemainingListeners() {
  if (!blocksContainer) return;
  blocksContainer.addEventListener('click', (e) => {
    if (!e.target.closest('.block-add')) return;
    e.preventDefault();
    const block = e.target.closest('.block');
    if (!block) return;
    const newBlock = insertBlockAfter(block, 'paragraph');
    newBlock.querySelector('.block-content')?.focus();
    updateEmptyState();
  });
}

// ลากย้ายบล็อก
let dragBlock = null;
let dropLine = null;

function getBlockIndex(block) {
  return getAllBlocks().indexOf(block);
}

function createDropLine() {
  const line = document.createElement('div');
  line.className = 'block-drop-line';
  return line;
}

function updateDropLine(y) {
  if (!dropLine || !dragBlock) return;
  const blocks = getAllBlocks();
  const containerRect = blocksContainer.getBoundingClientRect();
  if (y < containerRect.top) {
    blocks[0]?.before(dropLine);
    return;
  }
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b === dragBlock) continue;
    const rect = b.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (y < mid) {
      b.before(dropLine);
      return;
    }
  }
  blocksContainer.appendChild(dropLine);
}

// ========== Block Action Menu (กด ⋮⋮ แล้วกางเมนู) ==========
function getBlockTypeLabel(type) {
  const labels = { paragraph: 'ข้อความ', h1: 'หัวข้อ 1', h2: 'หัวข้อ 2', h3: 'หัวข้อ 3', ul: 'รายการ', ol: 'รายการเลข', code: 'โค้ด', table: 'ตาราง', quote: 'อ้างอิง', checkbox: 'Checklist', callout: 'Callout', divider: 'เส้นคั่น' };
  return labels[type] || type;
}

function openBlockMenu(block, handleEl) {
  currentBlockMenuBlock = block;
  blockMenu.classList.remove('hidden');
  blockMenu.querySelector('.block-menu-turn-into').classList.add('hidden');
  blockMenu.querySelector('.block-menu-colors').classList.add('hidden');
  const typeEl = document.getElementById('block-menu-type');
  if (typeEl) typeEl.textContent = getBlockTypeLabel(block.dataset.type || 'paragraph');
  const rect = handleEl.getBoundingClientRect();
  blockMenu.style.left = `${rect.left}px`;
  blockMenu.style.top = `${rect.bottom + 4}px`;
}

function closeBlockMenu() {
  blockMenu.classList.add('hidden');
  currentBlockMenuBlock = null;
}

function duplicateBlock(block) {
  const type = block.dataset.type || 'paragraph';
  const contentEl = block.querySelector('.block-content');
  let content = '';
  let extra = null;
  if (type === 'table') {
    const table = block.querySelector('table');
    if (table) {
      const rows = table.querySelectorAll('tr').length;
      const cols = table.querySelector('tr')?.querySelectorAll('th, td').length ?? 0;
      extra = { rows, cols };
    }
  } else if (contentEl && contentEl.contentEditable === 'true') {
    content = contentEl.textContent || '';
  }
  if (type === 'checkbox') {
    extra = { checked: block.dataset.checked === 'true' };
  }
  const newBlock = createBlock(type, content, extra);
  if (type === 'table' && newBlock.querySelector('table') && block.querySelector('table')) {
    const srcTable = block.querySelector('table');
    const destTable = newBlock.querySelector('table');
    srcTable.querySelectorAll('tr').forEach((tr, ri) => {
      const destTr = destTable.querySelectorAll('tr')[ri];
      if (destTr) tr.querySelectorAll('th, td').forEach((cell, ci) => {
        const destCell = destTr.querySelectorAll('th, td')[ci];
        if (destCell) destCell.textContent = cell.textContent || '';
      });
    });
  }
  block.after(newBlock);
  const focusEl = newBlock.querySelector('.block-content, .block-table-wrap th, .block-table-wrap td');
  if (focusEl) focusEl.focus();
}

function copyBlockContent(block) {
  const contentEl = block.querySelector('.block-content');
  let text = '';
  if (block.dataset.type === 'table') {
    const rows = block.querySelectorAll('table tr');
    const lines = Array.from(rows).map(tr =>
      Array.from(tr.querySelectorAll('th, td')).map(c => (c.textContent || '').trim()).join('\t')
    );
    text = lines.join('\n');
  } else if (contentEl) text = contentEl.textContent || '';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

// ⋮⋮ = ลาก = ย้าย, คลิก = กางเมนู Action
const DRAG_THRESHOLD = 4;

function attachDragListeners() {
  if (!blocksContainer) return;
  blocksContainer.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.block-handle')) return;
  e.preventDefault();
  const block = e.target.closest('.block');
  if (!block) return;
  const startX = e.clientX;
  const startY = e.clientY;
  let dragStarted = false;

  const onMouseMove = (e) => {
    if (dragStarted) {
      updateDropLine(e.clientY);
      return;
    }
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (dx * dx + dy * dy >= DRAG_THRESHOLD * DRAG_THRESHOLD) {
      dragStarted = true;
      dragBlock = block;
      dragBlock.classList.add('block-dragging');
      dropLine = createDropLine();
      const idx = getBlockIndex(dragBlock);
      const blocks = getAllBlocks();
      if (idx < blocks.length - 1) {
        blocks[idx + 1].before(dropLine);
      } else {
        blocksContainer.appendChild(dropLine);
      }
      updateDropLine(e.clientY);
    }
  };

  const onMouseUp = (e) => {
    if (dragStarted && dropLine && dragBlock) {
      dropLine.insertAdjacentElement('beforebegin', dragBlock);
      dropLine.remove();
      updateCommandPlaceholder();
    }
    if (dragBlock) dragBlock.classList.remove('block-dragging');
    dragBlock = null;
    dropLine = null;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    // คลิก ⋮⋮ โดยไม่ลาก = กางเมนู Action (ถ้าเมนูเปิดอยู่แล้ว กด ⋮⋮ อีกที = ปิด)
    if (!dragStarted && block) {
      if (!blockMenu.classList.contains('hidden')) {
        closeBlockMenu();
        return;
      }
      const handleEl = block.querySelector('.block-handle');
      openBlockMenu(block, handleEl || e.target);
    }
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});
}

// Slash menu item click
function attachMenuListeners() {
  slashMenu?.querySelectorAll('.slash-item').forEach((btn) => {
    btn.addEventListener('click', () => applySlashCommand(btn.dataset.type));
  });
  blockMenu?.addEventListener('click', (e) => onBlockMenuClick(e));
}
function onBlockMenuClick(e) {
  const action = e.target.closest('[data-action]')?.dataset?.action;
  const type = e.target.closest('[data-type]')?.dataset?.type;
  const colorBtn = e.target.closest('.block-menu-color');
  if (colorBtn && currentBlockMenuBlock) {
    const kind = colorBtn.dataset.kind;
    const color = colorBtn.dataset.color;
    if (kind === 'text') {
      if (color === 'default') delete currentBlockMenuBlock.dataset.textColor;
      else currentBlockMenuBlock.dataset.textColor = color;
    } else if (kind === 'bg') {
      if (color === 'default') delete currentBlockMenuBlock.dataset.bgColor;
      else currentBlockMenuBlock.dataset.bgColor = color;
    }
    return;
  }
  if (type && currentBlockMenuBlock) {
    setBlockType(currentBlockMenuBlock, type);
    closeBlockMenu();
    return;
  }
  if (!currentBlockMenuBlock) return;
  if (action === 'turn-into') {
    blockMenu.querySelector('.block-menu-turn-into').classList.toggle('hidden');
    blockMenu.querySelector('.block-menu-colors').classList.add('hidden');
    return;
  }
  if (action === 'color') {
    blockMenu.querySelector('.block-menu-turn-into').classList.add('hidden');
    blockMenu.querySelector('.block-menu-colors').classList.toggle('hidden');
    return;
  }
  if (action === 'duplicate') {
    duplicateBlock(currentBlockMenuBlock);
    closeBlockMenu();
    return;
  }
  if (action === 'copy') {
    copyBlockContent(currentBlockMenuBlock);
    closeBlockMenu();
    return;
  }
  if (action === 'delete') {
    deleteBlock(currentBlockMenuBlock);
    closeBlockMenu();
    return;
  }
}
document.addEventListener('click', (e) => {
  if (blockMenu?.classList.contains('hidden')) return;
  if (!blockMenu.contains(e.target) && !e.target.closest('.block-handle')) {
    closeBlockMenu();
  }
});

// Add .hidden for slash items (filter)
const style = document.createElement('style');
style.textContent = '.slash-item.hidden { display: none; }';
document.head.appendChild(style);

// ========== Selection Toolbar (เลือกข้อความบางส่วน → แก้ Style ได้) ==========
const selectionToolbar = document.getElementById('selection-toolbar');
const selectionColorPicker = document.getElementById('selection-toolbar-color-picker');

function isSelectionInEditor() {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return false;
  return blocksContainer.contains(sel.anchorNode) && blocksContainer.contains(sel.focusNode);
}

function updateSelectionToolbarPosition() {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed || !selectionToolbar) return;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  selectionToolbar.classList.remove('hidden');
  requestAnimationFrame(() => {
    const tw = selectionToolbar.offsetWidth;
    const th = selectionToolbar.offsetHeight;
    let left = rect.left + rect.width / 2 - tw / 2;
    let top = rect.top - th - 8;
    if (top < 8) top = rect.bottom + 8;
    if (left < 8) left = 8;
    if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;
    selectionToolbar.style.left = `${left}px`;
    selectionToolbar.style.top = `${top}px`;
  });
}

function hideSelectionToolbar() {
  if (selectionToolbar) selectionToolbar.classList.add('hidden');
  if (selectionColorPicker) selectionColorPicker.classList.add('hidden');
}

function showSelectionToolbar() {
  if (!isSelectionInEditor()) {
    hideSelectionToolbar();
    return;
  }
  updateSelectionToolbarPosition();
}

document.addEventListener('mouseup', () => {
  setTimeout(showSelectionToolbar, 10);
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
  setTimeout(showSelectionToolbar, 10);
});

selectionToolbar?.addEventListener('click', (e) => {
  const btn = e.target.closest('.selection-toolbar-btn[data-cmd]');
  if (btn) {
    e.preventDefault();
    const cmd = btn.dataset.cmd;
    if (cmd === 'createLink') {
      const url = prompt('ใส่ URL ลิงก์:', 'https://');
      if (url) document.execCommand('createLink', false, url);
    } else if (cmd === 'code') {
      const sel = window.getSelection();
      if (sel.rangeCount) {
        const range = sel.getRangeAt(0);
        const code = document.createElement('code');
        code.className = 'inline-code';
        try {
          range.surroundContents(code);
        } catch (_) {
          document.execCommand('insertHTML', false, '<code class="inline-code">' + (sel.toString() || '').replace(/</g, '&lt;') + '</code>');
        }
      }
    } else {
      document.execCommand(cmd, false, null);
    }
    hideSelectionToolbar();
    return;
  }
});

document.getElementById('selection-toolbar-color')?.addEventListener('click', (e) => {
  e.stopPropagation();
  selectionColorPicker?.classList.toggle('hidden');
});

selectionColorPicker?.querySelectorAll('.selection-color-btn').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const color = btn.dataset.color;
    document.execCommand('foreColor', false, color);
    selectionColorPicker.classList.add('hidden');
    hideSelectionToolbar();
  });
});

document.addEventListener('click', (e) => {
  if (selectionToolbar?.classList.contains('hidden')) return;
  if (!selectionToolbar.contains(e.target)) {
    hideSelectionToolbar();
  }
});

