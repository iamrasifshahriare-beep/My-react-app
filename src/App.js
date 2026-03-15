import React, { useState, useRef } from "react";
import { evaluate } from "mathjs";

const CELL_WIDTH = 90;

function colLabel(index) {
  let label = "";
  let n = index + 1;
  while (n > 0) {
    n--;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  return label;
}

function shiftFormulaToRow(formula, rowIndex) {
  return formula.replace(/([A-Za-z]+)(\d+)/g, (_, col) => {
    return `${col}${rowIndex + 1}`;
  });
}

export default function App() {
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(3);
  const [headers, setHeaders] = useState(Array(3).fill(""));
  const [data, setData] = useState(
    Array(3).fill(null).map(() => Array(3).fill(""))
  );
  const [formulas, setFormulas] = useState(Array(3).fill(""));
  const [activeFormulaCol, setActiveFormulaCol] = useState(null);
  const formulaInputRefs = useRef([]);

  const addRow = () => {
    setRows(rows + 1);
    setData([...data, Array(cols).fill("")]);
  };

  const addColumn = () => {
    setCols(cols + 1);
    setHeaders([...headers, ""]);
    setFormulas([...formulas, ""]);
    setData(data.map((row) => [...row, ""]));
  };

  const deleteRow = () => {
    if (rows <= 1) return;
    setRows(rows - 1);
    setData(data.slice(0, -1));
  };

  const deleteColumn = () => {
    if (cols <= 1) return;
    setCols(cols - 1);
    setHeaders(headers.slice(0, -1));
    setFormulas(formulas.slice(0, -1));
    setData(data.map((row) => row.slice(0, -1)));
  };

  const updateHeader = (col, value) => {
    const updated = [...headers];
    updated[col] = value;
    setHeaders(updated);
  };

  const updateCell = (r, c, value) => {
    if (formulas[c].trim() !== "") return;
    const updated = data.map((row) => [...row]);
    updated[r][c] = value;
    setData(updated);
  };

  const updateFormula = (c, value) => {
    const updated = [...formulas];
    updated[c] = value;
    setFormulas(updated);
  };

  const buildScope = () => {
    const scope = {};
    data.forEach((row, r) => {
      row.forEach((cell, c) => {
        scope[`${colLabel(c)}${r + 1}`] = parseFloat(cell) || 0;
      });
    });
    return scope;
  };

  const calculateCell = (col, rowIndex) => {
    const formula = formulas[col].trim();
    if (formula === "") return null;
    const shifted = shiftFormulaToRow(formula, rowIndex);
    const scope = buildScope();
    try {
      const result = evaluate(shifted, scope);
      if (typeof result === "object") return result.valueOf();
      return typeof result === "number" ? parseFloat(result.toPrecision(10)) : result;
    } catch {
      return "Error";
    }
  };

  const calculateColumnFooter = (col) => {
    const scope = buildScope();
    try {
      const f = formulas[col].trim();
      if (f === "") return "";
      const result = evaluate(f, scope);
      if (typeof result === "object") return result.valueOf();
      return typeof result === "number" ? parseFloat(result.toPrecision(10)) : result;
    } catch {
      return "Error";
    }
  };

  const insertOperator = (op, col) => {
    if (col === null) return;
    const current = formulas[col];
    let newVal = current;
    if (op === "sqrt") {
      newVal = current ? `sqrt(${current})` : "sqrt(";
    } else if (op === "square") {
      newVal = current ? `(${current})^2` : "(";
    } else {
      newVal = current + op;
    }
    updateFormula(col, newVal);
    setTimeout(() => {
      formulaInputRefs.current[col]?.focus();
    }, 0);
  };

  return (
    <div style={styles.screen}>
      {/* Header */}
      <div style={styles.appHeader}>
        <span style={styles.appHeaderTitle}>🧪 Lab Calculator</span>
        <div style={styles.headerBtns}>
          <button style={styles.addBtn} onClick={addRow}>+ Row</button>
          <button style={styles.addBtn} onClick={addColumn}>+ Col</button>
          <button style={styles.delBtn} onClick={deleteRow}>− Row</button>
          <button style={styles.delBtn} onClick={deleteColumn}>− Col</button>
        </div>
      </div>

      {/* Operator Bar */}
      <div style={styles.opBar}>
        <span style={styles.opLabel}>Operators:</span>
        {[
          { op: "+", label: "+" },
          { op: "-", label: "−" },
          { op: "*", label: "×" },
          { op: "/", label: "÷" },
          { op: "sqrt", label: "√" },
          { op: "square", label: "x²" },
        ].map(({ op, label }) => (
          <button
            key={op}
            style={styles.opBtn}
            title={`Insert ${op} into selected formula cell`}
            onClick={() => insertOperator(op, activeFormulaCol)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={styles.tableWrapper}>
        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.cornerTh}>#</th>
                {Array.from({ length: cols }, (_, c) => (
                  <th key={c} style={styles.colLabelTh}>{colLabel(c)}</th>
                ))}
              </tr>
              <tr>
                <th style={styles.rowNumTh}>H</th>
                {headers.map((header, c) => (
                  <th key={c} style={styles.headerCell}>
                    <input
                      style={styles.headerInput}
                      value={header}
                      onChange={(e) => updateHeader(c, e.target.value)}
                      placeholder=""
                    />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {data.map((row, r) => (
                <tr key={r}>
                  <td style={styles.rowNumber}>{r + 1}</td>
                  {row.map((cell, c) => {
                    const hasFormula = formulas[c].trim() !== "";
                    const computedVal = hasFormula ? calculateCell(c, r) : null;
                    const isError = computedVal === "Error";
                    return (
                      <td
                        key={c}
                        style={{
                          ...styles.dataCell,
                          background: hasFormula ? "#f0fff4" : "#fff",
                        }}
                      >
                        {hasFormula ? (
                          <div style={{
                            ...styles.computedCell,
                            color: isError ? "#d93025" : "#1a6e2e",
                          }}>
                            {isError ? "⚠ Err" : computedVal}
                          </div>
                        ) : (
                          <input
                            type="number"
                            style={styles.cellInput}
                            value={cell}
                            onChange={(e) => updateCell(r, c, e.target.value)}
                            placeholder="0"
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr>
                <td style={styles.formulaLabelCell}>fx</td>
                {formulas.map((formula, c) => {
                  const result = calculateColumnFooter(c);
                  const isError = result === "Error";
                  return (
                    <td key={c} style={styles.formulaCell}>
                      <input
                        ref={(el) => (formulaInputRefs.current[c] = el)}
                        style={{
                          ...styles.formulaInput,
                          borderColor: activeFormulaCol === c ? "#1a73e8" : "#ccc",
                          background: activeFormulaCol === c ? "#e8f0fe" : "#fff9e6",
                        }}
                        placeholder="=formula"
                        value={formula}
                        onChange={(e) => updateFormula(c, e.target.value)}
                        onFocus={() => setActiveFormulaCol(c)}
                      />
                      <div style={{ ...styles.resultText, color: isError ? "#d93025" : "#1a6e2e" }}>
                        {result !== "" ? (isError ? "⚠ Error" : `= ${result}`) : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Copyright */}
      <div style={styles.copyright}>
        © Copyright — Rasif Shahriare
      </div>
    </div>
  );
}

const styles = {
  screen: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
    background: "#f0f4f8",
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: "hidden",
  },
  appHeader: {
    background: "linear-gradient(135deg, #1a73e8 0%, #0d5bba 100%)",
    color: "white",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(26,115,232,0.3)",
  },
  appHeaderTitle: {
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  headerBtns: {
    display: "flex",
    gap: 5,
  },
  addBtn: {
    border: "1px solid rgba(255,255,255,0.35)",
    borderRadius: 6,
    background: "rgba(255,255,255,0.22)",
    color: "white",
    fontSize: 11,
    fontWeight: 600,
    padding: "5px 9px",
    cursor: "pointer",
  },
  delBtn: {
    border: "1px solid rgba(255,180,170,0.35)",
    borderRadius: 6,
    background: "rgba(255,100,80,0.25)",
    color: "#ffe0db",
    fontSize: 11,
    fontWeight: 600,
    padding: "5px 9px",
    cursor: "pointer",
  },
  opBar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#fff",
    borderBottom: "1.5px solid #cdd6e0",
    padding: "7px 10px",
    flexShrink: 0,
    overflowX: "auto",
  },
  opLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  opBtn: {
    border: "1.5px solid #d0d9e8",
    borderRadius: 7,
    background: "#f5f8ff",
    color: "#1a57b5",
    fontSize: 15,
    fontWeight: 700,
    width: 36,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  tableWrapper: {
    flex: 1,
    overflow: "hidden",
    background: "#f0f4f8",
  },
  tableScroll: {
    overflowX: "auto",
    overflowY: "auto",
    height: "100%",
    WebkitOverflowScrolling: "touch",
  },
  table: {
    borderCollapse: "collapse",
    background: "#fff",
    minWidth: "100%",
  },
  cornerTh: {
    width: 30,
    background: "#e8edf4",
    border: "1px solid #c8d3e0",
    textAlign: "center",
    fontSize: 10,
    fontWeight: 700,
    color: "#5a7a9a",
    padding: "4px 0",
  },
  colLabelTh: {
    width: CELL_WIDTH,
    minWidth: CELL_WIDTH,
    background: "#e8edf4",
    border: "1px solid #c8d3e0",
    textAlign: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#3a6090",
    padding: "5px 2px",
    letterSpacing: 0.5,
  },
  rowNumTh: {
    width: 30,
    background: "#e8edf4",
    border: "1px solid #c8d3e0",
    textAlign: "center",
    fontSize: 10,
    fontWeight: 700,
    color: "#5a7a9a",
    padding: 0,
  },
  headerCell: {
    border: "1px solid #c8d3e0",
    background: "#eef2f8",
    padding: 2,
  },
  headerInput: {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 12,
    fontWeight: 600,
    color: "#2a4070",
    textAlign: "center",
    padding: "4px 3px",
    boxSizing: "border-box",
  },
  rowNumber: {
    background: "#e8edf4",
    border: "1px solid #c8d3e0",
    textAlign: "center",
    fontSize: 10,
    fontWeight: 700,
    color: "#5a7a9a",
    padding: 0,
    width: 30,
  },
  dataCell: {
    border: "1px solid #d5dde8",
    padding: 0,
    height: 34,
    width: CELL_WIDTH,
    minWidth: CELL_WIDTH,
  },
  computedCell: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "0 8px",
    fontSize: 13,
    fontWeight: 600,
  },
  cellInput: {
    width: "100%",
    height: "100%",
    border: "none",
    outline: "none",
    fontSize: 13,
    textAlign: "right",
    padding: "0 6px",
    background: "transparent",
    boxSizing: "border-box",
    color: "#1a2536",
  },
  formulaLabelCell: {
    background: "#fffbe6",
    border: "1px solid #c8d3e0",
    textAlign: "center",
    fontSize: 11,
    fontStyle: "italic",
    fontWeight: 700,
    color: "#888",
    padding: "4px 0",
    width: 30,
  },
  formulaCell: {
    border: "1px solid #d5dde8",
    background: "#fffef5",
    padding: "4px 4px",
    verticalAlign: "top",
  },
  formulaInput: {
    width: "100%",
    border: "1.5px solid #ccc",
    borderRadius: 5,
    fontSize: 12,
    fontFamily: "monospace",
    padding: "4px 5px",
    outline: "none",
    boxSizing: "border-box",
    color: "#333",
    transition: "border-color 0.15s, background 0.15s",
  },
  resultText: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: "right",
    marginTop: 2,
    paddingRight: 2,
    minHeight: 16,
  },
  copyright: {
    background: "#1a73e8",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    fontSize: 11,
    padding: "7px 12px",
    flexShrink: 0,
    letterSpacing: 0.3,
  },
};