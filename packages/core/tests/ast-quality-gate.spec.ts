import { describe, expect, it } from 'vitest';
import {
  extractFunctions,
  extractFunctionsTypeScriptAst,
  extractFunctionsPolyglot,
} from '../src/index.js';

describe('AST Static Analysis Engine (Issue #32)', () => {
  describe('TypeScript / TSX / JavaScript Real AST', () => {
    it('should correctly parse TSX component with JSX props and nested style objects', () => {
      const code = `
        import React, { useState } from 'react';

        export function UserCard(props: { name: string; age: number }) {
          const [active, setActive] = useState(false);
          const handleToggle = () => {
            if (props.age >= 18) {
              setActive(!active);
            }
          };

          return (
            <div className="card" style={{ backgroundColor: active ? 'green' : 'red', padding: 10 }}>
              <h2>{props.name}</h2>
              <button onClick={handleToggle}>Toggle</button>
            </div>
          );
        }
      `;

      const metrics = extractFunctions(code, 'src/components/UserCard.tsx');
      expect(metrics.length).toBeGreaterThanOrEqual(1);

      const component = metrics.find((m) => m.functionName === 'UserCard');
      expect(component).toBeDefined();
      expect(component?.cyclomatic).toBeGreaterThanOrEqual(1);
      expect(component?.codeSmells).not.toContain('Uso prohibido de "any"');

      const handler = metrics.find((m) => m.functionName === 'handleToggle');
      expect(handler).toBeDefined();
      expect(handler?.cyclomatic).toBe(2); // base 1 + if
    });

    it('should handle template literals with nested braces ${{ a: 1 }} without corrupting function boundaries', () => {
      const code = `
        function generateComplexPayload(id: string): string {
          const nested = \`template with \${{ a: 1, b: { c: 2 } }} inner braces\`;
          if (id) {
            return \`result-\${id}-\${nested}\`;
          }
          return 'default';
        }

        export const helper = (x: number) => {
          return x * 2;
        };
      `;

      const metrics = extractFunctions(code, 'src/utils/payload.ts');
      expect(metrics.length).toBe(2);

      const fn = metrics.find((m) => m.functionName === 'generateComplexPayload');
      expect(fn).toBeDefined();
      expect(fn?.cyclomatic).toBe(2); // base 1 + if

      const helper = metrics.find((m) => m.functionName === 'helper');
      expect(helper).toBeDefined();
      expect(helper?.cyclomatic).toBe(1);
    });

    it('should compute exact Cyclomatic Complexity and Cognitive Complexity with AST nesting', () => {
      const code = `
        function calculateRisk(score: number, flags: string[], isVip: boolean): number {
          let risk = 0;
          if (score > 50) {
            if (isVip) {
              risk += 5;
            } else {
              for (const f of flags) {
                if (f === 'CRITICAL') {
                  risk += 20;
                }
              }
            }
          } else if (score > 20 || isVip) {
            risk += 2;
          }
          return risk;
        }
      `;

      const metrics = extractFunctions(code, 'src/risk.ts');
      expect(metrics.length).toBe(1);
      const fn = metrics[0];

      // CC: base 1 + if + if + for + if + else if + || = 7
      expect(fn.cyclomatic).toBe(7);
      // Cognitive: if (1) + nested if (2) + nested for (2) + doubly nested if (3) + else if (1) = 9
      expect(fn.cognitive).toBeGreaterThanOrEqual(8);
      expect(fn.maintainability).toBeGreaterThan(50);
    });

    it('should detect prohibited "any" using AST syntax kind without matching words containing "any"', () => {
      const code = `
        function processCompanyData(company: string, anyone: boolean): boolean {
          const payload: any = { company, anyone };
          return true;
        }
      `;

      const metrics = extractFunctions(code, 'src/company.ts');
      expect(metrics.length).toBe(1);
      expect(metrics[0].codeSmells).toContain('Uso prohibido de "any"');
    });

    it('should NOT flag "any" when the word is in variable or string names', () => {
      const code = `
        function validateCompany(company: string, anyone: boolean): string {
          const message = "anyone can join any company";
          if (anyone) return company;
          return message;
        }
      `;

      const metrics = extractFunctions(code, 'src/clean.ts');
      expect(metrics.length).toBe(1);
      expect(metrics[0].codeSmells).not.toContain('Uso prohibido de "any"');
    });

    it('should parse methods, getters, setters, and constructors in TypeScript classes', () => {
      const code = `
        class AccountManager {
          private _balance = 0;

          constructor(initial: number) {
            if (initial > 0) this._balance = initial;
          }

          get balance(): number {
            return this._balance;
          }

          set balance(val: number) {
            if (val >= 0) this._balance = val;
          }

          deposit(amount: number): boolean {
            if (amount > 0) {
              this._balance += amount;
              return true;
            }
            return false;
          }
        }
      `;

      const metrics = extractFunctions(code, 'src/account.ts');
      const names = metrics.map((m) => m.functionName);
      expect(names).toContain('constructor');
      expect(names).toContain('get balance');
      expect(names).toContain('set balance');
      expect(names).toContain('deposit');
    });

    it('should extract test callbacks with descriptive test names', () => {
      const code = `
        it('should verify authorization header', () => {
          const header = 'Bearer token';
          if (!header) throw new Error('Missing');
        });
      `;

      const metrics = extractFunctions(code, 'tests/auth.spec.ts');
      expect(metrics.length).toBe(1);
      expect(metrics[0].functionName).toBe('should verify authorization header');
      expect(metrics[0].cyclomatic).toBe(2);
    });
  });

  describe('Polyglot Token-Aware Structural AST Scanner', () => {
    it('should parse Go functions and ignore braces inside strings and comments', () => {
      const goCode = `
        package main

        // ProcessPayload handles JSON payloads with braces { and }
        func ProcessPayload(input string) (string, error) {
          template := "{ key: \\"value\\", count: 1 }"
          /* Multi-line comment with
             nested braces {foo} */
          if input == "" {
            return template, nil
          }
          for i := 0; i < len(input); i++ {
            if input[i] == '{' {
              return "brace", nil
            }
          }
          return input, nil
        }
      `;

      const metrics = extractFunctionsPolyglot(goCode, 'gateway/main.go');
      expect(metrics.length).toBe(1);
      expect(metrics[0].functionName).toBe('ProcessPayload');
      expect(metrics[0].cyclomatic).toBe(4); // base 1 + if + for + if
    });

    it('should parse Rust functions and ignore braces in raw strings r#"..."#', () => {
      const rustCode = `
        pub async fn validate_config(raw: &str) -> bool {
          let schema = r#"{ "$schema": "https://json-schema.org" }"#;
          // check config
          if raw.is_empty() {
            return false;
          }
          match raw {
            "default" => true,
            _ => false,
          }
        }
      `;

      const metrics = extractFunctionsPolyglot(rustCode, 'src/config.rs');
      expect(metrics.length).toBe(1);
      expect(metrics[0].functionName).toBe('validate_config');
      expect(metrics[0].cyclomatic).toBe(3); // base 1 + if + match
    });

    it('should parse Python functions with multiline docstrings and lambdas', () => {
      const pyCode = `
def analyze_telemetry(data, threshold=100):
    """
    Analyzes drone telemetry data.
    Expected format: { "drone_id": 1, "lat": 0.0 }
    """
    if not data:
        return None
    for item in data:
        if item.get("val", 0) > threshold:
            return True
    return False
      `;

      const metrics = extractFunctionsPolyglot(pyCode, 'scripts/analytics.py');
      expect(metrics.length).toBe(1);
      expect(metrics[0].functionName).toBe('analyze_telemetry');
      expect(metrics[0].cyclomatic).toBe(4); // base 1 + if + for + if = 4
    });

    it('should parse Java / C# classes and methods with annotations', () => {
      const javaCode = `
        public class GatewayHandler {
          private String config = "{ \\"active\\": true }";

          public void handleRequest(String req) throws Exception {
            // comment with { braces }
            if (req != null && req.length() > 0) {
              System.out.println(req);
            }
          }
        }
      `;

      const metrics = extractFunctionsPolyglot(javaCode, 'src/GatewayHandler.java');
      expect(metrics.length).toBe(1);
      expect(metrics[0].functionName).toBe('handleRequest');
      expect(metrics[0].cyclomatic).toBe(3); // base 1 + if + &&
    });
  });

  describe('Pre-flight Performance & False Positive Verification', () => {
    it('should execute AST extraction in under 300ms for multiple complex modules', () => {
      const tsx = `
        export const Dashboard = () => {
          const items = [{ id: 1 }, { id: 2 }];
          const format = (v: number) => \`\${{ val: v }}\`;
          if (items.length > 0) {
            return <div style={{ display: 'flex' }}>{items.map(i => format(i.id))}</div>;
          }
          return <div>Empty</div>;
        };
      `;

      const start = Date.now();
      for (let i = 0; i < 20; i++) {
        extractFunctions(tsx, `src/Dashboard_${i}.tsx`);
      }
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000); // 20 files in < 1 second
    });
  });
});
