import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import type { Cell } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  FunctionSquare,
  Sparkles,
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';

interface SpreadsheetProps {
  fileId: string;
}

const getColumnLabel = (index: number): string => {
  let result = '';
  let n = index;
  do {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26);
  } while (n > 0);
  return result;
};

const getCellId = (row: number, col: number): string => `${getColumnLabel(col)}${row + 1}`;

const parseCellReference = (ref: string): { row: number; col: number } | null => {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  
  const colStr = match[1];
  const row = parseInt(match[2], 10) - 1;
  
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 65);
  }
  
  return { row, col };
};

const evaluateFormula = (formula: string, cells: Record<string, Cell>): string => {
  if (!formula.startsWith('=')) return formula;
  
  const expr = formula.slice(1).toUpperCase();
  
  // Handle SUM function
  const sumMatch = expr.match(/SUM\(([A-Z]+\d+):([A-Z]+\d+)\)/);
  if (sumMatch) {
    const start = parseCellReference(sumMatch[1]);
    const end = parseCellReference(sumMatch[2]);
    if (start && end) {
      let sum = 0;
      for (let r = start.row; r <= end.row; r++) {
        for (let c = start.col; c <= end.col; c++) {
          const cellId = getCellId(r, c);
          const cell = cells[cellId];
          const value = parseFloat(cell?.value || '0');
          if (!isNaN(value)) sum += value;
        }
      }
      return sum.toString();
    }
  }
  
  // Handle AVERAGE function
  const avgMatch = expr.match(/AVERAGE\(([A-Z]+\d+):([A-Z]+\d+)\)/);
  if (avgMatch) {
    const start = parseCellReference(avgMatch[1]);
    const end = parseCellReference(avgMatch[2]);
    if (start && end) {
      let sum = 0;
      let count = 0;
      for (let r = start.row; r <= end.row; r++) {
        for (let c = start.col; c <= end.col; c++) {
          const cellId = getCellId(r, c);
          const cell = cells[cellId];
          const value = parseFloat(cell?.value || '0');
          if (!isNaN(value)) {
            sum += value;
            count++;
          }
        }
      }
      return count > 0 ? (sum / count).toString() : '0';
    }
  }
  
  // Handle simple cell references
  const cellRef = parseCellReference(expr);
  if (cellRef) {
    const cellId = getCellId(cellRef.row, cellRef.col);
    const cell = cells[cellId];
    return cell?.value || '';
  }
  
  // Try to evaluate as simple math expression
  try {
    // Replace cell references with their values
    const sanitized = expr.replace(/[A-Z]+\d+/g, (match) => {
      const ref = parseCellReference(match);
      if (ref) {
        const cellId = getCellId(ref.row, ref.col);
        const cell = cells[cellId];
        return cell?.value || '0';
      }
      return '0';
    });
    
    // eslint-disable-next-line no-new-func
    const result = new Function('return ' + sanitized)();
    return result.toString();
  } catch {
    return '#ERROR';
  }
};

export function Spreadsheet({ fileId }: SpreadsheetProps) {
  const { spreadsheets, updateSpreadsheet, aiConfig } = useAppStore();
  const data = spreadsheets[fileId] || {
    cells: {},
    rowCount: 50,
    colCount: 26,
    colWidths: {},
    rowHeights: {},
  };

  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const getCell = useCallback((row: number, col: number): Cell => {
    const cellId = getCellId(row, col);
    return data.cells[cellId] || { value: '' };
  }, [data.cells]);

  const setCell = useCallback((row: number, col: number, updates: Partial<Cell>) => {
    const cellId = getCellId(row, col);
    const currentCell = data.cells[cellId] || { value: '' };
    
    const newCells = {
      ...data.cells,
      [cellId]: { ...currentCell, ...updates },
    };
    
    updateSpreadsheet(fileId, {
      ...data,
      cells: newCells,
    });
  }, [data, fileId, updateSpreadsheet]);

  const handleCellClick = useCallback((row: number, col: number) => {
    const cellId = getCellId(row, col);
    setSelectedCell(cellId);
  }, []);

  const handleCellDoubleClick = useCallback((row: number, col: number) => {
    const cellId = getCellId(row, col);
    const cell = getCell(row, col);
    setEditingCell(cellId);
    setEditValue(cell.value);
  }, [getCell]);

  const handleEditSubmit = useCallback(() => {
    if (editingCell) {
      const ref = parseCellReference(editingCell);
      if (ref) {
        const isFormula = editValue.startsWith('=');
        setCell(ref.row, ref.col, {
          value: editValue,
          formula: isFormula ? editValue : undefined,
        });
      }
    }
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, setCell]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter') {
      if (editingCell) {
        handleEditSubmit();
      } else {
        handleCellDoubleClick(row, col);
      }
    } else if (e.key === 'Escape' && editingCell) {
      setEditingCell(null);
      setEditValue('');
    } else if (e.key === 'ArrowUp' && !editingCell && row > 0) {
      setSelectedCell(getCellId(row - 1, col));
    } else if (e.key === 'ArrowDown' && !editingCell) {
      setSelectedCell(getCellId(row + 1, col));
    } else if (e.key === 'ArrowLeft' && !editingCell && col > 0) {
      setSelectedCell(getCellId(row, col - 1));
    } else if (e.key === 'ArrowRight' && !editingCell) {
      setSelectedCell(getCellId(row, col + 1));
    } else if (!editingCell && e.key.length === 1) {
      handleCellDoubleClick(row, col);
      setEditValue(e.key);
    }
  }, [editingCell, handleCellDoubleClick, handleEditSubmit]);

  const applyStyle = useCallback((style: Partial<Cell['style']>) => {
    if (!selectedCell) return;
    
    const ref = parseCellReference(selectedCell);
    if (!ref) return;
    
    const cell = getCell(ref.row, ref.col);
    setCell(ref.row, ref.col, {
      style: { ...cell.style, ...style },
    });
  }, [selectedCell, getCell, setCell]);

  const addRow = useCallback(() => {
    updateSpreadsheet(fileId, {
      ...data,
      rowCount: data.rowCount + 1,
    });
  }, [data, fileId, updateSpreadsheet]);

  const addColumn = useCallback(() => {
    updateSpreadsheet(fileId, {
      ...data,
      colCount: data.colCount + 1,
    });
  }, [data, fileId, updateSpreadsheet]);

  const selectedCellData = selectedCell ? (() => {
    const ref = parseCellReference(selectedCell);
    return ref ? getCell(ref.row, ref.col) : null;
  })() : null;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-gray-50/50">
        {/* Style Controls */}
        <div className="flex items-center gap-0.5">
          <Toggle
            pressed={selectedCellData?.style?.bold}
            onPressedChange={(pressed) => applyStyle({ bold: pressed })}
            className="h-8 w-8 p-0"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </Toggle>
          <Toggle
            pressed={selectedCellData?.style?.italic}
            onPressedChange={(pressed) => applyStyle({ italic: pressed })}
            className="h-8 w-8 p-0"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </Toggle>
          <Toggle
            pressed={selectedCellData?.style?.underline}
            onPressedChange={(pressed) => applyStyle({ underline: pressed })}
            className="h-8 w-8 p-0"
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </Toggle>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <div className="flex items-center gap-0.5">
          <Toggle
            pressed={selectedCellData?.style?.align === 'left'}
            onPressedChange={() => applyStyle({ align: 'left' })}
            className="h-8 w-8 p-0"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </Toggle>
          <Toggle
            pressed={selectedCellData?.style?.align === 'center'}
            onPressedChange={() => applyStyle({ align: 'center' })}
            className="h-8 w-8 p-0"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </Toggle>
          <Toggle
            pressed={selectedCellData?.style?.align === 'right'}
            onPressedChange={() => applyStyle({ align: 'right' })}
            className="h-8 w-8 p-0"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </Toggle>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Row/Column Controls */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={addRow}
            title="Add Row"
          >
            <Plus className="w-4 h-4 mr-1" />
            Row
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={addColumn}
            title="Add Column"
          >
            <Plus className="w-4 h-4 mr-1" />
            Col
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Formula */}
        <div className="flex items-center gap-2 flex-1">
          <FunctionSquare className="w-4 h-4 text-gray-400" />
          <Input
            value={selectedCell ? (data.cells[selectedCell]?.formula || data.cells[selectedCell]?.value || '') : ''}
            onChange={(e) => {
              if (selectedCell) {
                const ref = parseCellReference(selectedCell);
                if (ref) {
                  const value = e.target.value;
                  const isFormula = value.startsWith('=');
                  setCell(ref.row, ref.col, {
                    value,
                    formula: isFormula ? value : undefined,
                  });
                }
              }
            }}
            placeholder="Enter value or formula (=SUM(A1:B2))"
            className="h-8 text-sm"
          />
        </div>

        {aiConfig.isConnected && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-[#0564d2]"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            AI
          </Button>
        )}
      </div>

      {/* Formula Bar */}
      <div className="flex items-center gap-2 px-4 py-1 border-b border-gray-200 bg-gray-50">
        <span className="text-sm font-medium text-gray-600 min-w-[60px]">
          {selectedCell || ''}
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-700 flex-1 truncate">
          {selectedCell && evaluateFormula(
            data.cells[selectedCell]?.formula || data.cells[selectedCell]?.value || '',
            data.cells
          )}
        </span>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto">
        <div className="inline-block min-w-full">
          {/* Header Row */}
          <div className="flex sticky top-0 z-10">
            <div className="w-12 h-8 bg-gray-100 border-r border-b border-gray-300 flex items-center justify-center sticky left-0 z-20" />
            {Array.from({ length: data.colCount }, (_, col) => (
              <div
                key={`header-${col}`}
                className="w-24 h-8 bg-gray-100 border-r border-b border-gray-300 flex items-center justify-center text-xs font-medium text-gray-600"
              >
                {getColumnLabel(col)}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {Array.from({ length: data.rowCount }, (_, row) => (
            <div key={`row-${row}`} className="flex">
              {/* Row Header */}
              <div className="w-12 h-7 bg-gray-100 border-r border-b border-gray-300 flex items-center justify-center text-xs font-medium text-gray-600 sticky left-0 z-10">
                {row + 1}
              </div>

              {/* Cells */}
              {Array.from({ length: data.colCount }, (_, col) => {
                const cellId = getCellId(row, col);
                const cell = getCell(row, col);
                const isSelected = selectedCell === cellId;
                const isEditing = editingCell === cellId;
                const displayValue = cell.formula
                  ? evaluateFormula(cell.formula, data.cells)
                  : cell.value;

                return (
                  <div
                    key={cellId}
                    className={cn(
                      'w-24 h-7 border-r border-b border-gray-200 flex items-center px-1 text-sm relative',
                      isSelected && 'ring-2 ring-[#0564d2] ring-inset z-10',
                      cell.style?.bold && 'font-bold',
                      cell.style?.italic && 'italic',
                      cell.style?.underline && 'underline',
                      cell.style?.align === 'center' && 'text-center justify-center',
                      cell.style?.align === 'right' && 'text-right justify-end'
                    )}
                    style={{
                      backgroundColor: cell.style?.backgroundColor,
                      color: cell.style?.textColor,
                      fontSize: cell.style?.fontSize,
                    }}
                    onClick={() => handleCellClick(row, col)}
                    onDoubleClick={() => handleCellDoubleClick(row, col)}
                    onKeyDown={(e) => handleKeyDown(e, row, col)}
                    tabIndex={0}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleEditSubmit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSubmit();
                          if (e.key === 'Escape') {
                            setEditingCell(null);
                            setEditValue('');
                          }
                        }}
                        className="absolute inset-0 w-full h-full px-1 border-none outline-none bg-white"
                      />
                    ) : (
                      <span className="truncate w-full">{displayValue}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        <span>
          {selectedCell
            ? `Cell: ${selectedCell}`
            : 'No selection'}
        </span>
        <span>
          {data.rowCount} rows × {data.colCount} columns
        </span>
      </div>
    </div>
  );
}
